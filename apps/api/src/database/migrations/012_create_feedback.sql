-- =============================================================================
-- Migration: 012_create_feedback.sql
-- Description: Creates feedback table to store ratings and optional comments
--              linked to assignments (Phase 8: Customer Feedback Loop).
--              Includes RLS policies for tenant isolation & caregiver self-view.
-- =============================================================================

CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(id) ON DELETE CASCADE,
    caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    source VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
    whatsapp_message_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and tenant isolation
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_id ON feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_feedback_assignment_id ON feedback (assignment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_caregiver_id ON feedback (caregiver_id);
CREATE INDEX IF NOT EXISTS idx_feedback_customer_id ON feedback (customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback (rating);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_created ON feedback (tenant_id, created_at);

-- Trigger for feedback updated_at
DROP TRIGGER IF EXISTS trg_feedback_updated_at ON feedback;
CREATE TRIGGER trg_feedback_updated_at
    BEFORE UPDATE ON feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS) on feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_isolation_policy ON feedback;
CREATE POLICY feedback_isolation_policy ON feedback
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
