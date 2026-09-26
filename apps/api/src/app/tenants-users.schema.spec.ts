import * as fs from 'fs';
import * as path from 'path';
import { UserRole } from './common/enums/user-role.enum';
import { TenantStatus } from './common/enums/tenant-status.enum';
import { Tenant } from './tenants/entities/tenant.entity';
import { User } from './users/entities/user.entity';

describe('Tenants & Users Schema Verification', () => {
  it('should have valid UserRole enum values', () => {
    expect(UserRole.OWNER).toBe('owner');
    expect(UserRole.STAFF).toBe('staff');
    expect(UserRole.COORDINATOR).toBe('coordinator');
  });

  it('should have valid TenantStatus enum values', () => {
    expect(TenantStatus.ACTIVE).toBe('active');
    expect(TenantStatus.SUSPENDED).toBe('suspended');
    expect(TenantStatus.TRIAL).toBe('trial');
  });

  it('should instantiate Tenant entity properly', () => {
    const tenant = new Tenant();
    tenant.name = 'Test Agency';
    tenant.subdomain = 'testagency';
    tenant.status = TenantStatus.ACTIVE;
    tenant.settings = {};

    expect(tenant.name).toBe('Test Agency');
    expect(tenant.subdomain).toBe('testagency');
    expect(tenant.status).toBe('active');
  });

  it('should instantiate User entity with tenant reference and role', () => {
    const user = new User();
    user.name = 'Rahul Nair';
    user.email = 'rahul@test.com';
    user.role = UserRole.OWNER;
    user.tenantId = '11111111-1111-1111-1111-111111111111';
    user.isActive = true;

    expect(user.role).toBe('owner');
    expect(user.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(user.isActive).toBe(true);
  });

  it('should have migration file containing all required tables, constraints, and indexes', () => {
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_tenants_and_users.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Tables
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tenants');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');

    // Extensions & Enums
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
    expect(sql).toContain("CREATE TYPE user_role AS ENUM ('owner', 'staff', 'coordinator')");
    expect(sql).toContain("CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial')");

    // Keys & constraints
    expect(sql).toContain('REFERENCES tenants(id) ON DELETE CASCADE');
    expect(sql).toContain('CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)');
    expect(sql).toContain('CONSTRAINT uq_tenants_subdomain UNIQUE (subdomain)');

    // Indexes
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_is_active ON users (tenant_id, is_active)');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants (LOWER(subdomain))');

    // Triggers
    expect(sql).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    expect(sql).toContain('CREATE TRIGGER trg_tenants_updated_at');
    expect(sql).toContain('CREATE TRIGGER trg_users_updated_at');
  });
});
