-- =============================================================================
-- Migration: 011_add_feedback_requested_to_assignments.sql
-- Description: Adds feedback request tracking fields to assignments table
--              for post-assignment WhatsApp rating requests (Phase 8).
-- =============================================================================

ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS feedback_request_status VARCHAR(32) DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_assignments_feedback_requested_at
ON assignments (feedback_requested_at);
