-- ============================================================================
-- PHASE 9.5 DEPLOYMENT - STEP 2: GUILD-AWARE PREDICTIONS
-- ============================================================================
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This REPLACES get_environmental_predictions_basic() with guild-aware version
-- Different fish guilds use different environmental weight profiles:
--   - Pelagic: 38% temp, 27% salinity, 20% depth, 15% substrate
--   - Surf/Estuary: 33% temp, 22% salinity, 23% depth, 22% substrate
--   - Reef/Kelp: 25% temp, 18% salinity, 22% depth, 35% substrate
--   - Benthic: 28% temp, 20% salinity, 22% depth, 30% substrate
--   - Cephalopod: 32% temp, 23% salinity, 22% depth, 23% substrate
--   - Default Coastal: 30% temp, 20% salinity, 25% depth, 25% substrate
--
-- ============================================================================

-- Drop existing function first (return type changed - added weight_profile column)
DROP FUNCTION IF EXISTS get_environmental_predictions_basic(TEXT, DATE);

-- Create new guild-aware version
CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  p_rectangle_code TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  species_code TEXT,
  species_name TEXT,
  scientific_name TEXT,
  environmental_score NUMERIC,
  confidence TEXT,
  temperature_match TEXT,
  salinity_match TEXT,
  depth_match TEXT,
  substrate_match TEXT,
  weight_profile TEXT,
  factors JSONB
) AS $$
DECLARE
  v_avg_temp NUMERIC;
  v_avg_salinity NUMERIC;
  v_substrate_type TEXT;
  v_avg_depth NUMERIC;
