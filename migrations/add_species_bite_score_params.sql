-- Add species-specific bite score parameters to species table
-- These parameters control how environmental factors affect bite predictions

-- Weights (ideal allocation - will be reweighted based on available signals)
ALTER TABLE species ADD COLUMN IF NOT EXISTS tide_weight DECIMAL DEFAULT 0.30;
ALTER TABLE species ADD COLUMN IF NOT EXISTS light_weight DECIMAL DEFAULT 0.30;
ALTER TABLE species ADD COLUMN IF NOT EXISTS wind_weight DECIMAL DEFAULT 0.15;
ALTER TABLE species ADD COLUMN IF NOT EXISTS pressure_weight DECIMAL DEFAULT 0.10;
ALTER TABLE species ADD COLUMN IF NOT EXISTS temp_weight DECIMAL DEFAULT 0.10;
ALTER TABLE species ADD COLUMN IF NOT EXISTS lunar_weight DECIMAL DEFAULT 0.05;
ALTER TABLE species ADD COLUMN IF NOT EXISTS turbidity_weight DECIMAL DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS water_clarity_weight DECIMAL DEFAULT 0;

-- Sensitivities and thresholds
ALTER TABLE species ADD COLUMN IF NOT EXISTS diurnal_sensitivity TEXT CHECK (diurnal_sensitivity IN ('strong', 'moderate', 'weak')); -- Dawn/dusk feeding behavior
ALTER TABLE species ADD COLUMN IF NOT EXISTS tidal_sensitivity DECIMAL; -- 0..1 (how much tides affect this species)
ALTER TABLE species ADD COLUMN IF NOT EXISTS preferred_tide_stage TEXT[]; -- e.g., ['mid_flood','early_ebb','dusk_bias']
ALTER TABLE species ADD COLUMN IF NOT EXISTS flow_preference TEXT CHECK (flow_preference IN ('slack_avoid', 'gentle', 'moderate', 'strong'));
ALTER TABLE species ADD COLUMN IF NOT EXISTS spring_neap_boost DECIMAL; -- -1..+1 (spring tide preference)
ALTER TABLE species ADD COLUMN IF NOT EXISTS temp_opt_c DECIMAL[2]; -- Optimal temp range [min, max]
ALTER TABLE species ADD COLUMN IF NOT EXISTS slack_threshold_ms DECIMAL; -- Current speed threshold for "slack"
ALTER TABLE species ADD COLUMN IF NOT EXISTS context_bias JSONB; -- Habitat-specific bonuses: [["surf_estuary","+0.2"]]

-- Add comments for documentation
COMMENT ON COLUMN species.tide_weight IS 'Ideal weight for tide factor (0-1), reweighted based on available signals';
COMMENT ON COLUMN species.light_weight IS 'Ideal weight for light/solar factor (0-1)';
COMMENT ON COLUMN species.wind_weight IS 'Ideal weight for wind factor (0-1)';
COMMENT ON COLUMN species.pressure_weight IS 'Ideal weight for barometric pressure factor (0-1)';
COMMENT ON COLUMN species.temp_weight IS 'Ideal weight for temperature factor (0-1)';
COMMENT ON COLUMN species.lunar_weight IS 'Ideal weight for lunar/moon phase factor (0-1)';
COMMENT ON COLUMN species.turbidity_weight IS 'Ideal weight for water turbidity factor (0-1)';
COMMENT ON COLUMN species.water_clarity_weight IS 'Ideal weight for water clarity/Secchi depth factor (0-1)';

COMMENT ON COLUMN species.diurnal_sensitivity IS 'Dawn/dusk feeding behavior: strong (crepuscular hunters), moderate (some preference), weak (no pattern)';
COMMENT ON COLUMN species.tidal_sensitivity IS 'How sensitive species is to tidal changes (0=not sensitive, 1=extremely sensitive)';
COMMENT ON COLUMN species.preferred_tide_stage IS 'Array of preferred tide stages: mid_flood, high_slack, early_ebb, mid_ebb, low_slack, early_flood, high, dusk_bias';
COMMENT ON COLUMN species.flow_preference IS 'Preferred water flow: slack_avoid, gentle, moderate, strong';
COMMENT ON COLUMN species.spring_neap_boost IS 'Spring tide preference: negative=prefers neap, positive=prefers spring (-1 to +1)';
COMMENT ON COLUMN species.temp_opt_c IS 'Optimal temperature range [min, max] in Celsius';
COMMENT ON COLUMN species.slack_threshold_ms IS 'Current speed threshold (m/s) below which tide is considered "slack"';
COMMENT ON COLUMN species.context_bias IS 'Habitat-specific bonuses as JSON: [["surf_estuary","+0.2"],["headlands","+0.1"]]';

