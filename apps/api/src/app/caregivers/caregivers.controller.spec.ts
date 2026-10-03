import { Test, TestingModule } from '@nestjs/testing';
import { CaregiversController } from './caregivers.controller';
import { CaregiversService } from './caregivers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('CaregiversController', () => {
  let controller: CaregiversController;
  let service: CaregiversService;

  const mockStaffUser: JwtPayload = {
    userId: 'staff-1',
    sub: 'staff-1',
    email: 'staff@keralacare.com',
    role: UserRole.OFFICE_STAFF,
    tenantId: 'tenant-1',
    name: 'Anjali Menon',
  };

  const mockCaregiversService = {
    createCaregiver: jest.fn().mockResolvedValue({
      success: true,
      message: 'Caregiver created successfully.',
      caregiver: {
        id: 'cg-1',
        fullName: 'Lakshmi Priya',
        temporaryCredentials: {
          username: 'cg_9847111222@keralacare.caregiver.local',
          temporaryPassword: 'Care@XYZ1!',
          portalUrl: 'https://keralacare.app.com/login',
        },
      },
    }),
    getCaregivers: jest.fn().mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    }),
    getCaregiverById: jest.fn().mockResolvedValue({
      id: 'cg-1',
      fullName: 'Lakshmi Priya',
    }),
    getMyCaregiverProfile: jest.fn().mockResolvedValue({
      id: 'cg-1',
      fullName: 'Lakshmi Priya',
      userId: 'caregiver-user-1',
      status: 'available',
    }),
    updateCaregiver: jest.fn().mockResolvedValue({
      id: 'cg-1',
      fullName: 'Lakshmi Priya',
    }),
    regenerateCredentials: jest.fn().mockResolvedValue({
      success: true,
      temporaryCredentials: {
        temporaryPassword: 'Care@NEW!',
      },
    }),
    getStatusCounts: jest.fn().mockResolvedValue({
      available: 5,
      assigned: 3,
      on_leave: 1,
      inactive: 0,
      total: 9,
      occupancyRate: 38,
    }),
    regeocodeCaregiver: jest.fn().mockResolvedValue({
      id: 'cg-1',
      latitude: 9.9816,
      longitude: 76.2999,
    }),
    configureRate: jest.fn().mockResolvedValue({
      id: 'cg-1',
      fullName: 'Lakshmi Priya',
      dailyRate: 1300,
      liveInRate: 2000,
      commissionPercentage: 18,
    }),
    getRateConfiguration: jest.fn().mockResolvedValue({
      caregiverId: 'cg-1',
      fullName: 'Lakshmi Priya',
      dailyRate: 1300,
      commissionPercentage: 18,
      takeHomeEstimateDaily: 1066,
      agencyCommissionDaily: 234,
    }),
    uploadCaregiverDocument: jest.fn().mockResolvedValue({
      id: 'doc-1',
      title: 'Aadhaar Card',
      documentType: 'aadhaar',
      expiryStatus: 'valid',
    }),
    getCaregiverDocuments: jest.fn().mockResolvedValue([
      {
        id: 'doc-1',
        title: 'Aadhaar Card',
        documentType: 'aadhaar',
        expiryStatus: 'valid',
      },
    ]),
    verifyCaregiverDocument: jest.fn().mockResolvedValue({
      id: 'doc-1',
      verified: true,
    }),
    downloadCaregiverDocument: jest.fn().mockResolvedValue({
      stream: { pipe: jest.fn() },
      mimeType: 'application/pdf',
      filename: 'aadhaar.pdf',
      fileSize: 1024,
    }),
    deleteCaregiverDocument: jest.fn().mockResolvedValue({
      success: true,
      message: 'Document deleted.',
    }),
    getCsvTemplate: jest.fn().mockReturnValue('full_name,phone\nSunitha,+919847111222'),
    bulkImportCaregiversFromCsv: jest.fn().mockResolvedValue({
      totalRows: 2,
      importedCount: 2,
      failedCount: 0,
      imported: [{ id: 'cg-1', fullName: 'Sunitha Kumari', phone: '+919847111222' }],
      errors: [],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaregiversController],
      providers: [
        {
          provide: CaregiversService,
          useValue: mockCaregiversService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CaregiversController>(CaregiversController);
    service = module.get<CaregiversService>(CaregiversService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate createCaregiver to service with user tenant context', async () => {
    const dto = {
      fullName: 'Lakshmi Priya',
      phone: '+919847111222',
      skills: ['Elderly Care'],
    };

    const result = await controller.createCaregiver(dto, mockStaffUser);
    expect(service.createCaregiver).toHaveBeenCalledWith(
      dto,
      'tenant-1',
      'staff-1',
      UserRole.OFFICE_STAFF
    );
    expect(result.success).toBe(true);
  });

  it('should delegate getMyProfile to service for logged-in caregiver', async () => {
    const caregiverUser: JwtPayload = {
      userId: 'cg-user-1',
      sub: 'cg-user-1',
      email: 'cg@keralacare.com',
      role: UserRole.CAREGIVER,
      tenantId: 'tenant-1',
      name: 'Lakshmi Priya',
    };

    const res = await controller.getMyProfile(caregiverUser);
    expect(service.getMyCaregiverProfile).toHaveBeenCalledWith(
      'tenant-1',
      'cg-user-1'
    );
    expect(res).toBeDefined();
    expect((res as any).id).toBe('cg-1');
  });

  it('should delegate getCaregivers to service with query params', async () => {
    const query = { page: 1, limit: 10 };
    await controller.getCaregivers(query, mockStaffUser);
    expect(service.getCaregivers).toHaveBeenCalledWith(
      'tenant-1',
      UserRole.OFFICE_STAFF,
      'staff-1',
      query
    );
  });

  it('should delegate getStatusCounts to service', async () => {
    mockCaregiversService.getStatusCounts = jest.fn().mockResolvedValue({
      available: 5,
      assigned: 3,
      on_leave: 1,
      inactive: 0,
      total: 9,
      occupancyRate: 38,
    });

    const res = await controller.getStatusCounts(mockStaffUser);
    expect(mockCaregiversService.getStatusCounts).toHaveBeenCalledWith(
      'tenant-1',
      UserRole.OFFICE_STAFF,
      'staff-1'
    );
    expect(res.available).toBe(5);
  });

  it('should delegate updateStatus to service', async () => {
    await controller.updateStatus('cg-1', 'assigned' as any, mockStaffUser);
    expect(service.updateCaregiver).toHaveBeenCalledWith(
      'cg-1',
      { status: 'assigned' },
      'tenant-1',
      UserRole.OFFICE_STAFF,
      'staff-1'
    );
  });

  it('should delegate geocodeCaregiver to service', async () => {
    const res = await controller.geocodeCaregiver('cg-1', mockStaffUser);
    expect(service.regeocodeCaregiver).toHaveBeenCalledWith(
      'cg-1',
      'tenant-1',
      UserRole.OFFICE_STAFF
    );
    expect(res.latitude).toBe(9.9816);
  });

  describe('Document endpoints', () => {
    const mockFile: any = {
      originalname: 'aadhaar.pdf',
      buffer: Buffer.from('test'),
    };

    it('should delegate uploadDocument to service', async () => {
      const dto = {
        documentType: 'aadhaar',
        title: 'Aadhaar Card',
        expiryDate: '2030-01-01',
      };

      const result = await controller.uploadDocument(
        'cg-1',
        mockFile,
        dto,
        mockStaffUser
      );

      expect(service.uploadCaregiverDocument).toHaveBeenCalledWith(
        'cg-1',
        mockFile,
        dto,
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(result.id).toBe('doc-1');
    });

    it('should delegate getDocuments to service', async () => {
      const docs = await controller.getDocuments('cg-1', mockStaffUser);
      expect(service.getCaregiverDocuments).toHaveBeenCalledWith(
        'cg-1',
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(docs.length).toBe(1);
    });

    it('should delegate verifyDocument to service', async () => {
      const result = await controller.verifyDocument('cg-1', 'doc-1', mockStaffUser);
      expect(service.verifyCaregiverDocument).toHaveBeenCalledWith(
        'cg-1',
        'doc-1',
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(result.verified).toBe(true);
    });

    it('should delegate downloadDocument and stream to response', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
      };
      await controller.downloadDocument('cg-1', 'doc-1', mockStaffUser, mockRes);
      expect(service.downloadCaregiverDocument).toHaveBeenCalledWith(
        'cg-1',
        'doc-1',
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });

    it('should delegate deleteDocument to service', async () => {
      const res = await controller.deleteDocument('cg-1', 'doc-1', mockStaffUser);
      expect(service.deleteCaregiverDocument).toHaveBeenCalledWith(
        'cg-1',
        'doc-1',
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(res.success).toBe(true);
    });
  });

  describe('Bulk Import endpoints', () => {
    it('should delegate downloadBulkImportTemplate to service and stream CSV', async () => {
      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.downloadBulkImportTemplate(mockRes);

      expect(service.getCsvTemplate).toHaveBeenCalled();
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should delegate bulkImport with file upload to service', async () => {
      const mockFile: any = {
        buffer: Buffer.from('full_name,phone\nSunitha,+919847111222'),
      };

      const result = await controller.bulkImport(mockFile, {}, mockStaffUser);

      expect(service.bulkImportCaregiversFromCsv).toHaveBeenCalledWith(
        mockFile.buffer,
        'tenant-1',
        'staff-1',
        UserRole.OFFICE_STAFF
      );
      expect(result.importedCount).toBe(2);
    });

    it('should delegate bulkImport with raw csvContent body to service', async () => {
      const dto = { csvContent: 'full_name,phone\nSunitha,+919847111222' };

      const result = await controller.bulkImport(undefined, dto, mockStaffUser);

      expect(service.bulkImportCaregiversFromCsv).toHaveBeenCalledWith(
        dto.csvContent,
        'tenant-1',
        'staff-1',
        UserRole.OFFICE_STAFF
      );
      expect(result.importedCount).toBe(2);
    });
  });

  describe('Rate Configuration Endpoints (Phase 6)', () => {
    it('should delegate configureRate to service and return success response', async () => {
      const dto = { dailyRate: 1300, liveInRate: 2000, commissionPercentage: 18 };

      const res = await controller.configureRate('cg-1', dto, mockStaffUser);

      expect(service.configureRate).toHaveBeenCalledWith(
        'cg-1',
        'tenant-1',
        dto,
        UserRole.OFFICE_STAFF
      );
      expect(res.success).toBe(true);
      expect(res.data.dailyRate).toBe(1300);
    });

    it('should delegate getRateConfiguration to service', async () => {
      const res = await controller.getRateConfiguration('cg-1', mockStaffUser);

      expect(service.getRateConfiguration).toHaveBeenCalledWith(
        'cg-1',
        'tenant-1',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(res.success).toBe(true);
      expect(res.data.dailyRate).toBe(1300);
      expect(res.data.takeHomeEstimateDaily).toBe(1066);
    });
  });
});

