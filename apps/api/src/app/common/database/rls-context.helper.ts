import { DataSource, QueryRunner } from 'typeorm';

export interface TenantSessionContext {
  tenantId?: string | null;
  userId?: string | null;
  role?: string | null;
}

export class RlsContextHelper {
  /**
   * Sets PostgreSQL session variables for Row-Level Security on a QueryRunner.
   */
  static async setSessionContext(
    queryRunner: QueryRunner,
    context: TenantSessionContext
  ): Promise<void> {
    await queryRunner.query('SELECT set_tenant_session($1, $2, $3)', [
      context.tenantId || null,
      context.userId || null,
      context.role || null,
    ]);
  }

  /**
   * Clears PostgreSQL session variables on a QueryRunner.
   */
  static async clearSessionContext(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('SELECT clear_tenant_session()');
  }

  /**
   * Executes a database operation with specific RLS session context.
   */
  static async runWithContext<T>(
    dataSource: DataSource,
    context: TenantSessionContext,
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      await this.setSessionContext(queryRunner, context);
      return await operation(queryRunner);
    } finally {
      try {
        await this.clearSessionContext(queryRunner);
      } finally {
        await queryRunner.release();
      }
    }
  }

  /**
   * Extracts tenant session context from an HTTP request.
   * Checks request.user (from JwtAuthGuard) first, then falls back to dev/testing headers.
   */
  static extractContext(req: any): TenantSessionContext {
    if (!req) {
      return { tenantId: null, userId: null, role: null };
    }

    const user = req.user;
    const headers = req.headers || {};

    const tenantId =
      user?.tenantId ??
      req.tenant?.id ??
      req.tenantId ??
      headers['x-tenant-id'] ??
      null;

    const userId =
      user?.userId ??
      user?.id ??
      headers['x-user-id'] ??
      null;

    const role =
      user?.role ??
      headers['x-user-role'] ??
      null;

    return {
      tenantId: tenantId ? String(tenantId).trim() : null,
      userId: userId ? String(userId).trim() : null,
      role: role ? String(role).trim() : null,
    };
  }
}

