import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
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
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow access if route has no role restrictions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user possesses required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER, UserRole.SUPER_ADMIN]);
    const context = createMockContext({}, { role: UserRole.OWNER });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if no user is authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException if user has a different role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
    const context = createMockContext({}, { role: UserRole.CAREGIVER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should support dev/test headers (x-user-role) when auth middleware is bypassed', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.OWNER]);
    const context = createMockContext({ 'x-user-role': UserRole.OWNER, 'x-tenant-id': 'ten-1' });
    expect(guard.canActivate(context)).toBe(true);
  });
});
