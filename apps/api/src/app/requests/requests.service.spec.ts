import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestStatus } from '../common/enums/request-status.enum';

describe('RequestsService', () => {
  let service: RequestsService;
  let mockRequestRepo: any;
  let mockTenantRepo: any;
  let mockWhatsappService: any;

  beforeEach(() => {
    mockRequestRepo = {
      create: jest.fn((data) => ({ id: 'new-req-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'saved-req-uuid', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'CareKerala Healthcare',
        subdomain: 'carekerala',
      }),
    };

    mockWhatsappService = {
      notifyAgencyOwnerOnEnquiry: jest.fn().mockResolvedValue({
        success: true,
        referenceId: 'REQ-2026-894102',
        agencyName: 'CareKerala Healthcare',
        targetOwnerPhone: '+919876543210',
        ownerAlert: { success: true, recipient: '919876543210', mode: 'mock' },
        customerAck: { success: true, recipient: '919847012345', mode: 'mock' },
      }),
    };

    service = new RequestsService(
      mockRequestRepo,
      mockTenantRepo,
      mockWhatsappService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRequest', () => {
    it('should create and save a new requests row in the database', async () => {
      const dto = {
        serviceType: 'bedridden_care',
        duration: '24_hours',
        startDate: 'immediate',
        district: 'Ernakulam (Kochi)',
        patientName: 'Mary Varghese',
        patientAge: '78',
        patientCondition: 'Bedridden with hip fracture',
        contactName: 'Dr. Thomas Varghese',
        phone: '+919847012345',
        subdomain: 'carekerala',
      };

      const result = await service.createRequest(dto);

      expect(mockRequestRepo.create).toHaveBeenCalled();
      expect(mockRequestRepo.save).toHaveBeenCalled();
      expect(result.request).toBeDefined();
      expect(result.request.patientName).toBe('Mary Varghese');
      expect(result.request.serviceType).toBe('bedridden_care');
      expect(result.request.status).toBe(RequestStatus.PENDING);
      expect(result.request.tenantId).toBe('tenant-123');
      expect(result.request.referenceId).toMatch(/^REQ-\d{4}-\d+/);

      // Verify WhatsApp alert triggered
      expect(mockWhatsappService.notifyAgencyOwnerOnEnquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          patientName: 'Mary Varghese',
          serviceType: 'bedridden_care',
          district: 'Ernakulam (Kochi)',
          phone: '+919847012345',
        })
      );
      expect(result.whatsappNotification.success).toBe(true);
    });

    it('should throw BadRequestException if tenant cannot be resolved', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createRequest({
          serviceType: 'elderly_care',
          duration: '12_day',
          startDate: 'immediate',
          district: 'Kollam',
          patientName: 'K. Pillai',
          contactName: 'Suresh',
          phone: '+919847000000',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should query requests and compute tab statistics', async () => {
      const mockItems = [
        {
          id: 'req-1',
          referenceId: 'REQ-2026-111111',
          patientName: 'Patient One',
          status: RequestStatus.PENDING,
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
          { status: RequestStatus.PENDING, count: '1' },
          { status: RequestStatus.CONTACTED, count: '0' },
        ]),
      };

      mockRequestRepo.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockStatsQueryBuilder);

      const res = await service.findAll('tenant-123', { status: RequestStatus.PENDING });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
      expect(res.stats.pending).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'req.status = :status',
        { status: RequestStatus.PENDING }
      );
    });
  });

  describe('findOne', () => {
    it('should return request if found', async () => {
      const mockReq = {
        id: 'req-123',
        tenantId: 'tenant-123',
        patientName: 'George Mathew',
      };
      mockRequestRepo.findOne.mockResolvedValue(mockReq);

      const result = await service.findOne('req-123', 'tenant-123');
      expect(result).toEqual(mockReq);
    });

    it('should throw NotFoundException if not found', async () => {
      mockRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStatus', () => {
    it('should update request status and notes', async () => {
      const mockReq = {
        id: 'req-123',
        tenantId: 'tenant-123',
        status: RequestStatus.PENDING,
        notes: 'Initial notes',
      };
      mockRequestRepo.findOne.mockResolvedValue(mockReq);

      const updated = await service.updateStatus('req-123', 'tenant-123', {
        status: RequestStatus.CONTACTED,
        notes: 'Spoke with son, meeting tomorrow at 10 AM',
      });

      expect(updated.status).toBe(RequestStatus.CONTACTED);
      expect(updated.notes).toContain('Spoke with son');
      expect(mockRequestRepo.save).toHaveBeenCalled();
    });
  });
});
