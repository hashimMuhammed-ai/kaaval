import { ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UserRole } from '../common/enums/user-role.enum';
import { TenantStatus } from '../common/enums/tenant-status.enum';
import { PaymentMethod, ConfirmationChannel } from './dto/provision-tenant.dto';
import { PasswordHasher } from '../common/utils/password-hasher';

describe('TenantsService — Super Admin Tenant & Owner Provisioning', () => {
  let service: TenantsService;
  let mockDataSource: any;
  let mockTenantRepo: any;
  let mockUserRepo: any;
  let mockInviteTokenRepo: any;
  let mockManager: any;

  beforeEach(() => {
    mockManager = {
      create: jest.fn((entityClass, data) => ({ id: 'mock-uuid-1234', ...data })),
      save: jest.fn(async (entityClass, data) => ({
        id: data.id || 'mock-saved-uuid',
        createdAt: new Date(),
        ...data,
      })),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
    };

    mockTenantRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })),
    };

    mockInviteTokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new TenantsService(
      mockDataSource,
      mockTenantRepo,
      mockUserRepo,
      mockInviteTokenRepo
    );
  });

  const validProvisionDto = {
    name: 'Kochi Home Care',
    subdomain: 'kochicare',
    phone: '+919876543210',
    email: 'contact@kochicare.com',
    address: 'Kochi, Kerala',
    paymentConfirmation: {
      paymentReference: 'GPAY_REF_987654321',
      paymentMethod: PaymentMethod.GPAY,
      confirmedVia: ConfirmationChannel.PHONE_CALL,
      amount: 15000,
      notes: 'Confirmed 1-year agency subscription payment via direct phone call',
    },
    owner: {
      name: 'Mohan Lal',
      email: 'owner@kochicare.com',
      phone: '+919876543211',
    },
  };

  it('should successfully provision a new tenant and owner with payment confirmation', async () => {
    const result = await service.provisionTenant(validProvisionDto, 'super-admin-uuid');

    expect(result.success).toBe(true);
    expect(result.tenant.name).toBe('Kochi Home Care');
    expect(result.tenant.subdomain).toBe('kochicare');
    expect(result.tenant.tenantSlug).toBe('kochicare');
    expect(result.tenant.status).toBe(TenantStatus.ACTIVE);

    expect(result.owner.name).toBe('Mohan Lal');
    expect(result.owner.email).toBe('owner@kochicare.com');
    expect(result.owner.role).toBe(UserRole.OWNER);

    // Initial credentials & invite token
    expect(result.credentials.inviteToken).toBeDefined();
    expect(result.credentials.inviteExpiresAt).toBeDefined();
    expect(result.credentials.temporaryPassword).toBeDefined();
    expect(result.credentials.whatsappOnboardingMessage).toContain('Kochi Home Care');
    expect(result.credentials.whatsappOnboardingMessage).toContain('owner@kochicare.com');

    // Payment confirmation record
    expect(result.paymentConfirmation.paymentReference).toBe('GPAY_REF_987654321');
    expect(result.paymentConfirmation.confirmedVia).toBe(ConfirmationChannel.PHONE_CALL);

    // Check transaction called
    expect(mockDataSource.transaction).toHaveBeenCalled();
  });

  it('should use explicit owner password when provided instead of generating a temporary one', async () => {
    const dtoWithPassword = {
      ...validProvisionDto,
      owner: {
        ...validProvisionDto.owner,
        password: 'CustomSecurePassword123!',
      },
    };

    const result = await service.provisionTenant(dtoWithPassword);

    expect(result.credentials.temporaryPassword).toBeUndefined();

    // Verify password hash was created for the custom password
    const userSaveCall = mockManager.save.mock.calls.find(
      (c: any[]) => c[1]?.role === UserRole.OWNER
    );
    expect(userSaveCall).toBeDefined();
    expect(PasswordHasher.verify('CustomSecurePassword123!', userSaveCall[1].passwordHash)).toBe(true);
  });

  it('should reject provisioning if the tenant subdomain already exists', async () => {
    mockTenantRepo.createQueryBuilder = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'existing-id', subdomain: 'kochicare' }),
    }));

    await expect(service.provisionTenant(validProvisionDto)).rejects.toThrow(ConflictException);
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('should reject provisioning if the custom domain is already taken', async () => {
    const dtoWithCustom = {
      ...validProvisionDto,
      customDomain: 'care.kochicare.com',
    };

    mockTenantRepo.createQueryBuilder = jest.fn()
      // First call for subdomain -> null
      .mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      })
      // Second call for custom domain -> found
      .mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'other-id', customDomain: 'care.kochicare.com' }),
      });

    await expect(service.provisionTenant(dtoWithCustom)).rejects.toThrow(ConflictException);
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });

  it('should reject provisioning if the owner email already exists', async () => {
    mockUserRepo.createQueryBuilder = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ id: 'existing-user', email: 'owner@kochicare.com' }),
    }));

    await expect(service.provisionTenant(validProvisionDto)).rejects.toThrow(ConflictException);
    expect(mockDataSource.transaction).not.toHaveBeenCalled();
  });
});
