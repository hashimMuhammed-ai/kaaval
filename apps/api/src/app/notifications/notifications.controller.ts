import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreatePushSubscriptionDto } from './dto/create-push-subscription.dto';
import { AdminLeadAlertDto } from './dto/admin-lead-alert.dto';
import { QueryAdminNotificationsDto } from './dto/query-admin-notifications.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Register a browser Web Push subscription for agency admin.
   */
  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async subscribePush(
    @Body() dto: CreatePushSubscriptionDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    const tenantId = user.tenantId || headerTenantId;
    const subscription = await this.notificationsService.subscribePush(
      dto,
      tenantId!,
      user.sub
    );
    return {
      success: true,
      message: 'Push subscription registered successfully.',
      data: subscription,
    };
  }

  /**
   * Unsubscribe a browser Web Push subscription.
   */
  @Post('push/unsubscribe')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async unsubscribePush(
    @Body('endpoint') endpoint: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    const tenantId = user.tenantId || headerTenantId;
    const result = await this.notificationsService.unsubscribePush(endpoint, tenantId!);
    return {
      success: result,
      message: result ? 'Unsubscribed successfully.' : 'Subscription not found.',
    };
  }

  /**
   * List push subscriptions for current tenant.
   */
  @Get('push/subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async listSubscriptions(
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    const tenantId = user.tenantId || headerTenantId;
    const subscriptions = await this.notificationsService.listSubscriptions(tenantId!);
    return {
      success: true,
      data: subscriptions,
    };
  }

  /**
   * Trigger Push/WhatsApp alert to admin for a new auto-captured lead (Phase 9, Point 3).
   * Can be triggered programmatically or via integration webhook.
   */
  @Post('admin/lead-alert')
  @HttpCode(HttpStatus.OK)
  async alertAdminOnNewLead(
    @Body() dto: AdminLeadAlertDto,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    if (!dto.tenantId && headerTenantId) {
      dto.tenantId = headerTenantId;
    }
    const result = await this.notificationsService.notifyAdminOnAutoCapturedLead(dto);
    return {
      success: true,
      message: 'Push and WhatsApp alerts dispatched to agency administrators.',
      data: result,
    };
  }

  /**
   * List admin notifications for agency dashboard.
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async listAdminNotifications(
    @Query() query: QueryAdminNotificationsDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    const tenantId = user.tenantId || headerTenantId;
    const result = await this.notificationsService.listAdminNotifications(tenantId!, query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      unreadCount: result.unreadCount,
    };
  }

  /**
   * Mark an admin notification as read.
   */
  @Patch('admin/:id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') headerTenantId?: string
  ) {
    const tenantId = user.tenantId || headerTenantId;
    const updated = await this.notificationsService.markAsRead(id, tenantId!);
    return {
      success: true,
      data: updated,
    };
  }
}
