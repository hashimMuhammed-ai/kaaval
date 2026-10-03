-- =============================================================================
-- Migration: 004_create_requests.sql
-- Description: Creates requests table for public intake inquiries and WhatsApp leads,
--              indexes for fast querying, and Row-Level Security (RLS) policies
--              for tenant isolation (Owner/Office Staff access only).
-- =============================================================================

-- 1. Request Status Enum
DO $$ BEGIN
    CREATE TYPE request_status AS ENUM (
        'pending',
        'contacted',
        'matched',
        'assigned',
        'cancelled',
        'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_id VARCHAR(32) NOT NULL UNIQUE,
    service_type VARCHAR(64) NOT NULL,
    duration VARCHAR(64) NOT NULL,
    engagement_period VARCHAR(64) NOT NULL DEFAULT 'ongoing',
    gender_preference VARCHAR(32) NOT NULL DEFAULT 'any',
    start_date VARCHAR(64) NOT NULL,
    district VARCHAR(100) NOT NULL,
    locality VARCHAR(255),
    address TEXT,
    pincode VARCHAR(20),
    patient_name VARCHAR(255) NOT NULL,
    patient_age VARCHAR(32),
    patient_gender VARCHAR(32) DEFAULT 'unspecified',
    patient_condition TEXT,
    mobility_status VARCHAR(64) DEFAULT 'assisted',
    medical_equipment VARCHAR(128) DEFAULT 'none',
    contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(64) DEFAULT 'son_daughter',
    phone VARCHAR(32) NOT NULL,
    is_whatsapp BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    status request_status NOT NULL DEFAULT 'pending',
    source VARCHAR(32) NOT NULL DEFAULT 'public_form',
    assigned_caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for fast retrieval in Agency Dashboard & Multi-Tenancy
CREATE INDEX IF NOT EXISTS idx_requests_tenant_id ON requests (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_requests_reference_id ON requests (reference_id);
CREATE INDEX IF NOT EXISTS idx_requests_tenant_status ON requests (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_tenant_phone ON requests (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_requests_district ON requests (tenant_id, district);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests (tenant_id, created_at DESC);

-- 4. Updated At Trigger
DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;
CREATE TRIGGER trg_requests_updated_at
    BEFORE UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Row-Level Security (RLS) on `requests` table
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS requests_isolation_policy ON requests;
CREATE POLICY requests_isolation_policy ON requests
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND current_app_user_role() IN ('owner', 'office_staff')
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND current_app_user_role() IN ('owner', 'office_staff')
        )
    );
