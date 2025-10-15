-- Batch Template: All Rays and Sharks (10 species)
-- Efficient batch processing for species with similar biology
-- Date: 2025-10-13

-- ============================================================================
-- RAYS - SHARED CHARACTERISTICS
-- ============================================================================
-- All rays are:
-- - Scent/electroreception hunters (water_clarity_weight = 0)
-- - Strong tidal dependency (0.65-0.75)
-- - Bottom feeders (sand/mixed ground preference)
-- - Moderate temperature range (8-18°C typical)
-- - Diurnal sensitivity: weak to moderate
-- - Spring tides preferred (easier to find food in movement)

-- ============================================================================
-- THORNBACK RAY (Template Species)
-- ============================================================================
-- Most common UK ray, sandy/mixed ground

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Feeds day and night
  tidal_sensitivity = 0.70,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.25,  -- Spring tides stir up food
  light_weight = 0.20,  -- Not very important for rays
  tide_weight = 0.40,  -- Very tide-dependent
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,  -- Uses electroreception
  water_clarity_weight = 0.00,  -- Doesn't rely on vision
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.35,
  context_bias = '[["sandbanks","+0.25"],["mixed_ground","+0.20"],["channels","+0.15"]]'::jsonb
WHERE species_code = 'rjc';

-- ============================================================================
-- SPOTTED RAY
-- ============================================================================
-- Similar to thornback but slightly deeper preference

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.68,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','mid_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.22,
  light_weight = 0.20,
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.35,
  context_bias = '[["sandbanks","+0.25"],["mixed_ground","+0.20"],["offshore_banks","+0.15"]]'::jsonb
WHERE species_code = 'RJM';

-- ============================================================================
-- SMALL-EYED RAY
-- ============================================================================
-- Surf zone specialist, sandy bars

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.72,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],  -- Flooding over bars
  flow_preference = 'moderate',
  spring_neap_boost = 0.28,  -- Loves spring tides
  light_weight = 0.20,
  tide_weight = 0.40,
  wind_weight = 0.10,  -- Surf can help
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[9, 17],
  slack_threshold_ms = 0.35,
  context_bias = '[["surf_zones","+0.30"],["sandy_bars","+0.25"],["channels","+0.15"]]'::jsonb
WHERE species_code = 'RME';

-- ============================================================================
-- UNDULATE RAY
-- ============================================================================
-- Channel/bank specialist, warmer preference

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.70,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.23,
  light_weight = 0.20,
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[10, 18],  -- Slightly warmer
  slack_threshold_ms = 0.30,
  context_bias = '[["channels","+0.25"],["banks","+0.22"],["sand_gravel","+0.15"]]'::jsonb
WHERE species_code = 'RUN';

-- ============================================================================
-- BLONDE RAY
-- ============================================================================
-- Deeper water, offshore banks

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.65,  -- Less tidal in deeper water
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.18,
  tide_weight = 0.35,
  wind_weight = 0.08,
  pressure_weight = 0.15,  -- Deeper water = more pressure sensitive
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[9, 16],
  slack_threshold_ms = 0.30,
  context_bias = '[["offshore_banks","+0.25"],["deep_sand","+0.20"],["channels","+0.15"]]'::jsonb
WHERE species_code = 'RJH';

-- ============================================================================
-- CUCKOO RAY
-- ============================================================================
-- Rocky ground specialist

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.68,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.22,
  light_weight = 0.20,
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[8, 15],
  slack_threshold_ms = 0.35,
  context_bias = '[["rocky_patches","+0.25"],["mixed_ground","+0.20"],["reef_edges","+0.15"]]'::jsonb
WHERE species_code = 'RJN';

