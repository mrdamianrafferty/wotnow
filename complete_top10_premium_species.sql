-- Complete Top 10 Premium Species (5-Star Eating Quality)
-- Run this to populate bite score parameters for the most sought-after species
-- Date: 2025-10-13

-- ============================================================================
-- UK/ATLANTIC PREMIUM FLATFISH (3 species)
-- ============================================================================

-- DOVER SOLE - Premium nocturnal flatfish
-- Night feeder, sandy bays, moderate tidal influence
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Primarily nocturnal feeder
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high_slack','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.20,  -- Less important (night feeder)
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.18,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.08,  -- Low visual (nocturnal, uses smell)
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.25,
  context_bias = '[["sandy_bays","+0.25"],["muddy_estuary","+0.15"],["night_bonus","+0.20"]]'::jsonb
WHERE species_code = 'sol';

-- TURBOT - Premium ambush flatfish
-- Sight hunter, structure-loving, strong tidal preference
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.28,
  tide_weight = 0.32,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.13,
  lunar_weight = 0.05,
  turbidity_weight = 0.16,
  water_clarity_weight = 0.16,  -- Visual ambush predator
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.30,
  context_bias = '[["sandbanks","+0.25"],["reef_edges","+0.20"],["channel_edges","+0.15"]]'::jsonb
WHERE species_code = 'tur';

-- BRILL - Premium flatfish, similar to turbot
-- Sight hunter, sandy/mixed ground, moderate tidal
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.58,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.28,
  tide_weight = 0.30,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.15,
  water_clarity_weight = 0.15,  -- Visual hunter
  temp_opt_c = ARRAY[9, 17],
  slack_threshold_ms = 0.30,
  context_bias = '[["sandbanks","+0.25"],["mixed_ground","+0.15"],["bank_edges","+0.20"]]'::jsonb
WHERE species_code = 'bll';

-- ============================================================================
-- UK/ATLANTIC PREMIUM PREDATORS (4 species)
-- ============================================================================

-- HADDOCK - Cold water cod relative
-- Bottom feeder, wrecks/banks, strong tidal influence
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
WHERE species_code = 'had';

-- HERRING - Pelagic schooling fish
-- Strong diurnal pattern, tidal rips, visual schooler
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.25,
  light_weight = 0.32,
  tide_weight = 0.28,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.10,
  lunar_weight = 0.07,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.12,  -- Visual schooling fish
  temp_opt_c = ARRAY[6, 14],  -- Cool water
  slack_threshold_ms = 0.35,
  context_bias = '[["tidal_rips","+0.20"],["harbour_lights","+0.15"],["bait_balls","+0.25"]]'::jsonb
WHERE species_code = 'her';

-- SEA TROUT - Estuarine predator
-- Similar to bass, strong tidal/lunar influence
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.75,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','dusk_bias'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.30,
  light_weight = 0.32,
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.08,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,  -- Visual predator
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.30,
  context_bias = '[["river_mouths","+0.30"],["estuaries","+0.25"],["dusk_dawn","+0.20"]]'::jsonb
WHERE species_code = 'trs';

-- DENTEX - Mediterranean premium predator
-- Rocky reefs, visual hunter, moderate tidal (Med)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,  -- Lower for Mediterranean
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.22,  -- Lower for Med
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.06,
  turbidity_weight = 0.15,
  water_clarity_weight = 0.15,  -- Visual predator
  temp_opt_c = ARRAY[16, 24],  -- Warm water
  slack_threshold_ms = 0.25,
  context_bias = '[["rocky_reefs","+0.25"],["drop_offs","+0.20"],["structure","+0.15"]]'::jsonb
WHERE species_code = 'dex';

-- ============================================================================
-- UK/ATLANTIC PREMIUM CEPHALOPODS (3 species)
-- ============================================================================

-- COMMON SQUID - Year-round pelagic target
-- Visual hunter, harbour lights, tidal influence
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Active day and night
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.08,
  temp_weight = 0.20,
  lunar_weight = 0.12,  -- Important for squid
  turbidity_weight = 0.15,
  water_clarity_weight = 0.15,  -- Visual hunter
  temp_opt_c = ARRAY[8, 18],
  slack_threshold_ms = 0.30,
  context_bias = '[["harbour_lights","+0.30"],["pier_lights","+0.25"],["night_bonus","+0.15"]]'::jsonb
WHERE species_code = 'sqc';

-- COMMON CUTTLEFISH - Coastal/estuarine cephalopod
-- Visual ambush hunter, structure-oriented
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.28,
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.18,
  lunar_weight = 0.06,
  turbidity_weight = 0.16,
  water_clarity_weight = 0.16,  -- Visual ambush
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.25,
  context_bias = '[["weed_beds","+0.25"],["structure","+0.20"],["estuaries","+0.15"]]'::jsonb
WHERE species_code = 'cut';

-- COMMON OCTOPUS - Mediterranean/Atlantic bottom dweller
-- Night hunter, rocky crevices, moderate tidal
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Nocturnal hunter
  tidal_sensitivity = 0.40,
  preferred_tide_stage = ARRAY['high','early_ebb','night_bias'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.08,
  light_weight = 0.18,  -- Nocturnal
  tide_weight = 0.25,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.25,
  lunar_weight = 0.12,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,  -- Uses touch/chemoreception
  temp_opt_c = ARRAY[14, 24],  -- Warm water
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_crevices","+0.30"],["caves","+0.25"],["night_bonus","+0.20"]]'::jsonb
WHERE species_code = 'oct';

-- ============================================================================
-- MEDITERRANEAN PREMIUM SEABREAM (2 species)
-- ============================================================================

-- SEA BREAM / DORADA (Gilthead Seabream) - #1 Med target
-- Rocky coves, visual hunter, warm water specialist
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,  -- Lower for Med
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.32,
  tide_weight = 0.20,  -- Lower for Med
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.22,
  lunar_weight = 0.06,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.14,  -- Visual hunter
  temp_opt_c = ARRAY[16, 24],  -- Warm water
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_coves","+0.25"],["seagrass","+0.15"],["harbour_walls","+0.12"]]'::jsonb
WHERE species_code IN ('sba', 'sbg');  -- Both codes for same species

-- RED SEABREAM - Deep water Med/Atlantic bream
-- Rocky reefs, visual hunter, cooler deep water
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
  water_clarity_weight = 0.13,  -- Visual but deeper water
  temp_opt_c = ARRAY[12, 18],  -- Cooler than dorada
  slack_threshold_ms = 0.25,
  context_bias = '[["deep_reefs","+0.25"],["drop_offs","+0.20"],["wrecks","+0.15"]]'::jsonb
WHERE species_code = 'sbr';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check all 10 premium species are now complete:
SELECT 
  species_code,
  name_en,
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
WHERE species_code IN ('sol','tur','bll','had','her','trs','dex','sqc','cut','oct','sba','sbg','sbr')
ORDER BY 
  CASE species_code
    WHEN 'sol' THEN 1
    WHEN 'tur' THEN 2
    WHEN 'bll' THEN 3
    WHEN 'had' THEN 4
    WHEN 'her' THEN 5
    WHEN 'trs' THEN 6
    WHEN 'dex' THEN 7
    WHEN 'sqc' THEN 8
    WHEN 'cut' THEN 9
    WHEN 'oct' THEN 10
    WHEN 'sba' THEN 11
    WHEN 'sbg' THEN 11  -- Same species as sba
    WHEN 'sbr' THEN 12
  END;

-- Expected result: All 13 rows (11 unique species) should show ✅ COMPLETE
