import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockFeedbackRepo: any;
  let mockAssignmentRepo: any;
  let mockCaregiverRepo: any;
  let mockCustomerRepo: any;
  let mockTenantRepo: any;

  beforeEach(() => {
    const createMockQb = () => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: '2', avg: '4.5' }),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    mockFeedbackRepo = {
      create: jest.fn((dto) => ({ id: 'new-fb-uuid', ...dto })),
      save: jest.fn(async (fb) => ({ id: fb.id || 'saved-fb-uuid', ...fb })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(createMockQb),
    };

    mockAssignmentRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    mockCaregiverRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockCustomerRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'tenant-123', name: 'CareKerala Agency' }),
    };

    service = new FeedbackService(
      mockFeedbackRepo,
      mockAssignmentRepo,
      mockCaregiverRepo,
      mockCustomerRepo,
      mockTenantRepo
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if assignment does not exist', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ assignmentId: 'non-existent', rating: 5 }, 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should store new feedback with rating and optional comment linked to assignment', async () => {
      const mockAsgn = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);
      mockFeedbackRepo.findOne.mockResolvedValue(null); // No previous feedback

      const createdFb = {
        id: 'fb-1',
        tenantId: 'tenant-123',
        assignmentId: 'asgn-1',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
        rating: 5,
        comment: 'Compassionate and professional nursing.',
        source: 'whatsapp',
      };
      mockFeedbackRepo.save.mockResolvedValue(createdFb);
      mockFeedbackRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(createdFb);

      const result = await service.create(
        {
          assignmentId: 'asgn-1',
          rating: 5,
          comment: 'Compassionate and professional nursing.',
          source: 'whatsapp',
        },
        'tenant-123'
      );

      expect(mockFeedbackRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          assignmentId: 'asgn-1',
          caregiverId: 'cg-1',
          customerId: 'cust-1',
          rating: 5,
          comment: 'Compassionate and professional nursing.',
          source: 'whatsapp',
        })
      );
      expect(mockAssignmentRepo.update).toHaveBeenCalledWith(
        { id: 'asgn-1' },
        { feedbackRequestStatus: 'received' }
      );
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Compassionate and professional nursing.');
    });

    it('should update existing feedback if already recorded for the assignment', async () => {
      const mockAsgn = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);

      const existingFb = {
        id: 'fb-1',
        tenantId: 'tenant-123',
        assignmentId: 'asgn-1',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
        rating: 4,
        comment: 'Initial comment',
        source: 'manual',
      };
      mockFeedbackRepo.findOne.mockResolvedValue(existingFb);
      mockFeedbackRepo.save.mockImplementation(async (f: any) => f);

      const result = await service.create(
        {
          assignmentId: 'asgn-1',
          rating: 5,
          comment: 'Updated: Outstanding care',
        },
        'tenant-123'
      );

      expect(mockFeedbackRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fb-1',
          rating: 5,
          comment: 'Updated: Outstanding care',
        })
      );
      expect(result.rating).toBe(5);
    });
  });

  describe('findByAssignment', () => {
    it('should return feedback linked to assignment', async () => {
      const mockFb = {
        id: 'fb-1',
        assignmentId: 'asgn-1',
        rating: 5,
        comment: 'Great nurse',
      };
      mockFeedbackRepo.findOne.mockResolvedValue(mockFb);

      const result = await service.findByAssignment('asgn-1', 'tenant-123');
      expect(result).toEqual(mockFb);
      expect(mockFeedbackRepo.findOne).toHaveBeenCalledWith({
        where: { assignmentId: 'asgn-1', tenantId: 'tenant-123' },
        relations: ['caregiver', 'customer', 'assignment'],
      });
    });
  });

  describe('findAll and Caregiver Self-View Isolation', () => {
    it('should allow Owner and Office Staff to query all tenant feedback', async () => {
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'fb-1', rating: 5 }], 1]),
      };
      mockFeedbackRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('tenant-123', { rating: 5 }, UserRole.OWNER, 'user-owner');
      expect(result.items.length).toBe(1);
      expect(result.total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('fb.tenant_id = :tenantId', { tenantId: 'tenant-123' });
    });

    it('should restrict Caregiver to only view their own feedback records', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-me', userId: 'user-cg' });

      const qb: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'fb-cg', caregiverId: 'cg-me' }], 1]),
      };
      mockFeedbackRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('tenant-123', {}, UserRole.CAREGIVER, 'user-cg');
      expect(qb.andWhere).toHaveBeenCalledWith('fb.caregiver_id = :cgId', { cgId: 'cg-me' });
      expect(result.items.length).toBe(1);
    });
  });

  describe('findOne security checks', () => {
    it('should throw ForbiddenException if caregiver views feedback belonging to another caregiver', async () => {
      mockFeedbackRepo.findOne.mockResolvedValue({
        id: 'fb-other',
        tenantId: 'tenant-123',
        caregiverId: 'cg-other',
      });
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-me', userId: 'user-cg' });

      await expect(
        service.findOne('fb-other', 'tenant-123', UserRole.CAREGIVER, 'user-cg')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recordInboundWhatsAppRating', () => {
    it('should extract 5-star rating and comment from customer text message', async () => {
      const qbCustomer: any = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'cust-1', phone: '+919847012345' }]),
      };
      mockCustomerRepo.createQueryBuilder.mockReturnValue(qbCustomer);

      const targetAsgn = {
        id: 'asgn-target',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
        caregiver: { fullName: 'Priya Lakshmi' },
        tenant: { name: 'CareKerala Agency' },
      };
      const qbAsgn: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(targetAsgn),
      };
      mockAssignmentRepo.createQueryBuilder.mockReturnValue(qbAsgn);
      mockAssignmentRepo.findOne.mockResolvedValue(targetAsgn);

      mockFeedbackRepo.findOne.mockResolvedValue(null);
      mockFeedbackRepo.save.mockImplementation(async (f: any) => ({ id: 'fb-wa', ...f }));

      const res = await service.recordInboundWhatsAppRating(
        '919847012345',
        '5 - Sister Priya took amazing care of mother.',
        'wamid.incoming.123'
      );

      expect(res.matched).toBe(true);
      expect(res.feedback?.rating).toBe(5);
      expect(res.feedback?.comment).toBe('Sister Priya took amazing care of mother.');
      expect(res.feedback?.source).toBe('whatsapp');
      expect(res.thankYouMessage).toContain('5/5 stars');
      expect(res.thankYouMessage).toContain('Priya Lakshmi');
    });

    it('should return matched: false if text contains no rating digit', async () => {
      const res = await service.recordInboundWhatsAppRating(
        '919847012345',
        'Hello, can I change the schedule tomorrow?'
      );
      expect(res.matched).toBe(false);
    });
  });

  describe('updateCaregiverRatingStats', () => {
    it('should compute rolling average rating and total reviews and update caregiver', async () => {
      const result = await service.updateCaregiverRatingStats('cg-1', 'tenant-123');

      expect(result).toEqual({
        averageRating: 4.5,
        totalRatings: 2,
      });

      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-1' },
        {
          averageRating: 4.5,
          totalRatings: 2,
        }
      );
    });
  });
});