-- Example configurations for key species (based on scientific research and angling experience)

-- BASS (Dicentrarchus labrax) - Tide-dependent dawn/dusk hunter
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.75,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.25,
  light_weight = 0.30,
  tide_weight = 0.35,
  wind_weight = 0.12,
  pressure_weight = 0.10,
  temp_weight = 0.08,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.30,
  context_bias = '[["surf_estuary","+0.2"],["headlands","+0.1"]]'::jsonb
WHERE scientific_name = 'Dicentrarchus labrax'
   OR species_code IN ('BSS', 'SBA')
   OR common_name ILIKE '%bass%';

-- MACKEREL (Scomber scombrus) - Strong diurnal, tide-aware
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.70,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.30,
  light_weight = 0.35,
  tide_weight = 0.30,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.05,
  lunar_weight = 0.07,
  temp_opt_c = ARRAY[10, 16],
  slack_threshold_ms = 0.40,
  context_bias = '[["tidal_rips","+0.2"],["headlands","+0.2"]]'::jsonb
WHERE scientific_name = 'Scomber scombrus'
   OR species_code IN ('MAC', 'HOM')
   OR common_name ILIKE '%mackerel%';

-- POLLACK (Pollachius pollachius) - Structure-oriented, tide-sensitive
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.30,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[9, 14],
  slack_threshold_ms = 0.35,
  context_bias = '[["reef_kelp","+0.2"],["wrecks","+0.2"]]'::jsonb
WHERE scientific_name = 'Pollachius pollachius'
   OR species_code IN ('POL', 'POC')
   OR common_name ILIKE '%pollack%' OR common_name ILIKE '%pollock%';

-- BALLAN WRASSE (Labrus bergylta) - Reef dweller, temperature-sensitive
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.00,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.25,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.20,
  context_bias = '[["reef_kelp","+0.3"]]'::jsonb
WHERE scientific_name = 'Labrus bergylta'
   OR species_code IN ('BLL', 'BWR')
   OR common_name ILIKE '%ballan%wrasse%';

-- BLACK BREAM (Spondyliosoma cantharus)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[14, 20],
  slack_threshold_ms = 0.25,
  context_bias = '[["seagrass","+0.2"],["sandy_gravel","+0.1"]]'::jsonb
WHERE scientific_name = 'Spondyliosoma cantharus'
   OR species_code = 'SBR'
   OR common_name ILIKE '%black%bream%';

-- GILT-HEAD BREAM (Sparus aurata)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[15, 22],
  slack_threshold_ms = 0.25,
  context_bias = '[["lagoons","+0.2"],["estuaries","+0.1"]]'::jsonb
WHERE scientific_name = 'Sparus aurata'
   OR common_name ILIKE '%gilt%head%';

-- GARFISH (Belone belone) - Surface feeder, light-sensitive
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.40,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.20,
  context_bias = '[["surface_slicks","+0.2"]]'::jsonb
WHERE scientific_name = 'Belone belone'
   OR species_code = 'GAR'
   OR common_name ILIKE '%garfish%';

-- THICK-LIPPED MULLET (Chelon labrosus) - HIGHLY TIDE-CRITICAL
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.85,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.20,
  light_weight = 0.20,
  tide_weight = 0.45,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[14, 20],
  slack_threshold_ms = 0.20,
  context_bias = '[["estuaries","+0.2"],["harbours","+0.1"]]'::jsonb
WHERE scientific_name = 'Chelon labrosus'
   OR species_code IN ('GMU', 'FGM', 'RMU', 'TMU')
   OR common_name ILIKE '%mullet%';

-- COD (Gadus morhua) - Pressure-sensitive, cold water
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.20,
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.15,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[6, 11],
  slack_threshold_ms = 0.30,
  context_bias = '[["rough_ground","+0.2"]]'::jsonb
WHERE scientific_name = 'Gadus morhua'
   OR species_code = 'COD'
   OR common_name ILIKE '%cod%';

