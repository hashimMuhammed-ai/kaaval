import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSchedulerService } from './services/analytics-scheduler.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    @Optional()
    private readonly schedulerService?: AnalyticsSchedulerService
  ) {}

  /**
   * Get single-pane KPI overview for the agency owner dashboard:
   * Current occupancy rate, average time-to-fill, and revenue snapshot.
   */
  @Get('overview')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getOverview(@CurrentUser() user: JwtPayload) {
    const overview = await this.analyticsService.getOverview(user.tenantId!);
    return {
      success: true,
      data: overview,
    };
  }

  /**
   * Get monthly historical trends for charts:
   * Revenue trend, average time-to-fill trend, and occupancy rate trend.
   */
  @Get('monthly-trend')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getMonthlyTrend(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 12;
    const trend = await this.analyticsService.getMonthlyTrend(
      user.tenantId!,
      parsedLimit
    );
    return {
      success: true,
      data: trend,
    };
  }

  /**
   * Manually trigger a refresh of PostgreSQL analytics materialized views.
   * Can run synchronously or enqueue a background job via BullMQ.
   */
  @Post('refresh')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async refreshMaterializedViews(
    @Query('async') isAsync?: string,
    @CurrentUser() user?: JwtPayload
  ) {
    if (isAsync === 'true' && this.schedulerService) {
      const enqueued = await this.schedulerService.triggerRefreshNow(
        user?.email || 'admin'
      );
      return {
        success: true,
        message: 'Materialized view refresh enqueued as background BullMQ job.',
        data: enqueued,
      };
    }

    const result = await this.analyticsService.refreshMaterializedViews();
    return {
      success: true,
      message: 'Analytics materialized views refreshed successfully.',
      data: result,
    };
  }

  /**
   * Get BullMQ queue status and scheduled cron job details.
   */
  @Get('queue-status')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  async getQueueStatus() {
    if (!this.schedulerService) {
      return {
        success: true,
        data: { message: 'Scheduler service not available.' },
      };
    }

    const status = await this.schedulerService.getQueueStatus();
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Clear dashboard Redis cache for the current tenant.
   */
  @Post('cache/clear')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async clearCache(@CurrentUser() user: JwtPayload) {
    await this.analyticsService.invalidateTenantCache(user.tenantId!);
    return {
      success: true,
      message: `Analytics cache cleared for tenant ${user.tenantId}.`,
    };
  }
}
