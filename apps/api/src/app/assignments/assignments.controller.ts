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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { QueryAssignmentsDto } from './dto/query-assignments.dto';
import { ReplaceAssignmentDto } from './dto/replace-assignment.dto';
import { RequestReplacementDto } from './dto/request-replacement.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  /**
   * Create new caregiver assignment for a customer.
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: JwtPayload
  ) {
    const assignment = await this.assignmentsService.create(dto, user.tenantId!);
    return {
      success: true,
      message: 'Caregiver assignment created successfully.',
      data: assignment,
    };
  }

  /**
   * List assignments.
   * Owner & Office Staff view all in agency; Caregivers view their own.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAssignmentsDto
  ) {
    const result = await this.assignmentsService.findAll(
      user.tenantId!,
      query,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Get active assignment for the current logged-in caregiver.
   */
  @Get('current')
  @Roles(UserRole.CAREGIVER, UserRole.OWNER, UserRole.OFFICE_STAFF)
  async findCurrent(@CurrentUser() user: JwtPayload) {
    const assignment = await this.assignmentsService.findActiveForCaregiver(
      user.tenantId!,
      user.userId
    );
    return {
      success: true,
      data: assignment,
    };
  }

  /**
   * Get full chronological assignment and replacement history for a customer.
   */
  @Get('customer/:customerId/history')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getCustomerHistory(
    @Param('customerId') customerId: string,
    @CurrentUser() user: JwtPayload
  ) {
    const history = await this.assignmentsService.getCustomerAssignmentHistory(
      customerId,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get aggregated absence reason statistics for the agency (Phase 10, Point 4).
   * Context breakdown: leave, quit, complaint, emergency, rotation, other.
   */
  @Get('absence-stats')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getAbsenceStats(@CurrentUser() user: JwtPayload) {
    const stats = await this.assignmentsService.getAbsenceStats(user.tenantId!);
    return {
      success: true,
      data: stats,
    };
  }

  /**
   * List active assignments currently under replacement SLA (pending or escalated).
   */
  @Get('sla/overdue')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getOverdueSla(@CurrentUser() user: JwtPayload) {
    const items = await this.assignmentsService.getOverdueReplacementSla(user.tenantId!);
    return {
      success: true,
      data: items,
    };
  }

  /**
   * View single assignment details.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const assignment = await this.assignmentsService.findOne(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: assignment,
    };
  }

  /**
   * Update assignment details.
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.assignmentsService.update(id, user.tenantId!, dto);
    return {
      success: true,
      message: 'Assignment updated successfully.',
      data: updated,
    };
  }

  /**
   * Replace an existing assignment with a new caregiver.
   * Updates assignment history chain with replaced_by link.
   */
  @Post(':id/replace')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async replace(
    @Param('id') id: string,
    @Body() dto: ReplaceAssignmentDto,
    @CurrentUser() user: JwtPayload
  ) {
    const result = await this.assignmentsService.replace(id, user.tenantId!, dto);
    return {
      success: true,
      message: 'Caregiver replaced successfully. History chain updated.',
      data: result,
    };
  }

  /**
   * Manually trigger or re-send post-assignment WhatsApp rating request to customer.
   */
  @Post(':id/request-feedback')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async requestFeedback(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const result = await this.assignmentsService.sendFeedbackRequest(id, user.tenantId!);
    return {
      success: true,
      message: 'Post-assignment WhatsApp rating request dispatched to customer.',
      data: result,
    };
  }

  /**
   * Request replacement for an active assignment, initiating the SLA timer (Phase 10, Point 3).
   * Captures absence reason (leave / quit / complaint / emergency) and sets SLA window.
   */
  @Post(':id/request-replacement')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async requestReplacement(
    @Param('id') id: string,
    @Body() dto: RequestReplacementDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.assignmentsService.requestReplacement(id, user.tenantId!, dto);
    return {
      success: true,
      message: 'Replacement requested successfully. SLA countdown timer active.',
      data: updated,
    };
  }

  /**
   * Manually or immediately trigger SLA escalation to Agency Owner via WhatsApp and Web Push.
   */
  @Post(':id/escalate')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async escalateSla(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const result = await this.assignmentsService.escalateAssignmentSla(id, user.tenantId!, true);
    return {
      success: true,
      message: 'Assignment replacement SLA escalated to Agency Owner via WhatsApp and Push.',
      data: result,
    };
  }

  /**
   * Check all active assignments for SLA breaches and automatically escalate overdue ones.
   */
  @Post('sla/check')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async checkSla(@CurrentUser() user: JwtPayload) {
    const summary = await this.assignmentsService.checkAndEscalateSlaTimers(user.tenantId!);
    return {
      success: true,
      data: summary,
    };
  }
}