-- WHITING (Merlangius merlangus) - Lunar-sensitive, night feeder
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['early_ebb','mid_ebb','mid_flood'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.15,
  temp_weight = 0.10,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[7, 12],
  slack_threshold_ms = 0.30,
  context_bias = '[["harbour_lights","+0.2"]]'::jsonb
WHERE scientific_name = 'Merlangius merlangus'
   OR species_code = 'WHG'
   OR common_name ILIKE '%whiting%';

-- PLAICE (Pleuronectes platessa) - Tide-critical flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.70,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.20,
  tide_weight = 0.40,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[7, 13],
  slack_threshold_ms = 0.20,
  context_bias = '[["mud_sand_flats","+0.3"]]'::jsonb
WHERE scientific_name = 'Pleuronectes platessa'
   OR species_code = 'PLE'
   OR common_name ILIKE '%plaice%';

-- DAB (Limanda limanda)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.20,
  tide_weight = 0.40,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[6, 11],
  slack_threshold_ms = 0.20,
  context_bias = '[["clean_sand","+0.2"]]'::jsonb
WHERE scientific_name = 'Limanda limanda'
   OR species_code = 'DAB'
   OR common_name ILIKE '%dab%';

-- TURBOT (Scophthalmus maximus) - Premium flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.15,
  light_weight = 0.25,
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[9, 14],
  slack_threshold_ms = 0.25,
  context_bias = '[["sand_banks","+0.3"]]'::jsonb
WHERE scientific_name = 'Scophthalmus maximus'
   OR species_code = 'TUR'
   OR common_name ILIKE '%turbot%';

-- BRILL (Scophthalmus rhombus) - Dusk-biased flatfish
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','dusk_bias'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[9, 14],
  slack_threshold_ms = 0.25,
  context_bias = '[["bank_edges","+0.2"]]'::jsonb
WHERE scientific_name = 'Scophthalmus rhombus'
   OR species_code = 'BLL'
   OR common_name ILIKE '%brill%';

-- SEA TROUT (Salmo trutta) - Estuarine predator
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.35,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[10, 15],
  slack_threshold_ms = 0.25,
  context_bias = '[["estuaries","+0.2"],["shoreline_at_night","+0.1"]]'::jsonb
WHERE scientific_name = 'Salmo trutta'
   OR species_code = 'TRS'
   OR common_name ILIKE '%sea%trout%';

-- CUTTLEFISH (Sepia officinalis) - Light + temp sensitive
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.05,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.15,
  context_bias = '[["harbour_lights","+0.2"],["reef_sand_edges","+0.1"]]'::jsonb
WHERE scientific_name = 'Sepia officinalis'
   OR species_code = 'CTC'
   OR common_name ILIKE '%cuttlefish%';

-- SQUID (Loligo vulgaris) - Highly light-sensitive, lunar patterns
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['dusk_bias','mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.40,
  tide_weight = 0.20,
  wind_weight = 0.05,
  pressure_weight = 0.10,
  temp_weight = 0.15,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[13, 18],
  slack_threshold_ms = 0.20,
  context_bias = '[["inshore_spawning_season","+0.2"],["harbour_lights","+0.1"]]'::jsonb
WHERE scientific_name = 'Loligo vulgaris'
   OR species_code IN ('SQU', 'SQC', 'SQI')
   OR common_name ILIKE '%squid%';

-- COALFISH/SAITHE (Pollachius virens)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.15,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[7, 12],
  slack_threshold_ms = 0.35,
  context_bias = '[["tidal_rips","+0.2"],["reefs","+0.1"]]'::jsonb
WHERE scientific_name = 'Pollachius virens'
   OR species_code = 'POK'
   OR common_name ILIKE '%coalfish%' OR common_name ILIKE '%saithe%';

-- HORSE MACKEREL/SCAD (Trachurus trachurus) - Lunar-sensitive
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[11, 17],
  slack_threshold_ms = 0.30,
  context_bias = '[["lights_at_night","+0.2"]]'::jsonb
WHERE scientific_name = 'Trachurus trachurus'
   OR species_code = 'HOM'
   OR common_name ILIKE '%horse%mackerel%' OR common_name ILIKE '%scad%';

-- PILCHARD (Sardina pilchardus) - DVM behavior
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.40,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.15,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.20,
  context_bias = '[["dvm_night_surface","+0.2"]]'::jsonb
WHERE scientific_name = 'Sardina pilchardus'
   OR species_code = 'PIL'
   OR common_name ILIKE '%pilchard%' OR common_name ILIKE '%sardine%';

-- SPRAT (Sprattus sprattus)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.40,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.15,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[8, 14],
  slack_threshold_ms = 0.20,
  context_bias = '[["plaice_spawning_grounds","+0.1"]]'::jsonb
WHERE scientific_name = 'Sprattus sprattus'
   OR species_code = 'SPR'
   OR common_name ILIKE '%sprat%';

-- ANCHOVY (Engraulis encrasicolus) - Night lighting attraction
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.15,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[14, 20],
  slack_threshold_ms = 0.20,
  context_bias = '[["night_lighting","+0.2"]]'::jsonb
WHERE scientific_name = 'Engraulis encrasicolus'
   OR species_code = 'ANE'
   OR common_name ILIKE '%anchovy%';

-- JOHN DORY (Zeus faber) - Ambush predator
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[10, 15],
  slack_threshold_ms = 0.25,
  context_bias = '[["reef_sand_edges","+0.2"]]'::jsonb
WHERE scientific_name = 'Zeus faber'
   OR species_code = 'JOD'
   OR common_name ILIKE '%john%dory%';

-- DENTEX (Dentex dentex) - Deep reef species
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[15, 20],
  slack_threshold_ms = 0.30,
  context_bias = '[["reef_dropoffs","+0.2"]]'::jsonb
WHERE scientific_name = 'Dentex dentex'
   OR common_name ILIKE '%dentex%';

-- ============================================================================
-- INSERT NEW MEDITERRANEAN SPECIES (Must run BEFORE UPDATEs below)
-- ============================================================================

-- Note: These 17 species don't exist in the database yet
-- We need to INSERT them first, then UPDATE with bite score parameters

INSERT INTO species (
    species_code,
    scientific_name,
    name_en,
    name_es,
    name_fr,
    name_it,
    eating_quality,
    typical_gear,
    min_depth,
    max_depth,
    preferred_habitat,
    is_seasonal,
    is_night_species
) VALUES
    -- Seabreams
    ('white-bream', 'Diplodus sargus', 'White Seabream', 'Sargo', 'Sar Commun', 'Sarago Maggiore', 4, 
     ARRAY['float fishing', 'bottom fishing', 'light tackle'], 0, 20, ARRAY['rocky reefs', 'seagrass beds'], false, false),
    
    ('two-band-bream', 'Diplodus vulgaris', 'Two-banded Seabream', 'Mojarra', 'Sar à Tête Noire', 'Sarago Fasciato', 4,
     ARRAY['float fishing', 'bottom fishing', 'light tackle'], 0, 20, ARRAY['rocky reefs', 'seagrass beds'], false, false),
    
    ('pandora', 'Pagellus erythrinus', 'Common Pandora', 'Breca', 'Pageot', 'Pagello Fragolino', 4,
     ARRAY['bottom fishing', 'light tackle'], 5, 40, ARRAY['sandy bottoms', 'reef edges'], false, false),
    
    ('red-porgy', 'Pagrus pagrus', 'Red Porgy', 'Pargo', 'Pagre', 'Pagro', 5,
     ARRAY['bottom fishing', 'jigging'], 20, 80, ARRAY['rocky reefs', 'drop-offs'], false, false),
    
    ('saddled-bream', 'Oblada melanura', 'Saddled Seabream', 'Oblada', 'Oblade', 'Occhiata', 3,
     ARRAY['float fishing', 'light tackle'], 0, 30, ARRAY['rocky shores', 'harbour walls'], false, false),
    
    ('bogue', 'Boops boops', 'Bogue', 'Boga', 'Bogue', 'Boga', 3,
     ARRAY['float fishing', 'sabiki rigs'], 0, 40, ARRAY['open water', 'harbour lights'], false, false),
    
    -- Mackerels & Tunas
    ('chub-mackerel', 'Scomber colias', 'Atlantic Chub Mackerel', 'Estornino', 'Maquereau Espagnol', 'Lanzardo', 4,
     ARRAY['trolling', 'spinning', 'sabiki rigs'], 0, 50, ARRAY['open water', 'tidal rips'], true, false),
    
    ('med-scad', 'Trachurus mediterraneus', 'Mediterranean Scad', 'Jurel Mediterráneo', 'Chinchard Méditerranéen', 'Suro Mediterraneo', 3,
     ARRAY['sabiki rigs', 'light tackle'], 0, 100, ARRAY['open water', 'harbour lights'], false, false),
    
    ('bonito', 'Sarda sarda', 'Atlantic Bonito', 'Bonito del Atlántico', 'Bonite à Dos Rayé', 'Palamita', 4,
     ARRAY['trolling', 'spinning', 'jigging'], 0, 50, ARRAY['open water', 'bait balls', 'current lines'], true, false),
    
    -- Predators
    ('leerfish', 'Lichia amia', 'Leerfish', 'Palometa', 'Liche', 'Leccia', 4,
     ARRAY['spinning', 'trolling', 'fly fishing'], 0, 30, ARRAY['surf zones', 'headlands'], true, false),
    
    ('bluefish', 'Pomatomus saltatrix', 'Bluefish', 'Anjova', 'Tassergal', 'Serra', 4,
     ARRAY['trolling', 'spinning', 'jigging'], 0, 40, ARRAY['open water', 'bait balls', 'river mouths'], true, false),
    
    -- Barracudas
    ('yellow-cuda', 'Sphyraena viridensis', 'Yellowmouth Barracuda', 'Barracuda Amarilla', 'Bécune Yellowmouth', 'Barracuda Bocca Gialla', 3,
     ARRAY['spinning', 'trolling', 'fly fishing'], 0, 30, ARRAY['harbour lights', 'reef edges'], false, true),
    
    ('euro-cuda', 'Sphyraena sphyraena', 'European Barracuda', 'Barracuda Europea', 'Barracuda Européen', 'Barracuda Europeo', 3,
     ARRAY['spinning', 'trolling', 'fly fishing'], 0, 40, ARRAY['harbour lights', 'open water'], false, true),
    
    -- Groupers
    ('dusky-grouper', 'Epinephelus marginatus', 'Dusky Grouper', 'Mero', 'Mérou Brun', 'Cernia Bruna', 5,
     ARRAY['bottom fishing', 'jigging', 'live bait'], 15, 100, ARRAY['caves', 'rocky reefs', 'wrecks'], false, false),
    
    ('white-grouper', 'Epinephelus aeneus', 'White Grouper', 'Cherne Blanco', 'Mérou Blanc', 'Cernia Bianca', 5,
     ARRAY['bottom fishing', 'jigging', 'live bait'], 15, 80, ARRAY['wrecks', 'reef edges'], false, false),
    
    -- Scorpionfish
    ('red-scorpion', 'Scorpaena scrofa', 'Red Scorpionfish', 'Cabracho', 'Chapon', 'Scorfano Rosso', 3,
     ARRAY['bottom fishing', 'bait fishing'], 10, 100, ARRAY['rocky reefs', 'crevices'], false, false),
    
    -- Drums/Croakers
    ('meagre', 'Argyrosomus regius', 'Meagre', 'Corvina', 'Maigre Commun', 'Ombrina', 5,
     ARRAY['spinning', 'bottom fishing', 'trolling'], 0, 50, ARRAY['estuaries', 'river mouths', 'channels', 'sandy bottoms'], false, false)
ON CONFLICT (species_code) DO NOTHING;

-- ============================================================================
-- MEDITERRANEAN SPECIES - BITE SCORE PARAMETERS
-- ============================================================================

-- WHITE SEABREAM (Diplodus sargus) - Common Med shore species
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
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["rocky_coves","+0.2"],["seagrass","+0.1"]]'::jsonb
WHERE scientific_name = 'Diplodus sargus'
   OR common_name ILIKE '%white%seabream%';

-- TWO-BANDED SEABREAM (Diplodus vulgaris)
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
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["reefs","+0.2"],["seagrass","+0.1"]]'::jsonb
WHERE scientific_name = 'Diplodus vulgaris'
   OR common_name ILIKE '%two%banded%seabream%';

