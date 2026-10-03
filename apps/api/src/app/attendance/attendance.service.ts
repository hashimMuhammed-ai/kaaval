import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateManualAttendanceDto } from './dto/create-manual-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { AssignmentStatus } from '../common/enums/assignment-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface AttendanceListResult {
  items: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TodayAttendanceStatusResult {
  date: string;
  hasAssignment: boolean;
  assignment: Assignment | null;
  attendance: Attendance | null;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>
  ) {}

  /**
   * Helper to format Date to 'YYYY-MM-DD'
   */
  private getTodayDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Record Check-in for an assignment on a given date (defaults to today).
   * Callable by Caregiver (for own assignment) or Office Staff / Owner.
   */
  async checkIn(
    dto: CheckInDto,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Attendance> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required.');
    }

    const targetDate = dto.date || this.getTodayDateString();

    const assignment = await this.assignmentRepository.findOne({
      where: { id: dto.assignmentId, tenantId },
      relations: ['caregiver', 'customer'],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${dto.assignmentId} not found.`);
    }

    // Role check for caregiver
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || assignment.caregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregivers may only check in for their own assigned customer.'
        );
      }
      if (assignment.status !== AssignmentStatus.ACTIVE) {
        throw new BadRequestException(
          `Cannot check in: Assignment status is '${assignment.status}'.`
        );
      }
    }

    // Check if attendance row already exists for (assignmentId, targetDate)
    let attendance = await this.attendanceRepository.findOne({
      where: { assignmentId: assignment.id, date: targetDate, tenantId },
      relations: ['assignment', 'caregiver', 'customer'],
    });

    const checkInTime = dto.checkInTime ? new Date(dto.checkInTime) : new Date();

    if (attendance) {
      if (attendance.checkInTime) {
        throw new BadRequestException(
          `Attendance check-in already recorded for this assignment on ${targetDate}.`
        );
      }
      attendance.checkInTime = checkInTime;
      if (dto.latitude !== undefined) attendance.checkInLatitude = dto.latitude;
      if (dto.longitude !== undefined) attendance.checkInLongitude = dto.longitude;
      if (dto.notes) attendance.checkInNotes = dto.notes;
      attendance.status = AttendanceStatus.PRESENT;
    } else {
      attendance = this.attendanceRepository.create({
        tenantId,
        assignmentId: assignment.id,
        caregiverId: assignment.caregiverId,
        customerId: assignment.customerId,
        date: targetDate,
        checkInTime,
        status: AttendanceStatus.PRESENT,
        checkInLatitude: dto.latitude || null,
        checkInLongitude: dto.longitude || null,
        checkInNotes: dto.notes || null,
      });
    }

    const saved = await this.attendanceRepository.save(attendance);

    this.logger.log(
      `Check-in recorded: Attendance=${saved.id}, Assignment=${assignment.id}, Date=${targetDate}`
    );

    return this.findOne(saved.id, tenantId);
  }

  /**
   * Record Check-out for an attendance record (by attendanceId or assignmentId + date).
   */
  async checkOut(
    dto: CheckOutDto,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Attendance> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required.');
    }

    const targetDate = dto.date || this.getTodayDateString();

    let attendance: Attendance | null = null;
    if (dto.attendanceId) {
      attendance = await this.attendanceRepository.findOne({
        where: { id: dto.attendanceId, tenantId },
        relations: ['assignment', 'caregiver', 'customer'],
      });
    } else if (dto.assignmentId) {
      attendance = await this.attendanceRepository.findOne({
        where: { assignmentId: dto.assignmentId, date: targetDate, tenantId },
        relations: ['assignment', 'caregiver', 'customer'],
      });
    } else {
      throw new BadRequestException('Either attendanceId or assignmentId must be provided.');
    }

    if (!attendance) {
      throw new NotFoundException(
        `No attendance record found for this assignment on ${targetDate}. Please record check-in first.`
      );
    }

    // Role check for caregiver
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || attendance.caregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregivers may only check out of their own assigned shift.'
        );
      }
    }

    if (attendance.checkOutTime) {
      throw new BadRequestException(
        `Check-out has already been recorded for this attendance shift on ${attendance.date}.`
      );
    }

    if (!attendance.checkInTime) {
      throw new BadRequestException('Cannot check out without a valid check-in time recorded.');
    }

    const checkOutTime = dto.checkOutTime ? new Date(dto.checkOutTime) : new Date();

    attendance.checkOutTime = checkOutTime;
    if (dto.latitude !== undefined) attendance.checkOutLatitude = dto.latitude;
    if (dto.longitude !== undefined) attendance.checkOutLongitude = dto.longitude;
    if (dto.notes) attendance.checkOutNotes = dto.notes;
    if (dto.status) attendance.status = dto.status;

    const saved = await this.attendanceRepository.save(attendance);

    this.logger.log(
      `Check-out recorded: Attendance=${saved.id}, Assignment=${saved.assignmentId}, Date=${saved.date}`
    );

    return this.findOne(saved.id, tenantId);
  }

  /**
   * Get today's attendance status for one-tap caregiver dashboard check-in/out button.
   */
  async getTodayStatus(
    tenantId: string,
    userRole?: string,
    userId?: string,
    assignmentId?: string
  ): Promise<TodayAttendanceStatusResult> {
    const today = this.getTodayDateString();

    let targetAssignment: Assignment | null = null;

    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (caregiver) {
        targetAssignment = await this.assignmentRepository.findOne({
          where: {
            tenantId,
            caregiverId: caregiver.id,
            status: AssignmentStatus.ACTIVE,
          },
          relations: ['customer', 'caregiver'],
          order: { startDate: 'DESC' },
        });
      }
    } else if (assignmentId) {
      targetAssignment = await this.assignmentRepository.findOne({
        where: { id: assignmentId, tenantId },
        relations: ['customer', 'caregiver'],
      });
    }

    if (!targetAssignment) {
      return {
        date: today,
        hasAssignment: false,
        assignment: null,
        attendance: null,
        isCheckedIn: false,
        isCheckedOut: false,
      };
    }

    const attendance = await this.attendanceRepository.findOne({
      where: {
        assignmentId: targetAssignment.id,
        date: today,
        tenantId,
      },
      relations: ['customer', 'caregiver'],
    });

    return {
      date: today,
      hasAssignment: true,
      assignment: targetAssignment,
      attendance,
      isCheckedIn: !!attendance?.checkInTime,
      isCheckedOut: !!attendance?.checkOutTime,
    };
  }

  /**
   * Manual attendance entry / correction by Owner or Office Staff.
   */
  async createManual(
    dto: CreateManualAttendanceDto,
    tenantId: string,
    verifiedByUserId?: string
  ): Promise<Attendance> {
    const assignment = await this.assignmentRepository.findOne({
      where: { id: dto.assignmentId, tenantId },
    });
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${dto.assignmentId} not found.`);
    }

    let attendance = await this.attendanceRepository.findOne({
      where: { assignmentId: assignment.id, date: dto.date, tenantId },
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        tenantId,
        assignmentId: assignment.id,
        caregiverId: assignment.caregiverId,
        customerId: assignment.customerId,
        date: dto.date,
      });
    }

    attendance.status = dto.status || AttendanceStatus.PRESENT;
    if (dto.checkInTime) attendance.checkInTime = new Date(dto.checkInTime);
    if (dto.checkOutTime) attendance.checkOutTime = new Date(dto.checkOutTime);
    if (dto.checkInNotes) attendance.checkInNotes = dto.checkInNotes;
    if (dto.checkOutNotes) attendance.checkOutNotes = dto.checkOutNotes;

    if (dto.verified !== undefined) {
      attendance.verified = dto.verified;
      if (dto.verified && verifiedByUserId) {
        attendance.verifiedBy = verifiedByUserId;
        attendance.verifiedAt = new Date();
      } else if (!dto.verified) {
        attendance.verifiedBy = null;
        attendance.verifiedAt = null;
      }
    }

    const saved = await this.attendanceRepository.save(attendance);
    return this.findOne(saved.id, tenantId);
  }

  /**
   * List attendance with filters (date range, caregiver, customer, assignment, status).
   */
  async findAll(
    tenantId: string,
    query: QueryAttendanceDto = {},
    userRole?: string,
    userId?: string
  ): Promise<AttendanceListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 31;
    const skip = (page - 1) * limit;

    const qb = this.attendanceRepository
      .createQueryBuilder('att')
      .where('att.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('att.assignment', 'assignment')
      .leftJoinAndSelect('att.caregiver', 'caregiver')
      .leftJoinAndSelect('att.customer', 'customer')
      .leftJoinAndSelect('att.verifiedByUser', 'verifier');

    // Caregiver isolation: can only see their own attendance
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      qb.andWhere('att.caregiver_id = :cgId', { cgId: caregiver.id });
    }

    if (query.assignmentId) {
      qb.andWhere('att.assignment_id = :asgnId', { asgnId: query.assignmentId });
    }

    if (query.caregiverId) {
      qb.andWhere('att.caregiver_id = :caregiverId', { caregiverId: query.caregiverId });
    }

    if (query.customerId) {
      qb.andWhere('att.customer_id = :customerId', { customerId: query.customerId });
    }

    if (query.status) {
      qb.andWhere('att.status = :status', { status: query.status });
    }

    if (query.startDate) {
      qb.andWhere('att.date >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('att.date <= :endDate', { endDate: query.endDate });
    }

    // Month filter (e.g. '2026-09')
    if (query.month) {
      qb.andWhere('TO_CHAR(att.date, \'YYYY-MM\') = :month', { month: query.month });
    }

    if (query.year) {
      qb.andWhere('EXTRACT(YEAR FROM att.date) = :year', { year: query.year });
    }

    qb.orderBy('att.date', 'DESC')
      .addOrderBy('att.check_in_time', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Find single attendance record.
   */
  async findOne(
    id: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id, tenantId },
      relations: ['assignment', 'caregiver', 'customer', 'verifiedByUser'],
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance record with ID ${id} not found.`);
    }

    // Role check for caregiver
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || attendance.caregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregivers may only view their own attendance records.'
        );
      }
    }

    return attendance;
  }

  /**
   * Update attendance record (times, notes, status, verification).
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdateAttendanceDto,
    verifiedByUserId?: string
  ): Promise<Attendance> {
    const attendance = await this.findOne(id, tenantId);

    if (dto.status !== undefined) attendance.status = dto.status;
    if (dto.checkInTime !== undefined) {
      attendance.checkInTime = dto.checkInTime ? new Date(dto.checkInTime) : null;
    }
    if (dto.checkOutTime !== undefined) {
      attendance.checkOutTime = dto.checkOutTime ? new Date(dto.checkOutTime) : null;
    }
    if (dto.checkInNotes !== undefined) attendance.checkInNotes = dto.checkInNotes;
    if (dto.checkOutNotes !== undefined) attendance.checkOutNotes = dto.checkOutNotes;

    if (dto.verified !== undefined) {
      attendance.verified = dto.verified;
      if (dto.verified && verifiedByUserId) {
        attendance.verifiedBy = verifiedByUserId;
        attendance.verifiedAt = new Date();
      } else if (!dto.verified) {
        attendance.verifiedBy = null;
        attendance.verifiedAt = null;
      }
    }

    await this.attendanceRepository.save(attendance);
    return this.findOne(id, tenantId);
  }

  /**
   * Delete attendance record (Owner and Office Staff).
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const attendance = await this.findOne(id, tenantId);
    await this.attendanceRepository.remove(attendance);
  }
}
