import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // Support dev / testing headers if user is not set by auth middleware
    if (!user && request.headers['x-user-role']) {
      user = {
        id: request.headers['x-user-id'] || 'dev-user-id',
        role: request.headers['x-user-role'] as UserRole,
        tenantId: request.headers['x-tenant-id'] || null,
      };
      request.user = user;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required to access this resource.');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Role "${user.role}" does not have required permissions: [${requiredRoles.join(', ')}].`
      );
    }

    return true;
  }
}
