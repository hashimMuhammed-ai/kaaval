import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { TenantResolverService } from '../../tenants/tenant-resolver.service';
import { TenantStatus } from '../enums/tenant-status.enum';

/**
 * Middleware that inspects incoming HTTP requests, resolves the target tenant based on
 * the subdomain or custom domain, and attaches the resolved tenant to `req.tenant` and `req.tenantId`.
 *
 * It also sets response headers for traceability and enforces cross-tenant boundary security
 * when an authenticated session is present.
 */
@Injectable()
export class TenantResolutionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolutionMiddleware.name);

  constructor(private readonly tenantResolver: TenantResolverService) {}

  async use(req: any, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenant = await this.tenantResolver.resolveFromRequest(req);

      if (tenant) {
        // Enforce active tenant status
        if (tenant.status === TenantStatus.SUSPENDED) {
          throw new ForbiddenException(
            `Agency "${tenant.name}" account is suspended. Please contact platform support.`
          );
        }

        req.tenant = tenant;
        req.tenantId = tenant.id;
        req.subdomain = tenant.subdomain;

        // Traceability header
        if (res.setHeader && !res.headersSent) {
          res.setHeader('X-Resolved-Tenant', tenant.subdomain);
        }

        // Cross-tenant access validation:
        // If an authenticated user is attached and is NOT a super_admin, verify their tenantId matches.
        if (
          req.user &&
          req.user.tenantId &&
          req.user.role !== 'super_admin' &&
          req.user.tenantId !== tenant.id
        ) {
          throw new ForbiddenException(
            'Cross-tenant access forbidden: Your user credentials belong to a different agency.'
          );
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  }
}
