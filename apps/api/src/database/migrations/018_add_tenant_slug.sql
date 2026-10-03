-- Migration 018: Add tenant_slug column to tenants table for path-based routing (/t/:tenantSlug)

DO $$ BEGIN
    -- Add tenant_slug column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'tenant_slug'
    ) THEN
        ALTER TABLE tenants ADD COLUMN tenant_slug VARCHAR(63);
    END IF;
END $$;

-- Populate tenant_slug from existing subdomain if currently null
UPDATE tenants SET tenant_slug = LOWER(subdomain) WHERE tenant_slug IS NULL;

-- Enforce NOT NULL and unique constraint on tenant_slug
ALTER TABLE tenants ALTER COLUMN tenant_slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_tenant_slug ON tenants (LOWER(tenant_slug));
