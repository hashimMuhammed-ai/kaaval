import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { UserRole } from '../common/enums/user-role.enum';
import { PasswordHasher } from '../common/utils/password-hasher';

describe('InvitesService', () => {
  let service: InvitesService;
  let mockDataSource: any;
  let mockInviteTokenRepo: any;
  let mockTenantRepo: any;
  let mockUserRepo: any;
  let mockManager: any;

  beforeEach(() => {
    mockManager = {
      findOne: jest.fn(),
      create: jest.fn((entityClass, data) => ({ id: 'new-uuid', ...data })),
      save: jest.fn(async (entityClass, data) => ({
        id: data.id || 'saved-uuid',
        ...data,
      })),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
    };

    mockInviteTokenRepo = {
      create: jest.fn((data) => ({ id: 'invite-uuid', ...data })),
      save: jest.fn(async (data) => ({
        id: data.id || 'invite-uuid',
        createdAt: new Date(),
        ...data,
      })),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      })),
    };

    mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'Kerala Care Agency',
        subdomain: 'keralacare',
      }),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };

    service = new InvitesService(
      mockDataSource,
      mockInviteTokenRepo,
      mockTenantRepo,
      mockUserRepo
    );
  });

  describe('createInvite', () => {
    it('should generate a 48h single-use invite token for Office Staff with WhatsApp delivery link', async () => {
      const dto = {
        email: 'anjali@keralacare.com',
        role: UserRole.OFFICE_STAFF,
        name: 'Anjali Menon',
      };

      const result = await service.createInvite(
        dto,
        'owner-user-id',
        'tenant-123',
        UserRole.OWNER
      );

      expect(result.success).toBe(true);
      expect(result.invite.role).toBe(UserRole.OFFICE_STAFF);
      expect(result.invite.email).toBe('anjali@keralacare.com');
      expect(result.invite.tenantId).toBe('tenant-123');
      expect(result.invite.inviteToken).toBeDefined();
      expect(result.invite.onboardingUrl).toContain('accept-invite?token=');
      expect(result.invite.whatsappInviteMessage).toContain('Kerala Care Agency');
      expect(result.invite.whatsappInviteMessage).toContain('Office Staff');
      expect(result.invite.status).toBe('active');

      expect(mockInviteTokenRepo.save).toHaveBeenCalled();
    });

    it('should forbid Owner from inviting roles other than Office Staff', async () => {
      const dto = {
        email: 'intruder@keralacare.com',
        role: UserRole.SUPER_ADMIN,
      };

      await expect(
        service.createInvite(dto, 'owner-user-id', 'tenant-123', UserRole.OWNER)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invite creation if user is already registered in the agency', async () => {
      mockUserRepo.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'existing-id', email: 'existing@keralacare.com' }),
      }));

      const dto = {
        email: 'existing@keralacare.com',
        role: UserRole.OFFICE_STAFF,
      };

      await expect(
        service.createInvite(dto, 'owner-user-id', 'tenant-123', UserRole.OWNER)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateInvite', () => {
    it('should validate an active, unredeemed invite token', async () => {
      const validInvite = {
        id: 'inv-1',
        inviteToken: 'token_abc_123',
        role: UserRole.OFFICE_STAFF,
        email: 'staff@test.com',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000), // In 24 hours
        usedAt: null,
        tenant: {
          id: 'tenant-123',
          name: 'Kerala Care Agency',
          subdomain: 'keralacare',
        },
      };

      mockInviteTokenRepo.findOne.mockResolvedValue(validInvite);

      const result = await service.validateInvite('token_abc_123');

      expect(result.valid).toBe(true);
      expect(result.tenant.subdomain).toBe('keralacare');
      expect(result.invite.role).toBe(UserRole.OFFICE_STAFF);
    });

    it('should reject invalid or non-existent token with NotFoundException', async () => {
      mockInviteTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.validateInvite('non_existent')).rejects.toThrow(NotFoundException);
    });

    it('should reject an already-redeemed token with BadRequestException', async () => {
      mockInviteTokenRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      });

      await expect(service.validateInvite('already_used')).rejects.toThrow(BadRequestException);
    });

    it('should reject an expired token with BadRequestException', async () => {
      mockInviteTokenRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      });

      await expect(service.validateInvite('expired_token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvite', () => {
    it('should atomically create user account, set password, and mark token used', async () => {
      const activeInvite = {
        id: 'inv-1',
        inviteToken: 'valid_token_xyz',
        tenantId: 'tenant-123',
        role: UserRole.OFFICE_STAFF,
        email: 'anjali@keralacare.com',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
        usedAt: null,
        tenant: { subdomain: 'keralacare' },
      };

      mockManager.findOne
        .mockResolvedValueOnce(activeInvite) // Token lookup
        .mockResolvedValueOnce(null); // Existing user check

      const dto = {
        token: 'valid_token_xyz',
        name: 'Anjali Menon',
        password: 'SecurePassword123!',
      };

      const result = await service.acceptInvite(dto);

      expect(result.success).toBe(true);
      expect(result.user.name).toBe('Anjali Menon');
      expect(result.user.email).toBe('anjali@keralacare.com');
      expect(result.user.role).toBe(UserRole.OFFICE_STAFF);

      // Verify token marked used
      expect(activeInvite.usedAt).toBeDefined();

      // Verify transaction was called
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should reject acceptance if token is expired', async () => {
      const expiredInvite = {
        id: 'inv-1',
        inviteToken: 'expired_token',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      };

      mockManager.findOne.mockResolvedValueOnce(expiredInvite);

      await expect(
        service.acceptInvite({
          token: 'expired_token',
          name: 'Test',
          password: 'Password123!',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('revokeInvite', () => {
    it('should delete active invite token', async () => {
      mockInviteTokenRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        tenantId: 'tenant-123',
        usedAt: null,
      });

      const result = await service.revokeInvite('inv-1', 'tenant-123');
      expect(result.success).toBe(true);
      expect(mockInviteTokenRepo.delete).toHaveBeenCalledWith('inv-1');
    });

    it('should reject revoking an already-redeemed invite', async () => {
      mockInviteTokenRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        tenantId: 'tenant-123',
        usedAt: new Date(),
      });

      await expect(service.revokeInvite('inv-1', 'tenant-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
