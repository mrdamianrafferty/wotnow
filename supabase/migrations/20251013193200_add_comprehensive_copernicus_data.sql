-- ============================================================================
-- ADD COMPREHENSIVE COPERNICUS MARINE DATA - PHASE 2
-- ============================================================================
-- Date: 2025-10-13
-- Purpose: Add ocean currents, thermocline depth, wave details, and food chain
--          indicators to maximize fishing prediction accuracy
-- Context: Phase 1 added kd490 (water clarity). This adds ALL remaining valuable
--          Copernicus variables for complete environmental coverage.

-- ============================================================================
-- STEP 1: Add Ocean Dynamics Columns (CRITICAL FOR FISHING)
-- ============================================================================

-- Ocean currents - affects ALL species, scent trails, drift fishing
ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS current_east_ms NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS current_north_ms NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS current_speed_ms NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS current_direction_deg NUMERIC;

-- Thermocline depth - where fish congregate
ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS mixed_layer_depth_m NUMERIC;

-- Upwelling/downwelling indicator
ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS sea_surface_height_m NUMERIC;

COMMENT ON COLUMN public.findr_conditions_snapshots.current_east_ms IS 
'Eastward sea water velocity (m/s). Positive = eastward flow. Source: Copernicus uo variable.';

COMMENT ON COLUMN public.findr_conditions_snapshots.current_north_ms IS 
'Northward sea water velocity (m/s). Positive = northward flow. Source: Copernicus vo variable.';

COMMENT ON COLUMN public.findr_conditions_snapshots.current_speed_ms IS 
'Total current speed (m/s). Calculated: sqrt(uo² + vo²). 0.2-0.5 m/s = ideal feeding conditions.';

COMMENT ON COLUMN public.findr_conditions_snapshots.current_direction_deg IS 
'Current direction (degrees, 0-360). 0° = East, 90° = North. Fish face into current.';

COMMENT ON COLUMN public.findr_conditions_snapshots.mixed_layer_depth_m IS 
'Ocean mixed layer thickness (m). Indicates thermocline depth where fish and baitfish congregate. Source: Copernicus mlotst.';

COMMENT ON COLUMN public.findr_conditions_snapshots.sea_surface_height_m IS 
'Sea surface height above geoid (m). Positive = upwelling (nutrient-rich). Source: Copernicus zos.';

-- ============================================================================
-- STEP 2: Add Food Chain Indicators
-- ============================================================================

-- Direct food sources
ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS zooplankton_mmol_m3 NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS phytoplankton_mmol_m3 NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS primary_production_mg_c_m3_day NUMERIC;

COMMENT ON COLUMN public.findr_conditions_snapshots.zooplankton_mmol_m3 IS 
'Zooplankton carbon concentration (mmol/m³). Direct food for baitfish. High = active ecosystem. Source: Copernicus zooc.';

COMMENT ON COLUMN public.findr_conditions_snapshots.phytoplankton_mmol_m3 IS 
'Phytoplankton carbon concentration (mmol/m³). Base of food chain. Source: Copernicus phyc.';

COMMENT ON COLUMN public.findr_conditions_snapshots.primary_production_mg_c_m3_day IS 
'Net primary production (mg C/m³/day). Ecosystem productivity indicator. Source: Copernicus nppv.';

-- ============================================================================
-- STEP 3: Add Detailed Wave Information
-- ============================================================================

-- Enhanced wave analysis for surf fishing
ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS wave_direction_deg NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS wave_period_s NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS wind_sea_height_m NUMERIC;

ALTER TABLE public.findr_conditions_snapshots 
ADD COLUMN IF NOT EXISTS swell_height_m NUMERIC;

COMMENT ON COLUMN public.findr_conditions_snapshots.wave_direction_deg IS 
'Mean wave direction (degrees, 0-360). Critical for beach fishing positioning. Source: Copernicus vmdr.';

COMMENT ON COLUMN public.findr_conditions_snapshots.wave_period_s IS 
'Mean wave period (seconds). Longer period = better surf fishing. 7-12s ideal. Source: Copernicus vtm10.';

COMMENT ON COLUMN public.findr_conditions_snapshots.wind_sea_height_m IS 
'Local wind-generated wave height (m). Choppy conditions. Source: Copernicus vhm0_ww.';

COMMENT ON COLUMN public.findr_conditions_snapshots.swell_height_m IS 
'Primary swell height (m). Deep ocean swell. Source: Copernicus vhm0_sw1.';

-- ============================================================================
-- STEP 4: Update View to Include All New Fields
-- ============================================================================

DROP VIEW IF EXISTS public.findr_conditions_latest;

CREATE VIEW public.findr_conditions_latest AS
SELECT DISTINCT ON (rectangle_code)
  rectangle_code,
  id,
  captured_at,
  
  -- Core measurements
  sea_temp_c,
  chlorophyll_mg_m3,
  kd490,
  dissolved_oxygen_mg_l,
  salinity_psu,
  nitrate_umol_l,
  phosphate_umol_l,
  
  -- Ocean dynamics (NEW - CRITICAL)
  current_east_ms,
  current_north_ms,
  current_speed_ms,
  current_direction_deg,
  mixed_layer_depth_m,
  sea_surface_height_m,
  
  -- Food chain indicators (NEW)
  zooplankton_mmol_m3,
  phytoplankton_mmol_m3,
  primary_production_mg_c_m3_day,
  
  -- Wave conditions
  wave_height_m,
  wave_direction_deg,
  wave_period_s,
  wind_sea_height_m,
  swell_height_m,
  
  -- Wind
  wind_speed_kts,
  wind_direction_deg,
  
  -- Tides
  next_high_tide_iso,
  next_low_tide_iso,
  
  -- JSON data
  hourly_marine_json,
  daily_marine_json,
  
  -- Metadata
  source,
  created_at
