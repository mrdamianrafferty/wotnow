-- Migration: Add water temperature column to findr_conditions_snapshots
-- 
-- Water temperature is critical for habitat suitability calculations:
-- - Different species have specific temperature preferences
-- - Temperature affects metabolism, feeding behavior, and distribution
-- - Essential component of the Habitat Suitability Index
--
-- To deploy: Run this in Supabase SQL Editor

-- Add water_temp_c column
ALTER TABLE findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS water_temp_c DOUBLE PRECISION;

-- Add comment
COMMENT ON COLUMN findr_conditions_snapshots.water_temp_c IS 
'Sea water potential temperature in degrees Celsius. Source: Copernicus Marine PHY products (thetao variable). Critical for species habitat suitability calculations.';

-- Create index for temperature queries
CREATE INDEX IF NOT EXISTS idx_findr_conditions_temperature 
ON findr_conditions_snapshots(rectangle_code, captured_at DESC, water_temp_c) 
WHERE water_temp_c IS NOT NULL;

-- Verify column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'findr_conditions_snapshots'
  AND column_name = 'water_temp_c';

-- Show sample data structure
SELECT 
  rectangle_code,
  captured_at,
  water_temp_c,
  salinity_psu,
  dissolved_oxygen_mg_l,
  chlorophyll_mg_m3
FROM findr_conditions_snapshots
LIMIT 1;