-- ============================================================================
-- COMMON SKATE (FLAPPER SKATE)
-- ============================================================================
-- Large deep water species, strong tidal preference

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.73,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','mid_ebb'],
  flow_preference = 'strong',  -- Large fish, handles strong flow
  spring_neap_boost = 0.30,
  light_weight = 0.18,
  tide_weight = 0.42,
  wind_weight = 0.05,
  pressure_weight = 0.15,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[6, 14],  -- Cold water
  slack_threshold_ms = 0.40,
  context_bias = '[["deep_channels","+0.30"],["banks","+0.25"],["rough_ground","+0.15"]]'::jsonb
WHERE species_code IN ('ska', 'RJB');  -- Common skate / flapper

-- ============================================================================
-- SHARKS - SMOOTHHOUNDS (3 species)
-- ============================================================================
-- All smoothhounds are:
-- - Scent hunters (water_clarity_weight = 0)
-- - Strong tidal hunters (0.70-0.75)
-- - Clean ground preference
-- - Warm water preference (12-20°C)
-- - Active day and night (weak diurnal)

-- ============================================================================
-- COMMON SMOOTHHOUND
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Active day and night
  tidal_sensitivity = 0.72,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.28,  -- Spring tides = more active prey
  light_weight = 0.18,
  tide_weight = 0.40,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,  -- Scent hunter
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[12, 20],  -- Warm water specialist
  slack_threshold_ms = 0.35,
  context_bias = '[["clean_ground","+0.25"],["sandbanks","+0.20"],["channels","+0.18"]]'::jsonb
WHERE species_code = 'CSH';

-- ============================================================================
-- STARRY SMOOTHHOUND
-- ============================================================================
-- Very similar to common smoothhound

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.73,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.30,
  light_weight = 0.18,
  tide_weight = 0.40,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[12, 20],
  slack_threshold_ms = 0.35,
  context_bias = '[["clean_ground","+0.28"],["sandbanks","+0.22"],["offshore_banks","+0.15"]]'::jsonb
WHERE species_code = 'SSH';

-- ============================================================================
-- BULL HUSS (GREATER SPOTTED DOGFISH)
-- ============================================================================
-- Rocky ground specialist, night hunter

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Primarily nocturnal
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['high','early_ebb','night_bias'],
  flow_preference = 'gentle',  -- Rocky areas with less flow
  spring_neap_boost = 0.20,
  light_weight = 0.15,  -- Nocturnal
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.30,
  context_bias = '[["rocky_ground","+0.28"],["kelp_beds","+0.20"],["wrecks","+0.18"],["night_bonus","+0.15"]]'::jsonb
WHERE species_code = 'BUH';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check all rays and sharks are now complete:
SELECT 
  species_code,
  name_en,
  diurnal_sensitivity,
  tidal_sensitivity,
  preferred_tide_stage,
  temp_opt_c,
  water_clarity_weight,
  context_bias,
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END as status
FROM species
WHERE species_code IN (
  'rjc',   -- Thornback Ray
  'RJM',   -- Spotted Ray
  'RME',   -- Small-eyed Ray
  'RUN',   -- Undulate Ray
  'RJH',   -- Blonde Ray
  'RJN',   -- Cuckoo Ray
  'ska', 'RJB',  -- Common Skate / Flapper
  'CSH',   -- Common Smoothhound
  'SSH',   -- Starry Smoothhound
  'BUH'    -- Bull Huss
)
ORDER BY 
  CASE 
    WHEN species_code LIKE 'RJ%' OR species_code = 'ska' THEN 1  -- Rays first
    ELSE 2  -- Sharks second
  END,
  species_code;

-- Expected result: All rows should show ✅ COMPLETE

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================

-- Show coverage after batch update:
SELECT 
  'Rays & Sharks' as species_group,
  COUNT(*) as total_in_group,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as complete_count,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END) / COUNT(*),
    1
  ) as percent_complete
FROM species
WHERE species_code IN (
  'rjc', 'RJM', 'RME', 'RUN', 'RJH', 'RJN', 'ska', 'RJB',
  'CSH', 'SSH', 'BUH'
);

-- Expected: 100% complete after running this script
