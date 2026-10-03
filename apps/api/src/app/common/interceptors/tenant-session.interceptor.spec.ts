import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, lastValueFrom } from 'rxjs';
import { TenantSessionInterceptor, RlsSessionInterceptor } from './tenant-session.interceptor';
import { TenantContextStorage } from '../database/tenant-context.storage';
import { SKIP_TENANT_SESSION_KEY } from '../decorators/tenant-session.decorator';

describe('TenantSessionInterceptor', () => {
  let interceptor: TenantSessionInterceptor;
  let mockDataSource: any;
  let mockQueryRunner: any;
  let mockReflector: any;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  const flushAsyncFinalize = () => new Promise((resolve) => setTimeout(resolve, 20));

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-uuid-1',
        userId: 'user-uuid-1',
        tenantId: 'tenant-uuid-1',
        role: 'owner',
      },
      headers: {},
    };

    mockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn().mockResolvedValue(undefined),
      isReleased: false,
      manager: { name: 'mock-entity-manager' },
    };

    mockDataSource = {
      isInitialized: true,
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
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

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'success' })),
    };

    interceptor = new TenantSessionInterceptor(mockDataSource, mockReflector);
  });

  it('should be defined and alias exported', () => {
    expect(interceptor).toBeDefined();
    expect(RlsSessionInterceptor).toBe(TenantSessionInterceptor);
  });

  it('should ignore non-http context', async () => {
    (mockExecutionContext.getType as jest.Mock).mockReturnValue('rpc');
    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'success' });
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('should bypass session setup if skip decorator is present', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'success' });
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(SKIP_TENANT_SESSION_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('should extract context, configure queryRunner with set_tenant_session, and release on finalize', async () => {
    mockCallHandler.handle = jest.fn().mockImplementation(() => {
      expect(TenantContextStorage.getTenantId()).toBe('tenant-uuid-1');
      expect(TenantContextStorage.getUserId()).toBe('user-uuid-1');
      expect(TenantContextStorage.getUserRole()).toBe('owner');
      return of({ data: 'success' });
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'success' });
    expect(mockRequest.tenantContext).toEqual({
      tenantId: 'tenant-uuid-1',
      userId: 'user-uuid-1',
      role: 'owner',
    });

    expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'SELECT set_tenant_session($1, $2, $3)',
      ['tenant-uuid-1', 'user-uuid-1', 'owner']
    );
    expect(mockRequest.queryRunner).toBe(mockQueryRunner);
    expect(mockRequest.entityManager).toBe(mockQueryRunner.manager);

    await flushAsyncFinalize();
    expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should extract context from headers if request.user is not present', async () => {
    delete mockRequest.user;
    mockRequest.headers = {
      'x-tenant-id': 'tenant-header-uuid',
      'x-user-id': 'user-header-uuid',
      'x-user-role': 'office_staff',
    };

    mockCallHandler.handle = jest.fn().mockImplementation(() => {
      expect(TenantContextStorage.getTenantId()).toBe('tenant-header-uuid');
      expect(TenantContextStorage.getUserId()).toBe('user-header-uuid');
      expect(TenantContextStorage.getUserRole()).toBe('office_staff');
      return of({ data: 'from-headers' });
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'from-headers' });
    expect(mockQueryRunner.query).toHaveBeenCalledWith(
      'SELECT set_tenant_session($1, $2, $3)',
      ['tenant-header-uuid', 'user-header-uuid', 'office_staff']
    );

    await flushAsyncFinalize();
    expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should cleanup queryRunner even if handler throws an error', async () => {
    mockCallHandler.handle = jest.fn().mockReturnValue(
      throwError(() => new Error('Handler execution failed'))
    );

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

    await expect(lastValueFrom(result$)).rejects.toThrow('Handler execution failed');

    await flushAsyncFinalize();
    expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });

  it('should operate safely if DataSource is uninitialized or null', async () => {
    interceptor = new TenantSessionInterceptor(undefined, mockReflector);

    mockCallHandler.handle = jest.fn().mockImplementation(() => {
      expect(TenantContextStorage.getTenantId()).toBe('tenant-uuid-1');
      return of({ data: 'success' });
    });

    const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual({ data: 'success' });
    expect(mockRequest.tenantContext).toEqual({
      tenantId: 'tenant-uuid-1',
      userId: 'user-uuid-1',
      role: 'owner',
    });
  });
});
