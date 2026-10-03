import * as fs from 'fs';
import * as path from 'path';
import { UserRole } from './common/enums/user-role.enum';
import { TenantStatus } from './common/enums/tenant-status.enum';
import { Tenant } from './tenants/entities/tenant.entity';
import { User } from './users/entities/user.entity';
import { InviteToken } from './users/entities/invite-token.entity';
import { Customer } from './customers/entities/customer.entity';
import { CustomerStatus } from './common/enums/customer-status.enum';

describe('Tenants & Users Schema Verification', () => {
  it('should have valid UserRole enum values (4 roles: super_admin, owner, office_staff, caregiver)', () => {
    expect(UserRole.SUPER_ADMIN).toBe('super_admin');
    expect(UserRole.OWNER).toBe('owner');
    expect(UserRole.OFFICE_STAFF).toBe('office_staff');
    expect(UserRole.CAREGIVER).toBe('caregiver');
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

  it('should instantiate User entity with tenant reference and tenant-scoped role', () => {
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

  it('should allow platform-level Super Admin with null tenantId', () => {
    const superAdmin = new User();
    superAdmin.name = 'Platform Admin';
    superAdmin.email = 'admin@platform.com';
    superAdmin.role = UserRole.SUPER_ADMIN;
    superAdmin.tenantId = null;
    superAdmin.isActive = true;

    expect(superAdmin.role).toBe('super_admin');
    expect(superAdmin.tenantId).toBeNull();
    expect(superAdmin.isActive).toBe(true);
  });

  it('should instantiate InviteToken entity properly', () => {
    const invite = new InviteToken();
    invite.inviteToken = 'random_token_123';
    invite.tenantId = '11111111-1111-1111-1111-111111111111';
    invite.role = UserRole.OFFICE_STAFF;
    invite.email = 'staff@agency.com';
    invite.expiresAt = new Date(Date.now() + 48 * 3600 * 1000);

    expect(invite.inviteToken).toBe('random_token_123');
    expect(invite.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(invite.role).toBe('office_staff');
    expect(invite.email).toBe('staff@agency.com');
    expect(invite.usedAt).toBeUndefined();
  });

  it('should have migration file containing all required tables, constraints, and indexes', () => {
    const migrationPath = path.join(__dirname, '../database/migrations/001_create_tenants_and_users.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Tables
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS tenants');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS invite_tokens');

    // Extensions & Enums
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS "postgis"');
    expect(sql).toContain("CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'office_staff', 'caregiver')");
    expect(sql).toContain("CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial')");

    // Keys & constraints
    expect(sql).toContain('REFERENCES tenants(id) ON DELETE CASCADE');
    expect(sql).toContain('CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)');
    expect(sql).toContain('CONSTRAINT uq_tenants_subdomain UNIQUE (subdomain)');
    expect(sql).toContain('CONSTRAINT chk_users_tenant_role CHECK');
    expect(sql).toContain('CONSTRAINT uq_invite_tokens_token UNIQUE (invite_token)');

    // Indexes
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_users_tenant_is_active ON users (tenant_id, is_active)');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_super_admin_email ON users (LOWER(email)) WHERE tenant_id IS NULL');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants (LOWER(subdomain))');
    expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens (invite_token)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_invite_tokens_tenant_id ON invite_tokens (tenant_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_invite_tokens_role ON invite_tokens (role)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens (expires_at)');

    // Triggers
    expect(sql).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
    expect(sql).toContain('CREATE TRIGGER trg_tenants_updated_at');
    expect(sql).toContain('CREATE TRIGGER trg_users_updated_at');
    expect(sql).toContain('CREATE TRIGGER trg_invite_tokens_updated_at');
  });

  it('should have migration 003_create_caregivers.sql containing caregivers table, PostGIS GiST index, and RLS', () => {
    const migrationPath = path.join(__dirname, '../database/migrations/003_create_caregivers.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS caregivers');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS documents');
    expect(sql).toContain('CREATE TYPE caregiver_status AS ENUM');
    expect(sql).toContain('REFERENCES tenants(id) ON DELETE CASCADE');
    expect(sql).toContain('REFERENCES users(id) ON DELETE CASCADE');
    expect(sql).toContain('idx_caregivers_location ON caregivers USING GIST (location)');
    expect(sql).toContain('ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE caregivers FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY caregivers_isolation_policy ON caregivers');
  });

  it('should instantiate Customer entity properly linked to requests and caregiver', () => {
    const customer = new Customer();
    customer.tenantId = '11111111-1111-1111-1111-111111111111';
    customer.requestId = '22222222-2222-2222-2222-222222222222';
    customer.referenceId = 'CUST-2026-123456';
    customer.patientName = 'Mary Thomas';
    customer.patientAge = '76';
    customer.patientGender = 'female';
    customer.primaryContactName = 'George Thomas';
    customer.phone = '+919847123456';
    customer.district = 'Ernakulam';
    customer.serviceType = 'elderly_care';
    customer.duration = '12_day';
    customer.startDate = 'immediate';
    customer.status = CustomerStatus.ACTIVE;
    customer.assignedCaregiverId = '33333333-3333-3333-3333-333333333333';

    expect(customer.patientName).toBe('Mary Thomas');
    expect(customer.status).toBe('active');
    expect(customer.requestId).toBe('22222222-2222-2222-2222-222222222222');
    expect(customer.assignedCaregiverId).toBe('33333333-3333-3333-3333-333333333333');
  });

  it('should have migration 005_create_customers.sql containing customers table linked to requests, indexes, and RLS', () => {
    const migrationPath = path.join(__dirname, '../database/migrations/005_create_customers.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Table & types
    expect(sql).toContain('CREATE TYPE customer_status AS ENUM');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS customers');
    expect(sql).toContain('REFERENCES tenants(id) ON DELETE CASCADE');
    expect(sql).toContain('request_id UUID REFERENCES requests(id) ON DELETE SET NULL');
    expect(sql).toContain('assigned_caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL');

    // Bidirectional link
    expect(sql).toContain('ALTER TABLE requests ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON requests (customer_id)');

    // Indexes
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_customers_request_id ON customers (request_id)');
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers (tenant_id, status)');

    // RLS
    expect(sql).toContain('ALTER TABLE customers ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE customers FORCE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY customers_isolation_policy ON customers');
  });
});

