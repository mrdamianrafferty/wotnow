-- Add Air Pressure and Cloud Cover to findr_conditions_snapshots
-- Week 1: Data Pipeline for Real-Time Bite Score Framework
--
-- COLUMNS ADDED:
-- 1. air_pressure_hpa: Barometric pressure at sea level in hectopascals from MET Norway
-- 2. cloud_cover_pct: Cloud cover percentage (0-100) from MET Norway
--
-- These columns will be populated by ingestFindrConditions.ts from MET Norway API
-- Then migrated to grid_conditions_latest by migrate-ices-to-grid.ts

-- Add pressure and cloud columns to findr_conditions_snapshots
ALTER TABLE findr_conditions_snapshots
ADD COLUMN IF NOT EXISTS air_pressure_hpa double precision,
ADD COLUMN IF NOT EXISTS cloud_cover_pct double precision;

COMMENT ON COLUMN findr_conditions_snapshots.air_pressure_hpa IS
'Barometric pressure at sea level in hectopascals (hPa) from MET Norway. 1013 hPa = standard atmosphere';

COMMENT ON COLUMN findr_conditions_snapshots.cloud_cover_pct IS
'Cloud cover percentage (0-100) from MET Norway. 0 = clear sky, 100 = fully overcast';

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ findr_conditions_snapshots schema updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS ADDED:';
  RAISE NOTICE '  - air_pressure_hpa: Barometric pressure from MET Norway';
  RAISE NOTICE '  - cloud_cover_pct: Cloud cover from MET Norway';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update ingestFindrConditions.ts to capture these fields';
END $$;
