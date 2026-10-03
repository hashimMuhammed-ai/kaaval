import { AsyncLocalStorage } from 'async_hooks';
import { TenantSessionContext } from './rls-context.helper';

/**
 * Ambient storage for tenant session context per asynchronous execution chain (request).
 * Allows any service, repository, or utility in the request call graph to access the active
 * tenant, user, and role without having to thread it through every function argument.
 */
export class TenantContextStorage {
  private static readonly asyncLocalStorage = new AsyncLocalStorage<TenantSessionContext>();

  /**
   * Run a callback within the context of a tenant session.
   */
  static run<T>(context: TenantSessionContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Retrieve the active tenant session context from AsyncLocalStorage.
   */
  static getContext(): TenantSessionContext | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Get the active tenant ID from the current context.
   */
  static getTenantId(): string | null {
    return this.asyncLocalStorage.getStore()?.tenantId || null;
  }

  /**
   * Get the active user ID from the current context.
   */
  static getUserId(): string | null {
    return this.asyncLocalStorage.getStore()?.userId || null;
  }

  /**
   * Get the active user role from the current context.
   */
  static getUserRole(): string | null {
    return this.asyncLocalStorage.getStore()?.role || null;
  }

  /**
   * Check if the current context belongs to a super admin.
   */
  static isSuperAdmin(): boolean {
    const role = this.asyncLocalStorage.getStore()?.role;
    return role === 'super_admin';
  }
}
