-- Batch Template: Cod Family (5 species)
-- Efficient batch processing for cod relatives with similar biology
-- Date: 2025-10-13

-- ============================================================================
-- COD FAMILY - SHARED CHARACTERISTICS
-- ============================================================================
-- All cod family members are:
-- - Scent/vibration hunters (low visual dependency)
-- - Strong tidal influence (0.60-0.70)
-- - Structure-oriented (wrecks, reefs, rough ground)
-- - Cold to temperate water preference
-- - Strong diurnal feeders (dawn/dusk peaks)
-- - Bottom to mid-water column

-- ============================================================================
-- COD (Already Complete - Reference Template)
-- ============================================================================
-- Included for reference only - already has complete parameters

-- SELECT species_code, name_en, diurnal_sensitivity, tidal_sensitivity, 
--        preferred_tide_stage, temp_opt_c, water_clarity_weight
-- FROM species WHERE species_code = 'cod';

-- Expected: strong diurnal, 0.65 tidal, [mid_flood,early_ebb], [4,9]°C, 0.00 clarity

-- ============================================================================
-- HADDOCK (Already in premium script, but included here for completeness)
-- ============================================================================
-- Cold water cod relative, wrecks/banks specialist
-- Can skip if premium script already run

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','mid_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.22,
  light_weight = 0.30,
  tide_weight = 0.32,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.13,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,  -- Mixed feeder (scent + sight)
  temp_opt_c = ARRAY[4, 10],  -- Cold water species
  slack_threshold_ms = 0.30,
  context_bias = '[["wrecks","+0.25"],["banks","+0.20"],["rough_ground","+0.15"]]'::jsonb
WHERE species_code = 'had'
  AND preferred_tide_stage IS NULL;  -- Only update if not already complete

-- ============================================================================
-- WHITING
-- ============================================================================
-- Inshore cod relative, sandbanks and mixed ground

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.62,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','dusk_bias'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.32,  -- Strong dawn/dusk feeder
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.13,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,  -- Scent dominant
  temp_opt_c = ARRAY[6, 14],
  slack_threshold_ms = 0.30,
  context_bias = '[["sandbanks","+0.20"],["mixed_ground","+0.18"],["channels","+0.15"],["dusk_dawn","+0.20"]]'::jsonb
WHERE species_code = 'whg';

-- ============================================================================
-- SAITHE / POLLOCK (Pollachius virens)
-- ============================================================================
-- Midwater predator, structure-oriented, active hunter
-- Note: Different from Pollack (Pollachius pollachius) which is already complete

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.68,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.23,
  light_weight = 0.30,
  tide_weight = 0.32,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.13,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,  -- More visual than other cod family
  temp_opt_c = ARRAY[6, 14],  -- Cool water
  slack_threshold_ms = 0.32,
  context_bias = '[["wrecks","+0.25"],["reefs","+0.20"],["kelp_edges","+0.18"]]'::jsonb
WHERE species_code IN ('pok', 'sai');  -- Both codes used for saithe

-- ============================================================================
-- COMMON LING
-- ============================================================================
-- Deep water specialist, powerful predator

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',  -- Less pronounced than shallow cod
  tidal_sensitivity = 0.60,  -- Less tidal in deeper water
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.08,
  pressure_weight = 0.15,  -- Deep water species
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.03,  -- Scent dominant
  temp_opt_c = ARRAY[6, 12],  -- Cold deep water
  slack_threshold_ms = 0.28,
  context_bias = '[["deep_wrecks","+0.28"],["rocky_drops","+0.25"],["rough_ground","+0.18"]]'::jsonb
WHERE species_code = 'lin';

-- ============================================================================
-- POUTING / BIB (Bonus - Common Small Cod Relative)
-- ============================================================================
-- Inshore nuisance species, but still in cod family

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.28,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["harbours","+0.18"],["piers","+0.15"],["wrecks","+0.20"]]'::jsonb
WHERE species_code = 'pou';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check all cod family species are now complete:
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
  'cod',   -- Atlantic Cod (reference)
  'had',   -- Haddock
  'whg',   -- Whiting
  'pok', 'sai',  -- Saithe / Pollock
  'lin',   -- Common Ling
  'pou'    -- Pouting
)
ORDER BY 
  CASE species_code
    WHEN 'cod' THEN 1
    WHEN 'had' THEN 2
    WHEN 'whg' THEN 3
    WHEN 'pok' THEN 4
    WHEN 'sai' THEN 4
    WHEN 'lin' THEN 5
    WHEN 'pou' THEN 6
  END;

-- Expected result: All rows should show ✅ COMPLETE

-- ============================================================================
-- COD FAMILY COMPARISON
-- ============================================================================

-- Compare parameters across cod family to verify consistency:
SELECT 
  species_code,
  name_en,
  temp_opt_c as temp_range,
  tidal_sensitivity,
  water_clarity_weight,
  CASE 
    WHEN temp_opt_c[1] <= 6 THEN 'Cold Water'
    WHEN temp_opt_c[1] <= 8 THEN 'Cool Water'
    ELSE 'Temperate'
  END as water_type,
  CASE 
    WHEN tidal_sensitivity >= 0.65 THEN 'High Tidal'
    WHEN tidal_sensitivity >= 0.60 THEN 'Moderate Tidal'
    ELSE 'Low Tidal'
  END as tidal_category
FROM species
WHERE species_code IN ('cod', 'had', 'whg', 'pok', 'sai', 'lin', 'pou')
ORDER BY temp_opt_c[1];

-- Expected pattern:
-- Coldest: Cod (4-9°C), Haddock (4-10°C)
-- Cool: Saithe (6-14°C), Ling (6-12°C)
-- Temperate: Whiting (6-14°C), Pouting (8-16°C)

-- ============================================================================
-- SUMMARY STATS
-- ============================================================================

SELECT 
  'Cod Family' as species_group,
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
WHERE species_code IN ('cod', 'had', 'whg', 'pok', 'sai', 'lin', 'pou');

-- Expected: 100% complete after running this script

-- ============================================================================
-- HABITAT SUMMARY
-- ============================================================================

-- Show habitat preferences across cod family:
SELECT 
  species_code,
  name_en,
  context_bias->0->0 as primary_habitat,
  context_bias->1->0 as secondary_habitat,
  context_bias->2->0 as tertiary_habitat
FROM species
WHERE species_code IN ('cod', 'had', 'whg', 'pok', 'sai', 'lin', 'pou')
ORDER BY species_code;

-- Expected patterns:
-- Cod: rough_ground, deep_water, wrecks
-- Haddock: wrecks, banks, rough_ground
-- Whiting: sandbanks, mixed_ground, channels
-- Saithe: wrecks, reefs, kelp_edges
-- Ling: deep_wrecks, rocky_drops, rough_ground
-- Pouting: harbours, piers, wrecks
