import * as fs from 'fs';
import * as path from 'path';
import { RlsContextHelper } from './rls-context.helper';

describe('Row-Level Security (RLS) Specification', () => {
  describe('Migration: 002_row_level_security.sql', () => {
    const migrationPath = path.join(
      __dirname,
      '../../../database/migrations/002_row_level_security.sql'
    );

    it('should exist in database migrations folder', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('should define session context helper functions', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE OR REPLACE FUNCTION current_app_tenant_id()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION current_app_user_id()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION current_app_user_role()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION is_app_super_admin()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION should_bypass_rls()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION set_tenant_session(');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION clear_tenant_session()');
    });

    it('should enable and force RLS on all tenant-scoped tables', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE tenants FORCE ROW LEVEL SECURITY;');

      expect(sql).toContain('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE users FORCE ROW LEVEL SECURITY;');

      expect(sql).toContain('ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE invite_tokens FORCE ROW LEVEL SECURITY;');
    });

    it('should configure tenant isolation policy on tenants table', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE POLICY tenant_isolation_policy ON tenants');
      expect(sql).toContain('current_app_tenant_id() IS NOT NULL AND id = current_app_tenant_id()');
    });

    it('should configure user isolation policy with caregiver self-view restriction on users table', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE POLICY user_isolation_policy ON users');
      expect(sql).toContain('tenant_id = current_app_tenant_id()');
      // Caregiver self-view condition
      expect(sql).toContain("WHEN current_app_user_role() = 'caregiver' THEN");
      expect(sql).toContain('id = current_app_user_id()');
    });

    it('should configure invite tokens isolation policy with caregiver exclusion', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE POLICY invite_tokens_isolation_policy ON invite_tokens');
      expect(sql).toContain("current_app_user_role() <> 'caregiver'");
      expect(sql).toContain('tenant_id = current_app_tenant_id()');
    });
  });

  describe('Migration: 003_create_caregivers.sql (Caregiver RLS Policies)', () => {
    const migrationPath = path.join(
      __dirname,
      '../../../database/migrations/003_create_caregivers.sql'
    );

    it('should exist in database migrations folder', () => {
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('should enable and force RLS on caregivers and documents tables', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE caregivers FORCE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE documents ENABLE ROW LEVEL SECURITY;');
      expect(sql).toContain('ALTER TABLE documents FORCE ROW LEVEL SECURITY;');
    });

    it('should configure caregivers isolation policy with strict caregiver self-view', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE POLICY caregivers_isolation_policy ON caregivers');
      expect(sql).toContain('tenant_id = current_app_tenant_id()');
      expect(sql).toContain("WHEN current_app_user_role() = 'caregiver' THEN");
      expect(sql).toContain('user_id = current_app_user_id()');
    });

    it('should configure documents isolation policy with caregiver self-view', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      expect(sql).toContain('CREATE POLICY documents_isolation_policy ON documents');
      expect(sql).toContain('tenant_id = current_app_tenant_id()');
      expect(sql).toContain("WHEN current_app_user_role() = 'caregiver' THEN");
      expect(sql).toContain('SELECT id FROM caregivers WHERE user_id = current_app_user_id()');
    });
  });

  describe('RlsContextHelper', () => {
    let mockQueryRunner: any;

    beforeEach(() => {
      mockQueryRunner = {
        query: jest.fn().mockResolvedValue([]),
        connect: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should call set_tenant_session with context values', async () => {
      await RlsContextHelper.setSessionContext(mockQueryRunner, {
        tenantId: '11111111-1111-1111-1111-111111111111',
        userId: '22222222-2222-2222-2222-222222222222',
        role: 'owner',
      });

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT set_tenant_session($1, $2, $3)',
        [
          '11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222',
          'owner',
        ]
      );
    });

    it('should call clear_tenant_session', async () => {
      await RlsContextHelper.clearSessionContext(mockQueryRunner);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
    });

    it('should manage connection lifecycle in runWithContext', async () => {
      const mockDataSource: any = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      const result = await RlsContextHelper.runWithContext(
        mockDataSource,
        { tenantId: 'ten-1', userId: 'usr-1', role: 'office_staff' },
        async (qr) => {
          return 'operation-result';
        }
      );

      expect(result).toBe('operation-result');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT set_tenant_session($1, $2, $3)',
        ['ten-1', 'usr-1', 'office_staff']
      );
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should ensure clear and release are called even if operation throws an error', async () => {
      const mockDataSource: any = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      await expect(
        RlsContextHelper.runWithContext(
          mockDataSource,
          { tenantId: 'ten-1' },
          async () => {
            throw new Error('Database query failed');
          }
        )
      ).rejects.toThrow('Database query failed');

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT clear_tenant_session()');
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
