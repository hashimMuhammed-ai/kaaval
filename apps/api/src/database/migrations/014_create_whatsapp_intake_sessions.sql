-- =============================================================================
-- Migration: 014_create_whatsapp_intake_sessions.sql
-- Description: Creates whatsapp_intake_sessions table to track multi-step
--              conversational intake flow for prospective customer leads
--              (Phase 9: WhatsApp Lead Automation).
--              Includes RLS policies for tenant isolation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS whatsapp_intake_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    reference_id VARCHAR(32),
    phone VARCHAR(32) NOT NULL,
    current_step VARCHAR(64) NOT NULL DEFAULT 'service',
    service_type VARCHAR(64),
    district VARCHAR(100),
    locality VARCHAR(255),
    duration VARCHAR(64),
    patient_name VARCHAR(255),
    patient_age VARCHAR(32),
    gender_preference VARCHAR(32) DEFAULT 'any',
    start_date VARCHAR(64),
    contact_name VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and quick session lookup by customer phone
CREATE INDEX IF NOT EXISTS idx_intake_sessions_phone ON whatsapp_intake_sessions (phone);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_tenant ON whatsapp_intake_sessions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_request_id ON whatsapp_intake_sessions (request_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_reference_id ON whatsapp_intake_sessions (reference_id);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_status ON whatsapp_intake_sessions (status);
CREATE INDEX IF NOT EXISTS idx_intake_sessions_last_message ON whatsapp_intake_sessions (last_message_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_whatsapp_intake_sessions_updated_at ON whatsapp_intake_sessions;
CREATE TRIGGER trg_whatsapp_intake_sessions_updated_at
    BEFORE UPDATE ON whatsapp_intake_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row-Level Security (RLS) on whatsapp_intake_sessions
ALTER TABLE whatsapp_intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_intake_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_intake_sessions_isolation_policy ON whatsapp_intake_sessions;
CREATE POLICY whatsapp_intake_sessions_isolation_policy ON whatsapp_intake_sessions
    FOR ALL
    USING (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND (tenant_id IS NULL OR tenant_id = current_app_tenant_id())
            AND current_app_user_role() IN ('owner', 'office_staff')
        )
    )
    WITH CHECK (
        should_bypass_rls()
        OR (
            current_app_tenant_id() IS NOT NULL
            AND (tenant_id IS NULL OR tenant_id = current_app_tenant_id())
            AND current_app_user_role() IN ('owner', 'office_staff')
        )
    );
