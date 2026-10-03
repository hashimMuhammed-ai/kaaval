-- =============================================================================
-- Migration: 003_create_caregivers.sql
-- Description: Creates caregivers table, documents table, PostGIS location sync,
--              and Row-Level Security (RLS) policies for caregiver tenant isolation
--              and self-view restriction.
-- =============================================================================

-- 1. Enum Types
DO $$ BEGIN
    CREATE TYPE caregiver_status AS ENUM ('available', 'assigned', 'on_leave', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Caregivers table (tenant-scoped, linked 1-to-1 to users account)
CREATE TABLE IF NOT EXISTS caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(255),
    gender VARCHAR(32) NOT NULL DEFAULT 'unspecified',
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL DEFAULT 'Kerala',
    pincode VARCHAR(20),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location GEOMETRY(Point, 4326),
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience_years NUMERIC(4, 1) NOT NULL DEFAULT 0,
    status caregiver_status NOT NULL DEFAULT 'available',
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(32),
    languages TEXT[] NOT NULL DEFAULT '{"Malayalam"}',
    temporary_access_code VARCHAR(64),
    profile_summary TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance, foreign keys, and matching queries
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_id ON caregivers (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_caregivers_user_id ON caregivers (user_id);
CREATE INDEX IF NOT EXISTS idx_caregivers_status ON caregivers (status);
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_status ON caregivers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_phone ON caregivers (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_caregivers_district ON caregivers (tenant_id, district);

-- GiST spatial index for high-performance distance-aware matching (Phase 5)
CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location);

-- 3. Documents table (certifications, ID proofs with expiry dates)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    document_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_key VARCHAR(255),
    mime_type VARCHAR(100),
    file_size INTEGER,
    expiry_date DATE,
    verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_caregiver_id ON documents (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents (document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON documents (expiry_date);

-- 4. Triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_caregivers_updated_at ON caregivers;
CREATE TRIGGER trg_caregivers_updated_at
    BEFORE UPDATE ON caregivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Trigger to automatically sync PostGIS Point geometry from latitude & longitude
CREATE OR REPLACE FUNCTION sync_caregiver_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.location = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_caregivers_location ON caregivers;
CREATE TRIGGER trg_caregivers_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON caregivers
    FOR EACH ROW
    EXECUTE FUNCTION sync_caregiver_location();

-- 6. Row-Level Security (RLS) on `caregivers` table
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caregivers_isolation_policy ON caregivers;
CREATE POLICY caregivers_isolation_policy ON caregivers
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                -- Caregivers can ONLY view/access their own caregiver profile
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        user_id = current_app_user_id()
                    ELSE
                        true
                END
            )
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        user_id = current_app_user_id()
                    ELSE
                        true
                END
            )
        )
    );

-- 7. Row-Level Security (RLS) on `documents` table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_isolation_policy ON documents;
CREATE POLICY documents_isolation_policy ON documents
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                -- Caregivers can ONLY view/access their own uploaded documents
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        caregiver_id IN (
                            SELECT id FROM caregivers WHERE user_id = current_app_user_id()
                        )
                    ELSE
                        true
                END
            )
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                CASE
                    WHEN current_app_user_role() = 'caregiver' THEN
                        caregiver_id IN (
                            SELECT id FROM caregivers WHERE user_id = current_app_user_id()
                        )
                    ELSE
                        true
                END
            )
        )
    );
