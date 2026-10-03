import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CaregiversService } from './caregivers.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';

describe('CaregiversService', () => {
  let service: CaregiversService;
  let mockDataSource: any;
  let mockCaregiverRepo: any;
  let mockDocumentRepo: any;
  let mockUserRepo: any;
  let mockTenantRepo: any;
  let mockStorageService: any;
  let mockGeocodingService: any;
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

    mockCaregiverRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (data) => ({ id: 'caregiver-uuid', ...data })),
      createQueryBuilder: jest.fn(),
    };

    mockDocumentRepo = {
      create: jest.fn((data) => ({ id: 'doc-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'doc-uuid', ...data })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (data) => ({ id: 'user-uuid', ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'Kerala Home Care',
        subdomain: 'keralahomecare',
      }),
    };

    mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue({
        fileUrl: '/api/caregivers/cg-123/documents/doc-uuid/download',
        fileKey: 'tenants/tenant-123/caregivers/cg-123/aadhaar/123-aadhaar.pdf',
        mimeType: 'application/pdf',
        fileSize: 10240,
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getFileStream: jest.fn().mockResolvedValue({
        stream: {},
        mimeType: 'application/pdf',
        fileSize: 10240,
        filename: 'aadhaar.pdf',
      }),
      resolveFileUrl: jest.fn(
        (key, cgId, docId) => `/api/caregivers/${cgId}/documents/${docId}/download`
      ),
    };

    mockGeocodingService = {
      geocode: jest.fn(async (q) => {
        if (q.district === 'Ernakulam' || q.city === 'Kochi' || q.city === 'Kakkanad') {
          return {
            latitude: 9.9816,
            longitude: 76.2999,
            provider: 'kerala_database',
            district: 'Ernakulam',
          };
        }
        if (q.district === 'Thrissur') {
          return {
            latitude: 10.5276,
            longitude: 76.2144,
            provider: 'kerala_database',
            district: 'Thrissur',
          };
        }
        return null;
      }),
      reverseGeocode: jest.fn(),
      calculateDistanceKm: jest.fn(),
    };

    service = new CaregiversService(
      mockDataSource,
      mockCaregiverRepo,
      mockDocumentRepo,
      mockUserRepo,
      mockTenantRepo,
      mockStorageService,
      mockGeocodingService
    );
  });

  describe('createCaregiver (Combined Profile + Portal Account)', () => {
    const validDto = {
      fullName: 'Sunitha Kumari',
      phone: '+919847123456',
      email: 'sunitha@example.com',
      gender: 'female',
      district: 'Ernakulam',
      skills: ['Elderly Care', 'Bedridden Care'],
      experienceYears: 4.5,
      dailyRate: 1200,
      emergencyContactName: 'Ramesh',
      emergencyContactPhone: '+919847654321',
    };

    it('should successfully create Caregiver profile and User account in a single atomic transaction', async () => {
      const result = await service.createCaregiver(
        validDto,
        'tenant-123',
        'staff-user-id',
        UserRole.OFFICE_STAFF
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockManager.create).toHaveBeenCalledTimes(2); // User and Caregiver
      expect(mockManager.save).toHaveBeenCalledTimes(2);

      expect(result.success).toBe(true);
      expect(result.caregiver.fullName).toBe('Sunitha Kumari');
      expect(result.caregiver.skills).toContain('Elderly Care');
      expect(result.caregiver.temporaryCredentials).toBeDefined();
      expect(result.caregiver.temporaryCredentials?.portalUrl).toContain('keralahomecare');
      expect(result.caregiver.temporaryCredentials?.temporaryPassword).toBeDefined();
      expect(result.caregiver.temporaryCredentials?.accessCode).toBeDefined();
      expect(result.caregiver.temporaryCredentials?.whatsappOnboardingMessage).toContain('Sunitha Kumari');
      expect(result.caregiver.temporaryCredentials?.whatsappOnboardingMessage).toContain('Portal Link:');
    });

    it('should generate a login username if email is not provided', async () => {
      const dtoWithoutEmail = {
        fullName: 'Biju George',
        phone: '+919876500000',
        district: 'Kottayam',
      };

      const result = await service.createCaregiver(
        dtoWithoutEmail,
        'tenant-123',
        'staff-user-id',
        UserRole.OFFICE_STAFF
      );

      expect(result.success).toBe(true);
      expect(result.caregiver.temporaryCredentials?.username).toContain('919876500000');
      expect(result.caregiver.temporaryCredentials?.username).toContain('keralahomecare');
    });

    it('should reject caregiver account creation if caller is CAREGIVER role', async () => {
      await expect(
        service.createCaregiver(
          validDto,
          'tenant-123',
          'caregiver-id',
          UserRole.CAREGIVER
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject creation if email or portal username already exists in tenant', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'existing-user-id' });

      await expect(
        service.createCaregiver(
          validDto,
          'tenant-123',
          'staff-user-id',
          UserRole.OFFICE_STAFF
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should reject creation if phone number already exists in tenant', async () => {
      mockCaregiverRepo.findOne.mockResolvedValueOnce({ id: 'existing-cg-id' });

      await expect(
        service.createCaregiver(
          validDto,
          'tenant-123',
          'staff-user-id',
          UserRole.OFFICE_STAFF
        )
      ).rejects.toThrow(ConflictException);
    });

    it('should persist initial documents when provided', async () => {
      const dtoWithDocs = {
        ...validDto,
        initialDocuments: [
          {
            documentType: 'nursing_certificate',
            title: 'ANM Nursing Diploma',
            fileUrl: 'https://storage.agency.com/docs/anm.pdf',
            expiryDate: '2030-12-31',
          },
        ],
      };

      const result = await service.createCaregiver(
        dtoWithDocs,
        'tenant-123',
        'staff-user-id',
        UserRole.OFFICE_STAFF
      );

      expect(result.success).toBe(true);
      expect(mockManager.create).toHaveBeenCalledTimes(3); // User, Caregiver, CaregiverDocument
    });

    it('should geocode address when coordinates are omitted on create', async () => {
      const dtoWithoutCoords = {
        fullName: 'Deepa Varghese',
        phone: '+919847999888',
        district: 'Ernakulam',
        city: 'Kakkanad',
        address: 'Near Infopark',
      };

      const result = await service.createCaregiver(
        dtoWithoutCoords,
        'tenant-123',
        'staff-1',
        UserRole.OFFICE_STAFF
      );

      expect(mockGeocodingService.geocode).toHaveBeenCalledWith(
        expect.objectContaining({
          district: 'Ernakulam',
          city: 'Kakkanad',
          address: 'Near Infopark',
        })
      );
      expect(result.caregiver.latitude).toBe(9.9816);
      expect(result.caregiver.longitude).toBe(76.2999);
    });

    it('should preserve explicit latitude and longitude without calling geocoder', async () => {
      const dtoWithCoords = {
        fullName: 'Anoop Kumar',
        phone: '+919847111333',
        district: 'Ernakulam',
        latitude: 10.1234,
        longitude: 76.4321,
      };

      const result = await service.createCaregiver(
        dtoWithCoords,
        'tenant-123',
        'staff-1',
        UserRole.OFFICE_STAFF
      );

      expect(result.caregiver.latitude).toBe(10.1234);
      expect(result.caregiver.longitude).toBe(76.4321);
    });
  });

  describe('getCaregivers & Isolation', () => {
    it('should apply strict self-view isolation for CAREGIVER role', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'cg-1',
              tenantId: 'tenant-123',
              userId: 'caregiver-user-id',
              fullName: 'Sunitha Kumari',
              phone: '+919847123456',
              skills: ['Elderly Care'],
              experienceYears: 4,
              status: CaregiverStatus.AVAILABLE,
              dailyRate: 1200,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          1,
        ]),
      };

      mockCaregiverRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const res = await service.getCaregivers(
        'tenant-123',
        UserRole.CAREGIVER,
        'caregiver-user-id',
        {}
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'caregiver.user_id = :userId',
        { userId: 'caregiver-user-id' }
      );
      expect(res.data.length).toBe(1);
    });
  });

  describe('getCaregiverById', () => {
    it('should prevent a Caregiver from viewing another Caregiver profile', async () => {
      mockCaregiverRepo.findOne.mockResolvedValueOnce({
        id: 'cg-other',
        tenantId: 'tenant-123',
        userId: 'other-user-id',
        fullName: 'Other Person',
      });

      await expect(
        service.getCaregiverById(
          'cg-other',
          'tenant-123',
          UserRole.CAREGIVER,
          'my-user-id'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('regenerateCredentials', () => {
    it('should generate new credentials and WhatsApp template', async () => {
      mockCaregiverRepo.findOne.mockResolvedValueOnce({
        id: 'cg-1',
        tenantId: 'tenant-123',
        userId: 'cg-user-id',
        fullName: 'Sunitha Kumari',
        user: { email: 'sunitha@keralahomecare.local' },
      });

      const res = await service.regenerateCredentials(
        'cg-1',
        'tenant-123',
        UserRole.OFFICE_STAFF
      );

      expect(res.success).toBe(true);
      expect(res.temporaryCredentials.temporaryPassword).toBeDefined();
      expect(res.temporaryCredentials.whatsappOnboardingMessage).toContain('Sunitha Kumari');
      expect(mockUserRepo.update).toHaveBeenCalled();
    });
  });

  describe('getStatusCounts', () => {
    it('should aggregate caregiver counts across operational statuses and compute occupancy', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: CaregiverStatus.AVAILABLE, count: '10' },
          { status: CaregiverStatus.ASSIGNED, count: '6' },
          { status: CaregiverStatus.ON_LEAVE, count: '2' },
          { status: CaregiverStatus.INACTIVE, count: '1' },
        ]),
      };

      mockCaregiverRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const counts = await service.getStatusCounts(
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );

      expect(counts.available).toBe(10);
      expect(counts.assigned).toBe(6);
      expect(counts.on_leave).toBe(2);
      expect(counts.inactive).toBe(1);
      expect(counts.total).toBe(19);
      // activePool = 10 + 6 = 16. occupancy = (6 / 16) * 100 = 38%
      expect(counts.occupancyRate).toBe(38);
    });
  });

  describe('getMyCaregiverProfile (Caregiver Self-View Portal)', () => {
    it('should return caregiver profile with documents for the authenticated user', async () => {
      const mockCaregiver = {
        id: 'cg-me-1',
        tenantId: 'tenant-123',
        userId: 'cg-user-me',
        fullName: 'Deepa Varghese',
        phone: '+919847000111',
        status: CaregiverStatus.AVAILABLE,
        skills: ['Palliative Care', 'Elderly Care'],
        city: 'Kochi',
        district: 'Ernakulam',
        documents: [],
      };

      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      const res = await service.getMyCaregiverProfile('tenant-123', 'cg-user-me');

      expect(mockCaregiverRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'cg-user-me', tenantId: 'tenant-123' },
        relations: ['documents'],
      });
      expect(res.id).toBe('cg-me-1');
      expect(res.fullName).toBe('Deepa Varghese');
    });

    it('should throw NotFoundException if caregiver profile does not exist for the user', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getMyCaregiverProfile('tenant-123', 'unknown-user')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Document Management & Storage', () => {
    const mockFile: any = {
      originalname: 'aadhaar_card.pdf',
      mimetype: 'application/pdf',
      size: 50000,
      buffer: Buffer.from('fake pdf content'),
    };

    const mockCaregiver = {
      id: 'cg-123',
      tenantId: 'tenant-123',
      userId: 'caregiver-user-id',
      fullName: 'Sunitha Kumari',
    };

    it('should successfully upload a document and save record to database', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      const result = await service.uploadCaregiverDocument(
        'cg-123',
        mockFile,
        {
          documentType: 'aadhaar',
          title: 'Aadhaar Card Front and Back',
          expiryDate: '2028-12-31',
        },
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-user-id'
      );

      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockDocumentRepo.create).toHaveBeenCalled();
      expect(mockDocumentRepo.save).toHaveBeenCalled();
      expect(result.title).toBe('Aadhaar Card Front and Back');
      expect(result.documentType).toBe('aadhaar');
      expect(result.expiryStatus).toBe('valid');
      expect(result.verified).toBe(false);
    });

    it('should reject file upload when size exceeds 10MB', async () => {
      const largeFile: any = {
        ...mockFile,
        size: 11 * 1024 * 1024,
      };

      await expect(
        service.uploadCaregiverDocument(
          'cg-123',
          largeFile,
          { documentType: 'aadhaar', title: 'Large' },
          'tenant-123',
          UserRole.OFFICE_STAFF,
          'staff-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid MIME types (e.g. text/exe or text/plain)', async () => {
      const invalidMimeFile: any = {
        ...mockFile,
        mimetype: 'text/plain',
      };

      await expect(
        service.uploadCaregiverDocument(
          'cg-123',
          invalidMimeFile,
          { documentType: 'aadhaar', title: 'Invalid' },
          'tenant-123',
          UserRole.OFFICE_STAFF,
          'staff-1'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent a Caregiver role from uploading documents for another caregiver profile', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      await expect(
        service.uploadCaregiverDocument(
          'cg-123',
          mockFile,
          { documentType: 'aadhaar', title: 'My Aadhaar' },
          'tenant-123',
          UserRole.CAREGIVER,
          'other-caregiver-user-id' // different user id
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list all documents for a caregiver with computed expiry indicators', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);
      mockDocumentRepo.find.mockResolvedValue([
        {
          id: 'doc-1',
          tenantId: 'tenant-123',
          caregiverId: 'cg-123',
          documentType: 'nursing_certificate',
          title: 'Kerala Nursing Council',
          fileUrl: '/download/1',
          fileKey: 'key-1',
          mimeType: 'application/pdf',
          fileSize: 1024,
          expiryDate: new Date('2024-01-01'), // Past date -> expired
          verified: true,
          verifiedBy: 'staff-1',
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const docs = await service.getCaregiverDocuments(
        'cg-123',
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );

      expect(docs.length).toBe(1);
      expect(docs[0].documentType).toBe('nursing_certificate');
      expect(docs[0].expiryStatus).toBe('expired');
      expect(docs[0].verified).toBe(true);
    });

    it('should allow office staff to verify an uploaded document', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);
      const existingDoc = {
        id: 'doc-1',
        caregiverId: 'cg-123',
        tenantId: 'tenant-123',
        title: 'ID Proof',
        documentType: 'aadhaar',
        verified: false,
      };
      mockDocumentRepo.findOne.mockResolvedValue(existingDoc);

      const verified = await service.verifyCaregiverDocument(
        'cg-123',
        'doc-1',
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-verifier-id'
      );

      expect(verified.verified).toBe(true);
      expect(verified.verifiedBy).toBe('staff-verifier-id');
    });

    it('should prevent caregiver role from verifying documents', async () => {
      await expect(
        service.verifyCaregiverDocument(
          'cg-123',
          'doc-1',
          'tenant-123',
          UserRole.CAREGIVER,
          'caregiver-user-id'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow deleting document and clean up object storage', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        caregiverId: 'cg-123',
        tenantId: 'tenant-123',
        title: 'Draft Doc',
        fileKey: 'storage-key-123',
        verified: false,
      });

      const res = await service.deleteCaregiverDocument(
        'cg-123',
        'doc-1',
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );

      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('storage-key-123');
      expect(mockDocumentRepo.delete).toHaveBeenCalledWith('doc-1');
      expect(res.success).toBe(true);
    });

    it('should prevent caregiver from deleting already verified documents', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);
      mockDocumentRepo.findOne.mockResolvedValue({
        id: 'doc-1',
        caregiverId: 'cg-123',
        tenantId: 'tenant-123',
        title: 'Verified Certificate',
        fileKey: 'storage-key-123',
        verified: true, // already verified!
      });

      await expect(
        service.deleteCaregiverDocument(
          'cg-123',
          'doc-1',
          'tenant-123',
          UserRole.CAREGIVER,
          'caregiver-user-id'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Bulk Import from CSV', () => {
    it('should successfully bulk import multiple valid caregivers and generate portal credentials', async () => {
      const csv = [
        'full_name,phone,district,skills,daily_rate',
        'Sunitha Kumari,+919847111222,Ernakulam,"Elderly Care",1200',
        'Rajesh Kumar,+919847333444,Thrissur,"Bedridden Care",1300',
      ].join('\n');

      const result = await service.bulkImportCaregiversFromCsv(
        csv,
        'tenant-123',
        'staff-1',
        UserRole.OFFICE_STAFF
      );

      expect(result.totalRows).toBe(2);
      expect(result.importedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.imported[0].fullName).toBe('Sunitha Kumari');
      expect(result.imported[0].temporaryCredentials.portalUrl).toBeDefined();
      expect(result.imported[1].fullName).toBe('Rajesh Kumar');
    });

    it('should isolate errors to specific rows without failing the entire batch', async () => {
      const csv = [
        'full_name,phone,district',
        'Sunitha Kumari,+919847111222,Ernakulam',
        ',+919847999888,Ernakulam', // Missing name
        'Valid Staff,+919847555666,Kozhikode',
      ].join('\n');

      const result = await service.bulkImportCaregiversFromCsv(
        csv,
        'tenant-123',
        'staff-1',
        UserRole.OFFICE_STAFF
      );

      expect(result.totalRows).toBe(3);
      expect(result.importedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].row).toBe(3);
      expect(result.errors[0].reason).toContain('name');
    });

    it('should detect duplicate phone numbers inside the same CSV file', async () => {
      const csv = [
        'full_name,phone,district',
        'Caregiver One,+919847111222,Ernakulam',
        'Caregiver Two,+919847111222,Thrissur', // Duplicate phone in file
      ].join('\n');

      const result = await service.bulkImportCaregiversFromCsv(
        csv,
        'tenant-123',
        'staff-1',
        UserRole.OFFICE_STAFF
      );

      expect(result.importedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].reason).toContain('Duplicate phone number');
    });

    it('should reject bulk import attempt if caller is CAREGIVER role', async () => {
      await expect(
        service.bulkImportCaregiversFromCsv(
          'name,phone\nSunitha,+919847111222',
          'tenant-123',
          'caregiver-1',
          UserRole.CAREGIVER
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should provide CSV template for download', () => {
      const template = service.getCsvTemplate();
      expect(template).toContain('full_name,phone');
      expect(template).toContain('Sunitha Kumari');
    });
  });

  describe('Geocoding on Update & Re-geocoding', () => {
    it('should re-geocode address when address fields are updated without explicit coordinates', async () => {
      const existingCaregiver = {
        id: 'cg-123',
        tenantId: 'tenant-123',
        fullName: 'Sunitha Kumari',
        phone: '+919847123456',
        district: 'Ernakulam',
        latitude: 9.9816,
        longitude: 76.2999,
        documents: [],
      };
      mockCaregiverRepo.findOne.mockResolvedValueOnce(existingCaregiver);
      mockCaregiverRepo.save.mockImplementationOnce(async (c: any) => c);

      await service.updateCaregiver(
        'cg-123',
        { district: 'Thrissur' },
        'tenant-123',
        UserRole.OFFICE_STAFF,
        'staff-1'
      );

      expect(mockGeocodingService.geocode).toHaveBeenCalledWith(
        expect.objectContaining({
          district: 'Thrissur',
        })
      );
      expect(existingCaregiver.latitude).toBe(10.5276);
      expect(existingCaregiver.longitude).toBe(76.2144);
    });

    it('should allow staff to regeocode an existing caregiver via regeocodeCaregiver()', async () => {
      const existingCaregiver = {
        id: 'cg-123',
        tenantId: 'tenant-123',
        fullName: 'Sunitha Kumari',
        district: 'Ernakulam',
        latitude: null,
        longitude: null,
        documents: [],
      };
      mockCaregiverRepo.findOne.mockResolvedValueOnce(existingCaregiver);
      mockCaregiverRepo.save.mockImplementationOnce(async (c: any) => c);

      const result = await service.regeocodeCaregiver(
        'cg-123',
        'tenant-123',
        UserRole.OFFICE_STAFF
      );

      expect(mockGeocodingService.geocode).toHaveBeenCalledWith(
        expect.objectContaining({
          district: 'Ernakulam',
        })
      );
      expect(result.latitude).toBe(9.9816);
      expect(result.longitude).toBe(76.2999);
    });
  });

  describe('Daily Rate Configuration & Commission Split (Phase 6)', () => {
    it('should configure daily rate, live-in rate, hourly rate, commission split, and rate notes', async () => {
      const existingCaregiver = {
        id: 'cg-123',
        tenantId: 'tenant-123',
        fullName: 'Priya Lakshmi',
        dailyRate: 1000,
        liveInRate: 0,
        hourlyRate: 0,
        commissionPercentage: 15,
        rateNotes: null,
        documents: [],
      };
      mockCaregiverRepo.findOne.mockResolvedValueOnce(existingCaregiver);
      mockCaregiverRepo.save.mockImplementationOnce(async (c: any) => c);

      const dto = {
        dailyRate: 1300,
        liveInRate: 2000,
        hourlyRate: 160,
        commissionPercentage: 20,
        rateNotes: 'Senior ICU and Palliative Care rate',
      };

      const result = await service.configureRate(
        'cg-123',
        'tenant-123',
        dto,
        UserRole.OWNER
      );

      expect(mockCaregiverRepo.save).toHaveBeenCalled();
      expect(result.dailyRate).toBe(1300);
      expect(result.liveInRate).toBe(2000);
      expect(result.hourlyRate).toBe(160);
      expect(result.commissionPercentage).toBe(20);
      expect(result.rateNotes).toBe('Senior ICU and Palliative Care rate');
    });

    it('should reject rate configuration by a Caregiver role with ForbiddenException', async () => {
      await expect(
        service.configureRate(
          'cg-123',
          'tenant-123',
          { dailyRate: 1500 },
          UserRole.CAREGIVER
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if caregiver does not exist for rate configuration', async () => {
      mockCaregiverRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.configureRate(
          'cg-nonexistent',
          'tenant-123',
          { dailyRate: 1200 },
          UserRole.OFFICE_STAFF
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should get rate configuration and commission split breakdown', async () => {
      const existingCaregiver = {
        id: 'cg-123',
        tenantId: 'tenant-123',
        userId: 'user-cg-1',
        fullName: 'Priya Lakshmi',
        dailyRate: 1200,
        liveInRate: 1800,
        hourlyRate: 150,
        commissionPercentage: 15,
        rateNotes: 'Standard geriatric rate',
      };
      mockCaregiverRepo.findOne.mockResolvedValueOnce(existingCaregiver);

      const breakdown = await service.getRateConfiguration(
        'cg-123',
        'tenant-123',
        UserRole.OWNER,
        'user-owner-1'
      );

      expect(breakdown.dailyRate).toBe(1200);
      expect(breakdown.liveInRate).toBe(1800);
      expect(breakdown.hourlyRate).toBe(150);
      expect(breakdown.commissionPercentage).toBe(15);
      expect(breakdown.agencyCommissionDaily).toBe(180); // 1200 * 0.15 = 180
      expect(breakdown.takeHomeEstimateDaily).toBe(1020); // 1200 - 180 = 1020
    });

    it('should allow caregiver self-view of their own rate configuration but deny viewing others', async () => {
      const caregiverMe = {
        id: 'cg-me',
        tenantId: 'tenant-123',
        userId: 'user-cg-me',
        fullName: 'Me',
        dailyRate: 1100,
        commissionPercentage: 10,
      };
      mockCaregiverRepo.findOne
        .mockResolvedValueOnce(caregiverMe)
        .mockResolvedValueOnce({
          id: 'cg-other',
          tenantId: 'tenant-123',
          userId: 'user-cg-other',
          dailyRate: 1500,
        });

      // Self-view succeeds
      const selfResult = await service.getRateConfiguration(
        'cg-me',
        'tenant-123',
        UserRole.CAREGIVER,
        'user-cg-me'
      );
      expect(selfResult.dailyRate).toBe(1100);

      // Viewing other caregiver throws ForbiddenException
      await expect(
        service.getRateConfiguration(
          'cg-other',
          'tenant-123',
          UserRole.CAREGIVER,
          'user-cg-me'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

