import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { DataSource, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RlsContextHelper, TenantSessionContext } from '../database/rls-context.helper';
import { TenantContextStorage } from '../database/tenant-context.storage';
import { SKIP_TENANT_SESSION_KEY } from '../decorators/tenant-session.decorator';

/**
 * NestJS Interceptor that configures PostgreSQL session variables per request for Row-Level Security (RLS).
 *
 * For each incoming HTTP request:
 * 1. Extracts the active tenant_id, user_id, and role from the authenticated JWT user or request headers.
 * 2. Initializes a request-scoped QueryRunner and calls PostgreSQL `set_tenant_session(tenant_id, user_id, role)`.
 * 3. Binds the QueryRunner and EntityManager to `req.queryRunner` and `req.entityManager`.
 * 4. Populates Node.js AsyncLocalStorage via TenantContextStorage for ambient contextual access.
 * 5. In finalize (response sent or error thrown), invokes `clear_tenant_session()` and safely releases the connection.
 */
@Injectable()
export class TenantSessionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantSessionInterceptor.name);

  constructor(
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
    @Optional()
    private readonly reflector?: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Check if route or controller explicitly bypasses RLS / tenant session
    const skip = this.reflector?.getAllAndOverride<boolean>(SKIP_TENANT_SESSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    // Extract tenant session context from authenticated user or request headers
    const sessionContext: TenantSessionContext = RlsContextHelper.extractContext(request);
    request.tenantContext = sessionContext;

    // If DataSource is not injected or not initialized (e.g., unit test mocks or offline mode),
    // propagate session context via AsyncLocalStorage and continue.
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return new Observable((subscriber) => {
        TenantContextStorage.run(sessionContext, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }

    // Initialize dedicated QueryRunner with PostgreSQL RLS session variables
    return from(this.initializeSession(sessionContext)).pipe(
      switchMap((queryRunner) => {
        if (queryRunner) {
          request.queryRunner = queryRunner;
          request.entityManager = queryRunner.manager;
        }

        return new Observable((subscriber) => {
          TenantContextStorage.run(sessionContext, () => {
            next
              .handle()
              .pipe(
                finalize(async () => {
                  if (queryRunner && !queryRunner.isReleased) {
                    try {
                      await RlsContextHelper.clearSessionContext(queryRunner);
                    } catch (err: any) {
                      this.logger.warn(`Failed to clear tenant session: ${err?.message || err}`);
                    } finally {
                      try {
                        if (!queryRunner.isReleased) {
                          await queryRunner.release();
                        }
                      } catch (err: any) {
                        this.logger.warn(`Failed to release queryRunner: ${err?.message || err}`);
                      }
                    }
                  }
                })
              )
              .subscribe(subscriber);
          });
        });
      })
    );
  }

  private async initializeSession(
    sessionContext: TenantSessionContext
  ): Promise<QueryRunner | null> {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return null;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await RlsContextHelper.setSessionContext(queryRunner, sessionContext);
      return queryRunner;
    } catch (err) {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
      throw err;
    }
  }
}

/**
 * Convenience alias for TenantSessionInterceptor
 */
export const RlsSessionInterceptor = TenantSessionInterceptor;
