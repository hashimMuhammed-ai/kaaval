import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { TenantResolverService, ResolvedTenantInfo } from './tenant-resolver.service';

@Controller('tenants')
export class TenantResolutionController {
  constructor(private readonly tenantResolver: TenantResolverService) {}

  /**
   * Public endpoint to resolve agency tenant details from incoming request host,
   * subdomain header, or explicit query parameter.
   *
   * Used by Next.js frontend to load agency branding, name, contact info, and status.
   */
  @Get('resolve')
  @Public()
  async resolveTenant(
    @Req() req: any,
    @Query('subdomain') querySubdomain?: string
  ): Promise<ResolvedTenantInfo> {
    let tenant = null;

    if (querySubdomain && typeof querySubdomain === 'string') {
      tenant = await this.tenantResolver.resolveBySubdomain(querySubdomain);
    }

    if (!tenant) {
      tenant = await this.tenantResolver.resolveFromRequest(req);
    }

    if (!tenant) {
      throw new NotFoundException(
        'No agency tenant found matching the requested domain or subdomain.'
      );
    }

    return this.tenantResolver.toPublicTenantInfo(tenant);
  }

  /**
   * Public endpoint to get agency details directly by subdomain.
   */
  @Get('by-subdomain/:subdomain')
  @Public()
  async getBySubdomain(
    @Param('subdomain') subdomain: string
  ): Promise<ResolvedTenantInfo> {
    const tenant = await this.tenantResolver.resolveAndValidate(subdomain);
    return this.tenantResolver.toPublicTenantInfo(tenant);
  }
}
