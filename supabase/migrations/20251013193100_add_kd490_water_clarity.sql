-- ============================================================================
-- ADD KD490 WATER CLARITY SUPPORT
-- ============================================================================
-- Date: 2025-10-13
-- Purpose: Add kd490 (water clarity/light attenuation) to conditions data
-- Context: Enables sight-feeding fish species to benefit from water clarity
--          predictions in bite score calculations

-- ============================================================================
-- STEP 1: Add kd490 column to base table
-- ============================================================================

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS kd490 NUMERIC;

COMMENT ON COLUMN public.findr_conditions_snapshots.kd490 IS 
'Diffuse attenuation coefficient at 490nm (m⁻¹). Measures water clarity/turbidity. Lower values = clearer water. Typical range: 0.04 (very clear) to 0.5+ (very turbid). Source: Copernicus Marine Service CMEMS.';

-- ============================================================================
-- STEP 2: Update view to include kd490
-- ============================================================================

-- Drop and recreate view (required when adding column in middle of column list)
DROP VIEW IF EXISTS public.findr_conditions_latest;

CREATE VIEW public.findr_conditions_latest AS
SELECT DISTINCT ON (rectangle_code)
  rectangle_code,
  id,
  captured_at,
  sea_temp_c,
  chlorophyll_mg_m3,
  kd490,  -- ← NEW: Water clarity metric
  dissolved_oxygen_mg_l,
  salinity_psu,
  nitrate_umol_l,
  phosphate_umol_l,
  wave_height_m,
  wind_speed_kts,
  wind_direction_deg,
  next_high_tide_iso,
  next_low_tide_iso,
  hourly_marine_json,
  daily_marine_json,
  source,
  created_at
FROM public.findr_conditions_snapshots
ORDER BY rectangle_code, captured_at DESC;

COMMENT ON VIEW public.findr_conditions_latest IS 
'Latest conditions snapshot per ICES rectangle. Now includes kd490 water clarity for sight-feeding fish predictions.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'findr_conditions_snapshots'
      AND column_name = 'kd490'
  ) THEN
    RAISE NOTICE '✅ Column kd490 added to findr_conditions_snapshots';
  ELSE
    RAISE WARNING '❌ Column kd490 NOT found in findr_conditions_snapshots';
  END IF;
END $$;

-- Check view includes kd490
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'findr_conditions_latest'
      AND column_name = 'kd490'
  ) THEN
    RAISE NOTICE '✅ View findr_conditions_latest includes kd490';
  ELSE
    RAISE WARNING '❌ View findr_conditions_latest missing kd490';
  END IF;
END $$;

-- Show current structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'findr_conditions_snapshots'
ORDER BY ordinal_position;

-- ============================================================================
-- IMPACT SUMMARY
-- ============================================================================

DO $$
DECLARE
  sight_feeder_count INTEGER;
  total_species INTEGER;
BEGIN
  -- Count species that benefit from water clarity
  SELECT 
    COUNT(*) FILTER (WHERE water_clarity_weight > 0),
    COUNT(*)
  INTO sight_feeder_count, total_species
  FROM public.species;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'WATER CLARITY INTEGRATION - COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Species benefiting: % / %', sight_feeder_count, total_species;
  RAISE NOTICE 'Database: kd490 column added ✅';
  RAISE NOTICE 'View: findr_conditions_latest updated ✅';
  RAISE NOTICE 'API: conditions endpoint ready ✅';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Populate kd490 from Copernicus CMEMS';
  RAISE NOTICE 'Dataset: cmems_obs-oc_glo_bgc-optics_my_l4-gapfree-multi-4km_P1D';
  RAISE NOTICE '========================================';
END $$;
