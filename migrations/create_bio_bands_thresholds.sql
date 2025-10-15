-- Migration: Create bio_bands_thresholds table and classification function
-- Purpose: Store threshold mappings for classifying raw CMEMS data into bio_level bands
-- Date: 12 October 2025
-- Dependencies: bio_level enum (should already exist)

-- ============================================================================
-- STEP 1: Create bio_bands_thresholds table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bio_bands_thresholds (
  idx INTEGER PRIMARY KEY,
  parameter TEXT NOT NULL,
  level bio_level NOT NULL,
  threshold NUMERIC NOT NULL,
  angler_interpretation TEXT NOT NULL,
  CONSTRAINT unique_parameter_threshold UNIQUE (parameter, threshold)
);

COMMENT ON TABLE public.bio_bands_thresholds IS
'Lookup table for classifying raw CMEMS environmental values into bio_level bands (very_low, low, normal, high, very_high)';

-- ============================================================================
-- STEP 2: Create index for fast classification queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bio_bands_param_threshold 
ON public.bio_bands_thresholds (parameter, threshold DESC);

COMMENT ON INDEX idx_bio_bands_param_threshold IS
'Enables fast threshold lookup for classify_parameter() function';

-- ============================================================================
-- STEP 3: Populate threshold data
-- ============================================================================

INSERT INTO public.bio_bands_thresholds (idx, parameter, level, threshold, angler_interpretation)
VALUES
  -- Chlorophyll (mg/m³)
  (0, 'chlorophyll', 'very_low', 0, 'Water too clear; little food chain action'),
  (1, 'chlorophyll', 'low', 0.5, 'Slight activity, bait scarce'),
  (2, 'chlorophyll', 'normal', 1.5, 'Balanced; predators can hunt'),
  (3, 'chlorophyll', 'high', 3, 'Plankton bloom, prey fish active'),
  (4, 'chlorophyll', 'very_high', 5, 'Bloom overload; can lower oxygen locally'),
  
  -- Nitrate
  (5, 'nitrate', 'very_low', 0, 'Nutrient desert, weak food chain'),
  (6, 'nitrate', 'low', 1, 'Low nutrients, limited growth'),
  (7, 'nitrate', 'normal', 3, 'Balanced nutrient level'),
  (8, 'nitrate', 'high', 6, 'Nutrient surge, prey increase likely'),
  (9, 'nitrate', 'very_high', 10, 'Overload, algal bloom risk'),
  
  -- Oxygen (mg/L)
  (10, 'oxygen', 'very_low', 0, 'Hypoxic – fish struggle to survive'),
  (11, 'oxygen', 'low', 2, 'Stressed fish, poor feeding'),
  (12, 'oxygen', 'normal', 4, 'Comfortable for most coastal fish'),
  (13, 'oxygen', 'high', 7, 'Healthy, lively feeding'),
  (14, 'oxygen', 'very_high', 10, 'Excellent oxygenation, very active fish'),
  
  -- Phosphate
  (15, 'phosphate', 'very_low', 0, 'Nutrient-poor water'),
  (16, 'phosphate', 'low', 0.1, 'Low nutrients, modest growth'),
  (17, 'phosphate', 'normal', 0.3, 'Balanced nutrient level'),
  (18, 'phosphate', 'high', 0.6, 'Nutrient boost, prey increase'),
  (19, 'phosphate', 'very_high', 1, 'Too much nutrient, algal bloom risk'),
  
  -- Phytoplankton (cells/L)
  (20, 'phytoplankton', 'very_low', 0, 'No base food, poor chain'),
  (21, 'phytoplankton', 'low', 1000, 'Sparse plankton, prey limited'),
  (22, 'phytoplankton', 'normal', 5000, 'Healthy food chain'),
  (23, 'phytoplankton', 'high', 20000, 'Strong bloom, baitfish abundant'),
  (24, 'phytoplankton', 'very_high', 50000, 'Over-bloom, oxygen stress possible'),
  
  -- Salinity (ppt)
  (25, 'salinity', 'very_low', 20, 'Estuarine, too fresh for many marine species'),
  (26, 'salinity', 'low', 28, 'Brackish, fewer saltwater predators'),
  (27, 'salinity', 'normal', 32, 'Typical coastal salinity'),
  (28, 'salinity', 'high', 36, 'Open sea levels, stable'),
  (29, 'salinity', 'very_high', 40, 'Unusually saline, stressful for fish'),
  
  -- Surface Temperature (°C)
  (30, 'surfaceTemperature', 'very_low', 0, 'Freezing, marine activity minimal'),
  (31, 'surfaceTemperature', 'low', 8, 'Cold, only hardy species feed'),
  (32, 'surfaceTemperature', 'normal', 14, 'Comfortable for most temperate fish'),
  (33, 'surfaceTemperature', 'high', 20, 'Warm, high fish activity'),
  (34, 'surfaceTemperature', 'very_high', 26, 'Hot, some fish stressed or go deep')
