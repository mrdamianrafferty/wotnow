-- Final Completion Script - Last 17 Species
-- Complete all remaining species to achieve 100% coverage
-- Date: 2025-10-13

-- ============================================================================
-- NOTE: Some species may already be complete from previous scripts
-- This script uses conditional logic to only update incomplete species
-- ============================================================================

-- ============================================================================
-- ALREADY COMPLETE FROM PREVIOUS SCRIPTS (Skip these)
-- ============================================================================
-- flounder (fle) - Complete from fix_core_species_bite_params.sql
-- plaice (ple) - Complete from fix_core_species_bite_params.sql
-- black seabream (brs) - Complete from batch_complete_med_seabreams.sql
-- whiting (whg) - Complete from batch_complete_cod_family.sql
-- ling (lin) - Complete from batch_complete_cod_family.sql
-- saithe (pok, sai) - Complete from batch_complete_cod_family.sql

-- ============================================================================
-- WRASSES (6 species) - Similar biology to Ballan Wrasse
-- ============================================================================

-- WRASSE (GENERIC) - Template for various wrasse species
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.14,  -- Visual hunter
  temp_opt_c = ARRAY[10, 16],
  slack_threshold_ms = 0.25,
  context_bias = '[["kelp_beds","+0.25"],["rocky_reefs","+0.20"],["reef_edges","+0.15"]]'::jsonb
WHERE species_code = 'wra'
  AND preferred_tide_stage IS NULL;

-- CORKWING WRASSE (WRK) - Already has environmental_preferences
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.14,
  temp_opt_c = ARRAY[11, 15],  -- From environmental data
  slack_threshold_ms = 0.25,
  context_bias = '[["kelp","+0.28"],["rocks","+0.22"],["reef","+0.18"]]'::jsonb
WHERE species_code = 'WRK'
  AND preferred_tide_stage IS NULL;

-- CUCKOO WRASSE - Deeper, larger wrasse
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.58,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.30,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.15,
  water_clarity_weight = 0.15,
  temp_opt_c = ARRAY[10, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["deep_reefs","+0.25"],["kelp_edges","+0.20"],["wrecks","+0.15"]]'::jsonb
WHERE species_code = 'wrc'
  AND preferred_tide_stage IS NULL;

-- GOLDSINNY WRASSE - Small inshore wrasse
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.52,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.12,
  light_weight = 0.30,
  tide_weight = 0.26,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.13,
  water_clarity_weight = 0.13,
  temp_opt_c = ARRAY[10, 16],
  slack_threshold_ms = 0.22,
  context_bias = '[["shallow_kelp","+0.25"],["rocky_shores","+0.20"],["tide_pools","+0.15"]]'::jsonb
WHERE species_code = 'WRG'
  AND preferred_tide_stage IS NULL;

-- ROCK COOK - Small wrasse, rocky shores
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.28,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.22,
  lunar_weight = 0.05,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[10, 16],
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_crevices","+0.25"],["shallow_reefs","+0.20"],["boulder_fields","+0.15"]]'::jsonb
WHERE species_code = 'WRO'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- PAINTED COMBER (CMP) - Med species, already has environmental data
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.28,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.22,
  lunar_weight = 0.05,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.14,
  temp_opt_c = ARRAY[16, 21],  -- From environmental_preferences (Mediterranean)
  slack_threshold_ms = 0.22,
  context_bias = '[["reef","+0.22"],["harbour","+0.18"],["rocks","+0.15"]]'::jsonb
WHERE species_code = 'CMP'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- GREY GURNARD (GGR) - May have different code than 'guu'
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.58,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.28,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["mixed_ground","+0.20"],["sandy_patches","+0.18"],["muddy_areas","+0.12"]]'::jsonb
WHERE species_code = 'GGR'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- PICAREL (PIC) - Small Med schooling species, already has environmental data
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,  -- Low for Med
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.08,
  light_weight = 0.28,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.27,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[15, 20],  -- From environmental_preferences (Mediterranean)
  slack_threshold_ms = 0.18,
  context_bias = '[["mid_water","+0.22"],["harbour","+0.20"],["shoals","+0.18"]]'::jsonb
WHERE species_code = 'PIC'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- SAND EEL (san) - Baitfish, burrows in sand
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'strong',  -- Daylight only (buries at night)
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.35,  -- Daylight dependent
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.08,
  temp_weight = 0.14,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.30,
  context_bias = '[["sand_banks","+0.30"],["shallow_sand","+0.28"],["tidal_flows","+0.20"]]'::jsonb
WHERE species_code = 'san'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- SMALL-SPOTTED CATSHARK (scy) - Lesser Spotted Dogfish
-- ============================================================================

UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Active day and night
  tidal_sensitivity = 0.62,
  preferred_tide_stage = ARRAY['high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.18,
  light_weight = 0.18,
  tide_weight = 0.35,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,  -- Scent hunter
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["rocky_ground","+0.22"],["mixed_ground","+0.18"],["shallow_reefs","+0.15"]]'::jsonb
WHERE species_code = 'scy'
  AND preferred_tide_stage IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check these 17 species are now complete
SELECT 
  species_code,
  name_en,
  diurnal_sensitivity,
  tidal_sensitivity,
  preferred_tide_stage,
  temp_opt_c,
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END as status
FROM species
WHERE species_code IN (
  'brs', 'CMP', 'fle', 'lin', 'ple', 'pok', 'sai', 'whg',
  'GGR', 'PIC', 'san', 'scy', 'wra', 'wrc', 'WRK', 'WRG', 'WRO'
)
ORDER BY 
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1
    ELSE 2
  END,
  species_code;

