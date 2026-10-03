import { ExecutionContext } from '@nestjs/common';
import { TenantSessionGuard, RlsSessionGuard } from './tenant-session.guard';
import { SKIP_TENANT_SESSION_KEY } from '../decorators/tenant-session.decorator';

describe('TenantSessionGuard', () => {
  let guard: TenantSessionGuard;
  let mockDataSource: any;
  let mockReflector: any;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'usr-123',
        userId: 'usr-123',
        tenantId: 'ten-456',
        role: 'caregiver',
      },
      headers: {},
    };

    mockDataSource = {
      isInitialized: true,
    };

    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    const handlerFn = () => {};
    const classFn = class {};

    mockExecutionContext = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
      }),
      getHandler: jest.fn().mockReturnValue(handlerFn),
      getClass: jest.fn().mockReturnValue(classFn),
    } as any;

    guard = new TenantSessionGuard(mockDataSource, mockReflector);
  });

  it('should be defined and alias exported', () => {
    expect(guard).toBeDefined();
    expect(RlsSessionGuard).toBe(TenantSessionGuard);
  });

  it('should return true for non-http requests', async () => {
    (mockExecutionContext.getType as jest.Mock).mockReturnValue('ws');
    const result = await guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('should return true and skip processing if skip decorator is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_TENANT_SESSION_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('should extract tenantContext from request.user and attach to request', async () => {
    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.tenantContext).toEqual({
      tenantId: 'ten-456',
      userId: 'usr-123',
      role: 'caregiver',
    });
  });

  it('should extract tenantContext from headers when request.user is absent', async () => {
    delete mockRequest.user;
    mockRequest.headers = {
      'x-tenant-id': 'ten-789',
      'x-user-id': 'usr-789',
      'x-user-role': 'super_admin',
    };

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.tenantContext).toEqual({
      tenantId: 'ten-789',
      userId: 'usr-789',
      role: 'super_admin',
    });
  });

  it('should synchronize session context on active queryRunner if present on request', async () => {
    const mockQueryRunner = {
      isReleased: false,
      query: jest.fn().mockResolvedValue([]),
    };
    mockRequest.queryRunner = mockQueryRunner;

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'SELECT set_tenant_session($1, $2, $3)',
      ['ten-456', 'usr-123', 'caregiver']
    );
  });
});
