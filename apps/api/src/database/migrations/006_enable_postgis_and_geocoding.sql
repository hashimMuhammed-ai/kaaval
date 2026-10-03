-- =============================================================================
-- Migration: 006_enable_postgis_and_geocoding.sql
-- Description: Phase 5 - Smart Matching Engine:
--              1. Explicitly ensures PostGIS extension is enabled.
--              2. Ensures caregivers table has PostGIS Point geometry column.
--              3. Ensures GiST spatial index exists on caregivers(location).
--              4. Ensures automatic trigger syncs geometry Point on latitude/longitude change.
--              5. Backfills geometry for any existing caregiver rows with lat/long.
-- =============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Ensure caregivers table has location geometry column with SRID 4326 (WGS 84)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'caregivers' AND column_name = 'location'
    ) THEN
        ALTER TABLE caregivers ADD COLUMN location GEOMETRY(Point, 4326);
    END IF;
END $$;

-- 3. Create GiST spatial index on caregivers location if not exists
CREATE INDEX IF NOT EXISTS idx_caregivers_location ON caregivers USING GIST (location);

-- 4. Trigger function to keep PostGIS Point geometry synchronized with latitude/longitude
CREATE OR REPLACE FUNCTION sync_caregiver_location()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.location = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_caregivers_location ON caregivers;
CREATE TRIGGER trg_caregivers_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON caregivers
    FOR EACH ROW
    EXECUTE FUNCTION sync_caregiver_location();

-- 5. Backfill location for any existing caregiver rows with valid coordinates
UPDATE caregivers
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
