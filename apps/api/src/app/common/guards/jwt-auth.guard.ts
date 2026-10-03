import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Check dev testing headers if Authorization Bearer header is not present
    if (!authHeader && request.headers['x-user-role']) {
      request.user = {
        id: request.headers['x-user-id'] || 'dev-user-id',
        userId: request.headers['x-user-id'] || 'dev-user-id',
        tenantId: request.headers['x-tenant-id'] || null,
        role: request.headers['x-user-role'] as UserRole,
        email: request.headers['x-user-email'] || 'dev@local',
        name: 'Dev User',
      };
      return true;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token missing or malformed.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Authentication token cannot be empty.');
    }

    try {
      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'super-secret-jwt-token-replace-in-production';

      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret,
      });

      request.user = {
        id: payload.sub,
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
        name: payload.name,
      };

      return true;
    } catch (err: any) {
      throw new UnauthorizedException(
        err?.name === 'TokenExpiredError'
          ? 'Authentication token has expired. Please log in again.'
          : 'Invalid authentication token.'
      );
    }
  }
}
