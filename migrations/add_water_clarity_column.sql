-- ============================================================================
-- Add water_clarity_kd490 column to findr_conditions_snapshots
-- ============================================================================
--
-- Purpose: Store light attenuation coefficient (KD490) from Copernicus satellite data
-- Used for: Stealth indicator calculation (water clarity + daylight)
--
-- Dataset sources:
-- - Mediterranean: cmems_obs-oc_med_bgc-transp_my_l3-multi-1km_P1D
-- - Atlantic: cmems_obs-oc_atl_bgc-transp_my_l3-multi-1km_P1D
-- - Baltic: cmems_obs-oc_bal_bgc-transp_nrt_l3-olci-300m_P1D
--
-- Units: m⁻¹ (reciprocal meters - light attenuation coefficient)
-- Typical range: 0.01 - 1.0 m⁻¹
--   - Low values (< 0.1) = clear water = high visibility = low stealth
--   - High values (> 0.5) = turbid water = low visibility = high stealth
--
-- Copy this to Supabase SQL Editor and run
-- ============================================================================

-- Add the column
ALTER TABLE findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS water_clarity_kd490 DOUBLE PRECISION;

-- Add comment for documentation
COMMENT ON COLUMN findr_conditions_snapshots.water_clarity_kd490 IS 
'Light attenuation coefficient KD490 in m⁻¹. Lower values = clearer water. Used for stealth indicator calculation.';

-- Create index for performance (queries filtered by rectangle + date)
CREATE INDEX IF NOT EXISTS idx_findr_conditions_clarity 
ON findr_conditions_snapshots(rectangle_code, captured_at, water_clarity_kd490)
WHERE water_clarity_kd490 IS NOT NULL;

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'findr_conditions_snapshots'
  AND column_name = 'water_clarity_kd490';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ water_clarity_kd490 column added successfully!';
  RAISE NOTICE 'Ready to store Copernicus transparency data (KD490).';
END $$;
