import { FeedbackController } from './feedback.controller';
import { UserRole } from '../common/enums/user-role.enum';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByAssignment: jest.fn(),
      findOne: jest.fn(),
      getPublicAssignmentDetails: jest.fn(),
      submitPublic: jest.fn(),
    };

    controller = new FeedbackController(mockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const dto = { assignmentId: 'asgn-1', rating: 5, comment: 'Great job!' };
      const created = { id: 'fb-1', ...dto };
      mockService.create.mockResolvedValue(created);

      const result = await controller.create(dto, mockUser);
      expect(mockService.create).toHaveBeenCalledWith(dto, 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(created);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const query = { rating: 5, page: 1, limit: 10 };
      const mockList = { items: [{ id: 'fb-1', rating: 5 }], total: 1, page: 1, limit: 10, totalPages: 1 };
      mockService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll(mockUser, query);
      expect(mockService.findAll).toHaveBeenCalledWith('tenant-123', query, UserRole.OWNER, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockList.items);
    });
  });

  describe('findByAssignment', () => {
    it('should call service.findByAssignment with assignmentId and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockFb = { id: 'fb-1', assignmentId: 'asgn-1', rating: 5 };
      mockService.findByAssignment.mockResolvedValue(mockFb);

      const result = await controller.findByAssignment('asgn-1', mockUser);
      expect(mockService.findByAssignment).toHaveBeenCalledWith('asgn-1', 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFb);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockFb = { id: 'fb-1', rating: 5 };
      mockService.findOne.mockResolvedValue(mockFb);

      const result = await controller.findOne('fb-1', mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith('fb-1', 'tenant-123', UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFb);
    });
  });

  describe('Public Endpoints', () => {
    it('should get public assignment details', async () => {
      const details = {
        assignmentId: 'asgn-1',
        caregiverName: 'Priya Lakshmi',
        agencyName: 'CareKerala',
      };
      mockService.getPublicAssignmentDetails.mockResolvedValue(details);

      const result = await controller.getPublicDetails('asgn-1');
      expect(mockService.getPublicAssignmentDetails).toHaveBeenCalledWith('asgn-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(details);
    });

    it('should submit public feedback from link', async () => {
      const dto = { rating: 5, comment: 'Wonderful care for mother.' };
      const submitted = { id: 'fb-pub', ...dto, assignmentId: 'asgn-1' };
      mockService.submitPublic.mockResolvedValue(submitted);

      const result = await controller.submitPublicFeedback('asgn-1', dto);
      expect(mockService.submitPublic).toHaveBeenCalledWith('asgn-1', dto);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(submitted);
    });
  });
});