-- COMMON PANDORA (Pagellus erythrinus) - Not to be confused with P. bogaraveo (which we have)
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['early_flood','mid_flood'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[15, 20],
  slack_threshold_ms = 0.20,
  context_bias = '[["sand_near_reef","+0.2"]]'::jsonb
WHERE scientific_name = 'Pagellus erythrinus'
   OR common_name ILIKE '%common%pandora%';

-- RED PORGY (Pagrus pagrus) - Premium eating species
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.50,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.25,
  tide_weight = 0.30,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.25,
  context_bias = '[["reef_dropoffs","+0.2"]]'::jsonb
WHERE scientific_name = 'Pagrus pagrus'
   OR common_name ILIKE '%red%porgy%';

-- SADDLED SEABREAM (Oblada melanura) - Light-sensitive schooling species
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.20,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[18, 24],
  slack_threshold_ms = 0.20,
  context_bias = '[["cliff_ledges","+0.1"],["harbour_walls","+0.1"]]'::jsonb
WHERE scientific_name = 'Oblada melanura'
   OR common_name ILIKE '%saddled%seabream%' OR common_name ILIKE '%saddled%bream%';

-- BOGUE (Boops boops) - Lunar-sensitive schooling species
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.35,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.05,
  temp_weight = 0.15,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["harbour_lights","+0.2"]]'::jsonb
