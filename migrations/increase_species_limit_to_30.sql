-- ============================================================================
-- INCREASE SPECIES LIMIT FROM 20 TO 30
-- ============================================================================
-- Date: October 15, 2025
-- Purpose: Show more species options while maintaining performance
-- Impact: Shows top 30 species instead of top 20 (50% more options!)
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
  weight_profile TEXT,
  factors JSONB,
  data_freshness TEXT
) AS $$
DECLARE
  v_avg_temp NUMERIC;
  v_avg_salinity NUMERIC;
  v_substrate_type TEXT;
  v_avg_depth NUMERIC;
  v_data_age_hours NUMERIC;
  v_data_source TEXT;
BEGIN
  -- Get REAL environmental conditions for the rectangle
  SELECT 
    rec.temperature_c,
    rec.salinity,
    rec.substrate_type,
    rec.fishing_depth_m,
    rec.data_age_hours,
    rec.data_source
  INTO 
    v_avg_temp,
    v_avg_salinity,
    v_substrate_type,
    v_avg_depth,
    v_data_age_hours,
    v_data_source
  FROM rectangle_environmental_conditions rec
  WHERE rec.rectangle_code = p_rectangle_code;
  
  -- Fallback to reasonable defaults if no data available
  v_avg_temp := COALESCE(v_avg_temp, 16.5);
  v_avg_salinity := COALESCE(v_avg_salinity, 34.2);
  v_substrate_type := COALESCE(v_substrate_type, 'mixed');
  v_avg_depth := COALESCE(v_avg_depth, 15.0);
  v_data_age_hours := COALESCE(v_data_age_hours, 999);
  v_data_source := COALESCE(v_data_source, 'fallback');

  RETURN QUERY
  WITH species_scores AS (
    SELECT 
      s.species_code::TEXT,
      s.name_en::TEXT,
      s.scientific_name::TEXT,
      COALESCE(s.weight_profile, 'default_coastal') as weight_profile,
      
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
      v_substrate_type as actual_substrate,
      v_data_age_hours as data_age_hours,
      v_data_source as data_source
      
    FROM species s
    WHERE s.environmental_preferences IS NOT NULL
  ),
  
  weighted_scores AS (
    SELECT
      ss.*,
      
      -- Apply guild-specific weights to calculate final score
      CASE COALESCE(ss.weight_profile, 'default_coastal')
        WHEN 'pelagic' THEN
          ss.temp_raw * 0.38 + ss.sal_raw * 0.27 + ss.depth_raw * 0.20 + ss.substrate_raw * 0.15
        WHEN 'surf_estuary' THEN
          ss.temp_raw * 0.33 + ss.sal_raw * 0.22 + ss.depth_raw * 0.23 + ss.substrate_raw * 0.22
        WHEN 'reef_kelp' THEN
          ss.temp_raw * 0.25 + ss.sal_raw * 0.18 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.35
        WHEN 'benthic' THEN
          ss.temp_raw * 0.28 + ss.sal_raw * 0.20 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.30
        WHEN 'cephalopod' THEN
          ss.temp_raw * 0.32 + ss.sal_raw * 0.23 + ss.depth_raw * 0.22 + ss.substrate_raw * 0.23
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
      'guild', ws.weight_profile,
      'data_source', ws.data_source,
      'data_age_hours', ROUND(ws.data_age_hours, 1)
    ) AS factors,
    
    -- Data freshness indicator
    CASE 
      WHEN ws.data_age_hours < 24 THEN 'fresh'
      WHEN ws.data_age_hours < 72 THEN 'recent'
      WHEN ws.data_age_hours < 168 THEN 'older'
      ELSE 'stale'
    END AS data_freshness
    
  FROM weighted_scores ws
  ORDER BY environmental_score DESC
  LIMIT 30;  -- ✅ INCREASED FROM 20 TO 30 (50% MORE SPECIES!)
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Returns top 30 species predictions (increased from 20) based on REAL environmental conditions from findr_conditions_snapshots with guild-specific weighting. Includes data_freshness indicator.';

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Test: Should now return 30 species instead of 20
SELECT 
  COUNT(*) as species_count,
  CASE 
    WHEN COUNT(*) = 30 THEN '✅ CORRECT: 30 species returned'
    ELSE '❌ ERROR: Expected 30 species, got ' || COUNT(*)::TEXT
  END as validation
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE);

-- Expected output:
-- species_count | validation
-- --------------+---------------------------
--            30 | ✅ CORRECT: 30 species returned
