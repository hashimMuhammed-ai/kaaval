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
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateCaregiverRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /**
   * Public intake endpoint: Form submission creates a `requests` row
   * in the database and dispatches instant WhatsApp alert.
   * Public entrypoint: No authentication required.
   */
  @Post('public')
  @HttpCode(HttpStatus.CREATED)
  async createPublicRequest(@Body() dto: CreateCaregiverRequestDto) {
    const result = await this.requestsService.createRequest(dto);
    return {
      success: true,
      message: 'Caregiver request recorded and instant notifications dispatched.',
      data: result.request,
      whatsappNotification: result.whatsappNotification,
    };
  }

  /**
   * Internal intake: Staff or Owner creating a request manually on phone inquiry.
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createInternalRequest(
    @Body() dto: CreateCaregiverRequestDto,
    @CurrentUser() user: JwtPayload
  ) {
    const result = await this.requestsService.createRequest(dto, user.tenantId!);
    return {
      success: true,
      message: 'Caregiver request created.',
      data: result.request,
      whatsappNotification: result.whatsappNotification,
    };
  }

  /**
   * Admin dashboard: List requests with status filters, search, and tab stats.
   * Accessible by Agency Owner and Office Staff.
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getRequests(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryRequestsDto
  ) {
    const result = await this.requestsService.findAll(user.tenantId!, query);
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        stats: result.stats,
      },
    };
  }

  /**
   * Admin dashboard: View single request requirement details.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getRequest(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const request = await this.requestsService.findOne(id, user.tenantId!);
    return {
      success: true,
      data: request,
    };
  }

  /**
   * Admin dashboard: Update request status (e.g., mark contacted, matched, assigned).
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.requestsService.updateStatus(id, user.tenantId!, dto);
    return {
      success: true,
      message: `Request status updated to ${dto.status}.`,
      data: updated,
    };
  }
}
