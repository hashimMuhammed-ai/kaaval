import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { ProvisionTenantResponseDto } from './dto/provision-tenant-response.dto';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@Controller('super-admin/tenants')
@UseGuards(SuperAdminGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Super Admin manual provisioning endpoint.
   * Creates a tenant, primary owner user, and expiring invite token atomically.
   */
  @Post('provision')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async provisionTenant(
    @Body() dto: ProvisionTenantDto,
    @Req() req: any
  ): Promise<ProvisionTenantResponseDto> {
    const superAdminUserId = req.user?.id;
    return this.tenantsService.provisionTenant(dto, superAdminUserId);
  }

  /**
   * List all provisioned agency tenants for Super Admin dashboard.
   */
  @Get()
  async getAllTenants() {
    return this.tenantsService.findAllTenants();
  }

  /**
   * Get specific tenant details by ID.
   */
  @Get(':id')
  async getTenantById(@Param('id') id: string) {
    return this.tenantsService.getTenantById(id);
  }
}
