import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { RequestStatus } from '../common/enums/request-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockCustomerRepo: any;
  let mockRequestRepo: any;
  let mockCaregiverRepo: any;

  beforeEach(() => {
    mockCustomerRepo = {
      create: jest.fn((data) => ({ id: 'new-cust-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'saved-cust-uuid', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(async () => undefined),
    };

    mockRequestRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (data) => data),
    };

    mockCaregiverRepo = {
      findOne: jest.fn(),
    };

    service = new CustomersService(
      mockCustomerRepo,
      mockRequestRepo,
      mockCaregiverRepo
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new customer linked to an intake request', async () => {
      const mockRequest = {
        id: 'req-123',
        tenantId: 'tenant-123',
        customerId: null,
        assignedCaregiverId: null,
        status: RequestStatus.PENDING,
      };
      mockRequestRepo.findOne.mockResolvedValue(mockRequest);

      const mockSavedCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        requestId: 'req-123',
        referenceId: 'CUST-2026-112233',
        patientName: 'K. R. Menon',
        status: CustomerStatus.ACTIVE,
      };
      mockCustomerRepo.save.mockResolvedValue(mockSavedCustomer);
      mockCustomerRepo.findOne.mockResolvedValue(mockSavedCustomer);

      const dto = {
        requestId: 'req-123',
        patientName: 'K. R. Menon',
        primaryContactName: 'Ramesh Menon',
        phone: '+919847111222',
        district: 'Ernakulam',
        serviceType: 'elderly_care',
        duration: '12_day',
        startDate: 'immediate',
        status: CustomerStatus.ACTIVE,
      };

      const result = await service.create(dto, 'tenant-123');

      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          requestId: 'req-123',
          patientName: 'K. R. Menon',
          status: CustomerStatus.ACTIVE,
        })
      );
      expect(mockCustomerRepo.save).toHaveBeenCalled();
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'req-123',
          customerId: 'cust-123',
        })
      );
      expect(result.id).toBe('cust-123');
    });

    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.create(
          {
            patientName: 'Test Patient',
            primaryContactName: 'Test Contact',
            phone: '1234567890',
            district: 'Ernakulam',
            serviceType: 'elderly_care',
            duration: '12_day',
            startDate: 'immediate',
          },
          ''
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if linked request is not found in tenant', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            requestId: 'nonexistent-req',
            patientName: 'Test Patient',
            primaryContactName: 'Test Contact',
            phone: '1234567890',
            district: 'Ernakulam',
            serviceType: 'elderly_care',
            duration: '12_day',
            startDate: 'immediate',
          },
          'tenant-123'
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createFromRequest', () => {
    it('should convert an intake request into a customer and establish bidirectional links', async () => {
      const mockRequest = {
        id: 'req-999',
        tenantId: 'tenant-123',
        referenceId: 'REQ-2026-999999',
        patientName: 'Lakshmi Amma',
        patientAge: '82',
        patientGender: 'female',
        patientCondition: 'Mild dementia, requires constant assistance',
        mobilityStatus: 'wheelchair',
        medicalEquipment: 'walker',
        contactName: 'Anil Kumar',
        relationship: 'son_daughter',
        phone: '+919847333444',
        isWhatsapp: true,
        address: '12/45 Green Valley',
        locality: 'Kaloor',
        district: 'Ernakulam',
        pincode: '682017',
        serviceType: 'dementia_care',
        duration: '24_hours',
        engagementPeriod: 'ongoing',
        genderPreference: 'female',
        startDate: 'immediate',
        assignedCaregiverId: 'cg-100',
        notes: 'Family requested experienced caregiver',
        customerId: null,
      };

      mockRequestRepo.findOne.mockResolvedValue(mockRequest);
      mockCustomerRepo.findOne
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValueOnce({
          id: 'cust-999',
          tenantId: 'tenant-123',
          requestId: 'req-999',
          referenceId: 'CUST-2026-888888',
          patientName: 'Lakshmi Amma',
          assignedCaregiverId: 'cg-100',
          status: CustomerStatus.ACTIVE,
        });

      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-100',
        tenantId: 'tenant-123',
        fullName: 'Sr. Mary Kurian',
      });

      const customer = await service.createFromRequest('req-999', 'tenant-123', {
        status: CustomerStatus.ACTIVE,
      });

      expect(mockCustomerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          requestId: 'req-999',
          patientName: 'Lakshmi Amma',
          patientAge: '82',
          patientGender: 'female',
          primaryContactName: 'Anil Kumar',
          phone: '+919847333444',
          district: 'Ernakulam',
          serviceType: 'dementia_care',
          duration: '24_hours',
          assignedCaregiverId: 'cg-100',
          status: CustomerStatus.ACTIVE,
        })
      );

      // Verify request is updated with customerId and status ASSIGNED
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'req-999',
          customerId: 'new-cust-uuid',
          status: RequestStatus.ASSIGNED,
        })
      );

      expect(customer).toBeDefined();
    });

    it('should return existing customer if request is already converted', async () => {
      const existingCustomer = {
        id: 'cust-already-exists',
        tenantId: 'tenant-123',
        requestId: 'req-111',
      };

      mockRequestRepo.findOne.mockResolvedValue({ id: 'req-111', tenantId: 'tenant-123' });
      mockCustomerRepo.findOne
        .mockResolvedValueOnce(existingCustomer) // existing check
        .mockResolvedValueOnce(existingCustomer); // findOne fetch

      const result = await service.createFromRequest('req-111', 'tenant-123');
      expect(result.id).toBe('cust-already-exists');
      expect(mockCustomerRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should list customers with status filter (Active / Pending) and stats', async () => {
      const mockItems = [
        {
          id: 'cust-1',
          referenceId: 'CUST-2026-000001',
          patientName: 'George Joseph',
          status: CustomerStatus.ACTIVE,
          district: 'Ernakulam',
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, 1]),
      };

      const mockStatsQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: CustomerStatus.ACTIVE, count: '1' },
          { status: CustomerStatus.PENDING, count: '2' },
        ]),
      };

      mockCustomerRepo.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockStatsQueryBuilder);

      const res = await service.findAll('tenant-123', {
        status: CustomerStatus.ACTIVE,
      });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.stats.active).toBe(1);
      expect(res.stats.pending).toBe(2);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cust.status = :status',
        { status: CustomerStatus.ACTIVE }
      );
    });

    it('should restrict Caregivers to only their assigned customers', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-assigned-uuid',
        userId: 'user-caregiver-1',
      });

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      const mockStatsQueryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockCustomerRepo.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockStatsQueryBuilder);

      await service.findAll('tenant-123', {}, UserRole.CAREGIVER, 'user-caregiver-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cust.assigned_caregiver_id = :cgId',
        { cgId: 'cg-assigned-uuid' }
      );
    });
  });

  describe('findOne', () => {
    it('should return customer when found', async () => {
      const mockCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        patientName: 'Devaki Amma',
        assignedCaregiverId: 'cg-10',
      };
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findOne('cust-123', 'tenant-123');
      expect(result).toEqual(mockCustomer);
    });

    it('should throw NotFoundException if customer does not exist', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if caregiver tries to view unassigned customer', async () => {
      const mockCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        assignedCaregiverId: 'cg-other',
      };
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-me',
        userId: 'caregiver-user-1',
      });

      await expect(
        service.findOne('cust-123', 'tenant-123', UserRole.CAREGIVER, 'caregiver-user-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update customer record and sync assigned caregiver to request', async () => {
      const existingCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        requestId: 'req-123',
        patientName: 'Old Name',
        assignedCaregiverId: null,
      };
      mockCustomerRepo.findOne.mockResolvedValue(existingCustomer);
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-55', tenantId: 'tenant-123' });
      mockRequestRepo.findOne.mockResolvedValue({
        id: 'req-123',
        tenantId: 'tenant-123',
        assignedCaregiverId: null,
        status: RequestStatus.MATCHED,
      });

      await service.update('cust-123', 'tenant-123', {
        patientName: 'Updated Name',
        assignedCaregiverId: 'cg-55',
        status: CustomerStatus.ACTIVE,
      });

      expect(mockCustomerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'cust-123',
          patientName: 'Updated Name',
          assignedCaregiverId: 'cg-55',
          status: CustomerStatus.ACTIVE,
        })
      );
      expect(mockRequestRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'req-123',
          assignedCaregiverId: 'cg-55',
          status: RequestStatus.ASSIGNED,
        })
      );
    });
  });
});
