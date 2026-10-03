import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OwnerAnalyticsOverview } from './entities/owner-analytics-overview.entity';
import { OwnerMonthlyAnalytics } from './entities/owner-monthly-analytics.entity';
import { AnalyticsCacheService } from './services/analytics-cache.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(OwnerAnalyticsOverview)
    private readonly overviewRepository: Repository<OwnerAnalyticsOverview>,
    @InjectRepository(OwnerMonthlyAnalytics)
    private readonly monthlyRepository: Repository<OwnerMonthlyAnalytics>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly cacheService?: AnalyticsCacheService
  ) {}

  /**
   * Retrieves high-level KPI overview for an agency tenant:
   * Current occupancy rate, average time-to-fill, and revenue snapshot.
   * Cached in Redis with a short TTL (5 minutes) for instant sub-millisecond retrieval.
   */
  async getOverview(tenantId: string): Promise<OwnerAnalyticsOverview | null> {
    const cacheKey = this.cacheService?.getOverviewKey(tenantId);

    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<OwnerAnalyticsOverview>(cacheKey);
      if (cached) {
        this.logger.debug(`[Cache HIT] Overview for tenant ${tenantId}`);
        return cached;
      }
    }

    this.logger.debug(`[Cache MISS] Fetching overview from materialized view for tenant ${tenantId}`);
    const overview = await this.overviewRepository.findOne({
      where: { tenantId },
    });

    if (!overview) {
      this.logger.warn(`No materialized analytics overview row found for tenant: ${tenantId}`);
      return null;
    }

    if (this.cacheService && cacheKey) {
      await this.cacheService.set(cacheKey, overview);
    }

    return overview;
  }

  /**
   * Retrieves historical monthly trend records for an agency tenant:
   * Monthly revenue trend, time-to-fill trend, and occupancy rate trend.
   * Cached in Redis with a short TTL (5 minutes).
   */
  async getMonthlyTrend(
    tenantId: string,
    limit = 12
  ): Promise<OwnerMonthlyAnalytics[]> {
    const cacheKey = this.cacheService?.getMonthlyTrendKey(tenantId, limit);

    if (this.cacheService && cacheKey) {
      const cached = await this.cacheService.get<OwnerMonthlyAnalytics[]>(cacheKey);
      if (cached) {
        this.logger.debug(`[Cache HIT] Monthly trend for tenant ${tenantId} (limit=${limit})`);
        return cached;
      }
    }

    this.logger.debug(`[Cache MISS] Fetching monthly trend from materialized view for tenant ${tenantId}`);
    const trend = await this.monthlyRepository.find({
      where: { tenantId },
      order: { periodMonth: 'ASC' },
      take: limit,
    });

    if (this.cacheService && cacheKey && trend.length > 0) {
      await this.cacheService.set(cacheKey, trend);
    }

    return trend;
  }

  /**
   * Executes concurrent refresh of PostgreSQL materialized views without locking read traffic.
   * Automatically invalidates Redis cache layer upon successful refresh so dashboard clients
   * immediately receive fresh metrics.
   */
  async refreshMaterializedViews(): Promise<{ success: boolean; refreshedAt: string }> {
    this.logger.log('Starting concurrent refresh of analytics materialized views...');
    const startTime = Date.now();

    try {
      await this.dataSource.query('SELECT refresh_owner_analytics_views();');
      const duration = Date.now() - startTime;
      this.logger.log(`Materialized views successfully refreshed in ${duration}ms.`);

      // Invalidate Redis dashboard cache
      if (this.cacheService) {
        await this.cacheService.invalidateAll();
      }

      return {
        success: true,
        refreshedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error('Failed to refresh materialized views via stored function, attempting direct refresh...', err);
      // Fallback to direct refresh statements
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_analytics_overview;');
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_owner_monthly_analytics;');

      if (this.cacheService) {
        await this.cacheService.invalidateAll();
      }

      return {
        success: true,
        refreshedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Manually invalidate cache entries for a specific agency tenant.
   */
  async invalidateTenantCache(tenantId: string): Promise<void> {
    if (this.cacheService) {
      await this.cacheService.invalidateTenant(tenantId);
    }
  }
}
