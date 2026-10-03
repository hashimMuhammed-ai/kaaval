import { AttendanceController } from './attendance.controller';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      getTodayStatus: jest.fn(),
      createManual: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    controller = new AttendanceController(mockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkIn', () => {
    it('should call service.checkIn with dto and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.CAREGIVER };
      const dto = { assignmentId: 'asgn-1', date: '2026-10-01' };
      const createdAtt = { id: 'att-1', status: AttendanceStatus.PRESENT };
      mockService.checkIn.mockResolvedValue(createdAtt);

      const result = await controller.checkIn(dto, mockUser);
      expect(mockService.checkIn).toHaveBeenCalledWith(
        dto,
        'tenant-123',
        UserRole.CAREGIVER,
        'user-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdAtt);
    });
  });

  describe('checkOut', () => {
    it('should call service.checkOut with dto and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.CAREGIVER };
      const dto = { assignmentId: 'asgn-1', date: '2026-10-01' };
      const updatedAtt = { id: 'att-1', checkOutTime: new Date() };
      mockService.checkOut.mockResolvedValue(updatedAtt);

      const result = await controller.checkOut(dto, mockUser);
      expect(mockService.checkOut).toHaveBeenCalledWith(
        dto,
        'tenant-123',
        UserRole.CAREGIVER,
        'user-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedAtt);
    });
  });

  describe('getToday', () => {
    it('should call service.getTodayStatus with user context and optional assignmentId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-cg-1', role: UserRole.CAREGIVER };
      const mockTodayResult = {
        date: '2026-10-01',
        hasAssignment: true,
        assignment: { id: 'asgn-1' },
        attendance: null,
        isCheckedIn: false,
        isCheckedOut: false,
      };
      mockService.getTodayStatus.mockResolvedValue(mockTodayResult);

      const result = await controller.getToday(mockUser, 'asgn-1');
      expect(mockService.getTodayStatus).toHaveBeenCalledWith(
        'tenant-123',
        UserRole.CAREGIVER,
        'user-cg-1',
        'asgn-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTodayResult);
    });
  });

  describe('createManual', () => {
    it('should call service.createManual with dto and user', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-owner', role: UserRole.OWNER };
      const dto = { assignmentId: 'asgn-1', date: '2026-09-25' };
      const manualAtt = { id: 'att-manual', date: '2026-09-25' };
      mockService.createManual.mockResolvedValue(manualAtt);

      const result = await controller.createManual(dto, mockUser);
      expect(mockService.createManual).toHaveBeenCalledWith(dto, 'tenant-123', 'user-owner');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(manualAtt);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const query = { page: 1, limit: 15 };
      const mockList = {
        items: [{ id: 'att-1' }],
        total: 1,
        page: 1,
        limit: 15,
        totalPages: 1,
      };
      mockService.findAll.mockResolvedValue(mockList);

      const result = await controller.findAll(mockUser, query);
      expect(mockService.findAll).toHaveBeenCalledWith('tenant-123', query, UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockList.items);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OFFICE_STAFF };
      const mockAtt = { id: 'att-1' };
      mockService.findOne.mockResolvedValue(mockAtt);

      const result = await controller.findOne('att-1', mockUser);
      expect(mockService.findOne).toHaveBeenCalledWith('att-1', 'tenant-123', UserRole.OFFICE_STAFF, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAtt);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto, and user context', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const dto = { verified: true };
      const updated = { id: 'att-1', verified: true };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('att-1', dto, mockUser);
      expect(mockService.update).toHaveBeenCalledWith('att-1', 'tenant-123', dto, 'user-1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      mockService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('att-1', mockUser);
      expect(mockService.remove).toHaveBeenCalledWith('att-1', 'tenant-123');
      expect(result.success).toBe(true);
    });
  });
});
