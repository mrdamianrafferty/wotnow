-- Batch Template: Remaining Species - Complete Coverage
-- Final script to complete all remaining species with bite score parameters
-- Date: 2025-10-13

-- ============================================================================
-- REMAINING FLATFISH (4 species)
-- ============================================================================

-- DAB - Small inshore flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.28,
  tide_weight = 0.32,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,  -- Sight feeder
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["sandbanks","+0.20"],["mixed_ground","+0.18"],["shallow_bays","+0.15"]]'::jsonb
WHERE species_code = 'dab';

-- MEGRIM (Lepidorhombus) - Deep flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.25,
  tide_weight = 0.28,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[8, 14],
  slack_threshold_ms = 0.25,
  context_bias = '[["deep_sand","+0.22"],["muddy_ground","+0.18"],["offshore","+0.15"]]'::jsonb
WHERE species_code = 'ldb';

-- LEMON SOLE - Premium flatfish
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
  pressure_weight = 0.12,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.14,  -- Visual hunter
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["mixed_ground","+0.22"],["sandbanks","+0.18"],["gravel","+0.15"]]'::jsonb
WHERE species_code = 'lem';

-- WITCH FLOUNDER - Deep water flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.12,
  light_weight = 0.22,
  tide_weight = 0.28,
  wind_weight = 0.08,
  pressure_weight = 0.18,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.05,
  water_clarity_weight = 0.08,
  temp_opt_c = ARRAY[6, 12],
  slack_threshold_ms = 0.25,
  context_bias = '[["deep_mud","+0.25"],["soft_ground","+0.20"],["offshore","+0.15"]]'::jsonb
WHERE species_code = 'wit';

-- ============================================================================
-- GURNARDS (3 species)
-- ============================================================================

-- TUB GURNARD (Already identified as priority)
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
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.28,
  context_bias = '[["mixed_ground","+0.20"],["sandy_banks","+0.18"],["reef_edges","+0.15"]]'::jsonb
WHERE species_code = 'gug';

