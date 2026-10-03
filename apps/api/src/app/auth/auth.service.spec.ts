import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { PasswordHasher } from '../common/utils/password-hasher';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockTenantRepo: any;
  let mockJwtService: any;
  let mockConfigService: any;

  const validPassword = 'SecurePassword123!';
  const passwordHash = PasswordHasher.hash(validPassword);

  beforeEach(() => {
    mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTenantRepo = {
      findOne: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mocked-signed-jwt-token'),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'JWT_EXPIRES_IN') return '1d';
        return defaultVal;
      }),
    };

    service = new AuthService(
      mockUserRepo,
      mockTenantRepo,
      mockJwtService,
      mockConfigService
    );
  });

  describe('login - Platform Super Admin', () => {
    it('should authenticate Super Admin and sign JWT with null tenantId and super_admin role', async () => {
      const superAdminUser = {
        id: 'super-admin-uuid',
        name: 'Platform Super Admin',
        email: 'admin@platform.com',
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        tenantId: null,
        isActive: true,
      };

      mockUserRepo.find.mockResolvedValue([superAdminUser]);

      const result = await service.login({
        email: 'admin@platform.com',
        password: validPassword,
      });

      expect(result.accessToken).toBe('mocked-signed-jwt-token');
      expect(result.user.role).toBe(UserRole.SUPER_ADMIN);
      expect(result.user.tenantId).toBeNull();
      expect(result.tenant).toBeNull();

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'super-admin-uuid',
        userId: 'super-admin-uuid',
        email: 'admin@platform.com',
        tenantId: null,
        role: UserRole.SUPER_ADMIN,
        name: 'Platform Super Admin',
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith('super-admin-uuid', expect.any(Object));
    });
  });

  describe('login - Tenant Scoped Users (Owner, Office Staff, Caregiver)', () => {
    it('should authenticate Owner and sign JWT with tenantId and owner role', async () => {
      const tenant = {
        id: 'tenant-kerala-uuid',
        name: 'Kerala Care Agency',
        subdomain: 'keralacare',
        status: TenantStatus.ACTIVE,
      };

      const ownerUser = {
        id: 'owner-uuid',
        name: 'Rahul Nair',
        email: 'owner@keralacare.com',
        passwordHash,
        role: UserRole.OWNER,
        tenantId: 'tenant-kerala-uuid',
        tenant,
        isActive: true,
      };

      mockTenantRepo.findOne.mockResolvedValue(tenant);
      mockUserRepo.findOne.mockResolvedValue(ownerUser);

      const result = await service.login({
        email: 'owner@keralacare.com',
        password: validPassword,
        subdomain: 'keralacare',
      });

      expect(result.accessToken).toBe('mocked-signed-jwt-token');
      expect(result.user.role).toBe(UserRole.OWNER);
      expect(result.user.tenantId).toBe('tenant-kerala-uuid');
      expect(result.tenant).toEqual({
        id: 'tenant-kerala-uuid',
        name: 'Kerala Care Agency',
        subdomain: 'keralacare',
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: 'owner-uuid',
        userId: 'owner-uuid',
        email: 'owner@keralacare.com',
        tenantId: 'tenant-kerala-uuid',
        role: UserRole.OWNER,
        name: 'Rahul Nair',
      });
    });

    it('should reject login if password does not match', async () => {
      const user = {
        id: 'user-uuid',
        email: 'user@agency.com',
        passwordHash,
        isActive: true,
      };

      mockUserRepo.find.mockResolvedValue([user]);

      await expect(
        service.login({
          email: 'user@agency.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if user account is deactivated', async () => {
      const deactivatedUser = {
        id: 'user-uuid',
        email: 'user@agency.com',
        passwordHash,
        isActive: false,
      };

      mockUserRepo.find.mockResolvedValue([deactivatedUser]);

      await expect(
        service.login({
          email: 'user@agency.com',
          password: validPassword,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject login if agency tenant is suspended', async () => {
      const suspendedTenant = {
        id: 'tenant-uuid',
        name: 'Suspended Care',
        subdomain: 'suspendedcare',
        status: TenantStatus.SUSPENDED,
      };

      mockTenantRepo.findOne.mockResolvedValue(suspendedTenant);

      await expect(
        service.login({
          email: 'staff@suspendedcare.com',
          password: validPassword,
          subdomain: 'suspendedcare',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with tenant info', async () => {
      const user = {
        id: 'user-1',
        name: 'Anjali Menon',
        email: 'staff@keralacare.com',
        role: UserRole.OFFICE_STAFF,
        tenantId: 'ten-1',
        isActive: true,
        tenant: {
          id: 'ten-1',
          name: 'Kerala Care',
          subdomain: 'keralacare',
          status: TenantStatus.ACTIVE,
        },
      };

      mockUserRepo.findOne.mockResolvedValue(user);

      const profile = await service.getProfile('user-1');
      expect(profile.id).toBe('user-1');
      expect(profile.role).toBe(UserRole.OFFICE_STAFF);
      expect(profile.tenant?.subdomain).toBe('keralacare');
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
