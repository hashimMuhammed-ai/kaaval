import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsCacheService } from './services/analytics-cache.service';
import { OwnerAnalyticsOverview } from './entities/owner-analytics-overview.entity';
import { OwnerMonthlyAnalytics } from './entities/owner-monthly-analytics.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let overviewRepo: jest.Mocked<Partial<Repository<OwnerAnalyticsOverview>>>;
  let monthlyRepo: jest.Mocked<Partial<Repository<OwnerMonthlyAnalytics>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let mockCacheService: jest.Mocked<Partial<AnalyticsCacheService>>;

  const mockTenantId = 'tenant-12345';

  const mockOverview: OwnerAnalyticsOverview = {
    tenantId: mockTenantId,
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

  const mockMonthlyTrend: OwnerMonthlyAnalytics[] = [
    {
      id: 'trend-1',
      tenantId: mockTenantId,
      periodMonth: '2026-08',
      grossRevenue: 160000,
      commissionRevenue: 24000,
      caregiverPayouts: 136000,
      totalDeductions: 0,
      totalDaysWorked: 110,
      paymentsCount: 5,
      caregiversPaidCount: 5,
      totalRequests: 20,
      filledRequests: 18,
      pendingRequests: 2,
      avgTimeToFillHours: 18.0,
      avgTimeToFillDays: 0.75,
      fillRatePct: 90.0,
      totalCaregivers: 18,
      activeCaregivers: 14,
      activeAssignments: 14,
      occupancyRatePct: 77.78,
      refreshedAt: new Date(),
    },
    {
      id: 'trend-2',
      tenantId: mockTenantId,
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

  beforeEach(async () => {
    overviewRepo = {
      findOne: jest.fn().mockResolvedValue(mockOverview),
    };

    monthlyRepo = {
      find: jest.fn().mockResolvedValue(mockMonthlyTrend),
    };

    dataSource = {
      query: jest.fn().mockResolvedValue([]),
    };

    mockCacheService = {
      getOverviewKey: jest.fn((id: string) => `analytics:overview:${id}`),
      getMonthlyTrendKey: jest.fn((id: string, lim: number) => `analytics:monthly_trend:${id}:${lim}`),
      get: jest.fn().mockResolvedValue(null), // Default cache miss
      set: jest.fn().mockResolvedValue(undefined),
      invalidateTenant: jest.fn().mockResolvedValue(undefined),
      invalidateAll: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(OwnerAnalyticsOverview),
          useValue: overviewRepo,
        },
        {
          provide: getRepositoryToken(OwnerMonthlyAnalytics),
          useValue: monthlyRepo,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: AnalyticsCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOverview with Redis Cache Layer', () => {
    it('should return cached data on cache HIT without hitting repository', async () => {
      mockCacheService.get = jest.fn().mockResolvedValue(mockOverview);

      const result = await service.getOverview(mockTenantId);

      expect(mockCacheService.get).toHaveBeenCalledWith(`analytics:overview:${mockTenantId}`);
      expect(overviewRepo.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockOverview);
    });

    it('should query repository on cache MISS and cache the result', async () => {
      mockCacheService.get = jest.fn().mockResolvedValue(null);

      const result = await service.getOverview(mockTenantId);

      expect(mockCacheService.get).toHaveBeenCalledWith(`analytics:overview:${mockTenantId}`);
      expect(overviewRepo.findOne).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `analytics:overview:${mockTenantId}`,
        mockOverview
      );
      expect(result).toEqual(mockOverview);
    });

    it('should return null when tenant record is not found in cache or DB', async () => {
      overviewRepo.findOne = jest.fn().mockResolvedValue(null);
      const result = await service.getOverview('unknown-tenant');
      expect(result).toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('getMonthlyTrend with Redis Cache Layer', () => {
    it('should return cached monthly trend on cache HIT', async () => {
      mockCacheService.get = jest.fn().mockResolvedValue(mockMonthlyTrend);

      const result = await service.getMonthlyTrend(mockTenantId, 6);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `analytics:monthly_trend:${mockTenantId}:6`
      );
      expect(monthlyRepo.find).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should query repository on cache MISS and cache the result', async () => {
      mockCacheService.get = jest.fn().mockResolvedValue(null);

      const result = await service.getMonthlyTrend(mockTenantId, 12);

      expect(monthlyRepo.find).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        order: { periodMonth: 'ASC' },
        take: 12,
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `analytics:monthly_trend:${mockTenantId}:12`,
        mockMonthlyTrend
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('refreshMaterializedViews and Cache Invalidation', () => {
    it('should refresh materialized views and invalidate all analytics cache', async () => {
      const result = await service.refreshMaterializedViews();
      expect(dataSource.query).toHaveBeenCalledWith('SELECT refresh_owner_analytics_views();');
      expect(mockCacheService.invalidateAll).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should invalidate cache even if stored procedure falls back to direct refresh', async () => {
      dataSource.query = jest
        .fn()
        .mockRejectedValueOnce(new Error('Function does not exist'))
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.refreshMaterializedViews();
      expect(mockCacheService.invalidateAll).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should support manual tenant cache invalidation', async () => {
      await service.invalidateTenantCache(mockTenantId);
      expect(mockCacheService.invalidateTenant).toHaveBeenCalledWith(mockTenantId);
    });
  });
});
