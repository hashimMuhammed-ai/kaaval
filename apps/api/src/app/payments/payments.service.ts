import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Caregiver } from '../caregivers/entities/caregiver.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { CalculateMonthlySalaryDto } from './dto/calculate-monthly-salary.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

export interface ShiftBreakdownItem {
  date: string;
  status: AttendanceStatus;
  checkInTime?: Date | null;
  checkOutTime?: Date | null;
  dayFactor: number;
  dailyRate: number;
  earnedGross: number;
  customerName?: string;
  assignmentId: string;
}

export interface CaregiverMonthlyBreakdown {
  caregiverId: string;
  caregiverName: string;
  month: string;
  dailyRate: number;
  commissionPercentage: number;
  totalDaysWorked: number;
  grossAmount: number;
  commissionAmount: number;
  deductions: number;
  netPayout: number;
  shifts: ShiftBreakdownItem[];
}

export interface PaymentsListResult {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    totalCaregivers: number;
    totalDaysWorked: number;
    totalGross: number;
    totalCommission: number;
    totalNetPayout: number;
  };
}

export interface MonthlySalaryExportTotals {
  totalCaregivers: number;
  totalDaysWorked: number;
  totalGross: number;
  totalCommission: number;
  totalDeductions: number;
  totalNetPayout: number;
}

export interface MonthlySalaryExportResult {
  filename: string;
  month: string;
  recordCount: number;
  totals: MonthlySalaryExportTotals;
  records: Payment[];
  csvContent: string;
}