ON CONFLICT (idx) DO NOTHING;

-- ============================================================================
-- STEP 4: Create classification function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.classify_parameter(
  p_parameter TEXT,
  p_value NUMERIC
)
RETURNS bio_level AS $$
  -- Find the highest threshold that the value exceeds
  -- This classifies the raw value into the appropriate bio_level band
  SELECT level
  FROM public.bio_bands_thresholds
  WHERE parameter = p_parameter
    AND p_value >= threshold
  ORDER BY threshold DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.classify_parameter(TEXT, NUMERIC) IS
'Classifies a raw environmental parameter value into a bio_level band (very_low, low, normal, high, very_high).
Example: classify_parameter(''surfaceTemperature'', 16.5) returns ''normal'' (16.5°C >= 14 threshold, < 20)';

-- ============================================================================
-- STEP 5: Validation queries
-- ============================================================================

-- Test classification function with various parameters
-- Uncomment to run validation:

/*
SELECT 
  'surfaceTemperature' as parameter,
  16.5 as value,
  classify_parameter('surfaceTemperature', 16.5) as classified_level,
  'Should be: normal (14-19°C)' as expected

UNION ALL

SELECT 
  'salinity',
  34.2,
  classify_parameter('salinity', 34.2),
  'Should be: normal (32-35 ppt)'

UNION ALL

SELECT 
  'oxygen',
  6.8,
  classify_parameter('oxygen', 6.8),
  'Should be: normal (4-6 mg/L, just below high at 7)'

UNION ALL

SELECT 
  'chlorophyll',
  2.1,
  classify_parameter('chlorophyll', 2.1),
  'Should be: normal (1.5-2.9 mg/m³)'

UNION ALL

SELECT 
  'salinity',
  12,
  classify_parameter('salinity', 12),
  'Should be: NULL (below 20 ppt threshold - freshwater)'

UNION ALL

SELECT 
  'surfaceTemperature',
  7,
  classify_parameter('surfaceTemperature', 7),
  'Should be: very_low (0-7°C)';
*/

-- Check all thresholds loaded correctly
-- SELECT COUNT(*) as total_thresholds FROM bio_bands_thresholds;
-- Expected: 35 (7 parameters × 5 levels each)

-- Check distribution by parameter
-- SELECT parameter, COUNT(*) as levels
-- FROM bio_bands_thresholds
-- GROUP BY parameter
-- ORDER BY parameter;
-- Expected: 5 levels per parameter

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
DROP FUNCTION IF EXISTS public.classify_parameter(TEXT, NUMERIC);
DROP TABLE IF EXISTS public.bio_bands_thresholds;
*/

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Classify temperature reading
SELECT classify_parameter('surfaceTemperature', 16.5);
-- Returns: 'normal'

-- Example 2: Classify multiple parameters at once
SELECT 
  classify_parameter('surfaceTemperature', 16.5) as temp_level,
  classify_parameter('salinity', 34.2) as sal_level,
  classify_parameter('oxygen', 6.8) as oxygen_level,
  classify_parameter('chlorophyll', 2.1) as chlorophyll_level;
-- Returns: normal, normal, normal, normal

-- Example 3: Use in WHERE clause to filter species
SELECT s.species_code, s.name_en
FROM species s
JOIN species_bio_bands sbb ON sbb.species_id = s.id
WHERE sbb.parameter = 'surfaceTemperature'
  AND classify_parameter('surfaceTemperature', 16.5) = ANY(sbb.happy_bands);
-- Returns: Species that are happy in 'normal' temperature conditions

-- Example 4: Get angler interpretation for current conditions
SELECT 
  parameter,
  level,
  angler_interpretation
FROM bio_bands_thresholds
WHERE parameter = 'surfaceTemperature'
  AND level = classify_parameter('surfaceTemperature', 16.5);
-- Returns: "Comfortable for most temperate fish"
*/
