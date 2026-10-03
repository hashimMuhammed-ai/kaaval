import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RlsContextHelper, TenantSessionContext } from '../database/rls-context.helper';
import { TenantContextStorage } from '../database/tenant-context.storage';
import { SKIP_TENANT_SESSION_KEY } from '../decorators/tenant-session.decorator';

/**
 * NestJS Guard that ensures PostgreSQL tenant session context is extracted and attached
 * to the request during the guard resolution pipeline.
 */
@Injectable()
export class TenantSessionGuard implements CanActivate {
  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly reflector?: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Check if route or controller explicitly bypasses RLS
    const skip = this.reflector?.getAllAndOverride<boolean>(SKIP_TENANT_SESSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return true;
    }

    const sessionContext: TenantSessionContext = RlsContextHelper.extractContext(request);
    request.tenantContext = sessionContext;

    // If request already has an active queryRunner (e.g. from middleware or custom runner),
    // ensure PostgreSQL session context is synchronized.
    if (request.queryRunner && !request.queryRunner.isReleased) {
      await RlsContextHelper.setSessionContext(request.queryRunner, sessionContext);
    }

    return true;
  }
}

/**
 * Convenience alias for TenantSessionGuard
 */
export const RlsSessionGuard = TenantSessionGuard;