-- RED GURNARD (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.28,
  tide_weight = 0.32,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[9, 17],
  slack_threshold_ms = 0.28,
  context_bias = '[["sand","+0.22"],["mixed_ground","+0.18"],["flats","+0.15"]]'::jsonb
WHERE species_code = 'GUR';

-- GREY GURNARD
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
WHERE species_code = 'guu';

-- ============================================================================
-- MULLETS (2 species)
-- ============================================================================

-- GREY MULLET (Thick-lipped) - Already identified as priority
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.20,
  light_weight = 0.28,
  tide_weight = 0.32,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,  -- Doesn't mind murky water
  water_clarity_weight = 0.05,
  temp_opt_c = ARRAY[12, 20],
  slack_threshold_ms = 0.25,
  context_bias = '[["harbours","+0.25"],["estuaries","+0.22"],["warm_outflows","+0.18"]]'::jsonb
WHERE species_code = 'mug';

-- FLATHEAD GREY MULLET - Similar to grey mullet
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.63,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.18,
  light_weight = 0.28,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,
  temp_opt_c = ARRAY[14, 22],  -- Warmer preference
  slack_threshold_ms = 0.25,
  context_bias = '[["harbours","+0.22"],["warm_bays","+0.20"],["marinas","+0.18"]]'::jsonb
WHERE species_code = 'fgm';

-- ============================================================================
-- PELAGIC SPECIES (3 species)
-- ============================================================================

-- SARDINE / PILCHARD
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.18,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[12, 20],
  slack_threshold_ms = 0.30,
  context_bias = '[["harbours","+0.20"],["bait_balls","+0.25"],["surface_lights","+0.15"]]'::jsonb
WHERE species_code = 'pil';

-- SPRAT
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.48,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.12,
  light_weight = 0.28,
  tide_weight = 0.22,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.23,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[8, 18],
  slack_threshold_ms = 0.25,
  context_bias = '[["harbours","+0.20"],["pier_lights","+0.22"],["estuaries","+0.15"]]'::jsonb
WHERE species_code = 'spr';

-- HORSE MACKEREL (Scad)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.30,
  tide_weight = 0.28,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.30,
  context_bias = '[["tidal_rips","+0.22"],["headlands","+0.20"],["reef_edges","+0.15"]]'::jsonb
WHERE species_code = 'hom';

-- ============================================================================
-- OTHER PREDATORS (6 species)
-- ============================================================================

-- CONGER EEL (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Nocturnal
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['high','early_ebb','night_bias'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.15,  -- Nocturnal
  tide_weight = 0.35,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.22,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,  -- Scent hunter
  temp_opt_c = ARRAY[10, 20],
  slack_threshold_ms = 0.25,
  context_bias = '[["wrecks","+0.30"],["rocky_holes","+0.28"],["harbours","+0.15"],["night_bonus","+0.20"]]'::jsonb
WHERE species_code = 'con';

-- GARFISH
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.32,
  tide_weight = 0.28,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,  -- Visual surface hunter
  temp_opt_c = ARRAY[12, 20],
  slack_threshold_ms = 0.30,
  context_bias = '[["surface","+0.25"],["harbours","+0.18"],["piers","+0.15"]]'::jsonb
WHERE species_code = 'gar';

-- TOPE SHARK
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.68,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.25,
  light_weight = 0.18,
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.12,
  temp_weight = 0.19,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.35,
  context_bias = '[["channels","+0.25"],["sandbanks","+0.22"],["offshore","+0.15"]]'::jsonb
WHERE species_code = 'tor';

-- LESSER SPOTTED DOGFISH
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
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
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[8, 16],
  slack_threshold_ms = 0.28,
  context_bias = '[["rocky_ground","+0.22"],["mixed_ground","+0.18"],["wrecks","+0.15"]]'::jsonb
WHERE species_code = 'lsd';

-- SPURDOG
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.22,
  light_weight = 0.18,
  tide_weight = 0.38,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.16,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.00,
  temp_opt_c = ARRAY[6, 14],  -- Cold water
  slack_threshold_ms = 0.32,
  context_bias = '[["deep_water","+0.25"],["banks","+0.20"],["offshore","+0.15"]]'::jsonb
WHERE species_code = 'spu';

-- BLUE SHARK
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',
  tidal_sensitivity = 0.45,  -- Offshore, less tidal
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.12,
  light_weight = 0.20,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.15,
  temp_weight = 0.25,
  lunar_weight = 0.05,
  turbidity_weight = 0.00,
  water_clarity_weight = 0.05,
  temp_opt_c = ARRAY[12, 20],
  slack_threshold_ms = 0.30,
  context_bias = '[["offshore","+0.30"],["deep_water","+0.25"],["open_ocean","+0.20"]]'::jsonb
WHERE species_code = 'bsh';

-- ============================================================================
-- MEDITERRANEAN PREDATORS (5 species)
-- ============================================================================

-- LEERFISH (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.32,
  tide_weight = 0.28,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,  -- Visual predator
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.30,
  context_bias = '[["surf_zones","+0.28"],["headlands","+0.25"],["beaches","+0.18"]]'::jsonb
WHERE species_code = 'leerfish';

-- BLUEFISH (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.32,
  tide_weight = 0.28,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.32,
  context_bias = '[["bait_balls","+0.30"],["river_mouths","+0.25"],["open_water","+0.15"]]'::jsonb
WHERE species_code = 'bluefish';

-- LITTLE TUNNY (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'strong',
  spring_neap_boost = 0.20,
  light_weight = 0.32,
  tide_weight = 0.25,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.18,
  lunar_weight = 0.05,
  turbidity_weight = 0.15,
  water_clarity_weight = 0.18,  -- Visual pelagic hunter
  temp_opt_c = ARRAY[18, 26],
  slack_threshold_ms = 0.35,
  context_bias = '[["bait_balls","+0.30"],["tidal_rips","+0.28"],["offshore","+0.20"]]'::jsonb
WHERE species_code = 'lta';

-- GREATER AMBERJACK (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.52,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,
  temp_opt_c = ARRAY[18, 26],
  slack_threshold_ms = 0.30,
  context_bias = '[["wrecks","+0.28"],["reefs","+0.25"],["drop_offs","+0.20"]]'::jsonb
WHERE species_code = 'gaj';

-- BONITO (Atlantic) - Med/Atlantic predator
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'strong',
  spring_neap_boost = 0.20,
  light_weight = 0.32,
  tide_weight = 0.25,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.18,
  lunar_weight = 0.05,
  turbidity_weight = 0.15,
  water_clarity_weight = 0.18,
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.35,
  context_bias = '[["bait_balls","+0.30"],["current_lines","+0.28"],["open_water","+0.20"]]'::jsonb
WHERE species_code = 'bonito';

-- ============================================================================
-- MEDITERRANEAN GROUPERS & SCORPIONFISH (3 species)
-- ============================================================================

-- DUSKY GROUPER (Already identified as priority in original migration)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.22,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.25,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.20,
  context_bias = '[["caves","+0.30"],["rocky_reefs","+0.28"],["wrecks","+0.25"]]'::jsonb
WHERE species_code = 'dusk-group';

-- WHITE GROUPER
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.22,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.25,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[18, 26],  -- Warmer than dusky
  slack_threshold_ms = 0.20,
  context_bias = '[["wrecks","+0.28"],["reef_edges","+0.25"],["drop_offs","+0.22"]]'::jsonb
WHERE species_code = 'whit-group';

-- RED SCORPIONFISH (Already identified as priority in original migration)
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Ambush predator
  tidal_sensitivity = 0.40,
  preferred_tide_stage = ARRAY['high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.08,
  light_weight = 0.20,
  tide_weight = 0.22,
  wind_weight = 0.08,
  pressure_weight = 0.15,
  temp_weight = 0.30,
  lunar_weight = 0.05,
  turbidity_weight = 0.05,
  water_clarity_weight = 0.08,
  temp_opt_c = ARRAY[14, 24],
  slack_threshold_ms = 0.18,
  context_bias = '[["rocky_reefs","+0.30"],["crevices","+0.28"],["ambush_points","+0.25"]]'::jsonb
WHERE species_code = 'red-scorp';

-- ============================================================================
-- MEDITERRANEAN WRASSE & COMBERS (3 species)
-- ============================================================================

-- COMBER (Serranus cabrilla) - Already identified as priority
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
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.22,
  context_bias = '[["reef","+0.22"],["harbour","+0.18"],["wreck","+0.15"]]'::jsonb
WHERE species_code = 'CMB';

-- PAINTED COMBER - Already covered in audit, similar to comber
-- (Parameters already exist from original migration or should be similar)

-- CORKWING WRASSE (Already has parameters from previous work)
-- Skip if already complete

-- PARROTFISH (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.08,
  light_weight = 0.32,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.23,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,  -- Visual grazer
  temp_opt_c = ARRAY[18, 26],
  slack_threshold_ms = 0.20,
  context_bias = '[["seagrass","+0.28"],["rocky_reefs","+0.25"],["algae_beds","+0.22"]]'::jsonb
WHERE species_code = 'par';

-- SALEMA (Already identified as priority)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.48,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.22,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.23,
  lunar_weight = 0.05,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.14,
  temp_opt_c = ARRAY[17, 25],
  slack_threshold_ms = 0.20,
  context_bias = '[["weed_beds","+0.25"],["reef","+0.20"],["shallow","+0.18"]]'::jsonb
WHERE species_code = 'SAL';

-- ============================================================================
-- MEDITERRANEAN MISC (4 species)
-- ============================================================================

-- BOGUE (Small schooling fish)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
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
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.18,
  context_bias = '[["harbours","+0.20"],["open_water","+0.18"],["pier_lights","+0.15"]]'::jsonb
WHERE species_code = 'bogue';

-- MEDITERRANEAN SCAD
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.48,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.12,
  light_weight = 0.28,
  tide_weight = 0.22,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.23,
  lunar_weight = 0.05,
  turbidity_weight = 0.10,
  water_clarity_weight = 0.12,
  temp_opt_c = ARRAY[16, 24],
  slack_threshold_ms = 0.25,
  context_bias = '[["harbour_lights","+0.22"],["open_water","+0.18"],["schooling","+0.20"]]'::jsonb
WHERE species_code = 'med-scad';

-- ATLANTIC CHUB MACKEREL
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.18,
  light_weight = 0.32,
  tide_weight = 0.28,
  wind_weight = 0.12,
  pressure_weight = 0.08,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  turbidity_weight = 0.14,
  water_clarity_weight = 0.16,
  temp_opt_c = ARRAY[14, 22],
  slack_threshold_ms = 0.32,
  context_bias = '[["tidal_rips","+0.25"],["open_water","+0.20"],["current_lines","+0.22"]]'::jsonb
WHERE species_code = 'chub-mack';

-- YELLOWMOUTH BARRACUDA (Night predator)
UPDATE species 
SET 
  diurnal_sensitivity = 'weak',  -- Nocturnal
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['high','early_ebb','night_bias'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.18,  -- Nocturnal
  tide_weight = 0.22,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.33,
  lunar_weight = 0.05,
  turbidity_weight = 0.08,
  water_clarity_weight = 0.10,
  temp_opt_c = ARRAY[18, 26],
  slack_threshold_ms = 0.20,
  context_bias = '[["harbour_lights","+0.30"],["reef_edges","+0.22"],["night_bonus","+0.20"]]'::jsonb
WHERE species_code = 'yel-cuda';

-- ============================================================================
-- MISCELLANEOUS UK SPECIES (3 species)
-- ============================================================================

-- GREATER WEEVER
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.52,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.25,
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  turbidity_weight = 0.05,
  water_clarity_weight = 0.08,  -- Ambush in sand
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.25,
  context_bias = '[["sandy_beaches","+0.25"],["estuary_bars","+0.20"],["shallow_sand","+0.18"]]'::jsonb
WHERE species_code = 'wee';

-- BALLAN WRASSE (Already complete from earlier work)
-- Skip

-- JOHN DORY
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.28,
  tide_weight = 0.28,
  wind_weight = 0.10,
  pressure_weight = 0.12,
  temp_weight = 0.17,
  lunar_weight = 0.05,
  turbidity_weight = 0.12,
  water_clarity_weight = 0.14,
  temp_opt_c = ARRAY[10, 18],
  slack_threshold_ms = 0.28,
  context_bias = '[["reefs","+0.25"],["wrecks","+0.22"],["structure","+0.18"]]'::jsonb
WHERE species_code = 'jdo';

-- PICAREL (Small Med species)
-- Already has parameters from environmental_preferences

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check overall completion status
SELECT 
  COUNT(*) as total_species,
  COUNT(CASE WHEN preferred_tide_stage IS NOT NULL THEN 1 END) as has_tide_stage,
  COUNT(CASE WHEN temp_opt_c IS NOT NULL THEN 1 END) as has_temp_range,
  COUNT(CASE WHEN context_bias IS NOT NULL THEN 1 END) as has_context_bias,
  COUNT(CASE 
    WHEN preferred_tide_stage IS NOT NULL 
    AND temp_opt_c IS NOT NULL 
    AND context_bias IS NOT NULL 
    AND diurnal_sensitivity IS NOT NULL 
    AND tidal_sensitivity IS NOT NULL 
    AND tidal_sensitivity > 0
    THEN 1 
  END) as fully_complete,
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

-- Expected: Close to 100% after running all batch scripts

-- ============================================================================
-- FINAL SPECIES BREAKDOWN
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
GROUP BY status
ORDER BY status DESC;

-- Show any remaining incomplete species
SELECT 
  species_code,
  name_en,
  scientific_name,
  'Still needs parameters' as note
FROM species
WHERE preferred_tide_stage IS NULL 
  OR temp_opt_c IS NULL 
  OR context_bias IS NULL
ORDER BY eating_quality DESC, species_code;
