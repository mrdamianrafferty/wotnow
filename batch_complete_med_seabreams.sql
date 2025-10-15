-- Batch Template: Mediterranean Seabreams (6 species)
-- Efficient batch processing for Med bream species with similar biology
-- Date: 2025-10-13

-- ============================================================================
-- MEDITERRANEAN SEABREAMS - SHARED CHARACTERISTICS
-- ============================================================================
-- All Mediterranean seabreams are:
-- - Visual hunters (moderate to high clarity dependency)
-- - Moderate tidal influence (0.45-0.60 - lower than Atlantic)
-- - Rocky reefs, seagrass, and harbour structures
-- - Warm water specialists (16-24°C typical)
-- - Strong diurnal feeders (daylight hunters)
-- - Spring/neap less critical than Atlantic species

-- ============================================================================
-- GILTHEAD SEABREAM / DORADA (Already in premium script)
-- ============================================================================
-- #1 Med target - included here for reference/completeness
-- Can skip if premium script already run

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.32,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.22,
  lunar_weight = 0.06,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.14,  -- Visual hunter
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_coves","+0.25"],["seagrass","+0.15"],["harbour_walls","+0.12"]]'::jsonb
WHERE species_code IN ('sba', 'sbg')
  AND preferred_tide_stage IS NULL;  -- Only if not already complete

-- ============================================================================
-- BLACK SEABREAM
-- ============================================================================
-- Atlantic/Med species, rocky reefs, strong visual hunter

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.58,  -- Higher than pure Med species (Atlantic influence)
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.30,
  tide_weight = 0.28,  -- Higher than pure Med
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.14,  -- Visual hunter
  temp_opt_c = ARRAY[12, 20],  -- Cooler than pure Med species
  slack_threshold_ms = 0.25,
  context_bias = '[["rocky_reefs","+0.25"],["kelp_edges","+0.18"],["wrecks","+0.15"]]'::jsonb
WHERE species_code = 'brs';

-- ============================================================================
-- WHITE SEABREAM (Diplodus sargus)
-- ============================================================================
-- Common Med shore species, rocky coves

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  turbidity_weight = 0.13,
  water_clarity_weight = 0.13,  -- Visual but adaptable
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_coves","+0.20"],["seagrass","+0.10"],["harbour_walls","+0.15"]]'::jsonb
WHERE species_code = 'wht-bream';

-- ============================================================================
-- TWO-BANDED SEABREAM (Diplodus vulgaris)
-- ============================================================================
-- Similar to white seabream, slightly deeper

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  turbidity_weight = 0.13,
  water_clarity_weight = 0.13,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_reefs","+0.20"],["seagrass","+0.10"],["reef_edges","+0.15"]]'::jsonb
WHERE species_code = '2bd-bream';

-- ============================================================================
-- COMMON PANDORA
-- ============================================================================
-- Sandy/mixed ground bream, deeper than Diplodus species

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.12,
  light_weight = 0.28,
  tide_weight = 0.22,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.22,
  lunar_weight = 0.06,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.12,  -- Visual but deeper water
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.22,
  context_bias = '[["sandy_bottoms","+0.20"],["reef_edges","+0.18"],["mixed_ground","+0.12"]]'::jsonb
WHERE species_code = 'pandora';

-- ============================================================================
-- RED PORGY
-- ============================================================================
-- Deeper reefs, drop-offs, structure-oriented

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.28,
  tide_weight = 0.22,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.22,
  lunar_weight = 0.06,
  turbidity_weight = 0.13,
  water_clarity_weight = 0.13,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.25,
  context_bias = '[["reef_dropoffs","+0.22"],["rocky_reefs","+0.20"],["structure","+0.15"]]'::jsonb
WHERE species_code = 'red-porgy';

-- ============================================================================
-- SADDLED SEABREAM (Oblada melanura)
-- ============================================================================
-- Inshore species, harbours and rocky shores

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.08,
  light_weight = 0.32,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.22,
  lunar_weight = 0.06,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[17, 24],  -- Warm water specialist
  slack_threshold_ms = 0.18,
  context_bias = '[["rocky_shores","+0.20"],["harbour_walls","+0.18"],["shallow_reefs","+0.15"]]'::jsonb
WHERE species_code = 'sadd-bream';

-- ============================================================================
-- RED SEABREAM (Already in premium script)
-- ============================================================================
-- Deep water Atlantic/Med bream - included for reference
-- Can skip if premium script already run

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.18,
  lunar_weight = 0.07,
  turbidity_weight = 0.13,
  water_clarity_weight = 0.13,
  temp_opt_c = ARRAY[12, 18],  -- Cooler deep water
  slack_threshold_ms = 0.25,
  context_bias = '[["deep_reefs","+0.25"],["drop_offs","+0.20"],["wrecks","+0.15"]]'::jsonb
