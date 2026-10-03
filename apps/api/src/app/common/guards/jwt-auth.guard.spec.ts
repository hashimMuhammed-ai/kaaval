import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '../enums/user-role.enum';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockJwtService: any;
  let mockConfigService: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockJwtService = {
      verifyAsync: jest.fn(),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    guard = new JwtAuthGuard(reflector, mockJwtService, mockConfigService);
  });

  const createMockContext = (headers: any = {}): ExecutionContext => {
    const request = {
      headers,
      user: null as any,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow access if route is marked with @Public()', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext();

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });

  it('should verify token and attach claims to request.user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const payload = {
      sub: 'usr-1',
      userId: 'usr-1',
      email: 'owner@keralacare.com',
      tenantId: 'ten-1',
      role: UserRole.OWNER,
      name: 'Rahul Nair',
    };

    mockJwtService.verifyAsync.mockResolvedValue(payload);

    const context = createMockContext({
      authorization: 'Bearer valid.jwt.token',
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.user).toEqual({
      id: 'usr-1',
      userId: 'usr-1',
      tenantId: 'ten-1',
      role: UserRole.OWNER,
      email: 'owner@keralacare.com',
      name: 'Rahul Nair',
    });
  });

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid signature'));

    const context = createMockContext({
      authorization: 'Bearer bad.token',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
