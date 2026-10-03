-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Reusable timestamp update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enum Types
DO $$ BEGIN
    CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'trial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'owner', 'office_staff', 'caregiver');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Support incremental addition of enum values if type existed previously
DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'office_staff';
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'caregiver';
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 1. Tenants table (agencies)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) NOT NULL,
    custom_domain VARCHAR(255),
    status tenant_status NOT NULL DEFAULT 'active',
    phone VARCHAR(32),
    email VARCHAR(255),
    address TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenants_subdomain UNIQUE (subdomain),
    CONSTRAINT uq_tenants_custom_domain UNIQUE (custom_domain)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants (LOWER(subdomain));
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);

-- 2. Users table (tenant-scoped, except super_admin which is platform-level)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_tenant_role CHECK (
        (role = 'super_admin' AND tenant_id IS NULL) OR
        (role <> 'super_admin' AND tenant_id IS NOT NULL)
    ),
    CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);

-- Indexes for performance and tenant isolation
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_super_admin_email ON users (LOWER(email)) WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users (tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_is_active ON users (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));

-- 3. Invite Tokens table (expiring single-use tokens for Owner / Office Staff onboarding)
CREATE TABLE IF NOT EXISTS invite_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_token VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    email VARCHAR(255),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_invite_tokens_token UNIQUE (invite_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens (invite_token);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_tenant_id ON invite_tokens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_role ON invite_tokens (role);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires_at ON invite_tokens (expires_at);

-- Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invite_tokens_updated_at ON invite_tokens;
CREATE TRIGGER trg_invite_tokens_updated_at
    BEFORE UPDATE ON invite_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
