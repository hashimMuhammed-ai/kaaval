import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CalculateMonthlySalaryDto } from './dto/calculate-monthly-salary.dto';
import { QueryPaymentsDto } from './dto/query-payments.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Run monthly salary calculation for a specific caregiver or the entire agency.
   * Computes days worked, gross, commission split, and net payout from attendance.
   */
  @Post('calculate')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.OK)
  async calculateMonthly(
    @Body() dto: CalculateMonthlySalaryDto,
    @CurrentUser() user: JwtPayload
  ) {
    const result = await this.paymentsService.calculateMonthly(
      dto,
      user.tenantId!
    );
    return {
      success: true,
      message: `Monthly salary calculated for ${result.processedCount} caregiver(s) for period ${result.month}.`,
      data: result,
    };
  }

  /**
   * List monthly payment/salary statements.
   * Owner & Office Staff view agency-wide; Caregiver views own statements only.
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryPaymentsDto
  ) {
    const result = await this.paymentsService.findAll(
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
        stats: result.stats,
      },
    };
  }

  /**
   * Get shift-by-shift daily breakdown for a caregiver's monthly statement.
   */
  @Get('breakdown/:caregiverId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async getShiftsBreakdown(
    @Param('caregiverId') caregiverId: string,
    @Query('month') month: string,
    @CurrentUser() user: JwtPayload
  ) {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const breakdown = await this.paymentsService.getShiftsBreakdown(
      caregiverId,
      targetMonth,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: breakdown,
    };
  }

  /**
   * Export monthly salary and payment report for Owner and Office Staff.
   * Supports CSV file streaming/download and structured JSON summary.
   */
  @Get('export')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async exportMonthlyReport(
    @Query('month') month: string,
    @Query('status') status: PaymentStatus,
    @Query('format') format: string,
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res?: Response
  ) {
    const result = await this.paymentsService.exportMonthlyReport(
      user.tenantId!,
      month,
      status
    );

    if (format === 'json') {
      return {
        success: true,
        data: result.records,
        meta: {
          month: result.month,
          filename: result.filename,
          recordCount: result.recordCount,
          totals: result.totals,
        },
      };
    }

    if (res) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`
      );
      res.setHeader('Cache-Control', 'no-cache');
    }

    return result.csvContent;
  }

  /**
   * Get single payment statement.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const payment = await this.paymentsService.findOne(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: payment,
    };
  }

  /**
   * Update payment statement (approve, mark paid, adjust deductions).
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.paymentsService.update(
      id,
      user.tenantId!,
      dto,
      user.userId
    );
    return {
      success: true,
      message: 'Payment statement updated successfully.',
      data: updated,
    };
  }
}
