import { AssignmentsController } from './assignments.controller';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findActiveForCaregiver: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      replace: jest.fn(),
      getCustomerAssignmentHistory: jest.fn(),
      sendFeedbackRequest: jest.fn(),
    };

    controller = new AssignmentsController(mockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and user tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const dto: any = {
        customerId: 'cust-1',
        caregiverId: 'cg-1',
        startDate: '2026-10-01',
      };
      const createdAsgn = { id: 'asgn-1', ...dto, tenantId: 'tenant-123' };
      mockService.create.mockResolvedValue(createdAsgn);

      const result = await controller.create(dto, mockUser);
      expect(mockService.create).toHaveBeenCalledWith(dto, 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdAsgn);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query params and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const query = { status: AssignmentStatus.ACTIVE, page: 1, limit: 10 };
      const mockResult = {
        items: [{ id: 'asgn-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(mockUser, query);
      expect(mockService.findAll).toHaveBeenCalledWith('tenant-123', query, UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.items);
    });
  });

  describe('findCurrent', () => {
    it('should call service.findActiveForCaregiver with tenantId and userId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-cg-1', role: UserRole.CAREGIVER };
      const activeAsgn = { id: 'asgn-current', status: AssignmentStatus.ACTIVE };
      mockService.findActiveForCaregiver.mockResolvedValue(activeAsgn);

      const result = await controller.findCurrent(mockUser);
      expect(mockService.findActiveForCaregiver).toHaveBeenCalledWith('tenant-123', 'user-cg-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(activeAsgn);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockAsgn = { id: 'asgn-1' };
      mockService.findOne.mockResolvedValue(mockAsgn);

      const result = await controller.findOne('asgn-1', mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith('asgn-1', 'tenant-123', UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAsgn);
    });
  });

  describe('update', () => {
    it('should call service.update with id, tenantId, and dto', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const dto = { status: AssignmentStatus.COMPLETED };
      const updated = { id: 'asgn-1', status: AssignmentStatus.COMPLETED };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('asgn-1', dto, mockUser);
      expect(mockService.update).toHaveBeenCalledWith('asgn-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('requestFeedback', () => {
    it('should call service.sendFeedbackRequest with id and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockResult = {
        success: true,
        assignmentId: 'asgn-1',
        recipient: '919847012345',
        mode: 'mock',
      };
      mockService.sendFeedbackRequest.mockResolvedValue(mockResult);

      const result = await controller.requestFeedback('asgn-1', mockUser);
      expect(mockService.sendFeedbackRequest).toHaveBeenCalledWith('asgn-1', 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
    });
  });

  describe('replace', () => {
    it('should call service.replace with assignment id, tenantId, and dto', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const dto = {
        replacementCaregiverId: 'cg-2',
        startDate: '2026-10-15',
        replacementReason: 'Sick leave',
      };
      const mockReplaceResult = {
        previousAssignment: { id: 'asgn-1', status: AssignmentStatus.REPLACED, replacedById: 'asgn-2' },
        newAssignment: { id: 'asgn-2', status: AssignmentStatus.ACTIVE },
      };
      mockService.replace.mockResolvedValue(mockReplaceResult);

      const result = await controller.replace('asgn-1', dto, mockUser);
      expect(mockService.replace).toHaveBeenCalledWith('asgn-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReplaceResult);
    });
  });

  describe('getCustomerHistory', () => {
    it('should call service.getCustomerAssignmentHistory with customerId, tenantId, and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const mockHistory = [
        { id: 'asgn-2', status: AssignmentStatus.ACTIVE },
        { id: 'asgn-1', status: AssignmentStatus.REPLACED },
      ];
      mockService.getCustomerAssignmentHistory.mockResolvedValue(mockHistory);

      const result = await controller.getCustomerHistory('cust-1', mockUser);
      expect(mockService.getCustomerAssignmentHistory).toHaveBeenCalledWith(
        'cust-1',
        'tenant-123',
        UserRole.OWNER,
        'user-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockHistory);
    });
  });

  describe('SLA Timer & Escalation endpoints (Phase 10 Point 3)', () => {
    it('should delegate requestReplacement to service with dto and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const dto = { absenceReason: 'leave', absenceNotes: 'Sick leave', slaMinutes: 60 };
      const mockUpdated = { id: 'asgn-1', replacementSlaStatus: 'pending' };
      mockService.requestReplacement = jest.fn().mockResolvedValue(mockUpdated);

      const result = await controller.requestReplacement('asgn-1', dto, mockUser);
      expect(mockService.requestReplacement).toHaveBeenCalledWith('asgn-1', 'tenant-123', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdated);
    });

    it('should delegate escalateSla to service with id, tenantId, and force=true', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const mockEscalateResult = {
        assignment: { id: 'asgn-1', replacementSlaStatus: 'escalated' },
        escalationResult: { success: true },
      };
      mockService.escalateAssignmentSla = jest.fn().mockResolvedValue(mockEscalateResult);

      const result = await controller.escalateSla('asgn-1', mockUser);
      expect(mockService.escalateAssignmentSla).toHaveBeenCalledWith('asgn-1', 'tenant-123', true);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEscalateResult);
    });

    it('should delegate checkSla to service with user tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockSummary = { checkedCount: 2, escalatedCount: 1, escalatedAssignments: ['asgn-1'] };
      mockService.checkAndEscalateSlaTimers = jest.fn().mockResolvedValue(mockSummary);

      const result = await controller.checkSla(mockUser);
      expect(mockService.checkAndEscalateSlaTimers).toHaveBeenCalledWith('tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSummary);
    });

    it('should delegate getOverdueSla to service with tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const mockItems = [{ id: 'asgn-1', replacementSlaStatus: 'escalated' }];
      mockService.getOverdueReplacementSla = jest.fn().mockResolvedValue(mockItems);

      const result = await controller.getOverdueSla(mockUser);
      expect(mockService.getOverdueReplacementSla).toHaveBeenCalledWith('tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockItems);
    });

    it('should delegate getAbsenceStats to service with tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockStats = {
        totalAbsences: 5,
        breakdown: { leave: 3, quit: 1, complaint: 1, emergency: 0, rotation: 0, other: 0 },
      };
      mockService.getAbsenceStats = jest.fn().mockResolvedValue(mockStats);

      const result = await controller.getAbsenceStats(mockUser);
      expect(mockService.getAbsenceStats).toHaveBeenCalledWith('tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });
});