WHERE scientific_name = 'Boops boops'
   OR common_name ILIKE '%bogue%';

-- MEDITERRANEAN HORSE MACKEREL (Trachurus mediterraneus) - Different from T. trachurus
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.55,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.10,
  light_weight = 0.30,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.15,
  temp_opt_c = ARRAY[12, 18],
  slack_threshold_ms = 0.30,
  context_bias = '[["lights_at_night","+0.2"]]'::jsonb
WHERE scientific_name = 'Trachurus mediterraneus'
   OR common_name ILIKE '%mediterranean%scad%' OR common_name ILIKE '%mediterranean%horse%mackerel%';

-- ATLANTIC CHUB MACKEREL (Scomber colias) - Warmer water mackerel
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.25,
  light_weight = 0.35,
  tide_weight = 0.30,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.07,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.40,
  context_bias = '[["tidal_rips","+0.2"],["headlands","+0.2"]]'::jsonb
WHERE scientific_name = 'Scomber colias'
   OR common_name ILIKE '%chub%mackerel%';

-- ATLANTIC BONITO (Sarda sarda) - Fast pelagic predator
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.35,
  tide_weight = 0.30,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.07,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[18, 23],
  slack_threshold_ms = 0.35,
  context_bias = '[["bait_balls","+0.3"],["rip_lines","+0.2"]]'::jsonb
