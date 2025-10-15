-- ============================================================================
-- PHASE 10: CONNECT REAL CMEMS DATA TO PREDICTIONS
-- ============================================================================
--
-- Purpose: Replace hardcoded test values (16.5°C, rock, 15m) with real environmental data
-- from findr_conditions_snapshots table and substrate data
--
-- Copy this entire file and paste into Supabase SQL Editor
-- Then click "Run" to execute
--
-- Expected Impact:
--   - Predictions become location-specific and real-time
--   - Users see actual environmental conditions in their area
--   - Guild weighting works with real data (pelagic vs reef vs benthic)
--
-- ============================================================================

-- Step 1: Create helper view for latest environmental conditions
-- ============================================================================

CREATE OR REPLACE VIEW rectangle_environmental_conditions AS
SELECT 
  r.rectangle_code AS rectangle_code,
  r.id AS rectangle_id,
  r.center_lat,
  r.center_lon,
  r.region,
  r.distance_to_shore_km,
  r.is_coastal,
  
  -- Latest conditions from findr_conditions_snapshots
  fc.sea_temp_c AS temperature_c,
  fc.salinity_psu AS salinity,
  fc.chlorophyll_mg_m3 AS chlorophyll,
  fc.dissolved_oxygen_mg_l AS dissolved_oxygen,
  fc.nitrate_umol_l AS nitrate,
  fc.phosphate_umol_l AS phosphate,
  fc.captured_at AS data_captured_at,
  fc.source AS data_source,
  
  -- Calculate data age in hours
  EXTRACT(EPOCH FROM (NOW() - fc.captured_at)) / 3600 AS data_age_hours,
  
  -- Substrate data (placeholder - will be connected to EMODnet later)
  -- For now, infer substrate from region/coastal status
  CASE 
    WHEN r.region LIKE '%Channel%' OR r.region LIKE '%Celtic%' THEN 'mixed'
    WHEN r.region LIKE '%North Sea%' THEN 'sand'
    WHEN r.region LIKE '%Hebrides%' OR r.region LIKE '%Irish%' THEN 'rock'
    ELSE 'mixed'
  END AS substrate_type,
  
  -- Default fishing depth based on coastal vs offshore
  -- Shore fishing: 0-20m, Boat: 15-50m
  CASE 
    WHEN r.is_coastal THEN 15.0  -- Shallow coastal water
    WHEN r.distance_to_shore_km > 20 THEN 40.0  -- Deeper offshore
    ELSE 25.0  -- Mid-range
  END AS fishing_depth_m

FROM ices_rectangles r
LEFT JOIN LATERAL (
  -- Get the most recent snapshot for this rectangle
  SELECT *
  FROM findr_conditions_snapshots
  WHERE rectangle_code = r.rectangle_code
  ORDER BY captured_at DESC
  LIMIT 1
) fc ON true;

COMMENT ON VIEW rectangle_environmental_conditions IS 
'Latest environmental conditions for each rectangle, combining findr_conditions_snapshots with rectangle metadata. Includes data freshness indicator (data_age_hours).';

-- ============================================================================
-- Step 2: Create helper function to get substrate type
-- ============================================================================

-- This function maps substrate data to simple categories
-- Update this based on your actual substrate data structure
CREATE OR REPLACE FUNCTION get_rectangle_substrate(
  p_rectangle_code TEXT
) RETURNS TEXT AS $$
DECLARE
  v_substrate TEXT;
BEGIN
  -- Try to get substrate from rectangle_environmental_conditions view
  SELECT substrate_type INTO v_substrate
  FROM rectangle_environmental_conditions
  WHERE rectangle_code = p_rectangle_code;
  
  -- If no data, return 'mixed' as default
  RETURN COALESCE(v_substrate, 'mixed');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Update prediction function to use real data
-- ============================================================================

DROP FUNCTION IF EXISTS get_environmental_predictions_basic(TEXT, DATE);

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
  data_freshness TEXT  -- NEW: Shows how recent the data is
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
    
    -- NEW: Data freshness indicator
    CASE 
      WHEN ws.data_age_hours < 24 THEN 'fresh'
      WHEN ws.data_age_hours < 72 THEN 'recent'
      WHEN ws.data_age_hours < 168 THEN 'older'
      ELSE 'stale'
    END AS data_freshness
    
  FROM weighted_scores ws
  ORDER BY environmental_score DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Returns top 20 species predictions based on REAL environmental conditions from findr_conditions_snapshots with guild-specific weighting. NEW: Includes data_freshness indicator (fresh/recent/older/stale).';

-- ============================================================================
-- VALIDATION & TEST QUERIES
-- ============================================================================

-- Test 1: Check view works - show environmental conditions for Cornwall
SELECT 
  rectangle_code,
  temperature_c,
  salinity,
  substrate_type,
  fishing_depth_m,
  ROUND(data_age_hours, 1) as age_hours,
  data_source
FROM rectangle_environmental_conditions
WHERE rectangle_code = '31F1'
LIMIT 1;

-- Expected: Should show REAL temperature/salinity from findr_conditions_snapshots

-- ============================================================================

-- Test 2: Run predictions with real data
SELECT 
  species_code,
  species_name,
  environmental_score,
  weight_profile,
  temperature_match,
  substrate_match,
  data_freshness,
  (factors->>'data_age_hours')::numeric as age_hours,
  factors->'temperature'->>'actual' as actual_temp,
  factors->'substrate'->>'actual' as actual_substrate
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
LIMIT 10;

-- Expected: Should show DIFFERENT temperatures for different rectangles!

-- ============================================================================

-- Test 3: Compare multiple rectangles to validate location-specific data
SELECT 
  '31F1' as rect,
  (factors->'temperature'->>'actual')::numeric as temp,
  factors->'substrate'->>'actual' as substrate
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code = 'bss'

UNION ALL

SELECT 
  '37F4' as rect,
  (factors->'temperature'->>'actual')::numeric as temp,
  factors->'substrate'->>'actual' as substrate
FROM get_environmental_predictions_basic('37F4', CURRENT_DATE)
WHERE species_code = 'bss'

UNION ALL

SELECT 
  '42F2' as rect,
  (factors->'temperature'->>'actual')::numeric as temp,
  factors->'substrate'->>'actual' as substrate
FROM get_environmental_predictions_basic('42F2', CURRENT_DATE)
WHERE species_code = 'bss';

-- Expected: Should show DIFFERENT temperatures for different locations
-- Cornwall vs Channel Islands vs Scotland should have different temps!

-- ============================================================================

-- Test 4: Check data freshness distribution
SELECT 
  data_freshness,
  COUNT(DISTINCT species_code) as species_count,
  AVG(environmental_score) as avg_score
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
GROUP BY data_freshness;

-- Expected: Most should be 'fresh' (< 24 hours)

-- ============================================================================
-- SUCCESS! ✅
-- Real CMEMS data now connected to predictions
-- Next: Monitor data freshness, add substrate data sources
-- ============================================================================
