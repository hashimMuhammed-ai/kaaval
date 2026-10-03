import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantResolverService } from './tenant-resolver.service';
import { Tenant } from './entities/tenant.entity';
import { TenantStatus } from '../common/enums/tenant-status.enum';

describe('TenantResolverService', () => {
  let service: TenantResolverService;
  let mockTenantRepository: any;
  let mockConfigService: any;
  let mockQueryBuilder: any;

  const mockTenant: Tenant = {
    id: 'tenant-uuid-1',
    name: 'Care Kerala Agency',
    subdomain: 'carekerala',
    tenantSlug: 'carekerala',
    customDomain: 'carekerala.in',
    status: TenantStatus.ACTIVE,
    phone: '+91 9876543210',
    email: 'info@carekerala.com',
    address: 'Kochi, Kerala',
    settings: { currency: 'INR' },
    users: [],
    inviteTokens: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockTenant),
    };

    mockTenantRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('caregiverplatform.com'),
    };

    service = new TenantResolverService(mockTenantRepository, mockConfigService);
  });

  describe('resolveBySubdomain', () => {
    it('should find tenant by subdomain in lowercase', async () => {
      const result = await service.resolveBySubdomain('CareKerala');

      expect(result).toBe(mockTenant);
      expect(mockTenantRepository.createQueryBuilder).toHaveBeenCalledWith('tenant');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(tenant.subdomain) = :subdomain',
        { subdomain: 'carekerala' }
      );
    });

    it('should return cached result on subsequent lookups', async () => {
      const first = await service.resolveBySubdomain('carekerala');
      const second = await service.resolveBySubdomain('carekerala');

      expect(first).toBe(mockTenant);
      expect(second).toBe(mockTenant);
      // DB was only hit once because of in-memory caching
      expect(mockTenantRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('should return null for empty subdomain', async () => {
      const result = await service.resolveBySubdomain('');
      expect(result).toBeNull();
      expect(mockTenantRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('resolveByCustomDomain', () => {
    it('should find tenant by custom domain', async () => {
      const result = await service.resolveByCustomDomain('CareKerala.in');

      expect(result).toBe(mockTenant);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(tenant.custom_domain) = :customDomain',
        { customDomain: 'carekerala.in' }
      );
    });
  });

  describe('resolveBySlug', () => {
    it('should find tenant by slug in lowercase', async () => {
      const result = await service.resolveBySlug('CareKerala');

      expect(result).toBe(mockTenant);
      expect(mockTenantRepository.createQueryBuilder).toHaveBeenCalledWith('tenant');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'LOWER(tenant.tenant_slug) = :slug OR LOWER(tenant.subdomain) = :slug',
        { slug: 'carekerala' }
      );
    });

    it('should return null for empty slug', async () => {
      const result = await service.resolveBySlug('');
      expect(result).toBeNull();
    });
  });

  describe('resolveFromRequest', () => {
    it('should resolve tenant via path-based URL (/t/:tenantSlug)', async () => {
      const req = {
        originalUrl: '/t/carekerala/dashboard',
        headers: {},
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via API path (/api/t/:tenantSlug)', async () => {
      const req = {
        url: '/api/t/carekerala/caregivers',
        headers: {},
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via x-tenant-slug header', async () => {
      const req = {
        headers: {
          'x-tenant-slug': 'carekerala',
        },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via x-tenant-subdomain header', async () => {
      const req = {
        headers: {
          'x-tenant-subdomain': 'carekerala',
        },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via Host header', async () => {
      const req = {
        headers: {
          host: 'carekerala.caregiverplatform.com',
        },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via x-forwarded-host header', async () => {
      const req = {
        headers: {
          'x-forwarded-host': 'carekerala.localhost:3000',
          host: 'internal-service:3000',
        },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant via query param fallback', async () => {
      const req = {
        headers: {},
        query: { subdomain: 'carekerala' },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should resolve tenant matching custom domain if subdomain extract fails', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(mockTenant);

      const req = {
        headers: {
          host: 'carekerala.in',
        },
      };

      const result = await service.resolveFromRequest(req);
      expect(result).toBe(mockTenant);
    });

    it('should return null if request is empty or no host/subdomain', async () => {
      expect(await service.resolveFromRequest(null)).toBeNull();
      expect(await service.resolveFromRequest({ headers: {} })).toBeNull();
    });
  });

  describe('resolveAndValidate', () => {
    it('should return tenant when active', async () => {
      const result = await service.resolveAndValidate('carekerala');
      expect(result).toBe(mockTenant);
    });

    it('should throw NotFoundException when tenant is not found', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.resolveAndValidate('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException when tenant is suspended', async () => {
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockTenant,
        status: TenantStatus.SUSPENDED,
      });

      await expect(service.resolveAndValidate('carekerala')).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('toPublicTenantInfo', () => {
    it('should return public representation without sensitive columns', () => {
      const info = service.toPublicTenantInfo(mockTenant);

      expect(info).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        subdomain: mockTenant.subdomain,
        tenantSlug: mockTenant.tenantSlug,
        customDomain: mockTenant.customDomain,
        status: mockTenant.status,
        phone: mockTenant.phone,
        email: mockTenant.email,
        address: mockTenant.address,
        settings: mockTenant.settings,
        createdAt: mockTenant.createdAt,
      });
    });
  });
});