-- ============================================================================
-- FINAL OVERALL COMPLETION CHECK
-- ============================================================================

SELECT 
  COUNT(*) as total_species,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN 1 
  END) as fully_complete,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NULL 
    OR temp_opt_c IS NULL 
    OR context_bias IS NULL
    THEN 1 
  END) as still_incomplete,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      AND diurnal_sensitivity IS NOT NULL 
      AND tidal_sensitivity IS NOT NULL 
      AND tidal_sensitivity > 0
      THEN 1 
    END) / COUNT(*),
    1
  ) as percent_complete
FROM species;

-- Expected: 100% complete after running all scripts

-- ============================================================================
-- LIST ANY REMAINING INCOMPLETE SPECIES
-- ============================================================================

SELECT 
  species_code,
  name_en,
  scientific_name,
  eating_quality,
  'STILL INCOMPLETE - Needs manual attention' as note
FROM species
WHERE preferred_tide_stage IS NULL 
  OR temp_opt_c IS NULL 
  OR context_bias IS NULL
ORDER BY eating_quality DESC NULLS LAST, species_code;

-- Expected: Empty result set (0 rows)

-- ============================================================================
-- SUMMARY BY COMPLETION STATUS
-- ============================================================================

SELECT 
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END as status,
  COUNT(*) as species_count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM species), 1) as percentage
FROM species
GROUP BY 
  CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN '✅ COMPLETE'
    ELSE '❌ INCOMPLETE'
  END
ORDER BY status DESC;

-- ============================================================================
-- SPECIES COUNT BY TYPE
-- ============================================================================

-- Show completion by species type
SELECT 
  CASE 
    WHEN species_code LIKE 'RJ%' OR species_code IN ('ska','RJB') THEN 'Rays'
    WHEN species_code IN ('CSH','SSH','BUH','tor','lsd','spu','bsh','scy') THEN 'Sharks'
    WHEN species_code IN ('cod','had','whg','pok','sai','lin','pou') THEN 'Cod Family'
    WHEN species_code IN ('ple','fle','dab','tur','bll','sol','ldb','lem','wit') THEN 'Flatfish'
    WHEN species_code LIKE 'wr%' OR species_code IN ('WRK','WRG','WRO','wra','wrb') THEN 'Wrasse'
    WHEN species_code IN ('bss','mac','pol','gar') THEN 'UK Predators'
    WHEN species_code IN ('sba','sbg','brs','wht-bream','2bd-bream','pandora','red-porgy','sadd-bream','sbr') THEN 'Seabreams'
    WHEN species_code IN ('bonito','leerfish','bluefish','lta','gaj','meagre') THEN 'Med Predators'
    WHEN species_code IN ('dusk-group','whit-group','red-scorp') THEN 'Med Groupers/Scorpion'
    ELSE 'Other'
  END as species_type,
  COUNT(*) as total,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    THEN 1 
  END) as complete,
  ROUND(
    100.0 * COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END) / COUNT(*),
    0
  ) as pct_complete
FROM species
GROUP BY 
  CASE 
    WHEN species_code LIKE 'RJ%' OR species_code IN ('ska','RJB') THEN 'Rays'
    WHEN species_code IN ('CSH','SSH','BUH','tor','lsd','spu','bsh','scy') THEN 'Sharks'
    WHEN species_code IN ('cod','had','whg','pok','sai','lin','pou') THEN 'Cod Family'
    WHEN species_code IN ('ple','fle','dab','tur','bll','sol','ldb','lem','wit') THEN 'Flatfish'
    WHEN species_code LIKE 'wr%' OR species_code IN ('WRK','WRG','WRO','wra','wrb') THEN 'Wrasse'
    WHEN species_code IN ('bss','mac','pol','gar') THEN 'UK Predators'
    WHEN species_code IN ('sba','sbg','brs','wht-bream','2bd-bream','pandora','red-porgy','sadd-bream','sbr') THEN 'Seabreams'
    WHEN species_code IN ('bonito','leerfish','bluefish','lta','gaj','meagre') THEN 'Med Predators'
    WHEN species_code IN ('dusk-group','whit-group','red-scorp') THEN 'Med Groupers/Scorpion'
    ELSE 'Other'
  END
ORDER BY pct_complete ASC, total DESC;

-- This will show which species groups still need attention

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
  complete_count INTEGER;
  total_count INTEGER;
  pct NUMERIC;
  remaining INTEGER;
BEGIN
  SELECT 
    COUNT(CASE 
      WHEN preferred_tide_stage IS NOT NULL 
      AND temp_opt_c IS NOT NULL 
      AND context_bias IS NOT NULL 
      THEN 1 
    END),
    COUNT(*),
    ROUND(
      100.0 * COUNT(CASE 
        WHEN preferred_tide_stage IS NOT NULL 
        AND temp_opt_c IS NOT NULL 
        AND context_bias IS NOT NULL 
        THEN 1 
      END) / COUNT(*),
      1
    )
  INTO complete_count, total_count, pct
  FROM species;
  
  remaining := total_count - complete_count;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BITE SCORE PARAMETER COMPLETION STATUS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Complete: % / % species (% percent complete)', complete_count, total_count, pct;
  
  IF pct >= 95 THEN
    RAISE NOTICE 'SUCCESS! Bite score system ready for production!';
  ELSIF pct >= 80 THEN
    RAISE NOTICE 'Nearly complete - % species remain', remaining;
  ELSE
    RAISE NOTICE 'More work needed - % species incomplete', remaining;
  END IF;
  RAISE NOTICE '========================================';
END $$;
