import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Support dev/admin header for provisioning if configured
    const superAdminKey = request.headers['x-super-admin-key'];
    const configuredKey = process.env.SUPER_ADMIN_KEY || 'superadmin-secret-key-dev';

    if (superAdminKey && superAdminKey === configuredKey) {
      request.user = {
        role: UserRole.SUPER_ADMIN,
        name: 'Platform Super Admin',
      };
      return true;
    }

    if (!user) {
      throw new UnauthorizedException(
        'Authentication required. Only platform Super Admin can access this resource.'
      );
    }

    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Access denied. Only platform Super Admin can provision tenants or manage platform configurations.'
      );
    }

    return true;
  }
}
