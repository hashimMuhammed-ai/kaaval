-- =============================================================================
-- Migration: 007_gist_spatial_index.sql
-- Description: Phase 5 - Smart Matching Engine: GiST spatial index on caregiver location
--              1. Enables btree_gist extension for combined tenant + spatial GiST indexing.
--              2. Ensures GiST spatial index on caregivers(location).
--              3. Creates composite GiST index on caregivers(tenant_id, location)
--                 for high-concurrency multi-tenant proximity searches.
--              4. Creates functional GiST index on caregivers using CAST(location AS geography)
--                 to accelerate meter-based ST_DWithin and ST_Distance calculations.
-- =============================================================================

-- 1. Enable btree_gist extension
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Primary GiST spatial index on caregiver geometry location
CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location);

-- 3. Composite multi-tenant GiST index (tenant_id + location)
-- Directly satisfies the scale requirement to index tenant-scoped foreign keys with spatial location
CREATE INDEX IF NOT EXISTS idx_caregivers_tenant_location ON caregivers USING GIST (tenant_id, location);

-- 4. Functional GiST spatial index on geography cast for meter-based distance filtering
CREATE INDEX IF NOT EXISTS idx_caregivers_location_geog ON caregivers USING GIST (CAST(location AS geography));
