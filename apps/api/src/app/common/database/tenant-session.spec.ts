import { TenantContextStorage } from './tenant-context.storage';
import { RlsContextHelper } from './rls-context.helper';
import {
  SKIP_TENANT_SESSION_KEY,
  SkipTenantSession,
  BypassRls,
} from '../decorators/tenant-session.decorator';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

describe('Tenant Session & Context Specifications', () => {
  describe('TenantContextStorage (AsyncLocalStorage)', () => {
    it('should store and retrieve tenant session context within run callback', () => {
      TenantContextStorage.run(
        {
          tenantId: 'ten-100',
          userId: 'usr-200',
          role: 'owner',
        },
        () => {
          expect(TenantContextStorage.getContext()).toEqual({
            tenantId: 'ten-100',
            userId: 'usr-200',
            role: 'owner',
          });
          expect(TenantContextStorage.getTenantId()).toBe('ten-100');
          expect(TenantContextStorage.getUserId()).toBe('usr-200');
          expect(TenantContextStorage.getUserRole()).toBe('owner');
          expect(TenantContextStorage.isSuperAdmin()).toBe(false);
        }
      );

      // Outside callback store should be undefined
      expect(TenantContextStorage.getContext()).toBeUndefined();
      expect(TenantContextStorage.getTenantId()).toBeNull();
      expect(TenantContextStorage.getUserId()).toBeNull();
      expect(TenantContextStorage.getUserRole()).toBeNull();
      expect(TenantContextStorage.isSuperAdmin()).toBe(false);
    });

    it('should correctly identify super_admin role', () => {
      TenantContextStorage.run(
        {
          tenantId: null,
          userId: 'usr-admin',
          role: 'super_admin',
        },
        () => {
          expect(TenantContextStorage.isSuperAdmin()).toBe(true);
        }
      );
    });

    it('should maintain strict context isolation across concurrent async executions', async () => {
      const task1 = new Promise<void>((resolve) => {
        TenantContextStorage.run(
          { tenantId: 'tenant-agency-1', userId: 'user-1', role: 'owner' },
          async () => {
            await new Promise((r) => setTimeout(r, 20));
            expect(TenantContextStorage.getTenantId()).toBe('tenant-agency-1');
            expect(TenantContextStorage.getUserRole()).toBe('owner');
            resolve();
          }
        );
      });

      const task2 = new Promise<void>((resolve) => {
        TenantContextStorage.run(
          { tenantId: 'tenant-agency-2', userId: 'user-2', role: 'caregiver' },
          async () => {
            await new Promise((r) => setTimeout(r, 10));
            expect(TenantContextStorage.getTenantId()).toBe('tenant-agency-2');
            expect(TenantContextStorage.getUserRole()).toBe('caregiver');
            resolve();
          }
        );
      });

      await Promise.all([task1, task2]);
    });
  });

  describe('RlsContextHelper.extractContext', () => {
    it('should return null fields for empty or undefined request', () => {
      expect(RlsContextHelper.extractContext(null)).toEqual({
        tenantId: null,
        userId: null,
        role: null,
      });
      expect(RlsContextHelper.extractContext({})).toEqual({
        tenantId: null,
        userId: null,
        role: null,
      });
    });

    it('should prioritize request.user over headers', () => {
      const req = {
        user: {
          tenantId: 'jwt-tenant',
          userId: 'jwt-user',
          role: 'owner',
        },
        headers: {
          'x-tenant-id': 'header-tenant',
          'x-user-id': 'header-user',
          'x-user-role': 'office_staff',
        },
      };

      const context = RlsContextHelper.extractContext(req);
      expect(context).toEqual({
        tenantId: 'jwt-tenant',
        userId: 'jwt-user',
        role: 'owner',
      });
    });

    it('should fall back to headers when request.user is missing', () => {
      const req = {
        headers: {
          'x-tenant-id': 'header-tenant',
          'x-user-id': 'header-user',
          'x-user-role': 'office_staff',
        },
      };

      const context = RlsContextHelper.extractContext(req);
      expect(context).toEqual({
        tenantId: 'header-tenant',
        userId: 'header-user',
        role: 'office_staff',
      });
    });
  });

  describe('Decorators', () => {
    it('should set skip tenant session metadata with SkipTenantSession / BypassRls', () => {
      class TestController {
        @SkipTenantSession()
        publicEndpoint() {}

        @BypassRls()
        adminEndpoint() {}
      }

      const skipMetadata1 = Reflect.getMetadata(
        SKIP_TENANT_SESSION_KEY,
        TestController.prototype.publicEndpoint
      );
      expect(skipMetadata1).toBe(true);

      const skipMetadata2 = Reflect.getMetadata(
        SKIP_TENANT_SESSION_KEY,
        TestController.prototype.adminEndpoint
      );
      expect(skipMetadata2).toBe(true);
    });
  });
});
