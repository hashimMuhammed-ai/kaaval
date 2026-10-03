import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { UserRole } from '../common/enums/user-role.enum';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentRepo: any;
  let mockAttendanceRepo: any;
  let mockCaregiverRepo: any;
  let mockAssignmentRepo: any;

  beforeEach(() => {
    mockPaymentRepo = {
      create: jest.fn((data) => ({ id: 'new-pmt-uuid', ...data })),
      save: jest.fn(async (data) => ({ id: data.id || 'saved-pmt-uuid', ...data })),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockAttendanceRepo = {
      createQueryBuilder: jest.fn(),
    };

    mockCaregiverRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockAssignmentRepo = {
      findOne: jest.fn(),
    };

    service = new PaymentsService(
      mockPaymentRepo,
      mockAttendanceRepo,
      mockCaregiverRepo,
      mockAssignmentRepo
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCaregiverSalary', () => {
    const tenantId = 'tenant-123';
    const caregiverId = 'cg-1';
    const month = '2026-09';

    it('should throw NotFoundException if caregiver does not exist', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculateCaregiverSalary(caregiverId, month, tenantId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should accurately compute days worked, gross, commission split, and net payout', async () => {
      const mockCaregiver = {
        id: caregiverId,
        tenantId,
        fullName: 'Lakshmi Nair',
        dailyRate: 1000,
        commissionPercentage: 15,
      };
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      // Shifts: 2 PRESENT (1.0 each), 1 HALF_DAY (0.5), 1 ABSENT, 1 ON_LEAVE
      // One shift has assignment.caregiverDailyRate = 1200 (overriding 1000)
      const mockShifts = [
        {
          date: '2026-09-01',
          status: AttendanceStatus.PRESENT,
          assignment: { caregiverDailyRate: 1000 },
        },
        {
          date: '2026-09-02',
          status: AttendanceStatus.PRESENT,
          assignment: { caregiverDailyRate: 1200 }, // override
        },
        {
          date: '2026-09-03',
          status: AttendanceStatus.HALF_DAY,
          assignment: { caregiverDailyRate: 1000 }, // 0.5 * 1000 = 500
        },
        {
          date: '2026-09-04',
          status: AttendanceStatus.ABSENT,
          assignment: { caregiverDailyRate: 1000 },
        },
        {
          date: '2026-09-05',
          status: AttendanceStatus.ON_LEAVE,
          assignment: { caregiverDailyRate: 1000 },
        },
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockShifts),
      };
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(mockQb);

      // Existing payment: null (first time calculation)
      mockPaymentRepo.findOne
        .mockResolvedValueOnce(null) // in calculateCaregiverSalary (check existing)
        .mockResolvedValueOnce({
          id: 'saved-pmt-uuid',
          caregiverId,
          periodMonth: month,
          totalDaysWorked: 2.5,
          grossAmount: 2700,
          commissionPercentage: 15,
          commissionAmount: 405,
          deductions: 0,
          netPayout: 2295,
          status: PaymentStatus.DRAFT,
        }); // in findOne call at the end

      const result = await service.calculateCaregiverSalary(caregiverId, month, tenantId);

      // Expected math:
      // totalDaysWorked = 1.0 + 1.0 + 0.5 = 2.5 days
      // Gross = (1.0 * 1000) + (1.0 * 1200) + (0.5 * 1000) = 1000 + 1200 + 500 = 2700
      // Commission (15%) = 2700 * 0.15 = 405
      // Net = 2700 - 405 = 2295
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          caregiverId,
          periodMonth: month,
          daysPresent: 2,
          daysHalfDay: 1,
          daysAbsent: 1,
          daysOnLeave: 1,
          totalDaysWorked: 2.5,
          dailyRate: 1000,
          grossAmount: 2700,
          commissionPercentage: 15,
          commissionAmount: 405,
          deductions: 0,
          netPayout: 2295,
          status: PaymentStatus.DRAFT,
        })
      );
      expect(result.netPayout).toBe(2295);
    });

    it('should preserve existing deductions and subtract them from net payout', async () => {
      const mockCaregiver = {
        id: caregiverId,
        tenantId,
        fullName: 'Lakshmi Nair',
        dailyRate: 800,
        commissionPercentage: 10,
      };
      mockCaregiverRepo.findOne.mockResolvedValue(mockCaregiver);

      const mockShifts = [
        {
          date: '2026-09-01',
          status: AttendanceStatus.PRESENT,
          assignment: { caregiverDailyRate: 800 },
        },
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockShifts),
      };
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(mockQb);

      const existingPayment = {
        id: 'existing-pmt-1',
        caregiverId,
        periodMonth: month,
        deductions: 100, // existing deduction
      };

      mockPaymentRepo.findOne
        .mockResolvedValueOnce(existingPayment) // found existing
        .mockResolvedValueOnce({
          ...existingPayment,
          grossAmount: 800,
          commissionAmount: 80,
          deductions: 100,
          netPayout: 620, // 800 - 80 - 100
        });

      await service.calculateCaregiverSalary(caregiverId, month, tenantId);

      // Gross = 800, Commission (10%) = 80, Deductions = 100, Net = 620
      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          grossAmount: 800,
          commissionAmount: 80,
          deductions: 100,
          netPayout: 620,
        })
      );
    });
  });

  describe('calculateMonthly', () => {
    it('should throw BadRequestException if tenantId is missing', async () => {
      await expect(
        service.calculateMonthly({ month: '2026-09' }, '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should compute monthly salary for all caregivers when caregiverId is omitted', async () => {
      const caregivers = [
        { id: 'cg-1', fullName: 'Caregiver One' },
        { id: 'cg-2', fullName: 'Caregiver Two' },
      ];
      mockCaregiverRepo.find.mockResolvedValue(caregivers);
      jest.spyOn(service, 'calculateCaregiverSalary').mockResolvedValue({ id: 'pmt-x' } as any);

      const result = await service.calculateMonthly({ month: '2026-09' }, 'tenant-123');

      expect(mockCaregiverRepo.find).toHaveBeenCalledWith({ where: { tenantId: 'tenant-123' } });
      expect(service.calculateCaregiverSalary).toHaveBeenCalledTimes(2);
      expect(result.processedCount).toBe(2);
    });

    it('should compute salary only for specified caregiver when caregiverId is provided', async () => {
      jest.spyOn(service, 'calculateCaregiverSalary').mockResolvedValue({ id: 'pmt-cg-1' } as any);

      const result = await service.calculateMonthly(
        { month: '2026-09', caregiverId: 'cg-1' },
        'tenant-123'
      );

      expect(mockCaregiverRepo.find).not.toHaveBeenCalled();
      expect(service.calculateCaregiverSalary).toHaveBeenCalledWith('cg-1', '2026-09', 'tenant-123');
      expect(result.processedCount).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return paginated list and summary stats for agency staff', async () => {
      const mockPayments = [
        { id: 'pmt-1', totalDaysWorked: 10, grossAmount: 10000, commissionAmount: 1500, netPayout: 8500 },
        { id: 'pmt-2', totalDaysWorked: 15, grossAmount: 15000, commissionAmount: 2250, netPayout: 12750 },
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockPayments, 2]),
      };

      const mockStatsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalCaregivers: '2',
          totalDaysWorked: '25.0',
          totalGross: '25000.00',
          totalCommission: '3750.00',
          totalNetPayout: '21250.00',
        }),
      };

      mockPaymentRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockStatsQb);

      const result = await service.findAll('tenant-123', { month: '2026-09' }, UserRole.OWNER);

      expect(result.total).toBe(2);
      expect(result.stats.totalGross).toBe(25000);
      expect(result.stats.totalNetPayout).toBe(21250);
      expect(result.stats.totalCommission).toBe(3750);
    });

    it('should filter payments to current caregiver when role is CAREGIVER', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({ id: 'cg-self-id', userId: 'user-cg' });

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      const mockStatsQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalCaregivers: '0',
          totalDaysWorked: '0',
          totalGross: '0',
          totalCommission: '0',
          totalNetPayout: '0',
        }),
      };

      mockPaymentRepo.createQueryBuilder
        .mockReturnValueOnce(mockQb)
        .mockReturnValueOnce(mockStatsQb);

      await service.findAll('tenant-123', {}, UserRole.CAREGIVER, 'user-cg');

      expect(mockCaregiverRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-cg', tenantId: 'tenant-123' },
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('pmt.caregiver_id = :cgId', {
        cgId: 'cg-self-id',
      });
    });
  });

  describe('getShiftsBreakdown', () => {
    it('should throw ForbiddenException if a caregiver accesses another caregivers breakdown', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-other',
        userId: 'other-user-uuid',
      });

      await expect(
        service.getShiftsBreakdown('cg-other', '2026-09', 'tenant-123', UserRole.CAREGIVER, 'my-user-uuid')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return itemized daily shift breakdown with daily rate and gross earned', async () => {
      mockCaregiverRepo.findOne.mockResolvedValue({
        id: 'cg-1',
        fullName: 'Anita Thomas',
        dailyRate: 900,
        commissionPercentage: 15,
      });

      const mockShifts = [
        {
          date: '2026-09-01',
          status: AttendanceStatus.PRESENT,
          assignmentId: 'asgn-1',
          assignment: { caregiverDailyRate: 900 },
          customer: { patientName: 'Ramanathan' },
        },
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockShifts),
      };
      mockAttendanceRepo.createQueryBuilder.mockReturnValue(mockQb);
      mockPaymentRepo.findOne.mockResolvedValue({ deductions: 50 });

      const breakdown = await service.getShiftsBreakdown('cg-1', '2026-09', 'tenant-123', UserRole.OWNER);

      expect(breakdown.caregiverName).toBe('Anita Thomas');
      expect(breakdown.totalDaysWorked).toBe(1.0);
      expect(breakdown.grossAmount).toBe(900);
      expect(breakdown.commissionAmount).toBe(135);
      expect(breakdown.deductions).toBe(50);
      expect(breakdown.netPayout).toBe(715); // 900 - 135 - 50 = 715
      expect(breakdown.shifts).toHaveLength(1);
      expect(breakdown.shifts[0].earnedGross).toBe(900);
      expect(breakdown.shifts[0].customerName).toBe('Ramanathan');
    });
  });

  describe('update', () => {
    it('should update deductions and recalculate net payout', async () => {
      const existingPayment = {
        id: 'pmt-1',
        tenantId: 'tenant-123',
        grossAmount: 10000,
        commissionAmount: 1500,
        deductions: 0,
        netPayout: 8500,
        status: PaymentStatus.DRAFT,
      };

      jest.spyOn(service, 'findOne')
        .mockResolvedValueOnce(existingPayment as any)
        .mockResolvedValueOnce({
          ...existingPayment,
          deductions: 500,
          netPayout: 8000,
        } as any);

      const result = await service.update('pmt-1', 'tenant-123', { deductions: 500 });

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deductions: 500,
          netPayout: 8000,
        })
      );
      expect(result.netPayout).toBe(8000);
    });

    it('should record approval metadata when status is set to APPROVED', async () => {
      const existingPayment = {
        id: 'pmt-1',
        tenantId: 'tenant-123',
        grossAmount: 10000,
        commissionAmount: 1500,
        deductions: 0,
        netPayout: 8500,
        status: PaymentStatus.DRAFT,
      };

      jest.spyOn(service, 'findOne')
        .mockResolvedValueOnce(existingPayment as any)
        .mockResolvedValueOnce({
          ...existingPayment,
          status: PaymentStatus.APPROVED,
          approvedBy: 'staff-user-1',
        } as any);

      await service.update(
        'pmt-1',
        'tenant-123',
        { status: PaymentStatus.APPROVED },
        'staff-user-1'
      );

      expect(mockPaymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.APPROVED,
          approvedBy: 'staff-user-1',
        })
      );
    });
  });

  describe('exportMonthlyReport', () => {
    it('should generate RFC 4180 CSV and aggregated totals for owner/staff', async () => {
      const mockPayments = [
        {
          id: 'pmt-1',
          caregiverId: 'cg-1',
          periodMonth: '2026-09',
          totalDaysWorked: 10.0,
          daysPresent: 10,
          daysHalfDay: 0,
          daysAbsent: 1,
          daysOnLeave: 0,
          dailyRate: 1000,
          grossAmount: 10000,
          commissionPercentage: 15,
          commissionAmount: 1500,
          deductions: 0,
          netPayout: 8500,
          status: PaymentStatus.APPROVED,
          caregiver: {
            fullName: 'Anita Thomas',
            phone: '+919876543210',
            district: 'Ernakulam',
          },
          approvedByUser: {
            name: 'Manager Staff',
          },
        },
      ];

      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPayments),
      };
      mockPaymentRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.exportMonthlyReport('tenant-123', '2026-09', PaymentStatus.APPROVED);

      expect(result.month).toBe('2026-09');
      expect(result.filename).toBe('salary-report-2026-09.csv');
      expect(result.recordCount).toBe(1);
      expect(result.totals.totalCaregivers).toBe(1);
      expect(result.totals.totalDaysWorked).toBe(10);
      expect(result.totals.totalGross).toBe(10000);
      expect(result.totals.totalCommission).toBe(1500);
      expect(result.totals.totalNetPayout).toBe(8500);

      // Verify CSV contents
      expect(result.csvContent).toContain('Caregiver Name,Phone,District,Period Month');
      expect(result.csvContent).toContain('Anita Thomas');
      expect(result.csvContent).toContain('10000.00');
      expect(result.csvContent).toContain('1500.00');
      expect(result.csvContent).toContain('8500.00');
      expect(result.csvContent).toContain('TOTAL / AGENCY SUMMARY');
    });
  });
});