WHERE scientific_name = 'Sarda sarda'
   OR common_name ILIKE '%atlantic%bonito%' OR common_name ILIKE '%bonito%';

-- LEERFISH/GARRICK (Lichia amia) - Surf zone predator
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.60,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.35,
  tide_weight = 0.30,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.07,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[18, 24],
  slack_threshold_ms = 0.35,
  context_bias = '[["surf_points","+0.3"],["headlands","+0.2"]]'::jsonb
WHERE scientific_name = 'Lichia amia'
   OR common_name ILIKE '%leerfish%' OR common_name ILIKE '%garrick%';

-- BLUEFISH (Pomatomus saltatrix) - Aggressive predator
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.65,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'strong',
  spring_neap_boost = 0.25,
  light_weight = 0.35,
  tide_weight = 0.30,
  wind_weight = 0.15,
  pressure_weight = 0.08,
  temp_weight = 0.07,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[18, 24],
  slack_threshold_ms = 0.40,
  context_bias = '[["bait_balls","+0.3"],["river_mouths","+0.2"]]'::jsonb
WHERE scientific_name = 'Pomatomus saltatrix'
   OR common_name ILIKE '%bluefish%';

-- YELLOWMOUTH BARRACUDA (Sphyraena viridensis) - Light-sensitive hunter
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.40,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[18, 24],
  slack_threshold_ms = 0.25,
  context_bias = '[["harbour_lights","+0.3"],["reef_edges","+0.1"]]'::jsonb
WHERE scientific_name = 'Sphyraena viridensis'
   OR common_name ILIKE '%yellowmouth%barracuda%';

-- EUROPEAN BARRACUDA (Sphyraena sphyraena) - Similar to S. viridensis
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.40,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.10,
  temp_opt_c = ARRAY[18, 24],
  slack_threshold_ms = 0.25,
  context_bias = '[["harbour_lights","+0.3"],["open_ledges","+0.1"]]'::jsonb
WHERE scientific_name = 'Sphyraena sphyraena'
   OR common_name ILIKE '%european%barracuda%' OR common_name ILIKE '%barracuda%';

-- DUSKY GROUPER (Epinephelus marginatus) - Iconic Med cave dweller
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.40,
  preferred_tide_stage = ARRAY['high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.00,
  light_weight = 0.25,
  tide_weight = 0.20,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.30,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["caves","+0.3"],["reef_kelp","+0.2"]]'::jsonb
