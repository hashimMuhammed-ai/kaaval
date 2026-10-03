import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CreateManualAttendanceDto } from './dto/create-manual-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * Record attendance check-in for an assignment shift.
   * Usable by Caregiver (for own assignment) or Office Staff / Owner.
   */
  @Post('check-in')
  @Roles(UserRole.CAREGIVER, UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Body() dto: CheckInDto,
    @CurrentUser() user: JwtPayload
  ) {
    const attendance = await this.attendanceService.checkIn(
      dto,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      message: 'Attendance check-in recorded successfully.',
      data: attendance,
    };
  }

  /**
   * Record attendance check-out for an assignment shift.
   * Usable by Caregiver (for own assignment) or Office Staff / Owner.
   */
  @Post('check-out')
  @Roles(UserRole.CAREGIVER, UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @Body() dto: CheckOutDto,
    @CurrentUser() user: JwtPayload
  ) {
    const attendance = await this.attendanceService.checkOut(
      dto,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      message: 'Attendance check-out recorded successfully.',
      data: attendance,
    };
  }

  /**
   * Get today's attendance status (for mobile one-tap check-in/out UI).
   */
  @Get('today')
  @Roles(UserRole.CAREGIVER, UserRole.OWNER, UserRole.OFFICE_STAFF)
  async getToday(
    @CurrentUser() user: JwtPayload,
    @Query('assignmentId') assignmentId?: string
  ) {
    const result = await this.attendanceService.getTodayStatus(
      user.tenantId!,
      user.role,
      user.userId,
      assignmentId
    );
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Manual attendance record creation / backfill by Owner or Office Staff.
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createManual(
    @Body() dto: CreateManualAttendanceDto,
    @CurrentUser() user: JwtPayload
  ) {
    const attendance = await this.attendanceService.createManual(
      dto,
      user.tenantId!,
      user.userId
    );
    return {
      success: true,
      message: 'Manual attendance record created successfully.',
      data: attendance,
    };
  }

  /**
   * List attendance records with date range, caregiver, customer filters.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryAttendanceDto
  ) {
    const result = await this.attendanceService.findAll(
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
   * View single attendance record.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const attendance = await this.attendanceService.findOne(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: attendance,
    };
  }

  /**
   * Update attendance record (times, status, verification).
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.attendanceService.update(
      id,
      user.tenantId!,
      dto,
      user.userId
    );
    return {
      success: true,
      message: 'Attendance record updated successfully.',
      data: updated,
    };
  }

  /**
   * Delete attendance record.
   */
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    await this.attendanceService.remove(id, user.tenantId!);
    return {
      success: true,
      message: 'Attendance record removed successfully.',
    };
  }
}
