import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantSessionContext } from '../database/rls-context.helper';
import { TenantContextStorage } from '../database/tenant-context.storage';

export const SKIP_TENANT_SESSION_KEY = 'skip_tenant_session';

/**
 * Decorator to bypass RLS tenant session setup for a specific handler or controller.
 * Useful for public endpoints, health checks, or explicit platform-level administration.
 */
export const SkipTenantSession = () => SetMetadata(SKIP_TENANT_SESSION_KEY, true);
export const BypassRls = SkipTenantSession;

/**
 * Parameter decorator to extract the active TenantSessionContext from the request or AsyncLocalStorage.
 * Usage:
 *   @Get()
 *   find(@TenantContext() context: TenantSessionContext)
 *   findTenant(@TenantContext('tenantId') tenantId: string)
 */
export const TenantContext = createParamDecorator(
  (prop: keyof TenantSessionContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const context: TenantSessionContext | undefined =
      request?.tenantContext || TenantContextStorage.getContext();

    if (!context) {
      return null;
    }

    return prop ? context[prop] : context;
  }
);

/**
 * Parameter decorator to directly extract the active tenantId.
 * Usage:
 *   @Get()
 *   list(@TenantId() tenantId: string)
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request?.tenantContext?.tenantId ||
      request?.tenant?.id ||
      request?.tenantId ||
      TenantContextStorage.getTenantId()
    );
  }
);

/**
 * Parameter decorator to extract the resolved Tenant entity from the request.
 */
export const ResolvedTenant = createParamDecorator(
  (prop: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request?.tenant;
    if (!tenant) {
      return null;
    }
    return prop ? tenant[prop] : tenant;
  }
);

/**
 * Parameter decorator to extract the resolved subdomain string.
 */
export const Subdomain = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request?.subdomain || request?.tenant?.subdomain || null;
  }
);

