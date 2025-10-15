-- ============================================================================
-- PHASE 9 DEPLOYMENT - STEP 1: THRESHOLDS TABLE
-- ============================================================================
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This creates:
--   1. bio_bands_thresholds table (35 threshold records)
--   2. classify_parameter() function
--   3. Index for fast lookups
--
-- ============================================================================

-- Create the thresholds table
CREATE TABLE IF NOT EXISTS bio_bands_thresholds (
  idx INTEGER PRIMARY KEY,
  parameter TEXT NOT NULL,
  level bio_level NOT NULL,
  threshold NUMERIC NOT NULL,
  angler_interpretation TEXT NOT NULL
);

-- Insert all 35 threshold records
INSERT INTO bio_bands_thresholds (idx, parameter, level, threshold, angler_interpretation) VALUES
  -- Surface Temperature (°C)
  (30, 'surfaceTemperature', 'very_low', 0, 'Freezing, marine activity minimal'),
  (31, 'surfaceTemperature', 'low', 8, 'Cold, only hardy species feed'),
  (32, 'surfaceTemperature', 'normal', 14, 'Comfortable for most temperate fish'),
  (33, 'surfaceTemperature', 'high', 20, 'Warm, high fish activity'),
  (34, 'surfaceTemperature', 'very_high', 26, 'Hot, some fish stressed or go deep'),

  -- Salinity (ppt)
  (25, 'salinity', 'very_low', 20, 'Brackish, only euryhaline species'),
  (26, 'salinity', 'low', 28, 'Reduced salinity, near estuaries'),
  (27, 'salinity', 'normal', 32, 'Typical coastal seawater'),
  (28, 'salinity', 'high', 36, 'Full oceanic salinity'),
  (29, 'salinity', 'very_high', 40, 'Hypersaline, e.g. Mediterranean evaporation'),

  -- Dissolved Oxygen (mg/L)
  (10, 'oxygen', 'very_low', 0, 'Anoxic, fish kills likely'),
  (11, 'oxygen', 'low', 2, 'Hypoxic, stressful for most fish'),
  (12, 'oxygen', 'normal', 4, 'Adequate for survival'),
  (13, 'oxygen', 'high', 7, 'Good, healthy conditions'),
  (14, 'oxygen', 'very_high', 10, 'Excellent, peak fish activity'),

  -- Chlorophyll (mg/m³)
  (0, 'chlorophyll', 'very_low', 0, 'Clear, low productivity'),
  (1, 'chlorophyll', 'low', 0.5, 'Oligotrophic'),
  (2, 'chlorophyll', 'normal', 1.5, 'Mesotrophic, balanced food web'),
  (3, 'chlorophyll', 'high', 3, 'Eutrophic, high plankton'),
  (4, 'chlorophyll', 'very_high', 5, 'Bloom conditions, can stress fish'),

  -- Nitrate (μmol/L)
  (15, 'nitrate', 'very_low', 0, 'Nutrient-depleted'),
  (16, 'nitrate', 'low', 1, 'Oligotrophic'),
  (17, 'nitrate', 'normal', 3, 'Typical coastal levels'),
  (18, 'nitrate', 'high', 6, 'Enriched, near-shore runoff'),
  (19, 'nitrate', 'very_high', 10, 'Eutrophic, pollution concern'),

  -- Phosphate (μmol/L)
  (20, 'phosphate', 'very_low', 0, 'Nutrient-depleted'),
  (21, 'phosphate', 'low', 0.1, 'Oligotrophic'),
  (22, 'phosphate', 'normal', 0.3, 'Mesotrophic'),
  (23, 'phosphate', 'high', 0.6, 'Enriched'),
  (24, 'phosphate', 'very_high', 1, 'Eutrophic, potential algal blooms'),

  -- Phytoplankton (cells/L)
  (5, 'phytoplankton', 'very_low', 0, 'Sparse, low productivity'),
  (6, 'phytoplankton', 'low', 1000, 'Typical winter levels'),
  (7, 'phytoplankton', 'normal', 5000, 'Healthy coastal productivity'),
  (8, 'phytoplankton', 'high', 20000, 'Spring/summer bloom'),
  (9, 'phytoplankton', 'very_high', 50000, 'Dense bloom, may reduce water clarity')
ON CONFLICT (idx) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bio_bands_param_threshold 
ON bio_bands_thresholds(parameter, threshold DESC);

-- Create the classification function
CREATE OR REPLACE FUNCTION classify_parameter(
  p_parameter TEXT,
  p_value NUMERIC
) RETURNS bio_level AS $$
  SELECT level 
  FROM bio_bands_thresholds
  WHERE parameter = p_parameter 
    AND p_value >= threshold
  ORDER BY threshold DESC 
  LIMIT 1;
$$ LANGUAGE SQL IMMUTABLE;

-- ============================================================================
-- VALIDATION QUERIES (run these after the above completes)
-- ============================================================================

-- Check table created with 35 records
SELECT COUNT(*) as total_thresholds FROM bio_bands_thresholds;
-- Expected: 35

-- Check all parameters present
SELECT parameter, COUNT(*) as levels 
FROM bio_bands_thresholds 
GROUP BY parameter 
ORDER BY parameter;
-- Expected: 7 parameters, 5 levels each

-- Test classification function
SELECT 
  'Temperature 16.5°C' as test,
  classify_parameter('surfaceTemperature', 16.5) as result,
  'normal' as expected;
-- Expected: normal

SELECT 
  'Salinity 12 ppt (brackish)' as test,
  classify_parameter('salinity', 12) as result,
  'NULL' as expected;
-- Expected: NULL (below 20 ppt threshold)

SELECT 
  'Oxygen 7.5 mg/L' as test,
  classify_parameter('oxygen', 7.5) as result,
  'high' as expected;
-- Expected: high

-- ============================================================================
-- SUCCESS! ✅
-- If all validation queries pass, proceed to Step 2
-- ============================================================================
