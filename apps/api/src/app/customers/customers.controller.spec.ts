import { CustomersController } from './customers.controller';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('CustomersController', () => {
  let controller: CustomersController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      createFromRequest: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new CustomersController(mockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and user tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const dto: any = {
        patientName: 'K. V. Raman',
        primaryContactName: 'Geetha',
        phone: '9847123456',
        district: 'Ernakulam',
        serviceType: 'elderly_care',
        duration: '12_day',
        startDate: 'immediate',
      };
      const createdCustomer = { id: 'cust-1', ...dto, tenantId: 'tenant-123' };
      mockService.create.mockResolvedValue(createdCustomer);

      const result = await controller.create(dto, mockUser);
      expect(mockService.create).toHaveBeenCalledWith(dto, 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdCustomer);
    });
  });

  describe('createFromRequest', () => {
    it('should call service.createFromRequest with requestId and user tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const dto = { status: CustomerStatus.ACTIVE };
      const convertedCustomer = { id: 'cust-converted', requestId: 'req-1', status: CustomerStatus.ACTIVE };
      mockService.createFromRequest.mockResolvedValue(convertedCustomer);

      const result = await controller.createFromRequest('req-1', dto, mockUser);
      expect(mockService.createFromRequest).toHaveBeenCalledWith('req-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(convertedCustomer);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query params and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const query = { status: CustomerStatus.ACTIVE, page: 1, limit: 10 };
      const mockResult = {
        items: [{ id: 'cust-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        stats: { total: 1, active: 1, pending: 0, paused: 0, inactive: 0, discharged: 0 },
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, query);
      expect(mockService.findAll).toHaveBeenCalledWith('tenant-123', query, UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.items);
      expect(result.meta.stats.active).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockCustomer = { id: 'cust-1', patientName: 'Patient One' };
      mockService.findOne.mockResolvedValue(mockCustomer);

      const result = await controller.findOne('cust-1', mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith('cust-1', 'tenant-123', UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomer);
    });
  });

  describe('update', () => {
    it('should call service.update with id, tenantId, and dto', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const dto = { status: CustomerStatus.ACTIVE };
      const updated = { id: 'cust-1', status: CustomerStatus.ACTIVE };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('cust-1', dto, mockUser);
      expect(mockService.update).toHaveBeenCalledWith('cust-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('cust-1', mockUser);
      expect(mockService.remove).toHaveBeenCalledWith('cust-1', 'tenant-123');
      expect(result.success).toBe(true);
    });
  });
});