BEGIN
  -- Get environmental conditions for the rectangle
  -- NOTE: Replace this with your actual CMEMS data table
  -- For now, using sample values for testing
  SELECT 
    COALESCE(avg_temp, 16.5),
    COALESCE(avg_salinity, 34.2),
    COALESCE(substrate_type, 'rock'),
    COALESCE(avg_depth, 15)
  INTO v_avg_temp, v_avg_salinity, v_substrate_type, v_avg_depth
  FROM (
    SELECT 
      NULL::numeric as avg_temp,
      NULL::numeric as avg_salinity,
      NULL::text as substrate_type,
      NULL::numeric as avg_depth
  ) dummy;
  
  -- TODO: Replace above with actual query when CMEMS data is ready:
  -- FROM cmems_daily_summary
  -- WHERE rectangle_code = p_rectangle_code
  --   AND date = p_date;

  RETURN QUERY
  WITH species_scores AS (
    SELECT 
      s.species_code::TEXT,
      s.name_en::TEXT,
      s.scientific_name::TEXT,
      COALESCE(s.weight_profile, 'default_coastal') as weight_profile,
      
      -- Raw factor scores (0-1 scale, unweighted)
      
      -- Temperature scoring
      CASE 
        WHEN v_avg_temp BETWEEN 
          COALESCE(
            (s.environmental_preferences->'temperature'->>'optimal_min')::numeric,
            (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'temperature'->>'optimal_max')::numeric,
            (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
          )
        THEN 1.0
        WHEN v_avg_temp BETWEEN
          (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
        THEN 0.6
        ELSE 0.2
      END AS temp_raw,
      
      -- Salinity scoring
      CASE 
        WHEN v_avg_salinity BETWEEN
          COALESCE(
            (s.environmental_preferences->'salinity'->>'optimal_min')::numeric,
            (s.environmental_preferences->'salinity'->>'tolerance_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'salinity'->>'optimal_max')::numeric,
            (s.environmental_preferences->'salinity'->>'tolerance_max')::numeric
          )
        THEN 1.0
        WHEN v_avg_salinity BETWEEN
          (s.environmental_preferences->'salinity'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'salinity'->>'tolerance_max')::numeric
        THEN 0.6
        ELSE 0.2
      END AS sal_raw,
      
      -- Depth scoring
      CASE 
        WHEN v_avg_depth BETWEEN
          COALESCE(
            (s.environmental_preferences->'depth'->>'optimal_min')::numeric,
            (s.environmental_preferences->'depth'->>'typical_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'depth'->>'optimal_max')::numeric,
            (s.environmental_preferences->'depth'->>'typical_max')::numeric
          )
        THEN 1.0
        WHEN v_avg_depth BETWEEN
          (s.environmental_preferences->'depth'->>'typical_min')::numeric AND
          (s.environmental_preferences->'depth'->>'typical_max')::numeric
        THEN 0.7
        ELSE 0.3
      END AS depth_raw,
      
      -- Substrate scoring  
      CASE 
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object' 
          AND s.environmental_preferences->'substrate'->'preferred' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 1.0
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'acceptable' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 0.7
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'array'
          AND s.environmental_preferences->'substrate' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 0.85
        ELSE 0.3
      END AS substrate_raw,
      
      -- Match labels
      CASE 
        WHEN v_avg_temp BETWEEN 
          COALESCE(
            (s.environmental_preferences->'temperature'->>'optimal_min')::numeric,
            (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'temperature'->>'optimal_max')::numeric,
            (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
          )
        THEN 'optimal'
        WHEN v_avg_temp BETWEEN
          (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
        THEN 'tolerable'
        ELSE 'poor'
      END AS temp_match,
      
      CASE 
        WHEN v_avg_salinity BETWEEN
          COALESCE(
            (s.environmental_preferences->'salinity'->>'optimal_min')::numeric,
            (s.environmental_preferences->'salinity'->>'tolerance_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'salinity'->>'optimal_max')::numeric,
            (s.environmental_preferences->'salinity'->>'tolerance_max')::numeric
          )
        THEN 'optimal'
        WHEN v_avg_salinity BETWEEN
          (s.environmental_preferences->'salinity'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'salinity'->>'tolerance_max')::numeric
        THEN 'tolerable'
        ELSE 'poor'
      END AS sal_match,
      
      CASE 
        WHEN v_avg_depth BETWEEN
          COALESCE(
            (s.environmental_preferences->'depth'->>'optimal_min')::numeric,
            (s.environmental_preferences->'depth'->>'typical_min')::numeric
          ) AND
          COALESCE(
            (s.environmental_preferences->'depth'->>'optimal_max')::numeric,
            (s.environmental_preferences->'depth'->>'typical_max')::numeric
          )
        THEN 'optimal'
        WHEN v_avg_depth BETWEEN
          (s.environmental_preferences->'depth'->>'typical_min')::numeric AND
          (s.environmental_preferences->'depth'->>'typical_max')::numeric
        THEN 'acceptable'
        ELSE 'poor'
      END AS depth_match,
      
      CASE 
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'preferred' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'preferred'
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'acceptable' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'acceptable'
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'array'
          AND s.environmental_preferences->'substrate' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'suitable'
        ELSE 'poor'
      END AS substrate_match,
      
      -- Store actual conditions
      v_avg_temp as actual_temp,
      v_avg_salinity as actual_salinity,
      v_avg_depth as actual_depth,
      v_substrate_type as actual_substrate
      
    FROM species s
    WHERE s.environmental_preferences IS NOT NULL
  ),
  
  weighted_scores AS (
    SELECT
      ss.*,
      
      -- Apply guild-specific weights to calculate final score
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        
        -- PELAGIC: Temperature-driven (38%), substrate minimal (15%)
        WHEN 'pelagic' THEN
          ss.temp_raw * 0.38 + ss.sal_raw * 0.27 + ss.depth_raw * 0.20 + ss.substrate_raw * 0.15
        
        -- SURF_ESTUARY: Generalist, salinity-sensitive (22%)
        WHEN 'surf_estuary' THEN
          ss.temp_raw * 0.33 + ss.sal_raw * 0.22 + ss.depth_raw * 0.23 + ss.substrate_raw * 0.22
        
        -- REEF_KELP: Substrate-dominant (35%)
        WHEN 'reef_kelp' THEN
          ss.temp_raw * 0.25 + ss.sal_raw * 0.18 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.35
        
        -- BENTHIC: Substrate-critical (30%), temp moderate (28%)
        WHEN 'benthic' THEN
          ss.temp_raw * 0.28 + ss.sal_raw * 0.20 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.30
        
        -- CEPHALOPOD: Temperature-sensitive (32%), substrate moderate (23%)
        WHEN 'cephalopod' THEN
          ss.temp_raw * 0.32 + ss.sal_raw * 0.23 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.23
        
        -- DEFAULT_COASTAL: Balanced (30% temp, 25% substrate)
        ELSE
          ss.temp_raw * 0.30 + ss.sal_raw * 0.20 + ss.depth_raw * 0.25 + ss.substrate_raw * 0.25
      END AS weighted_score,
      
      -- Calculate weighted contributions for factors JSONB
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        WHEN 'pelagic' THEN ss.temp_raw * 0.38
        WHEN 'surf_estuary' THEN ss.temp_raw * 0.33
        WHEN 'reef_kelp' THEN ss.temp_raw * 0.25
        WHEN 'benthic' THEN ss.temp_raw * 0.28
        WHEN 'cephalopod' THEN ss.temp_raw * 0.32
        ELSE ss.temp_raw * 0.30
      END AS temp_weighted,
      
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        WHEN 'pelagic' THEN ss.sal_raw * 0.27
        WHEN 'surf_estuary' THEN ss.sal_raw * 0.22
        WHEN 'reef_kelp' THEN ss.sal_raw * 0.18
        WHEN 'benthic' THEN ss.sal_raw * 0.20
        WHEN 'cephalopod' THEN ss.sal_raw * 0.23
        ELSE ss.sal_raw * 0.20
      END AS sal_weighted,
      
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        WHEN 'pelagic' THEN ss.depth_raw * 0.20
        WHEN 'surf_estuary' THEN ss.depth_raw * 0.23
        WHEN 'reef_kelp' THEN ss.depth_raw * 0.22
        WHEN 'benthic' THEN ss.depth_raw * 0.22
        WHEN 'cephalopod' THEN ss.depth_raw * 0.22
        ELSE ss.depth_raw * 0.25
      END AS depth_weighted,
      
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        WHEN 'pelagic' THEN ss.substrate_raw * 0.15
        WHEN 'surf_estuary' THEN ss.substrate_raw * 0.22
        WHEN 'reef_kelp' THEN ss.substrate_raw * 0.35
        WHEN 'benthic' THEN ss.substrate_raw * 0.30
        WHEN 'cephalopod' THEN ss.substrate_raw * 0.23
        ELSE ss.substrate_raw * 0.25
      END AS substrate_weighted
      
    FROM species_scores ss
  )
  
  SELECT 
    ws.species_code,
    ws.name_en,
    ws.scientific_name,
    
    -- Convert to 0-10 scale
    ROUND(ws.weighted_score * 10, 1) AS environmental_score,
    
    -- Confidence level
    CASE 
      WHEN ws.weighted_score > 0.8 THEN 'high'
      WHEN ws.weighted_score > 0.6 THEN 'medium'
      ELSE 'low'
    END AS confidence,
    
    -- Match labels
    ws.temp_match,
    ws.sal_match,
    ws.depth_match,
    ws.substrate_match,
    
    -- Weight profile used
    ws.weight_profile,
    
    -- Detailed factors with weighted scores
    jsonb_build_object(
      'temperature', jsonb_build_object(
        'actual', ws.actual_temp,
        'score', ROUND(ws.temp_weighted, 3),
        'raw_score', ROUND(ws.temp_raw, 2),
        'match', ws.temp_match
      ),
      'salinity', jsonb_build_object(
        'actual', ws.actual_salinity,
        'score', ROUND(ws.sal_weighted, 3),
        'raw_score', ROUND(ws.sal_raw, 2),
        'match', ws.sal_match
      ),
      'depth', jsonb_build_object(
        'actual', ws.actual_depth,
        'score', ROUND(ws.depth_weighted, 3),
        'raw_score', ROUND(ws.depth_raw, 2),
        'match', ws.depth_match
      ),
      'substrate', jsonb_build_object(
        'actual', ws.actual_substrate,
        'score', ROUND(ws.substrate_weighted, 3),
        'raw_score', ROUND(ws.substrate_raw, 2),
        'match', ws.substrate_match
      ),
      'guild', ws.weight_profile
    ) AS factors
    
  FROM weighted_scores ws
  ORDER BY environmental_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Update function comment
COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Returns top 20 species predictions based on environmental conditions with guild-specific weighting. Pelagic species prioritize temperature (38%), reef species prioritize substrate (35%), benthic species balance both. Returns 0-10 scale with confidence levels.';

-- ============================================================================
-- VALIDATION & TEST QUERIES
-- ============================================================================

-- Test 1: Call with default parameters - check weight_profile column appears
SELECT species_code, species_name, environmental_score, weight_profile, confidence
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
LIMIT 10;

-- Test 2: Check Bass (should be surf_estuary or default_coastal initially)
SELECT 
  species_code,
  species_name,
  environmental_score,
  weight_profile,
  factors->'guild' as guild,
  factors->'temperature'->>'score' as temp_contribution,
  factors->'substrate'->>'score' as substrate_contribution
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'bss';

-- Test 3: Compare scores once profiles are populated
-- This will show differences after Step 3 population script runs
SELECT 
  species_code,
  species_name,
  environmental_score,
  weight_profile,
  temperature_match,
  substrate_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
ORDER BY environmental_score DESC
LIMIT 20;

-- ============================================================================
-- SUCCESS! ✅
-- Guild-aware prediction function deployed
-- Next: Populate species with their guild classifications (Step 3)
-- ============================================================================