FROM public.findr_conditions_snapshots
ORDER BY rectangle_code, captured_at DESC;

COMMENT ON VIEW public.findr_conditions_latest IS 
'Latest conditions snapshot per ICES rectangle. Includes comprehensive Copernicus marine data: currents, thermocline, waves, food chain, and water clarity.';

-- ============================================================================
-- STEP 5: Create Helper Functions for Current Analysis
-- ============================================================================

-- Calculate ideal current score for bite predictions
CREATE OR REPLACE FUNCTION public.calculate_current_score(
  current_speed_ms NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  IF current_speed_ms IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- 0.2-0.5 m/s = ideal feeding conditions
  -- Too slow: fish not actively feeding
  -- Too fast: fish can't hold position
  CASE
    WHEN current_speed_ms < 0.1 THEN RETURN 0.5;  -- Too still
    WHEN current_speed_ms >= 0.1 AND current_speed_ms <= 0.5 THEN RETURN 1.0;  -- Perfect
    WHEN current_speed_ms > 0.5 AND current_speed_ms <= 1.0 THEN RETURN 0.7;  -- Strong
    ELSE RETURN 0.4;  -- Too strong
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_current_score IS 
'Returns 0-1 score for current speed suitability. 0.2-0.5 m/s = ideal (1.0). Affects ALL species feeding activity.';

-- ============================================================================
-- STEP 6: Create Helper Function for Thermocline Proximity
-- ============================================================================

-- Check if target depth is near thermocline (where fish congregate)
CREATE OR REPLACE FUNCTION public.is_near_thermocline(
  target_depth_m NUMERIC,
  mixed_layer_depth_m NUMERIC,
  tolerance_m NUMERIC DEFAULT 5.0
) RETURNS BOOLEAN AS $$
BEGIN
  IF target_depth_m IS NULL OR mixed_layer_depth_m IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Within 5m of thermocline = fish highway
  RETURN ABS(target_depth_m - mixed_layer_depth_m) <= tolerance_m;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.is_near_thermocline IS 
'Returns TRUE if target depth is within tolerance of thermocline. Fish and baitfish congregate at thermocline edges.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all columns were added
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'kd490',
    'current_east_ms',
    'current_north_ms', 
    'current_speed_ms',
    'current_direction_deg',
    'mixed_layer_depth_m',
    'sea_surface_height_m',
    'zooplankton_mmol_m3',
    'phytoplankton_mmol_m3',
    'primary_production_mg_c_m3_day',
    'wave_direction_deg',
    'wave_period_s',
    'wind_sea_height_m',
    'swell_height_m'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
        AND table_name = 'findr_conditions_snapshots'
        AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '❌ Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All Copernicus columns added successfully';
  END IF;
END $$;

-- Check view includes new columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'findr_conditions_latest'
      AND column_name = 'current_speed_ms'
  ) THEN
    RAISE NOTICE '✅ View findr_conditions_latest includes ocean currents';
  ELSE
    RAISE WARNING '❌ View missing ocean currents';
  END IF;
END $$;

-- Show complete structure
SELECT 
  column_name,
  data_type,
  col_description('public.findr_conditions_snapshots'::regclass, ordinal_position) as description
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'findr_conditions_snapshots'
ORDER BY ordinal_position;

-- ============================================================================
-- IMPACT SUMMARY
-- ============================================================================

DO $$
DECLARE
  total_cols INTEGER;
  copernicus_cols INTEGER;
BEGIN
  SELECT COUNT(*) 
  INTO total_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'findr_conditions_snapshots';
    
  SELECT COUNT(*)
  INTO copernicus_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'findr_conditions_snapshots'
    AND column_name IN (
      'sea_temp_c', 'chlorophyll_mg_m3', 'kd490', 
      'dissolved_oxygen_mg_l', 'salinity_psu', 
      'nitrate_umol_l', 'phosphate_umol_l',
      'current_east_ms', 'current_north_ms', 
      'current_speed_ms', 'current_direction_deg',
      'mixed_layer_depth_m', 'sea_surface_height_m',
      'zooplankton_mmol_m3', 'phytoplankton_mmol_m3',
      'primary_production_mg_c_m3_day',
      'wave_height_m', 'wave_direction_deg', 
      'wave_period_s', 'wind_sea_height_m', 'swell_height_m'
    );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COPERNICUS INTEGRATION - PHASE 2 COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total columns: %', total_cols;
  RAISE NOTICE 'Copernicus data fields: %', copernicus_cols;
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEW CAPABILITIES:';
  RAISE NOTICE '  ✅ Ocean currents (scent trails, drift fishing)';
  RAISE NOTICE '  ✅ Thermocline depth (fish congregation zones)';
  RAISE NOTICE '  ✅ Upwelling detection (nutrient-rich zones)';
  RAISE NOTICE '  ✅ Food chain indicators (baitfish presence)';
  RAISE NOTICE '  ✅ Wave period/direction (surf fishing)';
  RAISE NOTICE '  ✅ Swell vs wind sea (ocean vs local conditions)';
  RAISE NOTICE '';
  RAISE NOTICE '🐟 SPECIES BENEFITS:';
  RAISE NOTICE '  🦈 Sharks/Rays: Follow scent in currents';
  RAISE NOTICE '  🐟 Bass: Hunt at current breaks';
  RAISE NOTICE '  🐠 Mackerel: Follow current-driven baitfish';
  RAISE NOTICE '  🐟 Tuna/Bonito: Patrol thermocline edges';
  RAISE NOTICE '  🌊 ALL: More accurate bite predictions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Update API to populate new fields';
  RAISE NOTICE '========================================';
END $$;
