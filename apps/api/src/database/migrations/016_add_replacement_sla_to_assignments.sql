-- =============================================================================
-- Migration: 016_add_replacement_sla_to_assignments.sql
-- Description: Adds SLA timer, escalation timestamps, and absence context fields
--              to assignments table for Phase 10 backup & replacement flow.
-- =============================================================================

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS replacement_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replacement_sla_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS replacement_sla_escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replacement_sla_status VARCHAR(32) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS absence_reason VARCHAR(64),
ADD COLUMN IF NOT EXISTS absence_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_assignments_sla_status
ON assignments (tenant_id, replacement_sla_status);

CREATE INDEX IF NOT EXISTS idx_assignments_replacement_requested_at
ON assignments (replacement_requested_at);