WHERE species_code = 'sbr'
  AND preferred_tide_stage IS NULL;  -- Only if not already complete

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check all Mediterranean seabream species are now complete:
SELECT 
  species_code,
  name_en,
  scientific_name,
  diurnal_sensitivity,
  tidal_sensitivity,
  preferred_tide_stage,
  temp_opt_c,
  water_clarity_weight,
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END as status
FROM species
WHERE species_code IN (
  'sba', 'sbg',      -- Gilthead Seabream (2 codes)
  'brs',             -- Black Seabream
  'wht-bream',       -- White Seabream
  '2bd-bream',       -- Two-banded Seabream
  'pandora',         -- Common Pandora
  'red-porgy',       -- Red Porgy
  'sadd-bream',      -- Saddled Seabream
  'sbr'              -- Red Seabream
)
ORDER BY 
  CASE species_code
    WHEN 'sba' THEN 1
    WHEN 'sbg' THEN 1
    WHEN 'brs' THEN 2
    WHEN 'wht-bream' THEN 3
    WHEN '2bd-bream' THEN 4
    WHEN 'pandora' THEN 5
    WHEN 'red-porgy' THEN 6
    WHEN 'sadd-bream' THEN 7
    WHEN 'sbr' THEN 8
  END;

-- Expected result: All rows should show ✅ COMPLETE

-- ============================================================================
-- SEABREAM TEMPERATURE COMPARISON
-- ============================================================================

-- Compare temperature preferences to verify warm water pattern:
SELECT 
  species_code,
  name_en,
  temp_opt_c as temp_range,
  tidal_sensitivity,
  water_clarity_weight,
  CASE 
    WHEN temp_opt_c[1] >= 16 THEN 'Warm Med Species'
    WHEN temp_opt_c[1] >= 12 THEN 'Cool Med/Atlantic'
    ELSE 'Cold Atlantic'
  END as thermal_category,
  CASE 
    WHEN tidal_sensitivity >= 0.55 THEN 'Atlantic Influence'
    ELSE 'Pure Med'
  END as tidal_pattern
FROM species
WHERE species_code IN (
  'sba', 'sbg', 'brs', 'wht-bream', '2bd-bream', 
  'pandora', 'red-porgy', 'sadd-bream', 'sbr'
)
ORDER BY temp_opt_c[1] DESC;

-- Expected pattern:
-- Warmest: Saddled (17-24°C), Gilthead/White/2-banded (16-24°C)
-- Moderate: Pandora/Red Porgy (16-22°C)
-- Cooler: Black (12-20°C), Red Seabream (12-18°C)

-- ============================================================================
-- HABITAT SUMMARY
-- ============================================================================

-- Show habitat preferences across seabream species:
SELECT 
  species_code,
  name_en,
  context_bias->0->0 as primary_habitat,
  context_bias->0->1 as primary_bonus,
  context_bias->1->0 as secondary_habitat,
  context_bias->1->1 as secondary_bonus
FROM species
WHERE species_code IN (
  'sba', 'sbg', 'brs', 'wht-bream', '2bd-bream', 
  'pandora', 'red-porgy', 'sadd-bream', 'sbr'
)
ORDER BY species_code;

-- Expected patterns:
-- Inshore: harbour_walls, rocky_shores, shallow_reefs
-- Mid-depth: rocky_coves, rocky_reefs, seagrass
-- Deeper: reef_dropoffs, deep_reefs, mixed_ground

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================

SELECT 
  'Mediterranean Seabreams' as species_group,
  COUNT(DISTINCT species_code) as total_in_group,
  COUNT(DISTINCT CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN species_code
  END) as complete_count,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN species_code
    END) / COUNT(DISTINCT species_code),
    1
  ) as percent_complete
FROM species
WHERE species_code IN (
  'sba', 'sbg', 'brs', 'wht-bream', '2bd-bream', 
  'pandora', 'red-porgy', 'sadd-bream', 'sbr'
);

-- Expected: 100% complete after running this script

-- ============================================================================
-- VISUAL DEPENDENCY COMPARISON
-- ============================================================================

-- All seabreams are visual hunters - verify clarity weights:
SELECT 
  species_code,
  name_en,
  water_clarity_weight,
  turbidity_weight,
  diurnal_sensitivity,
  'Visual Hunter' as feeding_strategy
FROM species
WHERE species_code IN (
  'sba', 'sbg', 'brs', 'wht-bream', '2bd-bream', 
  'pandora', 'red-porgy', 'sadd-bream', 'sbr'
)
ORDER BY water_clarity_weight DESC;

-- Expected: All should have clarity_weight between 0.12-0.14
-- All should have strong or moderate diurnal sensitivity
