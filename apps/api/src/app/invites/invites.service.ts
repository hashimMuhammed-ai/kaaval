import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InviteToken } from '../users/entities/invite-token.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import {
  CreateInviteResponseDto,
  ValidateInviteResponseDto,
  AcceptInviteResponseDto,
  InviteSummary,
} from './dto/invite-response.dto';
import { PasswordHasher } from '../common/utils/password-hasher';

@Injectable()
export class InvitesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(InviteToken)
    private readonly inviteTokenRepository: Repository<InviteToken>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Owner generates a single-use expiring invite token for Office Staff.
   * Bound to tenant_id + role.
   */
  async createInvite(
    dto: CreateInviteDto,
    inviterUserId: string,
    callerTenantId: string,
    callerRole: UserRole
  ): Promise<CreateInviteResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Enforce role boundary: Owner can only invite Office Staff
    const targetRole = dto.role || UserRole.OFFICE_STAFF;
    if (callerRole === UserRole.OWNER && targetRole !== UserRole.OFFICE_STAFF) {
      throw new BadRequestException(
        'Agency Owners can only invite Office Staff members.'
      );
    }

    // 2. Verify tenant exists and is active
    const tenant = await this.tenantRepository.findOne({
      where: { id: callerTenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Agency tenant not found.`);
    }

    // 3. Verify user does not already exist in this tenant
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('user.tenant_id = :tenantId', { tenantId: callerTenantId })
      .andWhere('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();

    if (existingUser) {
      throw new ConflictException(
        `A user account with email "${normalizedEmail}" already exists in this agency.`
      );
    }

    // 4. Invalidate any existing unused invites for this email in this tenant
    await this.inviteTokenRepository
      .createQueryBuilder()
      .update(InviteToken)
      .set({ usedAt: new Date() })
      .where('tenant_id = :tenantId', { tenantId: callerTenantId })
      .andWhere('LOWER(email) = :email', { email: normalizedEmail })
      .andWhere('used_at IS NULL')
      .execute();

    // 5. Generate secure random non-sequential token (64 hex characters)
    const tokenString = PasswordHasher.generateRandomToken(32);
    const expiryHours = dto.expiryHours || 48;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    const inviteToken = this.inviteTokenRepository.create({
      inviteToken: tokenString,
      tenantId: callerTenantId,
      role: targetRole,
      email: normalizedEmail,
      invitedBy: inviterUserId,
      expiresAt,
    });

    const savedInvite = await this.inviteTokenRepository.save(inviteToken);

    // 6. Build WhatsApp shareable message & onboarding URL
    const appDomain = process.env.APP_DOMAIN || 'caregiverplatform.com';
    const baseUrl = `https://${tenant.subdomain}.${appDomain}`;
    const onboardingUrl = `${baseUrl}/accept-invite?token=${tokenString}`;

    const whatsappInviteMessage = [
      `*Caregiver Platform — Agency Staff Invitation*`,
      ``,
      `Hello${dto.name ? ' ' + dto.name.trim() : ''}!`,
      `You have been invited to join *${tenant.name}* as *Office Staff*.`,
      ``,
      `Activate your account here (valid for ${expiryHours} hours):`,
      `${onboardingUrl}`,
      ``,
      `Click the link to set your password and start managing requests and caregivers.`,
    ].join('\n');

    return {
      success: true,
      message: `Invite token generated successfully for ${normalizedEmail}.`,
      invite: {
        id: savedInvite.id,
        inviteToken: savedInvite.inviteToken,
        tenantId: savedInvite.tenantId,
        tenantName: tenant.name,
        subdomain: tenant.subdomain,
        role: savedInvite.role,
        email: savedInvite.email,
        expiresAt: savedInvite.expiresAt,
        usedAt: savedInvite.usedAt,
        status: 'active',
        onboardingUrl,
        whatsappInviteMessage,
        createdAt: savedInvite.createdAt,
      },
    };
  }

  /**
   * Validate invite token (public endpoint called before displaying registration form).
   */
  async validateInvite(token: string): Promise<ValidateInviteResponseDto> {
    if (!token || !token.trim()) {
      throw new BadRequestException('Invite token is required.');
    }

    const invite = await this.inviteTokenRepository.findOne({
      where: { inviteToken: token.trim() },
      relations: ['tenant'],
    });

    if (!invite) {
      throw new NotFoundException('Invite token is invalid or does not exist.');
    }

    if (invite.usedAt) {
      throw new BadRequestException(
        'This invitation token has already been used. Please log in or ask your agency owner for a new invitation.'
      );
    }

    if (new Date() > new Date(invite.expiresAt)) {
      throw new BadRequestException(
        'This invitation token has expired (tokens are valid for 48 hours). Please request a new invitation link.'
      );
    }

    return {
      valid: true,
      tenant: {
        id: invite.tenant.id,
        name: invite.tenant.name,
        subdomain: invite.tenant.subdomain,
      },
      invite: {
        role: invite.role,
        email: invite.email,
        expiresAt: invite.expiresAt,
      },
    };
  }

  /**
   * Accept invite token, establish password, and create staff user account atomically.
   */
  async acceptInvite(dto: AcceptInviteDto): Promise<AcceptInviteResponseDto> {
    const trimmedToken = dto.token.trim();
    const trimmedName = dto.name.trim();

    return await this.dataSource.transaction(async (manager) => {
      // 1. Fetch token within transaction
      const invite = await manager.findOne(InviteToken, {
        where: { inviteToken: trimmedToken },
        relations: ['tenant'],
      });

      if (!invite) {
        throw new NotFoundException('Invite token is invalid or does not exist.');
      }

      if (invite.usedAt) {
        throw new BadRequestException(
          'This invitation token has already been redeemed.'
        );
      }

      if (new Date() > new Date(invite.expiresAt)) {
        throw new BadRequestException(
          'This invitation token has expired. Please request a new invitation.'
        );
      }

      // 2. Ensure email doesn't conflict
      const userEmail = invite.email
        ? invite.email.toLowerCase()
        : `${PasswordHasher.generateRandomToken(4)}@${invite.tenant.subdomain}.local`;

      const existingUser = await manager.findOne(User, {
        where: {
          tenantId: invite.tenantId,
          email: userEmail,
        },
      });

      if (existingUser) {
        throw new ConflictException(
          `A user account with email "${userEmail}" already exists in this agency.`
        );
      }

      // 3. Hash user password securely
      const passwordHash = PasswordHasher.hash(dto.password);

      // 4. Create new User account
      const newUser = manager.create(User, {
        tenantId: invite.tenantId,
        role: invite.role,
        name: trimmedName,
        email: userEmail,
        passwordHash,
        phone: dto.phone ? dto.phone.trim() : null,
        isActive: true,
      });

      const savedUser = await manager.save(User, newUser);

      // 5. Mark invite token as redeemed (single-use)
      invite.usedAt = new Date();
      await manager.save(InviteToken, invite);

      return {
        success: true,
        message: 'Account successfully activated. You can now log in to the agency portal.',
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          tenantId: savedUser.tenantId!,
        },
      };
    });
  }

  /**
   * List all invites for a tenant (Owner view).
   */
  async getInvitesByTenant(tenantId: string): Promise<InviteSummary[]> {
    const invites = await this.inviteTokenRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();

    return invites.map((inv) => {
      let status: 'active' | 'used' | 'expired' = 'active';
      if (inv.usedAt) {
        status = 'used';
      } else if (now > new Date(inv.expiresAt)) {
        status = 'expired';
      }

      return {
        id: inv.id,
        inviteToken: inv.inviteToken,
        tenantId: inv.tenantId,
        role: inv.role,
        email: inv.email,
        expiresAt: inv.expiresAt,
        usedAt: inv.usedAt,
        status,
        createdAt: inv.createdAt,
      };
    });
  }

  /**
   * Revoke an active invite token before it is redeemed.
   */
  async revokeInvite(inviteId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const invite = await this.inviteTokenRepository.findOne({
      where: { id: inviteId, tenantId },
    });

    if (!invite) {
      throw new NotFoundException(`Invite not found.`);
    }

    if (invite.usedAt) {
      throw new BadRequestException('Cannot revoke an invite that has already been redeemed.');
    }

    await this.inviteTokenRepository.delete(inviteId);

    return {
      success: true,
      message: 'Invite successfully revoked.',
    };
  }
}
