import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSchedulerService } from './services/analytics-scheduler.service';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: jest.Mocked<Partial<AnalyticsService>>;
  let schedulerService: jest.Mocked<Partial<AnalyticsSchedulerService>>;

  const mockUser: JwtPayload = {
    sub: 'user-123',
    userId: 'user-123',
    tenantId: 'tenant-456',
    role: UserRole.OWNER,
    email: 'owner@keralacare.com',
    name: 'Rahul Nair',
  };

  const mockOverview = {
    tenantId: 'tenant-456',
    totalCaregivers: 20,
    activeWorkforceCaregivers: 18,
    assignedCaregivers: 15,
    availableCaregivers: 3,
    onLeaveCaregivers: 0,
    inactiveCaregivers: 2,
    activeAssignmentsCount: 15,
    occupancyRatePct: 75.0,
    totalRequests: 50,
    filledRequests: 45,
    pendingRequests: 5,
    avgTimeToFillHours: 16.5,
    avgTimeToFillDays: 0.69,
    fillRatePct: 90.0,
    allTimeGrossRevenue: 600000,
    allTimeCommissionRevenue: 90000,
    allTimeNetPayout: 510000,
    currentMonthGrossRevenue: 180000,
    currentMonthCommissionRevenue: 27000,
    currentMonthNetPayout: 153000,
    previousMonthCommissionRevenue: 25000,
    revenueGrowthMomPct: 8.0,
    refreshedAt: new Date(),
  };

  const mockTrend = [
    {
      id: 'trend-1',
      tenantId: 'tenant-456',
      periodMonth: '2026-09',
      grossRevenue: 180000,
      commissionRevenue: 27000,
      caregiverPayouts: 153000,
      totalDeductions: 0,
      totalDaysWorked: 125,
      paymentsCount: 6,
      caregiversPaidCount: 6,
      totalRequests: 25,
      filledRequests: 23,
      pendingRequests: 2,
      avgTimeToFillHours: 15.5,
      avgTimeToFillDays: 0.65,
      fillRatePct: 92.0,
      totalCaregivers: 20,
      activeCaregivers: 16,
      activeAssignments: 16,
      occupancyRatePct: 80.0,
      refreshedAt: new Date(),
    },
  ];

  beforeEach(() => {
    service = {
      getOverview: jest.fn().mockResolvedValue(mockOverview as any),
      getMonthlyTrend: jest.fn().mockResolvedValue(mockTrend as any),
      refreshMaterializedViews: jest.fn().mockResolvedValue({
        success: true,
        refreshedAt: new Date().toISOString(),
      }),
    };

    schedulerService = {
      triggerRefreshNow: jest.fn().mockResolvedValue({
        jobId: 'bullmq-job-999',
        status: 'enqueued',
      }),
      getQueueStatus: jest.fn().mockResolvedValue({
        queueName: 'analytics-refresh',
        cronSchedule: '0 * * * *',
        isPaused: false,
        counts: { waiting: 0, active: 1, completed: 50, failed: 0, delayed: 0 },
        repeatableJobs: [],
      }),
    };

    controller = new AnalyticsController(service as any, schedulerService as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOverview', () => {
    it('should return KPI overview for the authenticated user tenant', async () => {
      const response = await controller.getOverview(mockUser);
      expect(service.getOverview).toHaveBeenCalledWith('tenant-456');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockOverview);
    });
  });

  describe('getMonthlyTrend', () => {
    it('should return monthly trend data with default limit of 12', async () => {
      const response = await controller.getMonthlyTrend(mockUser);
      expect(service.getMonthlyTrend).toHaveBeenCalledWith('tenant-456', 12);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTrend);
    });

    it('should respect custom limit query parameter', async () => {
      await controller.getMonthlyTrend(mockUser, '6');
      expect(service.getMonthlyTrend).toHaveBeenCalledWith('tenant-456', 6);
    });
  });

  describe('refreshMaterializedViews', () => {
    it('should trigger direct materialized view refresh when async is not specified', async () => {
      const response = await controller.refreshMaterializedViews();
      expect(service.refreshMaterializedViews).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.message).toContain('refreshed successfully');
    });

    it('should enqueue BullMQ background job when async=true is specified', async () => {
      const response = await controller.refreshMaterializedViews('true', mockUser);
      expect(schedulerService.triggerRefreshNow).toHaveBeenCalledWith('owner@keralacare.com');
      expect(response.success).toBe(true);
      expect(response.message).toContain('enqueued as background BullMQ job');
      expect(response.data).toEqual({ jobId: 'bullmq-job-999', status: 'enqueued' });
    });
  });

  describe('getQueueStatus', () => {
    it('should return BullMQ queue metrics and cron schedule details', async () => {
      const response = await controller.getQueueStatus();
      expect(schedulerService.getQueueStatus).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('queueName', 'analytics-refresh');
      expect(response.data).toHaveProperty('cronSchedule', '0 * * * *');
    });
  });

  describe('clearCache', () => {
    it('should call service.invalidateTenantCache for the user tenant', async () => {
      service.invalidateTenantCache = jest.fn().mockResolvedValue(undefined);
      const response = await controller.clearCache(mockUser);
      expect(service.invalidateTenantCache).toHaveBeenCalledWith('tenant-456');
      expect(response.success).toBe(true);
      expect(response.message).toContain('Analytics cache cleared');
    });
  });
});
