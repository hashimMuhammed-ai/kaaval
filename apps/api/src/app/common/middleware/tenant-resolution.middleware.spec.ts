import { ForbiddenException } from '@nestjs/common';
import { TenantResolutionMiddleware } from './tenant-resolution.middleware';
import { TenantStatus } from '../enums/tenant-status.enum';

describe('TenantResolutionMiddleware', () => {
  let middleware: TenantResolutionMiddleware;
  let mockTenantResolver: any;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;

  const mockTenant = {
    id: 'tenant-111',
    name: 'Care Kerala Agency',
    subdomain: 'carekerala',
    status: TenantStatus.ACTIVE,
  };

  beforeEach(() => {
    mockTenantResolver = {
      resolveFromRequest: jest.fn().mockResolvedValue(mockTenant),
    };

    mockRequest = {
      headers: {
        host: 'carekerala.caregiverplatform.com',
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
      headersSent: false,
    };

    mockNext = jest.fn();

    middleware = new TenantResolutionMiddleware(mockTenantResolver);
  });

  it('should resolve tenant, attach to request, set header, and call next()', async () => {
    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockTenantResolver.resolveFromRequest).toHaveBeenCalledWith(mockRequest);
    expect(mockRequest.tenant).toBe(mockTenant);
    expect(mockRequest.tenantId).toBe('tenant-111');
    expect(mockRequest.subdomain).toBe('carekerala');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Resolved-Tenant', 'carekerala');
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should pass with next() if no tenant is resolved (e.g. apex/platform routes)', async () => {
    mockTenantResolver.resolveFromRequest.mockResolvedValue(null);

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockRequest.tenant).toBeUndefined();
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should pass error to next if tenant account is suspended', async () => {
    mockTenantResolver.resolveFromRequest.mockResolvedValue({
      ...mockTenant,
      status: TenantStatus.SUSPENDED,
    });

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenException));
  });

  it('should allow authenticated user from the SAME tenant', async () => {
    mockRequest.user = {
      id: 'usr-1',
      tenantId: 'tenant-111',
      role: 'owner',
    };

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });

  it('should block authenticated user from a DIFFERENT tenant with ForbiddenException', async () => {
    mockRequest.user = {
      id: 'usr-foreign',
      tenantId: 'other-tenant-999',
      role: 'owner',
    };

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenException));
  });

  it('should allow Super Admin to access any tenant domain without restriction', async () => {
    mockRequest.user = {
      id: 'usr-admin',
      tenantId: null,
      role: 'super_admin',
    };

    await middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
  });
});
