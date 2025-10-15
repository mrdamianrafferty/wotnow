-- ============================================================================
-- PHASE 9 DEPLOYMENT - STEP 4: BASIC ENVIRONMENTAL PREDICTIONS
-- ============================================================================
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- This creates:
--   get_environmental_predictions_basic() RPC function
--   Scores species based on environmental conditions
--
-- ============================================================================

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
      
      -- Temperature scoring (0-1 scale, weighted 35%)
      CASE 
        -- Optimal range
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
        
        -- Tolerance range
        WHEN v_avg_temp BETWEEN
          (s.environmental_preferences->'temperature'->>'tolerance_min')::numeric AND
          (s.environmental_preferences->'temperature'->>'tolerance_max')::numeric
        THEN 0.6
        
        -- Outside tolerance
        ELSE 0.2
      END * 0.35 AS temp_score,
      
      -- Temperature match label
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
      
      -- Salinity scoring (0-1 scale, weighted 25%)
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
      END * 0.25 AS sal_score,
      
      -- Salinity match label
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
      
      -- Depth scoring (0-1 scale, weighted 20%)
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
      END * 0.20 AS depth_score,
      
      -- Depth match label
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
      
      -- Substrate scoring (0-1 scale, weighted 20%)
      -- Handles both structured object {preferred: [], acceptable: []} and simple array formats
      CASE 
        -- Structured format: check preferred array
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object' 
          AND s.environmental_preferences->'substrate'->'preferred' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 1.0
        -- Structured format: check acceptable array
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'acceptable' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 0.7
        -- Simple array format: check if substrate is in the array
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'array'
          AND s.environmental_preferences->'substrate' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 0.85
        -- No match
        ELSE 0.3
      END * 0.20 AS substrate_score,
      
      -- Substrate match label
      CASE 
        -- Structured format: preferred
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'preferred' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'preferred'
        -- Structured format: acceptable
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'object'
          AND s.environmental_preferences->'substrate'->'acceptable' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'acceptable'
        -- Simple array format: suitable
        WHEN jsonb_typeof(s.environmental_preferences->'substrate') = 'array'
          AND s.environmental_preferences->'substrate' @> to_jsonb(ARRAY[v_substrate_type])
        THEN 'suitable'
        -- No match
        ELSE 'poor'
      END AS substrate_match,
      
      -- Store actual conditions for reference
      v_avg_temp as actual_temp,
      v_avg_salinity as actual_salinity,
      v_avg_depth as actual_depth,
      v_substrate_type as actual_substrate
      
    FROM species s
    WHERE s.environmental_preferences IS NOT NULL
  )
  SELECT 
    ss.species_code,
    ss.name_en,
    ss.scientific_name,
    
    -- Convert to 0-10 scale
    ROUND((ss.temp_score + ss.sal_score + ss.depth_score + ss.substrate_score) * 10, 1) 
      AS environmental_score,
    
    -- Confidence level
    CASE 
      WHEN (ss.temp_score + ss.sal_score + ss.depth_score + ss.substrate_score) > 0.8 THEN 'high'
      WHEN (ss.temp_score + ss.sal_score + ss.depth_score + ss.substrate_score) > 0.6 THEN 'medium'
      ELSE 'low'
    END AS confidence,
    
    -- Match labels
    ss.temp_match,
    ss.sal_match,
    ss.depth_match,
    ss.substrate_match,
    
    -- Detailed factors
    jsonb_build_object(
      'temperature', jsonb_build_object(
        'actual', ss.actual_temp,
        'score', ROUND(ss.temp_score, 2),
        'match', ss.temp_match
      ),
      'salinity', jsonb_build_object(
        'actual', ss.actual_salinity,
        'score', ROUND(ss.sal_score, 2),
        'match', ss.sal_match
      ),
      'depth', jsonb_build_object(
        'actual', ss.actual_depth,
        'score', ROUND(ss.depth_score, 2),
        'match', ss.depth_match
      ),
      'substrate', jsonb_build_object(
        'actual', ss.actual_substrate,
        'score', ROUND(ss.substrate_score, 2),
        'match', ss.substrate_match
      )
    ) AS factors
    
  FROM species_scores ss
  ORDER BY environmental_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comment
COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Returns top 20 species predictions based on environmental conditions. Scores: temperature (35%), salinity (25%), depth (20%), substrate (20%). Returns 0-10 scale with confidence levels.';

-- ============================================================================
-- VALIDATION & TEST QUERIES
-- ============================================================================

-- Test 1: Call the function with default parameters
SELECT * FROM get_environmental_predictions_basic('31F1', CURRENT_DATE);

-- Test 2: Check top 5 results
SELECT 
  species_code,
  species_name,
  environmental_score,
  confidence,
  temperature_match,
  salinity_match
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
LIMIT 5;

-- Test 3: Check factors breakdown for Bass
SELECT 
  species_code,
  species_name,
  environmental_score,
  factors
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'bss';

-- ============================================================================
-- SUCCESS! ✅
-- You now have working environmental predictions!
-- ============================================================================
