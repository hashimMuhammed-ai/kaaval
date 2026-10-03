import { PaymentsController } from './payments.controller';
import { UserRole } from '../common/enums/user-role.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let mockService: any;

  beforeEach(() => {
    mockService = {
      calculateMonthly: jest.fn(),
      findAll: jest.fn(),
      getShiftsBreakdown: jest.fn(),
      exportMonthlyReport: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    controller = new PaymentsController(mockService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('calculateMonthly', () => {
    it('should invoke service.calculateMonthly with dto and tenantId', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'owner-1', role: UserRole.OWNER };
      const dto = { month: '2026-09', caregiverId: 'cg-1' };
      const serviceResponse = {
        month: '2026-09',
        processedCount: 1,
        payments: [{ id: 'pmt-1', netPayout: 2500 }],
      };
      mockService.calculateMonthly.mockResolvedValue(serviceResponse);

      const result = await controller.calculateMonthly(dto, mockUser);

      expect(mockService.calculateMonthly).toHaveBeenCalledWith(dto, 'tenant-123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(serviceResponse);
    });
  });

  describe('findAll', () => {
    it('should return paginated payment items and metadata', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'staff-1', role: UserRole.OFFICE_STAFF };
      const query = { month: '2026-09', page: 1, limit: 10 };
      const serviceResponse = {
        items: [{ id: 'pmt-1', periodMonth: '2026-09', netPayout: 5000 }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        stats: {
          totalCaregivers: 1,
          totalDaysWorked: 10,
          totalGross: 6000,
          totalCommission: 900,
          totalNetPayout: 5000,
        },
      };
      mockService.findAll.mockResolvedValue(serviceResponse);

      const result = await controller.findAll(mockUser, query as any);

      expect(mockService.findAll).toHaveBeenCalledWith(
        'tenant-123',
        query,
        UserRole.OFFICE_STAFF,
        'staff-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(serviceResponse.items);
      expect(result.meta.stats.totalNetPayout).toBe(5000);
    });
  });

  describe('getShiftsBreakdown', () => {
    it('should retrieve itemized daily shift breakdown for caregiver', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'owner-1', role: UserRole.OWNER };
      const breakdown = {
        caregiverId: 'cg-1',
        caregiverName: 'Lakshmi Nair',
        month: '2026-09',
        totalDaysWorked: 2,
        grossAmount: 2000,
        commissionAmount: 300,
        deductions: 0,
        netPayout: 1700,
        shifts: [],
      };
      mockService.getShiftsBreakdown.mockResolvedValue(breakdown);

      const result = await controller.getShiftsBreakdown('cg-1', '2026-09', mockUser);

      expect(mockService.getShiftsBreakdown).toHaveBeenCalledWith(
        'cg-1',
        '2026-09',
        'tenant-123',
        UserRole.OWNER,
        'owner-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(breakdown);
    });
  });

  describe('findOne', () => {
    it('should return a specific payment statement', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'user-1', role: UserRole.OWNER };
      const payment = { id: 'pmt-1', netPayout: 7500 };
      mockService.findOne.mockResolvedValue(payment);

      const result = await controller.findOne('pmt-1', mockUser);

      expect(mockService.findOne).toHaveBeenCalledWith(
        'pmt-1',
        'tenant-123',
        UserRole.OWNER,
        'user-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(payment);
    });
  });

  describe('update', () => {
    it('should update payment statement and return updated entity', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'staff-1', role: UserRole.OFFICE_STAFF };
      const dto = { status: PaymentStatus.APPROVED, deductions: 200 };
      const updated = { id: 'pmt-1', status: PaymentStatus.APPROVED, deductions: 200, netPayout: 7300 };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('pmt-1', dto, mockUser);

      expect(mockService.update).toHaveBeenCalledWith(
        'pmt-1',
        'tenant-123',
        dto,
        'staff-1'
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('exportMonthlyReport', () => {
    it('should return CSV text and set HTTP download headers when format is csv', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'staff-1', role: UserRole.OFFICE_STAFF };
      const mockRes: any = { setHeader: jest.fn() };
      const exportData = {
        filename: 'salary-report-2026-09.csv',
        month: '2026-09',
        recordCount: 1,
        totals: { totalCaregivers: 1, totalGross: 10000, totalNetPayout: 8500 },
        records: [{ id: 'pmt-1' }],
        csvContent: 'Caregiver Name,Gross\nAnita,10000',
      };
      mockService.exportMonthlyReport.mockResolvedValue(exportData);

      const result = await controller.exportMonthlyReport(
        '2026-09',
        PaymentStatus.APPROVED,
        'csv',
        mockUser,
        mockRes
      );

      expect(mockService.exportMonthlyReport).toHaveBeenCalledWith(
        'tenant-123',
        '2026-09',
        PaymentStatus.APPROVED
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="salary-report-2026-09.csv"'
      );
      expect(result).toBe(exportData.csvContent);
    });

    it('should return JSON structure with totals when format is json', async () => {
      const mockUser: any = { tenantId: 'tenant-123', userId: 'owner-1', role: UserRole.OWNER };
      const exportData = {
        filename: 'salary-report-2026-09.csv',
        month: '2026-09',
        recordCount: 1,
        totals: { totalCaregivers: 1, totalGross: 10000, totalNetPayout: 8500 },
        records: [{ id: 'pmt-1' }],
        csvContent: '...',
      };
      mockService.exportMonthlyReport.mockResolvedValue(exportData);

      const result = await controller.exportMonthlyReport(
        '2026-09',
        PaymentStatus.APPROVED,
        'json',
        mockUser
      );

      const jsonResult = result as any;
      expect(jsonResult.success).toBe(true);
      expect(jsonResult.data).toEqual(exportData.records);
      expect(jsonResult.meta.totals.totalNetPayout).toBe(8500);
    });
  });
});

