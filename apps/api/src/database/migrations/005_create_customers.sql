-- =============================================================================
-- Migration: 005_create_customers.sql
-- Description: Creates customers table linked to requests, indexes for fast querying,
--              bidirectional reference from requests to customers, and
--              Row-Level Security (RLS) policies for tenant isolation & caregiver self-view.
-- =============================================================================

-- 1. Customer Status Enum
DO $$ BEGIN
    CREATE TYPE customer_status AS ENUM (
        'pending',
        'active',
        'paused',
        'inactive',
        'discharged'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Customers Table (tenant-scoped, linked to originating intake request)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    reference_id VARCHAR(32) NOT NULL UNIQUE,
    patient_name VARCHAR(255) NOT NULL,
    patient_age VARCHAR(32),
    patient_gender VARCHAR(32) DEFAULT 'unspecified',
    patient_condition TEXT,
    mobility_status VARCHAR(64) DEFAULT 'assisted',
    medical_equipment VARCHAR(128) DEFAULT 'none',
    primary_contact_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(64) DEFAULT 'son_daughter',
    phone VARCHAR(32) NOT NULL,
    alternate_phone VARCHAR(32),
    email VARCHAR(255),
    is_whatsapp BOOLEAN NOT NULL DEFAULT true,
    address TEXT,
    locality VARCHAR(255),
    district VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    service_type VARCHAR(64) NOT NULL,
    duration VARCHAR(64) NOT NULL,
    engagement_period VARCHAR(64) NOT NULL DEFAULT 'ongoing',
    gender_preference VARCHAR(32) NOT NULL DEFAULT 'any',
    start_date VARCHAR(64) NOT NULL,
    status customer_status NOT NULL DEFAULT 'pending',
    assigned_caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Indexes for fast retrieval in Agency CRM & Multi-Tenancy
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_request_id ON customers (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_reference_id ON customers (reference_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_district ON customers (tenant_id, district);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_caregiver_id ON customers (assigned_caregiver_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (tenant_id, created_at DESC);

-- 4. Bidirectional link: add customer_id to requests table
ALTER TABLE requests ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON requests (customer_id);

-- 5. Updated At Trigger
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Row-Level Security (RLS) on `customers` table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_isolation_policy ON customers;
CREATE POLICY customers_isolation_policy ON customers
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND tenant_id = current_app_tenant_id()
            AND (
                current_app_user_role() IN ('owner', 'office_staff')
                OR (
                    current_app_user_role() = 'caregiver'
                    AND assigned_caregiver_id IN (
                        SELECT id FROM caregivers WHERE user_id = current_app_user_id()
                    )
                )
            )
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
