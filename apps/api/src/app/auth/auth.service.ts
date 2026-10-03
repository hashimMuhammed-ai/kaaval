import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordHasher } from '../common/utils/password-hasher';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Authenticate user with credentials and sign a JWT containing userId, tenantId, and role claims.
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    let user: User | null = null;

    if (dto.subdomain) {
      const normalizedSubdomain = dto.subdomain.trim().toLowerCase();
      const tenant = await this.tenantRepository.findOne({
        where: { subdomain: normalizedSubdomain },
      });

      if (!tenant) {
        throw new UnauthorizedException('Invalid agency subdomain or credentials.');
      }

      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new ForbiddenException(
          `Agency "${tenant.name}" is currently ${tenant.status}. Access is restricted.`
        );
      }

      user = await this.userRepository.findOne({
        where: {
          tenantId: tenant.id,
          email: normalizedEmail,
        },
        relations: ['tenant'],
      });
    } else {
      // Find user without subdomain (e.g. Super Admin or unique email)
      const matchingUsers = await this.userRepository.find({
        where: { email: normalizedEmail },
        relations: ['tenant'],
      });

      if (matchingUsers.length === 0) {
        throw new UnauthorizedException('Invalid email or password.');
      }

      if (matchingUsers.length === 1) {
        user = matchingUsers[0];
      } else {
        // If multiple tenants have the same email, prioritize platform Super Admin
        const superAdmin = matchingUsers.find((u) => u.role === UserRole.SUPER_ADMIN);
        if (superAdmin) {
          user = superAdmin;
        } else {
          throw new BadRequestException(
            'This email belongs to multiple agencies. Please specify your agency subdomain to log in.'
          );
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify password hash
    const isPasswordValid = PasswordHasher.verify(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Verify active account status
    if (!user.isActive) {
      throw new ForbiddenException(
        'Your user account is inactive. Please contact your agency administrator.'
      );
    }

    // If tenant-scoped user, verify tenant is active
    if (user.tenantId && user.tenant && user.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(
        `Agency "${user.tenant.name}" is currently ${user.tenant.status}. Access is restricted.`
      );
    }

    // Update last login timestamp
    await this.userRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // Construct JWT Payload with userId, tenantId, and role claims
    const payload: JwtPayload = {
      sub: user.id,
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId || null,
      role: user.role,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1d';

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || null,
        phone: user.phone,
      },
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            subdomain: user.tenant.subdomain,
          }
        : null,
    };
  }

  /**
   * Fetch authenticated user profile and verify current token validity.
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['tenant'],
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId || null,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      tenant: user.tenant
        ? {
            id: user.tenant.id,
            name: user.tenant.name,
            subdomain: user.tenant.subdomain,
            status: user.tenant.status,
          }
        : null,
    };
  }
}