function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Caregiver)
    private readonly caregiverRepository: Repository<Caregiver>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>
  ) {}

  /**
   * Calculate or recalculate monthly salary for a single caregiver for a specific month.
   */
  async calculateCaregiverSalary(
    caregiverId: string,
    month: string,
    tenantId: string
  ): Promise<Payment> {
    const caregiver = await this.caregiverRepository.findOne({
      where: { id: caregiverId, tenantId },
    });
    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${caregiverId}" not found.`);
    }

    // Fetch all attendance shifts in the target month (e.g. '2026-09')
    const shifts = await this.attendanceRepository
      .createQueryBuilder('att')
      .where('att.tenant_id = :tenantId', { tenantId })
      .andWhere('att.caregiver_id = :caregiverId', { caregiverId })
      .andWhere('TO_CHAR(att.date, \'YYYY-MM\') = :month', { month })
      .leftJoinAndSelect('att.assignment', 'assignment')
      .leftJoinAndSelect('att.customer', 'customer')
      .orderBy('att.date', 'ASC')
      .getMany();

    let daysPresent = 0;
    let daysHalfDay = 0;
    let daysAbsent = 0;
    let daysOnLeave = 0;
    let grossAmount = 0;

    for (const shift of shifts) {
      let dayFactor = 0;
      if (shift.status === AttendanceStatus.PRESENT) {
        daysPresent += 1;
        dayFactor = 1.0;
      } else if (shift.status === AttendanceStatus.HALF_DAY) {
        daysHalfDay += 1;
        dayFactor = 0.5;
      } else if (shift.status === AttendanceStatus.ABSENT) {
        daysAbsent += 1;
      } else if (shift.status === AttendanceStatus.ON_LEAVE) {
        daysOnLeave += 1;
      }

      if (dayFactor > 0) {
        // Daily rate: assignment rate takes precedence if specified, fallback to caregiver's base rate
        const shiftRate =
          shift.assignment?.caregiverDailyRate && shift.assignment.caregiverDailyRate > 0
            ? Number(shift.assignment.caregiverDailyRate)
            : Number(caregiver.dailyRate || 0);

        grossAmount += dayFactor * shiftRate;
      }
    }

    const totalDaysWorked = Number((daysPresent * 1.0 + daysHalfDay * 0.5).toFixed(1));
    grossAmount = Number(grossAmount.toFixed(2));

    const commissionPercentage = Number(caregiver.commissionPercentage ?? 15);
    const commissionAmount = Number(((grossAmount * commissionPercentage) / 100).toFixed(2));

    // Check for existing payment statement to preserve existing deductions, status, or transaction metadata
    let payment = await this.paymentRepository.findOne({
      where: { caregiverId, periodMonth: month, tenantId },
    });

    const deductions = payment ? Number(payment.deductions || 0) : 0;
    const netPayout = Number(Math.max(0, grossAmount - commissionAmount - deductions).toFixed(2));

    if (payment) {
      payment.daysPresent = daysPresent;
      payment.daysHalfDay = daysHalfDay;
      payment.daysAbsent = daysAbsent;
      payment.daysOnLeave = daysOnLeave;
      payment.totalDaysWorked = totalDaysWorked;
      payment.dailyRate = Number(caregiver.dailyRate || 0);
      payment.grossAmount = grossAmount;
      payment.commissionPercentage = commissionPercentage;
      payment.commissionAmount = commissionAmount;
      payment.netPayout = netPayout;
      payment.computedAt = new Date();
    } else {
      payment = this.paymentRepository.create({
        tenantId,
        caregiverId,
        periodMonth: month,
        daysPresent,
        daysHalfDay,
        daysAbsent,
        daysOnLeave,
        totalDaysWorked,
        dailyRate: Number(caregiver.dailyRate || 0),
        grossAmount,
        commissionPercentage,
        commissionAmount,
        deductions,
        netPayout,
        status: PaymentStatus.DRAFT,
        computedAt: new Date(),
      });
    }

    const saved = await this.paymentRepository.save(payment);
    this.logger.log(
      `Computed salary for Caregiver ${caregiver.fullName} (${month}): ${totalDaysWorked} days, Gross=₹${grossAmount}, Net=₹${netPayout}`
    );

    return this.findOne(saved.id, tenantId);
  }

  /**
   * Run monthly salary calculations for one or all caregivers in the agency.
   */
  async calculateMonthly(
    dto: CalculateMonthlySalaryDto,
    tenantId: string
  ): Promise<{ month: string; processedCount: number; payments: Payment[] }> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required.');
    }

    if (dto.caregiverId) {
      const payment = await this.calculateCaregiverSalary(
        dto.caregiverId,
        dto.month,
        tenantId
      );
      return {
        month: dto.month,
        processedCount: 1,
        payments: [payment],
      };
    }

    // Process all caregivers belonging to this tenant
    const caregivers = await this.caregiverRepository.find({
      where: { tenantId },
    });

    const payments: Payment[] = [];
    for (const cg of caregivers) {
      const p = await this.calculateCaregiverSalary(cg.id, dto.month, tenantId);
      payments.push(p);
    }

    return {
      month: dto.month,
      processedCount: payments.length,
      payments,
    };
  }

  /**
   * List monthly payment statements with filters, pagination, and aggregate financial totals.
   */
  async findAll(
    tenantId: string,
    query: QueryPaymentsDto = {},
    userRole?: string,
    userId?: string
  ): Promise<PaymentsListResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const qb = this.paymentRepository
      .createQueryBuilder('pmt')
      .where('pmt.tenant_id = :tenantId', { tenantId })
      .leftJoinAndSelect('pmt.caregiver', 'caregiver')
      .leftJoinAndSelect('pmt.approvedByUser', 'approvedByUser');

    // Caregiver isolation: Caregiver can only see their own salary statements
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 1,
          stats: {
            totalCaregivers: 0,
            totalDaysWorked: 0,
            totalGross: 0,
            totalCommission: 0,
            totalNetPayout: 0,
          },
        };
      }
      qb.andWhere('pmt.caregiver_id = :cgId', { cgId: caregiver.id });
    }

    if (query.month) {
      qb.andWhere('pmt.period_month = :month', { month: query.month });
    }

    if (query.caregiverId) {
      qb.andWhere('pmt.caregiver_id = :caregiverId', { caregiverId: query.caregiverId });
    }

    if (query.status) {
      qb.andWhere('pmt.status = :status', { status: query.status });
    }

    qb.orderBy('pmt.period_month', 'DESC')
      .addOrderBy('pmt.net_payout', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Compute aggregate summary metrics for the active filter set
    const statsQuery = this.paymentRepository
      .createQueryBuilder('pmt')
      .select('COUNT(*)', 'totalCaregivers')
      .addSelect('COALESCE(SUM(pmt.total_days_worked), 0)', 'totalDaysWorked')
      .addSelect('COALESCE(SUM(pmt.gross_amount), 0)', 'totalGross')
      .addSelect('COALESCE(SUM(pmt.commission_amount), 0)', 'totalCommission')
      .addSelect('COALESCE(SUM(pmt.net_payout), 0)', 'totalNetPayout')
      .where('pmt.tenant_id = :tenantId', { tenantId });

    if (query.month) {
      statsQuery.andWhere('pmt.period_month = :month', { month: query.month });
    }
    if (query.status) {
      statsQuery.andWhere('pmt.status = :status', { status: query.status });
    }
    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (caregiver) {
        statsQuery.andWhere('pmt.caregiver_id = :cgId', { cgId: caregiver.id });
      }
    }

    const rawStats = await statsQuery.getRawOne();

    const stats = {
      totalCaregivers: parseInt(rawStats?.totalCaregivers || '0', 10),
      totalDaysWorked: parseFloat(rawStats?.totalDaysWorked || '0'),
      totalGross: parseFloat(rawStats?.totalGross || '0'),
      totalCommission: parseFloat(rawStats?.totalCommission || '0'),
      totalNetPayout: parseFloat(rawStats?.totalNetPayout || '0'),
    };

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      stats,
    };
  }

  /**
   * Get itemized shift breakdown for a caregiver in a given month.
   */
  async getShiftsBreakdown(
    caregiverId: string,
    month: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<CaregiverMonthlyBreakdown> {
    let caregiver: Caregiver | null = null;
    if (caregiverId === 'me' && userId) {
      caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
    } else {
      caregiver = await this.caregiverRepository.findOne({
        where: { id: caregiverId, tenantId },
      });
    }

    if (!caregiver) {
      throw new NotFoundException(`Caregiver with ID "${caregiverId}" not found.`);
    }

    // Role check for caregiver self-view
    if (userRole === UserRole.CAREGIVER && userId && caregiver.userId !== userId) {
      throw new ForbiddenException(
        'Caregivers are not permitted to inspect other caregivers payment breakdowns.'
      );
    }

    const shifts = await this.attendanceRepository
      .createQueryBuilder('att')
      .where('att.tenant_id = :tenantId', { tenantId })
      .andWhere('att.caregiver_id = :caregiverId', { caregiverId: caregiver.id })
      .andWhere('TO_CHAR(att.date, \'YYYY-MM\') = :month', { month })
      .leftJoinAndSelect('att.assignment', 'assignment')
      .leftJoinAndSelect('att.customer', 'customer')
      .orderBy('att.date', 'ASC')
      .getMany();

    const shiftItems: ShiftBreakdownItem[] = [];
    let grossAmount = 0;
    let daysPresent = 0;
    let daysHalfDay = 0;

    for (const shift of shifts) {
      let dayFactor = 0;
      if (shift.status === AttendanceStatus.PRESENT) {
        dayFactor = 1.0;
        daysPresent += 1;
      } else if (shift.status === AttendanceStatus.HALF_DAY) {
        dayFactor = 0.5;
        daysHalfDay += 1;
      }

      const dailyRate =
        shift.assignment?.caregiverDailyRate && shift.assignment.caregiverDailyRate > 0
          ? Number(shift.assignment.caregiverDailyRate)
          : Number(caregiver.dailyRate || 0);

      const earnedGross = Number((dayFactor * dailyRate).toFixed(2));
      grossAmount += earnedGross;

      shiftItems.push({
        date: shift.date,
        status: shift.status,
        checkInTime: shift.checkInTime,
        checkOutTime: shift.checkOutTime,
        dayFactor,
        dailyRate,
        earnedGross,
        customerName: shift.customer?.patientName,
        assignmentId: shift.assignmentId,
      });
    }

    const totalDaysWorked = Number((daysPresent * 1.0 + daysHalfDay * 0.5).toFixed(1));
    grossAmount = Number(grossAmount.toFixed(2));
    const commissionPercentage = Number(caregiver.commissionPercentage ?? 15);
    const commissionAmount = Number(((grossAmount * commissionPercentage) / 100).toFixed(2));

    const existingPayment = await this.paymentRepository.findOne({
      where: { caregiverId: caregiver.id, periodMonth: month, tenantId },
    });
    const deductions = existingPayment ? Number(existingPayment.deductions || 0) : 0;
    const netPayout = Number(Math.max(0, grossAmount - commissionAmount - deductions).toFixed(2));

    return {
      caregiverId: caregiver.id,
      caregiverName: caregiver.fullName,
      month,
      dailyRate: Number(caregiver.dailyRate || 0),
      commissionPercentage,
      totalDaysWorked,
      grossAmount,
      commissionAmount,
      deductions,
      netPayout,
      shifts: shiftItems,
    };
  }

  /**
   * Find single payment record.
   */
  async findOne(
    id: string,
    tenantId: string,
    userRole?: string,
    userId?: string
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, tenantId },
      relations: ['caregiver', 'approvedByUser'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment record with ID "${id}" not found.`);
    }

    if (userRole === UserRole.CAREGIVER && userId) {
      const caregiver = await this.caregiverRepository.findOne({
        where: { userId, tenantId },
      });
      if (!caregiver || payment.caregiverId !== caregiver.id) {
        throw new ForbiddenException(
          'Caregivers may only view their own payment statements.'
        );
      }
    }

    return payment;
  }

  /**
   * Update payment record (e.g. approve, mark paid, add deductions or transaction ref).
   */
  async update(
    id: string,
    tenantId: string,
    dto: UpdatePaymentDto,
    approvedByUserId?: string
  ): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);

    if (dto.deductions !== undefined) {
      payment.deductions = dto.deductions;
      payment.netPayout = Number(
        Math.max(0, payment.grossAmount - payment.commissionAmount - payment.deductions).toFixed(2)
      );
    }

    if (dto.status !== undefined) {
      payment.status = dto.status;
      if (dto.status === PaymentStatus.APPROVED && approvedByUserId) {
        payment.approvedBy = approvedByUserId;
        payment.approvedAt = new Date();
      } else if (dto.status === PaymentStatus.PAID) {
        payment.paymentDate = dto.paymentDate || new Date().toISOString().split('T')[0];
      }
    }

    if (dto.paymentDate !== undefined) payment.paymentDate = dto.paymentDate || null;
    if (dto.paymentMethod !== undefined) payment.paymentMethod = dto.paymentMethod || null;
    if (dto.transactionReference !== undefined) {
      payment.transactionReference = dto.transactionReference || null;
    }
    if (dto.notes !== undefined) payment.notes = dto.notes || null;

    const saved = await this.paymentRepository.save(payment);
    return this.findOne(saved.id, tenantId);
  }

  /**
   * Generate an exportable monthly salary and payout report for Owner and Office Staff.
   * Produces RFC 4180 compliant CSV content and structured JSON summary.
   */
  async exportMonthlyReport(
    tenantId: string,
    month?: string,
    status?: PaymentStatus
  ): Promise<MonthlySalaryExportResult> {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const qb = this.paymentRepository
      .createQueryBuilder('pmt')
      .where('pmt.tenant_id = :tenantId', { tenantId })
      .andWhere('pmt.period_month = :targetMonth', { targetMonth })
      .leftJoinAndSelect('pmt.caregiver', 'caregiver')
      .leftJoinAndSelect('pmt.approvedByUser', 'approvedByUser')
      .orderBy('caregiver.fullName', 'ASC');

    if (status) {
      qb.andWhere('pmt.status = :status', { status });
    }

    const payments = await qb.getMany();

    let totalDaysWorked = 0;
    let totalGross = 0;
    let totalCommission = 0;
    let totalDeductions = 0;
    let totalNetPayout = 0;

    const header = [
      'Caregiver ID',
      'Caregiver Name',
      'Phone',
      'District',
      'Period Month',
      'Daily Rate (INR)',
      'Present Days',
      'Half Days',
      'Absent Days',
      'On Leave Days',
      'Total Days Worked',
      'Gross Amount (INR)',
      'Commission %',
      'Agency Commission (INR)',
      'Deductions (INR)',
      'Net Payout (INR)',
      'Status',
      'Payment Date',
      'Payment Method',
      'Transaction Reference',
      'Approved By',
      'Approved At',
      'Notes',
    ];

    const rows: string[] = [header.map(escapeCsvCell).join(',')];

    for (const p of payments) {
      const daysWorked = Number(p.totalDaysWorked || 0);
      const gross = Number(p.grossAmount || 0);
      const comm = Number(p.commissionAmount || 0);
      const ded = Number(p.deductions || 0);
      const net = Number(p.netPayout || 0);

      totalDaysWorked += daysWorked;
      totalGross += gross;
      totalCommission += comm;
      totalDeductions += ded;
      totalNetPayout += net;

      const row = [
        p.caregiverId || '',
        p.caregiver?.fullName || '',
        p.caregiver?.phone || '',
        p.caregiver?.district || '',
        p.periodMonth,
        Number(p.dailyRate || 0).toFixed(2),
        Number(p.daysPresent || 0).toFixed(1),
        Number(p.daysHalfDay || 0).toFixed(1),
        Number(p.daysAbsent || 0).toFixed(1),
        Number(p.daysOnLeave || 0).toFixed(1),
        daysWorked.toFixed(1),
        gross.toFixed(2),
        Number(p.commissionPercentage || 15).toFixed(2),
        comm.toFixed(2),
        ded.toFixed(2),
        net.toFixed(2),
        p.status,
        p.paymentDate || '',
        p.paymentMethod || '',
        p.transactionReference || '',
        p.approvedByUser?.name || '',
        p.approvedAt ? new Date(p.approvedAt).toISOString() : '',
        p.notes || '',
      ];

      rows.push(row.map(escapeCsvCell).join(','));
    }

    // Summary / Totals Row
    const summaryRow = [
      'TOTAL / AGENCY SUMMARY',
      `${payments.length} Caregivers`,
      '',
      '',
      targetMonth,
      '',
      '',
      '',
      '',
      '',
      totalDaysWorked.toFixed(1),
      totalGross.toFixed(2),
      '',
      totalCommission.toFixed(2),
      totalDeductions.toFixed(2),
      totalNetPayout.toFixed(2),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ];
    rows.push(summaryRow.map(escapeCsvCell).join(','));

    const csvContent = rows.join('\r\n');
    const filename = `salary-report-${targetMonth}.csv`;

    return {
      filename,
      month: targetMonth,
      recordCount: payments.length,
      totals: {
        totalCaregivers: payments.length,
        totalDaysWorked: Number(totalDaysWorked.toFixed(1)),
        totalGross: Number(totalGross.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2)),
        totalDeductions: Number(totalDeductions.toFixed(2)),
        totalNetPayout: Number(totalNetPayout.toFixed(2)),
      },
      records: payments,
      csvContent,
    };
  }
}

