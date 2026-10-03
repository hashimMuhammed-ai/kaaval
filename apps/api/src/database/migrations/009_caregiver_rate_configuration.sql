-- =============================================================================
-- Migration: 009_caregiver_rate_configuration.sql
-- Description: Adds rate configuration columns to caregivers table:
--              live_in_rate, hourly_rate, commission_percentage, rate_notes.
-- =============================================================================

ALTER TABLE caregivers
    ADD COLUMN IF NOT EXISTS live_in_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    ADD COLUMN IF NOT EXISTS rate_notes TEXT;
