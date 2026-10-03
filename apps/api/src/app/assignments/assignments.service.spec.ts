import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { CustomerStatus } from '../common/enums/customer-status.enum';
import { CaregiverStatus } from '../common/enums/caregiver-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let mockAssignmentRepo: any;
  let mockCustomerRepo: any;
  let mockCaregiverRepo: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockAssignmentRepo = {
      create: jest.fn((data) => ({ id: 'new-asgn-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'saved-asgn-uuid', ...data })),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockCustomerRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (data) => data),
    };

    mockCaregiverRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (data) => data),
      update: jest.fn(async () => undefined),
    };

    const mockTenantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'tenant-123',
        name: 'CareKerala Agency',
        subdomain: 'carekerala',
      }),
    };

    const mockWhatsappService = {
      sendPostAssignmentRatingRequest: jest.fn().mockResolvedValue({
        success: true,
        assignmentId: 'asgn-1',
        recipient: '919847012345',
        mode: 'mock',
      }),
    };

    mockNotificationsService = {
      escalateReplacementSla: jest.fn().mockResolvedValue({
        success: true,
        notificationId: 'notif-sla-1',
        pushDispatch: { sentCount: 1, failureCount: 0 },
        whatsappAlerts: [{ recipient: '+919847012345', success: true }],
      }),
    };

    service = new AssignmentsService(
      mockAssignmentRepo,
      mockCustomerRepo,
      mockCaregiverRepo,
      mockTenantRepo as any,
      mockWhatsappService as any,
      mockNotificationsService as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an assignment and sync customer & caregiver statuses', async () => {
      const mockCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        patientName: 'Devaki Amma',
        status: CustomerStatus.PENDING,
        assignedCaregiverId: null,
      };
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);

      const mockCaregiver = {
        id: 'cg-123',
        tenantId: 'tenant-123',
        fullName: 'Priya Lakshmi',
        status: CaregiverStatus.AVAILABLE,
        dailyRate: 1100,
      };
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      const mockSavedAssignment = {
        id: 'asgn-123',
        tenantId: 'tenant-123',
        customerId: 'cust-123',
        caregiverId: 'cg-123',
        startDate: '2026-10-01',
        status: AssignmentStatus.ACTIVE,
        billingRate: 1500,
        caregiverDailyRate: 1100,
      };
      mockAssignmentRepo.save.mockResolvedValue(mockSavedAssignment);
      mockAssignmentRepo.findOne.mockResolvedValue(mockSavedAssignment);

      const dto = {
        customerId: 'cust-123',
        caregiverId: 'cg-123',
        startDate: '2026-10-01',
        billingRate: 1500,
      };

      const result = await service.create(dto, 'tenant-123');

      expect(mockAssignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          customerId: 'cust-123',
          caregiverId: 'cg-123',
          status: AssignmentStatus.ACTIVE,
          caregiverDailyRate: 1100, // defaulted from caregiver
          billingRate: 1500,
        })
      );
      expect(mockCustomer.assignedCaregiverId).toBe('cg-123');
      expect(mockCustomer.status).toBe(CustomerStatus.ACTIVE);
      expect(mockCaregiver.status).toBe(CaregiverStatus.ASSIGNED);
      expect(result.id).toBe('asgn-123');
    });

    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.create(
          {
            customerId: 'cust-1',
            caregiverId: 'cg-1',
            startDate: '2026-10-01',
          },
          ''
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if customer does not exist in tenant', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            customerId: 'nonexistent-cust',
            caregiverId: 'cg-1',
            startDate: '2026-10-01',
          },
          'tenant-123'
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if caregiver does not exist in tenant', async () => {
      mockCustomerRepo.findOne.mockResolvedValue({ id: 'cust-1', tenantId: 'tenant-123' });
      mockCaregiverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            customerId: 'cust-1',
            caregiverId: 'nonexistent-cg',
            startDate: '2026-10-01',
          },
          'tenant-123'
        )
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should list assignments with status and pagination filters', async () => {
      const mockItems = [
        {
          id: 'asgn-1',
          tenantId: 'tenant-123',
          status: AssignmentStatus.ACTIVE,
          startDate: '2026-10-01',
        },
      ];

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockItems, 1]),
      };

      mockAssignmentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const res = await service.findAll('tenant-123', {
        status: AssignmentStatus.ACTIVE,
      });

      expect(res.items.length).toBe(1);
      expect(res.total).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'asgn.status = :status',
        { status: AssignmentStatus.ACTIVE }
      );
    });

    it('should restrict caregiver to only their own assignments', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-my-id',
        userId: 'user-cg-1',
      });

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockAssignmentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findAll('tenant-123', {}, UserRole.CAREGIVER, 'user-cg-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'asgn.caregiver_id = :cgId',
        { cgId: 'cg-my-id' }
      );
    });
  });

  describe('findOne', () => {
    it('should return assignment when found', async () => {
      const mockAsgn = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);

      const result = await service.findOne('asgn-1', 'tenant-123');
      expect(result).toEqual(mockAsgn);
    });

    it('should throw NotFoundException when assignment does not exist', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if caregiver tries to access someone else assignment', async () => {
      const mockAsgn = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-other',
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-me',
        userId: 'user-me',
      });

      await expect(
        service.findOne('asgn-1', 'tenant-123', UserRole.CAREGIVER, 'user-me')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findActiveForCaregiver', () => {
    it('should return active assignment for caregiver', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-1', userId: 'user-cg-1' });
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-active',
        caregiverId: 'cg-1',
        status: AssignmentStatus.ACTIVE,
      });

      const result = await service.findActiveForCaregiver('tenant-123', 'user-cg-1');
      expect(result).toBeDefined();
      expect(result?.id).toBe('asgn-active');
    });

    it('should return null if caregiver has no active assignment', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-1', userId: 'user-cg-1' });
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      const result = await service.findActiveForCaregiver('tenant-123', 'user-cg-1');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update assignment and reset caregiver status to AVAILABLE on completion if no other active', async () => {
      const mockAsgn = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        status: AssignmentStatus.ACTIVE,
        customer: {
          phone: '+91 98470 12345',
          patientName: 'Devaki',
          primaryContactName: 'Ramesh',
        },
        caregiver: {
          fullName: 'Priya Lakshmi',
        },
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);
      mockAssignmentRepo.count.mockResolvedValue(1);

      await service.update('asgn-1', 'tenant-123', {
        status: AssignmentStatus.COMPLETED,
      });

      expect(mockAssignmentRepo.save).toHaveBeenCalled();
      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-1', tenantId: 'tenant-123' },
        { status: CaregiverStatus.AVAILABLE }
      );
    });
  });

  describe('sendFeedbackRequest', () => {
    it('should throw NotFoundException if assignment does not exist', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.sendFeedbackRequest('non-existent', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should dispatch post-assignment WhatsApp rating request and update feedbackRequestedAt', async () => {
      const mockAsgn = {
        id: 'asgn-completed',
        tenantId: 'tenant-123',
        status: AssignmentStatus.COMPLETED,
        customer: {
          id: 'cust-1',
          phone: '+91 98470 12345',
          patientName: 'Mary Varghese',
          primaryContactName: 'Dr. Thomas',
        },
        caregiver: {
          id: 'cg-1',
          fullName: 'Priya Lakshmi',
        },
        feedbackRequestedAt: null,
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAsgn);

      const res = await service.sendFeedbackRequest('asgn-completed', 'tenant-123');

      expect(res.success).toBe(true);
      expect(mockAssignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'asgn-completed',
          feedbackRequestStatus: 'sent',
        })
      );
    });
  });

  describe('updateCaregiverJobsCount', () => {
    it('should count completed assignments and update caregiver record', async () => {
      mockAssignmentRepo.count.mockResolvedValue(7);

      const count = await service.updateCaregiverJobsCount('cg-1', 'tenant-123');

      expect(count).toBe(7);
      expect(mockAssignmentRepo.count).toHaveBeenCalledWith({
        where: {
          caregiverId: 'cg-1',
          status: AssignmentStatus.COMPLETED,
          tenantId: 'tenant-123',
        },
      });
      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-1' },
        { jobsCompleted: 7 }
      );
    });
  });

  describe('replace', () => {
    it('should replace an active assignment, creating a replacement assignment and setting replaced_by_id', async () => {
      const mockCurrentAssignment: any = {
        id: 'asgn-old',
        tenantId: 'tenant-123',
        customerId: 'cust-123',
        caregiverId: 'cg-old',
        status: AssignmentStatus.ACTIVE,
        billingRate: 1500,
        caregiverDailyRate: 1000,
        replacedById: null,
        replacementReason: null,
        caregiver: { fullName: 'Old Caregiver' },
      };

      const mockReplacementCaregiver = {
        id: 'cg-new',
        tenantId: 'tenant-123',
        fullName: 'New Caregiver',
        dailyRate: 1100,
        status: CaregiverStatus.AVAILABLE,
      };

      const mockCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        assignedCaregiverId: 'cg-old',
        status: CustomerStatus.ACTIVE,
      };

      mockAssignmentRepo.findOne
        .mockResolvedValueOnce(mockCurrentAssignment) // first findOne in replace
        .mockResolvedValueOnce(mockCurrentAssignment) // findOne for updatedPrev
        .mockResolvedValueOnce({ id: 'asgn-new', status: AssignmentStatus.ACTIVE }); // findOne for updatedNew

      mockCaregiverRepo.findOne.mockResolvedValue(mockReplacementCaregiver);
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockAssignmentRepo.count.mockResolvedValue(0); // 0 remaining active assignments for old caregiver

      const dto = {
        replacementCaregiverId: 'cg-new',
        startDate: '2026-10-15',
        replacementReason: 'Sick leave',
        notes: 'Handover complete',
      };

      const result = await service.replace('asgn-old', 'tenant-123', dto);

      expect(mockAssignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          customerId: 'cust-123',
          caregiverId: 'cg-new',
          startDate: '2026-10-15',
          status: AssignmentStatus.ACTIVE,
          caregiverDailyRate: 1100,
        })
      );

      expect(mockCurrentAssignment.status).toBe(AssignmentStatus.REPLACED);
      expect(mockCurrentAssignment.replacedById).toBe('new-asgn-uuid');
      expect(mockCurrentAssignment.replacementReason).toBe('Sick leave');
      expect(mockCustomer.assignedCaregiverId).toBe('cg-new');
      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-old', tenantId: 'tenant-123' },
        { status: CaregiverStatus.AVAILABLE }
      );
      expect(mockCaregiverRepo.update).toHaveBeenCalledWith(
        { id: 'cg-new', tenantId: 'tenant-123' },
        { status: CaregiverStatus.ASSIGNED }
      );
      expect(result).toBeDefined();
    });

    it('should capture absenceReason and absenceNotes when replacing assignment (Phase 10 Point 4)', async () => {
      const mockCurrentAssignment: any = {
        id: 'asgn-to-replace',
        tenantId: 'tenant-123',
        customerId: 'cust-123',
        caregiverId: 'cg-prev',
        status: AssignmentStatus.ACTIVE,
        billingRate: 1500,
        caregiverDailyRate: 1000,
        replacementSlaStatus: 'pending',
      };
      const mockReplacementCaregiver = {
        id: 'cg-replacement',
        tenantId: 'tenant-123',
        fullName: 'Replacement Caregiver',
        dailyRate: 1200,
        status: CaregiverStatus.AVAILABLE,
      };
      const mockCustomer = {
        id: 'cust-123',
        tenantId: 'tenant-123',
        assignedCaregiverId: 'cg-prev',
        status: CustomerStatus.ACTIVE,
      };

      mockAssignmentRepo.findOne
        .mockResolvedValueOnce(mockCurrentAssignment)
        .mockResolvedValueOnce(mockCurrentAssignment)
        .mockResolvedValueOnce({ id: 'asgn-brand-new', status: AssignmentStatus.ACTIVE });
      mockCaregiverRepo.findOne.mockResolvedValue(mockReplacementCaregiver);
      mockCustomerRepo.findOne.mockResolvedValue(mockCustomer);
      mockAssignmentRepo.count.mockResolvedValue(0);

      await service.replace('asgn-to-replace', 'tenant-123', {
        replacementCaregiverId: 'cg-replacement',
        startDate: '2026-10-15',
        absenceReason: 'quit',
        absenceNotes: 'Caregiver resigned to pursue hospital nursing position',
      });

      expect(mockCurrentAssignment.status).toBe(AssignmentStatus.REPLACED);
      expect(mockCurrentAssignment.absenceReason).toBe('quit');
      expect(mockCurrentAssignment.absenceNotes).toBe(
        'Caregiver resigned to pursue hospital nursing position'
      );
      expect(mockCurrentAssignment.replacementReason).toContain('quit');
      expect(mockCurrentAssignment.replacementSlaStatus).toBe('resolved');
    });

    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.replace('asgn-1', '', {
          replacementCaregiverId: 'cg-2',
          startDate: '2026-10-15',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if assignment to replace is not found', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.replace('asgn-nonexistent', 'tenant-123', {
          replacementCaregiverId: 'cg-2',
          startDate: '2026-10-15',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if assignment is already replaced', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        status: AssignmentStatus.REPLACED,
        replacedById: 'asgn-other',
      });

      await expect(
        service.replace('asgn-1', 'tenant-123', {
          replacementCaregiverId: 'cg-2',
          startDate: '2026-10-15',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if replacement caregiver is identical to current', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-same',
        status: AssignmentStatus.ACTIVE,
      });

      await expect(
        service.replace('asgn-1', 'tenant-123', {
          replacementCaregiverId: 'cg-same',
          startDate: '2026-10-15',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if replacement caregiver does not exist', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        status: AssignmentStatus.ACTIVE,
      });
      mockCaregiverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.replace('asgn-1', 'tenant-123', {
          replacementCaregiverId: 'cg-missing',
          startDate: '2026-10-15',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCustomerAssignmentHistory', () => {
    it('should return assignments list for customer ordered by startDate DESC', async () => {
      mockCustomerRepo.findOne.mockResolvedValue({ id: 'cust-1', tenantId: 'tenant-123' });
      const mockHistory = [
        { id: 'asgn-2', startDate: '2026-10-15', status: AssignmentStatus.ACTIVE },
        { id: 'asgn-1', startDate: '2026-10-01', status: AssignmentStatus.REPLACED, replacedById: 'asgn-2' },
      ];
      mockAssignmentRepo.find.mockResolvedValue(mockHistory);

      const result = await service.getCustomerAssignmentHistory('cust-1', 'tenant-123');

      expect(result).toHaveLength(2);
      expect(mockAssignmentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'cust-1', tenantId: 'tenant-123' },
          order: { startDate: 'DESC', createdAt: 'DESC' },
        })
      );
    });

    it('should throw NotFoundException if customer does not exist in tenant', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getCustomerAssignmentHistory('cust-missing', 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('requestReplacement & SLA Escalation Flow (Phase 10 Point 3)', () => {
    it('should request replacement, record absence reason, and activate SLA timer', async () => {
      const activeAsgn = {
        id: 'asgn-active-1',
        tenantId: 'tenant-123',
        status: AssignmentStatus.ACTIVE,
        customerId: 'cust-1',
        caregiverId: 'cg-1',
        customer: { id: 'cust-1', patientName: 'Devaki Amma' },
        caregiver: { id: 'cg-1', fullName: 'Sunitha' },
      };
      mockAssignmentRepo.findOne.mockResolvedValue(activeAsgn);

      const result = await service.requestReplacement('asgn-active-1', 'tenant-123', {
        absenceReason: 'leave',
        absenceNotes: 'Caregiver has high fever',
        slaMinutes: 60,
      });

      expect(result.replacementSlaStatus).toBe('pending');
      expect(result.replacementSlaMinutes).toBe(60);
      expect(result.absenceReason).toBe('leave');
      expect(result.absenceNotes).toBe('Caregiver has high fever');
      expect(result.replacementRequestedAt).toBeInstanceOf(Date);
      expect(mockAssignmentRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if assignment is not active', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-completed',
        tenantId: 'tenant-123',
        status: AssignmentStatus.COMPLETED,
      });

      await expect(
        service.requestReplacement('asgn-completed', 'tenant-123', {
          absenceReason: 'leave',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should escalate assignment SLA to Owner via WhatsApp and Web Push', async () => {
      const overdueAsgn = {
        id: 'asgn-overdue',
        tenantId: 'tenant-123',
        status: AssignmentStatus.ACTIVE,
        customerId: 'cust-1',
        caregiverId: 'cg-1',
        replacementSlaStatus: 'pending',
        replacementSlaMinutes: 60,
        absenceReason: 'quit',
        absenceNotes: 'Caregiver resigned abruptly',
        customer: { id: 'cust-1', patientName: 'Devaki Amma', district: 'Ernakulam' },
        caregiver: { id: 'cg-1', fullName: 'Sunitha' },
      };
      mockAssignmentRepo.findOne.mockResolvedValue(overdueAsgn);

      const result = await service.escalateAssignmentSla('asgn-overdue', 'tenant-123', true);

      expect(result.assignment.replacementSlaStatus).toBe('escalated');
      expect(result.assignment.replacementSlaEscalatedAt).toBeInstanceOf(Date);
      expect(mockNotificationsService.escalateReplacementSla).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          assignmentId: 'asgn-overdue',
          patientName: 'Devaki Amma',
          absenceReason: 'quit',
          slaMinutes: 60,
        })
      );
    });

    it('should scan and automatically escalate overdue pending SLA assignments', async () => {
      const now = Date.now();
      const pastRequestedDate = new Date(now - 70 * 60 * 1000); // 70 minutes ago

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'asgn-breached',
            tenantId: 'tenant-123',
            status: AssignmentStatus.ACTIVE,
            replacementSlaStatus: 'pending',
            replacementRequestedAt: pastRequestedDate,
            replacementSlaMinutes: 60,
            absenceReason: 'leave',
            customer: { patientName: 'Devaki Amma', district: 'Ernakulam' },
            caregiver: { fullName: 'Sunitha' },
          },
        ]),
      };
      mockAssignmentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-breached',
        tenantId: 'tenant-123',
        status: AssignmentStatus.ACTIVE,
        replacementSlaStatus: 'pending',
        replacementRequestedAt: pastRequestedDate,
        replacementSlaMinutes: 60,
        absenceReason: 'leave',
        customer: { id: 'cust-1', patientName: 'Devaki Amma', district: 'Ernakulam' },
        caregiver: { id: 'cg-1', fullName: 'Sunitha' },
      });

      const summary = await service.checkAndEscalateSlaTimers('tenant-123');

      expect(summary.checkedCount).toBe(1);
      expect(summary.escalatedCount).toBe(1);
      expect(summary.escalatedAssignments).toContain('asgn-breached');
      expect(mockNotificationsService.escalateReplacementSla).toHaveBeenCalled();
    });
  });

  describe('getAbsenceStats', () => {
    it('should aggregate absence reasons across agency tenant (Phase 10 Point 4)', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { reason: 'leave', count: '5' },
          { reason: 'quit', count: '2' },
          { reason: 'complaint', count: '1' },
          { reason: 'emergency', count: '3' },
        ]),
      };
      mockAssignmentRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const stats = await service.getAbsenceStats('tenant-123');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('asgn.tenant_id = :tenantId', {
        tenantId: 'tenant-123',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('asgn.absence_reason IS NOT NULL');
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('asgn.absence_reason');
      expect(stats.totalAbsences).toBe(11);
      expect(stats.breakdown.leave).toBe(5);
      expect(stats.breakdown.quit).toBe(2);
      expect(stats.breakdown.complaint).toBe(1);
      expect(stats.breakdown.emergency).toBe(3);
      expect(stats.breakdown.rotation).toBe(0);
      expect(stats.breakdown.other).toBe(0);
    });
  });
});


