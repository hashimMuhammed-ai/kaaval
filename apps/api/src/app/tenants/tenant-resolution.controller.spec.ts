import { NotFoundException } from '@nestjs/common';
import { TenantResolutionController } from './tenant-resolution.controller';
import { TenantStatus } from '../common/enums/tenant-status.enum';

describe('TenantResolutionController', () => {
  let controller: TenantResolutionController;
  let mockTenantResolver: any;

  const mockPublicTenantInfo = {
    id: 'ten-123',
    name: 'Care Kerala Agency',
    subdomain: 'carekerala',
    customDomain: null,
    status: TenantStatus.ACTIVE,
    phone: '+91 9876543210',
    email: 'info@carekerala.com',
    address: 'Kochi, Kerala',
    settings: { currency: 'INR' },
    createdAt: new Date(),
  };

  beforeEach(() => {
    mockTenantResolver = {
      resolveBySubdomain: jest.fn().mockResolvedValue({ id: 'ten-123' }),
      resolveFromRequest: jest.fn().mockResolvedValue({ id: 'ten-123' }),
      resolveAndValidate: jest.fn().mockResolvedValue({ id: 'ten-123' }),
      toPublicTenantInfo: jest.fn().mockReturnValue(mockPublicTenantInfo),
    };

    controller = new TenantResolutionController(mockTenantResolver);
  });

  describe('resolveTenant', () => {
    it('should resolve tenant via query parameter if provided', async () => {
      const result = await controller.resolveTenant({}, 'carekerala');

      expect(mockTenantResolver.resolveBySubdomain).toHaveBeenCalledWith('carekerala');
      expect(mockTenantResolver.toPublicTenantInfo).toHaveBeenCalled();
      expect(result).toBe(mockPublicTenantInfo);
    });

    it('should resolve tenant via request host if query parameter is omitted', async () => {
      const mockReq = { headers: { host: 'carekerala.caregiverplatform.com' } };
      const result = await controller.resolveTenant(mockReq);

      expect(mockTenantResolver.resolveFromRequest).toHaveBeenCalledWith(mockReq);
      expect(result).toBe(mockPublicTenantInfo);
    });

    it('should throw NotFoundException when no tenant can be resolved', async () => {
      mockTenantResolver.resolveFromRequest.mockResolvedValue(null);

      await expect(controller.resolveTenant({})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBySubdomain', () => {
    it('should return validated public tenant details by subdomain path param', async () => {
      const result = await controller.getBySubdomain('carekerala');

      expect(mockTenantResolver.resolveAndValidate).toHaveBeenCalledWith('carekerala');
      expect(result).toBe(mockPublicTenantInfo);
    });
  });
});
