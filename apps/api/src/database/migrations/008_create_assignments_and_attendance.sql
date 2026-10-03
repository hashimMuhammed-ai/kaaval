-- =============================================================================
-- Migration: 008_create_assignments_and_attendance.sql
-- Description: Creates assignments and attendance tables, indexes, constraints,
--              and Row-Level Security (RLS) policies for tenant isolation & caregiver self-view.
-- =============================================================================

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE assignment_status AS ENUM (
        'active',
        'completed',
        'cancelled',
        'replaced'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'present',
        'half_day',
        'absent',
        'on_leave'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Assignments Table (history table: caregiver <-> customer, replaced_by reference)
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    status assignment_status NOT NULL DEFAULT 'active',
    replaced_by_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    replacement_reason TEXT,
    billing_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    caregiver_daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_tenant_id ON assignments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignments_customer_id ON assignments (customer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_caregiver_id ON assignments (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tenant_status ON assignments (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_replaced_by_id ON assignments (replaced_by_id);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON assignments (tenant_id, start_date, end_date);

-- Trigger for assignments updated_at
DROP TRIGGER IF EXISTS trg_assignments_updated_at ON assignments;
CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS) on assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_isolation_policy ON assignments;
CREATE POLICY assignments_isolation_policy ON assignments
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

-- 3. Attendance Table (check-in/check-out per assignment/day)
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status attendance_status NOT NULL DEFAULT 'present',
    check_in_latitude DOUBLE PRECISION,
    check_in_longitude DOUBLE PRECISION,
    check_out_latitude DOUBLE PRECISION,
    check_out_longitude DOUBLE PRECISION,
    check_in_notes TEXT,
    check_out_notes TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: exactly one attendance entry per assignment per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_assignment_date ON attendance (assignment_id, date);

-- Indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON attendance (tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_assignment_id ON attendance (assignment_id);
CREATE INDEX IF NOT EXISTS idx_attendance_caregiver_id ON attendance (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_attendance_customer_id ON attendance (customer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance (tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_caregiver_date ON attendance (caregiver_id, date);

-- Trigger for attendance updated_at
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
    BEFORE UPDATE ON attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS) on attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_isolation_policy ON attendance;
CREATE POLICY attendance_isolation_policy ON attendance
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
    );
