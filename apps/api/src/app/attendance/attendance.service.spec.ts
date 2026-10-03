import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let mockAttendanceRepo: any;
  let mockAssignmentRepo: any;
  let mockCaregiverRepo: any;

  beforeEach(() => {
    mockAttendanceRepo = {
      create: jest.fn((data) => ({ id: 'new-att-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'saved-att-uuid', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(async () => undefined),
    };

    mockAssignmentRepo = {
      findOne: jest.fn(),
    };

    mockCaregiverRepo = {
      findOne: jest.fn(),
    };

    service = new AttendanceService(
      mockAttendanceRepo,
      mockAssignmentRepo,
      mockCaregiverRepo
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('should successfully record check-in for an active assignment', async () => {
      const mockAssignment = {
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
        status: AssignmentStatus.ACTIVE,
      };
      mockAssignmentRepo.findOne.mockResolvedValue(mockAssignment);
      mockAttendanceRepo.findOne
        .mockResolvedValueOnce(null) // no existing check-in
        .mockResolvedValueOnce({
          id: 'att-1',
          assignmentId: 'asgn-1',
          date: '2026-10-01',
          checkInTime: new Date(),
          status: AttendanceStatus.PRESENT,
        });

      const result = await service.checkIn(
        {
          assignmentId: 'asgn-1',
          date: '2026-10-01',
          latitude: 9.9674,
          longitude: 76.2999,
          notes: 'Arrived at patient home',
        },
        'tenant-123'
      );

      expect(mockAttendanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          assignmentId: 'asgn-1',
          caregiverId: 'cg-1',
          customerId: 'cust-1',
          date: '2026-10-01',
          status: AttendanceStatus.PRESENT,
          checkInLatitude: 9.9674,
          checkInLongitude: 76.2999,
          checkInNotes: 'Arrived at patient home',
        })
      );
      expect(mockAttendanceRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if assignment does not exist in tenant', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkIn({ assignmentId: 'nonexistent-asgn' }, 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if caregiver attempts check-in to another caregiver assignment', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-someone-else',
        status: AssignmentStatus.ACTIVE,
      });
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-me',
        userId: 'user-me',
      });

      await expect(
        service.checkIn(
          { assignmentId: 'asgn-1' },
          'tenant-123',
          UserRole.CAREGIVER,
          'user-me'
        )
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if assignment is not active', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-me',
        status: AssignmentStatus.COMPLETED,
      });
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-me',
        userId: 'user-me',
      });

      await expect(
        service.checkIn(
          { assignmentId: 'asgn-1' },
          'tenant-123',
          UserRole.CAREGIVER,
          'user-me'
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if check-in is already recorded for this date', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        status: AssignmentStatus.ACTIVE,
      });
      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-existing',
        date: '2026-10-01',
        checkInTime: new Date(),
      });

      await expect(
        service.checkIn(
          { assignmentId: 'asgn-1', date: '2026-10-01' },
          'tenant-123'
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should successfully record check-out when valid check-in exists', async () => {
      const mockAttendance = {
        id: 'att-1',
        assignmentId: 'asgn-1',
        tenantId: 'tenant-123',
        caregiverId: 'cg-1',
        date: '2026-10-01',
        checkInTime: new Date('2026-10-01T08:00:00Z'),
        checkOutTime: null,
        status: AttendanceStatus.PRESENT,
      };
      mockAttendanceRepo.findOne
        .mockResolvedValueOnce(mockAttendance) // lookup
        .mockResolvedValueOnce({
          ...mockAttendance,
          checkOutTime: new Date('2026-10-01T17:00:00Z'),
        }); // findOne after save

      const result = await service.checkOut(
        {
          attendanceId: 'att-1',
          checkOutTime: '2026-10-01T17:00:00Z',
          latitude: 9.9674,
          longitude: 76.2999,
          notes: 'Shift completed, vitals reported to daughter',
        },
        'tenant-123'
      );

      expect(mockAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'att-1',
          checkOutLatitude: 9.9674,
          checkOutLongitude: 76.2999,
          checkOutNotes: 'Shift completed, vitals reported to daughter',
        })
      );
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if no attendance record is found', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkOut({ attendanceId: 'att-missing' }, 'tenant-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already checked out', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-1',
        date: '2026-10-01',
        checkInTime: new Date('2026-10-01T08:00:00Z'),
        checkOutTime: new Date('2026-10-01T17:00:00Z'),
      });

      await expect(
        service.checkOut({ attendanceId: 'att-1' }, 'tenant-123')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if caregiver attempts to check out shift of another caregiver', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-1',
        caregiverId: 'cg-other',
        checkInTime: new Date(),
        checkOutTime: null,
      });
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-me',
        userId: 'user-me',
      });

      await expect(
        service.checkOut(
          { attendanceId: 'att-1' },
          'tenant-123',
          UserRole.CAREGIVER,
          'user-me'
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTodayStatus', () => {
    it('should return today status for caregiver active assignment', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-1', userId: 'user-cg-1' });
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        caregiverId: 'cg-1',
        status: AssignmentStatus.ACTIVE,
      });
      mockAttendanceRepo.findOne.mockResolvedValue({
        id: 'att-today',
        checkInTime: new Date(),
        checkOutTime: null,
      });

      const res = await service.getTodayStatus(
        'tenant-123',
        UserRole.CAREGIVER,
        'user-cg-1'
      );

      expect(res.hasAssignment).toBe(true);
      expect(res.isCheckedIn).toBe(true);
      expect(res.isCheckedOut).toBe(false);
      expect(res.assignment).toBeDefined();
    });

    it('should return hasAssignment: false when caregiver has no assignment', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-1', userId: 'user-cg-1' });
      mockAssignmentRepo.findOne.mockResolvedValue(null);

      const res = await service.getTodayStatus(
        'tenant-123',
        UserRole.CAREGIVER,
        'user-cg-1'
      );

      expect(res.hasAssignment).toBe(false);
      expect(res.isCheckedIn).toBe(false);
    });
  });

  describe('createManual', () => {
    it('should create manual attendance and record verification', async () => {
      mockAssignmentRepo.findOne.mockResolvedValue({
        id: 'asgn-1',
        caregiverId: 'cg-1',
        customerId: 'cust-1',
      });
      mockAttendanceRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'att-manual',
          status: AttendanceStatus.PRESENT,
          verified: true,
        });

      const res = await service.createManual(
        {
          assignmentId: 'asgn-1',
          date: '2026-09-25',
          status: AttendanceStatus.PRESENT,
          verified: true,
        },
        'tenant-123',
        'verifier-user-id'
      );

      expect(mockAttendanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentId: 'asgn-1',
          date: '2026-09-25',
          verified: true,
          verifiedBy: 'verifier-user-id',
        })
      );
      expect(res).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should list attendance with filters and caregiver isolation', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-1', userId: 'user-cg-1' });

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'att-1' }], 1]),
      };

      mockAttendanceRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const res = await service.findAll(
        'tenant-123',
        { month: '2026-10', status: AttendanceStatus.PRESENT },
        UserRole.CAREGIVER,
        'user-cg-1'
      );

      expect(res.items.length).toBe(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'att.caregiver_id = :cgId',
        { cgId: 'cg-1' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'att.status = :status',
        { status: AttendanceStatus.PRESENT }
      );
    });
  });

  describe('findOne', () => {
    it('should return attendance when found', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({ id: 'att-1', caregiverId: 'cg-1' });

      const res = await service.findOne('att-1', 'tenant-123');
      expect(res.id).toBe('att-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('att-nonexistent', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('update', () => {
    it('should update attendance record and toggle verification', async () => {
      const mockAtt = {
        id: 'att-1',
        status: AttendanceStatus.PRESENT,
        verified: false,
      };
      mockAttendanceRepo.findOne
        .mockResolvedValueOnce(mockAtt)
        .mockResolvedValueOnce({ ...mockAtt, verified: true, verifiedBy: 'user-1' });

      const res = await service.update(
        'att-1',
        'tenant-123',
        { verified: true },
        'user-1'
      );

      expect(mockAttendanceRepo.save).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should delete attendance record', async () => {
      mockAttendanceRepo.findOne.mockResolvedValue({ id: 'att-1' });

      await service.remove('att-1', 'tenant-123');
      expect(mockAttendanceRepo.remove).toHaveBeenCalled();
    });
  });
});
