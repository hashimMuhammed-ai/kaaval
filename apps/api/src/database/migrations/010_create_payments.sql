-- =============================================================================
-- Migration: 010_create_payments.sql
-- Description: Creates payments table for monthly salary calculations, commission
--              splits, net payouts, and Row-Level Security (RLS) policies.
-- =============================================================================

-- 1. Payment Status Enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'draft',
        'approved',
        'paid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Payments Table (computed from attendance: days worked, gross, commission split, net payout)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    period_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM' (e.g. '2026-09')
    days_present NUMERIC(5, 1) NOT NULL DEFAULT 0,
    days_half_day NUMERIC(5, 1) NOT NULL DEFAULT 0,
    days_absent NUMERIC(5, 1) NOT NULL DEFAULT 0,
    days_on_leave NUMERIC(5, 1) NOT NULL DEFAULT 0,
    total_days_worked NUMERIC(5, 1) NOT NULL DEFAULT 0,
    daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_payout NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status payment_status NOT NULL DEFAULT 'draft',
    payment_date DATE,
    payment_method VARCHAR(64),
    transaction_reference VARCHAR(128),
    notes TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: Exactly one payment calculation statement per caregiver per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_caregiver_period ON payments (caregiver_id, period_month);

-- Performance and multi-tenant indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_caregiver_id ON payments (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_payments_period_month ON payments (tenant_id, period_month);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (tenant_id, status);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS) on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_isolation_policy ON payments;
CREATE POLICY payments_isolation_policy ON payments
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
                    AND caregiver_id IN (
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