WHERE scientific_name = 'Epinephelus marginatus'
   OR common_name ILIKE '%dusky%grouper%';

-- WHITE GROUPER (Epinephelus aeneus) - Sand/rock edges
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.45,
  preferred_tide_stage = ARRAY['mid_flood','high'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.05,
  light_weight = 0.25,
  tide_weight = 0.25,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.25,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.20,
  context_bias = '[["wrecks","+0.2"],["rock_sand_edges","+0.2"]]'::jsonb
WHERE scientific_name = 'Epinephelus aeneus'
   OR common_name ILIKE '%white%grouper%';

-- RED SCORPIONFISH (Scorpaena scrofa) - Ambush predator
UPDATE species 
SET 
  diurnal_sensitivity = 'moderate',
  tidal_sensitivity = 0.35,
  preferred_tide_stage = ARRAY['high','early_ebb'],
  flow_preference = 'gentle',
  spring_neap_boost = 0.00,
  light_weight = 0.25,
  tide_weight = 0.15,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.35,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[15, 20],
  slack_threshold_ms = 0.15,
  context_bias = '[["reef_crevices","+0.3"]]'::jsonb
WHERE scientific_name = 'Scorpaena scrofa'
   OR common_name ILIKE '%red%scorpionfish%' OR common_name ILIKE '%large%scaled%scorpionfish%';

-- MEAGRE (Argyrosomus regius) - Med's answer to bass, growing in UK
UPDATE species 
SET 
  diurnal_sensitivity = 'strong',
  tidal_sensitivity = 0.70,
  preferred_tide_stage = ARRAY['early_flood','mid_flood','early_ebb'],
  flow_preference = 'moderate',
  spring_neap_boost = 0.20,
  light_weight = 0.30,
  tide_weight = 0.35,
  wind_weight = 0.10,
  pressure_weight = 0.10,
  temp_weight = 0.10,
  lunar_weight = 0.05,
  temp_opt_c = ARRAY[16, 22],
  slack_threshold_ms = 0.30,
  context_bias = '[["estuaries","+0.3"],["channels","+0.2"]]'::jsonb
WHERE scientific_name = 'Argyrosomus regius'
   OR common_name ILIKE '%meagre%' OR common_name ILIKE '%shi%drum%';

-- Update Zeus faber if not already done (it's in both datasets)
-- Uses your Med parameters which differ slightly from the Atlantic version
UPDATE species 
SET 
  diurnal_sensitivity = COALESCE(diurnal_sensitivity, 'moderate'),
  tidal_sensitivity = COALESCE(tidal_sensitivity, 0.50),
  preferred_tide_stage = COALESCE(preferred_tide_stage, ARRAY['mid_flood','early_ebb']),
  flow_preference = COALESCE(flow_preference, 'gentle'),
  spring_neap_boost = COALESCE(spring_neap_boost, 0.05),
  light_weight = COALESCE(light_weight, 0.25),
  tide_weight = COALESCE(tide_weight, 0.30),
  wind_weight = COALESCE(wind_weight, 0.10),
  pressure_weight = COALESCE(pressure_weight, 0.10),
  temp_weight = COALESCE(temp_weight, 0.20),
  lunar_weight = COALESCE(lunar_weight, 0.05),
  temp_opt_c = COALESCE(temp_opt_c, ARRAY[10, 15]),
  slack_threshold_ms = COALESCE(slack_threshold_ms, 0.25),
  context_bias = COALESCE(context_bias, '[["reef_sand_edges","+0.2"]]'::jsonb)
WHERE scientific_name = 'Zeus faber'
   OR species_code = 'JOD'
   OR common_name ILIKE '%john%dory%';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_species_tide_params ON species(tidal_sensitivity, flow_preference);

-- Create view for species with high tide sensitivity
CREATE OR REPLACE VIEW tide_critical_species AS
SELECT 
  species_code,
  common_name,
  scientific_name,
  tidal_sensitivity,
  preferred_tide_stage,
  flow_preference,
  tide_weight
FROM species
WHERE tidal_sensitivity > 0.7
ORDER BY tidal_sensitivity DESC;

COMMENT ON VIEW tide_critical_species IS 'Species highly dependent on tidal conditions (sensitivity > 0.7)';
