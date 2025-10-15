-- Quick Fix: Complete Core Species Bite Score Parameters
-- Date: 13 October 2025
-- Priority: HIGH - These are essential UK/Atlantic species

-- ============================================================================
-- FLOUNDER (fle) - Estuary specialist, tide-dependent
-- ============================================================================
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',  -- Feeds day and night, peaks at dusk/dawn
  tidal_sensitivity = 0.70,          -- Strong tide influence in estuaries
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'gentle',        -- Prefers gentle flow over strong current
  spring_neap_boost = 0.15,
  tide_weight = 0.35,                -- Tide is KEY for flounder
  light_weight = 0.25,               
  wind_weight = 0.15,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[8, 16],         -- Cool to mild water
  slack_threshold_ms = 0.25,
  context_bias = '[["estuaries","+0.3"],["surf_estuary","+0.2"],["mudflats","+0.15"]]'::jsonb
WHERE species_code = 'fle';

-- ============================================================================
-- COD (cod) - Deep water, structure-oriented, night feeder
-- ============================================================================
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',  -- Feeds at night and dawn, some daytime activity
  tidal_sensitivity = 0.65,          -- Moderate tide influence
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',      -- Likes moving water over rough ground
  spring_neap_boost = 0.20,
  tide_weight = 0.30,
  light_weight = 0.30,               -- Night/low light important
  wind_weight = 0.12,
  pressure_weight = 0.12,            -- Pressure-sensitive
  temp_weight = 0.10,
  lunar_weight = 0.06,
  temp_opt_c = ARRAY[4, 12],         -- Cold water species
  slack_threshold_ms = 0.30,
  context_bias = '[["rough_ground","+0.25"],["wrecks","+0.2"],["reef_deep","+0.15"]]'::jsonb
WHERE species_code = 'cod';

-- ============================================================================
-- RED MULLET (mul) - Sandy bottoms, daytime sight feeder
-- ============================================================================
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',  -- Daytime feeder, dawn peaks
  tidal_sensitivity = 0.55,          -- Moderate tide influence
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',        -- Clean sandy bottoms, gentle flow
  spring_neap_boost = 0.10,
  tide_weight = 0.30,
  light_weight = 0.30,               -- Sight feeder - light important
  wind_weight = 0.15,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[15, 19],        -- Warm water species (Med/S Atlantic)
  slack_threshold_ms = 0.25,
  context_bias = '[["sandy_bays","+0.25"],["clean_sand","+0.2"],["surf_estuary","+0.15"]]'::jsonb
WHERE species_code = 'mul';

-- ============================================================================
-- BALLAN WRASSE (wrb) - Kelp/rock specialist, daylight feeder
-- ============================================================================
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',    -- Daylight feeder, peaks at dawn/dusk
  tidal_sensitivity = 0.60,          -- Moderate-strong tide influence
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',      -- Likes flow around structure
  spring_neap_boost = 0.15,
  tide_weight = 0.30,
  light_weight = 0.35,               -- Daylight sight feeder
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[10, 16],        -- Temperate - warms up in summer
  slack_threshold_ms = 0.30,
  context_bias = '[["kelp_beds","+0.3"],["rocky_reef","+0.25"],["harbour_walls","+0.15"]]'::jsonb
WHERE species_code = 'wrb';

-- ============================================================================
-- PLAICE (ple) - Sandy bottoms, daylight sight feeder
-- ============================================================================
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',  -- Daylight feeder, sight-dependent
  tidal_sensitivity = 0.60,          -- Moderate tide influence
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'gentle',        -- Clean sandy bottoms
  spring_neap_boost = 0.15,
  tide_weight = 0.30,
  light_weight = 0.30,               -- Sight feeder
  wind_weight = 0.15,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[6, 14],         -- Cool to mild water
  slack_threshold_ms = 0.25,
  context_bias = '[["sandbanks","+0.25"],["clean_sand","+0.2"],["shallow_bays","+0.15"]]'::jsonb
WHERE species_code = 'ple';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this after update to verify all fields populated:
SELECT 
  species_code,
  diurnal_sensitivity,
  tidal_sensitivity,
  preferred_tide_stage,
  temp_opt_c,
  context_bias
FROM species
WHERE species_code IN ('fle', 'cod', 'mul', 'wrb', 'ple')
ORDER BY species_code;

-- Expected: All 5 species should have complete data
