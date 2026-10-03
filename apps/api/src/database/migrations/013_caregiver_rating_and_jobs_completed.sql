-- =============================================================================
-- Migration: 013_caregiver_rating_and_jobs_completed.sql
-- Description: Adds rolling average rating, total ratings count, and jobs completed
--              count columns to caregivers table, along with performance indexes.
-- =============================================================================

ALTER TABLE caregivers
    ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_ratings INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS jobs_completed INTEGER NOT NULL DEFAULT 0;

-- Performance indexes for sorting and filtering top-rated caregivers and job counts per tenant
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_rating ON caregivers (tenant_id, average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_jobs ON caregivers (tenant_id, jobs_completed DESC);

-- Backfill initial jobs_completed from assignments marked as completed
UPDATE caregivers c
SET jobs_completed = COALESCE((
    SELECT COUNT(*)
    FROM assignments a
    WHERE a.caregiver_id = c.id
      AND a.status = 'completed'
), 0);

-- Backfill initial rolling average rating & total ratings from feedback table
UPDATE caregivers c
SET 
    total_ratings = COALESCE((
        SELECT COUNT(*)
        FROM feedback fb
        WHERE fb.caregiver_id = c.id
    ), 0),
    average_rating = COALESCE((
        SELECT ROUND(AVG(fb.rating)::numeric, 2)
        FROM feedback fb
        WHERE fb.caregiver_id = c.id
    ), 0.00);
