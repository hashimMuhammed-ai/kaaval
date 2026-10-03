import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OwnerAnalyticsOverview } from './entities/owner-analytics-overview.entity';
import { OwnerMonthlyAnalytics } from './entities/owner-monthly-analytics.entity';
import { AnalyticsRefreshProcessor } from './processors/analytics-refresh.processor';
import { AnalyticsSchedulerService } from './services/analytics-scheduler.service';
import { AnalyticsCacheService } from './services/analytics-cache.service';
import { ANALYTICS_REFRESH_QUEUE } from './constants/analytics.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OwnerAnalyticsOverview,
      OwnerMonthlyAnalytics,
    ]),
    BullModule.registerQueue({
      name: ANALYTICS_REFRESH_QUEUE,
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AnalyticsRefreshProcessor,
    AnalyticsSchedulerService,
    AnalyticsCacheService,
  ],
  exports: [
    AnalyticsService,
    AnalyticsSchedulerService,
    AnalyticsCacheService,
    BullModule,
  ],
})
export class AnalyticsModule {}
