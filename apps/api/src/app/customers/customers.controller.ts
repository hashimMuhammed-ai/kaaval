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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { ConvertRequestToCustomerDto } from './dto/convert-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Create a new customer manually (linked optionally to an intake request).
   */
  @Post()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: JwtPayload
  ) {
    const customer = await this.customersService.create(dto, user.tenantId!);
    return {
      success: true,
      message: 'Customer record created successfully.',
      data: customer,
    };
  }

  /**
   * Convert an intake request into a CRM Customer with automatic data linkage.
   */
  @Post('from-request/:requestId')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  @HttpCode(HttpStatus.CREATED)
  async createFromRequest(
    @Param('requestId') requestId: string,
    @Body() dto: ConvertRequestToCustomerDto,
    @CurrentUser() user: JwtPayload
  ) {
    const customer = await this.customersService.createFromRequest(
      requestId,
      user.tenantId!,
      dto
    );
    return {
      success: true,
      message: 'Intake request successfully converted to CRM customer.',
      data: customer,
    };
  }

  /**
   * List customers with status filters (e.g. Active / Pending), search, pagination, and tab stats.
   * Accessible by Owner, Office Staff, and Caregivers (Caregivers see assigned only).
   */
  @Get()
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryCustomersDto
  ) {
    const result = await this.customersService.findAll(
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
   * View single customer detail with patient info, requirement, assigned caregiver, and status.
   */
  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF, UserRole.CAREGIVER)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    const customer = await this.customersService.findOne(
      id,
      user.tenantId!,
      user.role,
      user.userId
    );
    return {
      success: true,
      data: customer,
    };
  }

  /**
   * Update customer record.
   */
  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: JwtPayload
  ) {
    const updated = await this.customersService.update(id, user.tenantId!, dto);
    return {
      success: true,
      message: 'Customer record updated successfully.',
      data: updated,
    };
  }

  /**
   * Delete customer.
   */
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.OFFICE_STAFF)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ) {
    await this.customersService.remove(id, user.tenantId!);
    return {
      success: true,
      message: 'Customer record removed successfully.',
    };
  }
}
