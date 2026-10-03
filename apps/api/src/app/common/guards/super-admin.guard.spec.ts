import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { UserRole } from '../enums/user-role.enum';

describe('SuperAdminGuard', () => {
  let guard: SuperAdminGuard;

  beforeEach(() => {
    guard = new SuperAdminGuard();
  });

  const createMockContext = (headers: any = {}, user: any = null): ExecutionContext => {
    const request = {
      headers,
      user,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if user has SUPER_ADMIN role', () => {
    const context = createMockContext({}, { role: UserRole.SUPER_ADMIN, name: 'Admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access with valid x-super-admin-key header and attach super admin user', () => {
    const context = createMockContext({ 'x-super-admin-key': 'superadmin-secret-key-dev' });
    expect(guard.canActivate(context)).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.user.role).toBe(UserRole.SUPER_ADMIN);
  });

  it('should throw UnauthorizedException if no user or admin key is present', () => {
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user has a non-super-admin role (e.g. OWNER or OFFICE_STAFF)', () => {
    const ownerContext = createMockContext({}, { role: UserRole.OWNER, name: 'Owner' });
    expect(() => guard.canActivate(ownerContext)).toThrow(ForbiddenException);

    const staffContext = createMockContext({}, { role: UserRole.OFFICE_STAFF, name: 'Staff' });
    expect(() => guard.canActivate(staffContext)).toThrow(ForbiddenException);
  });
});
