import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { PaymentMethod, ConfirmationChannel } from './dto/provision-tenant.dto';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: TenantsService;

  const mockTenantsService = {
    provisionTenant: jest.fn(),
    findAllTenants: jest.fn(),
    getTenantById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
      ],
    })
      .overrideGuard(SuperAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TenantsController>(TenantsController);
    service = module.get<TenantsService>(TenantsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate provisionTenant to TenantsService with user id', async () => {
    const dto = {
      name: 'Malabar Care',
      subdomain: 'malabarcare',
      paymentConfirmation: {
        paymentReference: 'GPAY_REF_111',
        paymentMethod: PaymentMethod.GPAY,
        confirmedVia: ConfirmationChannel.PHONE_CALL,
      },
      owner: {
        name: 'Suhail K',
        email: 'suhail@malabarcare.com',
      },
    };

    const mockResponse: any = {
      success: true,
      tenant: { id: 'tenant-1', name: 'Malabar Care' },
    };

    mockTenantsService.provisionTenant.mockResolvedValue(mockResponse);

    const req = { user: { id: 'super-admin-id' } };
    const result = await controller.provisionTenant(dto as any, req);

    expect(result).toBe(mockResponse);
    expect(mockTenantsService.provisionTenant).toHaveBeenCalledWith(dto, 'super-admin-id');
  });

  it('should delegate getAllTenants to TenantsService', async () => {
    mockTenantsService.findAllTenants.mockResolvedValue([{ id: 'tenant-1' }]);
    const result = await controller.getAllTenants();
    expect(result).toEqual([{ id: 'tenant-1' }]);
    expect(mockTenantsService.findAllTenants).toHaveBeenCalled();
  });

  it('should delegate getTenantById to TenantsService', async () => {
    mockTenantsService.getTenantById.mockResolvedValue({ id: 'tenant-1' });
    const result = await controller.getTenantById('tenant-1');
    expect(result).toEqual({ id: 'tenant-1' });
    expect(mockTenantsService.getTenantById).toHaveBeenCalledWith('tenant-1');
  });
});
