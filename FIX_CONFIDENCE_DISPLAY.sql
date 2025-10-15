-- FIX: Add numeric confidence percentage to predictions
-- Issue: Frontend shows "n/a" because confidence is returned as text ('high'/'medium'/'low')
-- Solution: Add confidence_percent field with numeric value (0-100)

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
  confidence_percent NUMERIC,  -- NEW: Numeric confidence (0-100) for frontend display
  confidence TEXT,              -- Text label for readability
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
    rec.salinity_ppt,
    rec.substrate_type,
    rec.depth_m,
    EXTRACT(EPOCH FROM (NOW() - rec.ingested_at)) / 3600.0 AS data_age_hours,
    'cmems_' || rec.data_date::TEXT AS data_source
  INTO 
    v_avg_temp,
    v_avg_salinity,
    v_substrate_type,
    v_avg_depth,
    v_data_age_hours,
    v_data_source
  FROM 
    ices_rectangles_conditions rec
  WHERE 
    rec.rectangle_code = p_rectangle_code
    AND rec.data_date = p_date
  LIMIT 1;

  -- If no real data found, return empty set
  IF v_avg_temp IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH species_prefs AS (
    SELECT
      sp.species_code,
      sp.name_en,
      sp.scientific_name,
      sp.guild_category,
      
      -- Temperature preferences
      sp.temp_min,
      sp.temp_optimal_min,
      sp.temp_optimal_max,
      sp.temp_max,
      
      -- Salinity preferences  
      sp.salinity_min,
      sp.salinity_optimal_min,
      sp.salinity_optimal_max,
      sp.salinity_max,
      
      -- Depth preferences
      sp.depth_min,
      sp.depth_optimal_min,
      sp.depth_optimal_max,
      sp.depth_max,
      
      -- Substrate preferences (array of preferred types)
      sp.substrate_preferred,
      sp.substrate_tolerated,
      
      -- Environmental variables
      v_avg_temp AS actual_temp,
      v_avg_salinity AS actual_salinity,
      v_substrate_type AS actual_substrate,
      v_avg_depth AS actual_depth,
      v_data_age_hours,
      v_data_source
      
    FROM species_environmental_preferences sp
    WHERE sp.is_active = TRUE
  ),
  
  species_scores AS (
    SELECT 
      sp.*,
      
      -- Temperature scoring (0 to 1)
      CASE 
        WHEN sp.actual_temp BETWEEN sp.temp_optimal_min AND sp.temp_optimal_max THEN 1.0
        WHEN sp.actual_temp BETWEEN sp.temp_min AND sp.temp_optimal_min THEN
          (sp.actual_temp - sp.temp_min) / NULLIF((sp.temp_optimal_min - sp.temp_min), 0)
        WHEN sp.actual_temp BETWEEN sp.temp_optimal_max AND sp.temp_max THEN
          (sp.temp_max - sp.actual_temp) / NULLIF((sp.temp_max - sp.temp_optimal_max), 0)
        ELSE 0.0
      END AS temp_raw,
      
      -- Salinity scoring (0 to 1)
      CASE 
        WHEN sp.actual_salinity BETWEEN sp.salinity_optimal_min AND sp.salinity_optimal_max THEN 1.0
        WHEN sp.actual_salinity BETWEEN sp.salinity_min AND sp.salinity_optimal_min THEN
          (sp.actual_salinity - sp.salinity_min) / NULLIF((sp.salinity_optimal_min - sp.salinity_min), 0)
        WHEN sp.actual_salinity BETWEEN sp.salinity_optimal_max AND sp.salinity_max THEN
          (sp.salinity_max - sp.actual_salinity) / NULLIF((sp.salinity_max - sp.salinity_optimal_max), 0)
        ELSE 0.0
      END AS sal_raw,
      
      -- Depth scoring (0 to 1)
      CASE 
        WHEN sp.actual_depth BETWEEN sp.depth_optimal_min AND sp.depth_optimal_max THEN 1.0
        WHEN sp.actual_depth BETWEEN sp.depth_min AND sp.depth_optimal_min THEN
          (sp.actual_depth - sp.depth_min) / NULLIF((sp.depth_optimal_min - sp.depth_min), 0)
        WHEN sp.actual_depth BETWEEN sp.depth_optimal_max AND sp.depth_max THEN
          (sp.depth_max - sp.actual_depth) / NULLIF((sp.depth_max - sp.depth_optimal_max), 0)
        ELSE 0.0
      END AS depth_raw,
      
      -- Substrate scoring (0, 0.5, or 1.0)
      CASE 
        WHEN sp.actual_substrate = ANY(sp.substrate_preferred) THEN 1.0
        WHEN sp.actual_substrate = ANY(sp.substrate_tolerated) THEN 0.5
        ELSE 0.0
      END AS substrate_raw,
      
      -- Match labels for UI
      CASE 
        WHEN sp.actual_temp BETWEEN sp.temp_optimal_min AND sp.temp_optimal_max THEN 'optimal'
        WHEN sp.actual_temp BETWEEN sp.temp_min AND sp.temp_max THEN 'acceptable'
        ELSE 'poor'
      END AS temp_match,
      
      CASE 
        WHEN sp.actual_salinity BETWEEN sp.salinity_optimal_min AND sp.salinity_optimal_max THEN 'optimal'
        WHEN sp.actual_salinity BETWEEN sp.salinity_min AND sp.salinity_max THEN 'acceptable'
        ELSE 'poor'
      END AS sal_match,
      
      CASE 
        WHEN sp.actual_depth BETWEEN sp.depth_optimal_min AND sp.depth_optimal_max THEN 'optimal'
        WHEN sp.actual_depth BETWEEN sp.depth_min AND sp.depth_max THEN 'acceptable'
        ELSE 'poor'
      END AS depth_match,
      
      CASE 
        WHEN sp.actual_substrate = ANY(sp.substrate_preferred) THEN 'optimal'
        WHEN sp.actual_substrate = ANY(sp.substrate_tolerated) THEN 'acceptable'
        ELSE 'poor'
      END AS substrate_match
      
    FROM species_prefs sp
  ),
  
  guild_weights AS (
    SELECT
      'pelagic' AS guild_category,
      0.38 AS temp_weight,
      0.27 AS sal_weight,
      0.20 AS depth_weight,
      0.15 AS substrate_weight
    UNION ALL SELECT 'surf_estuary', 0.33, 0.22, 0.23, 0.22
    UNION ALL SELECT 'reef_kelp', 0.25, 0.18, 0.22, 0.35
    UNION ALL SELECT 'benthic', 0.28, 0.20, 0.22, 0.30
    UNION ALL SELECT 'cephalopod', 0.32, 0.23, 0.22, 0.23
    UNION ALL SELECT 'default_coastal', 0.30, 0.20, 0.25, 0.25
  ),
  
  weighted_scores AS (
    SELECT
      ss.species_code,
      ss.name_en,
      ss.scientific_name,
      ss.guild_category AS weight_profile,
      
      -- Raw scores
      ss.temp_raw,
      ss.sal_raw,
      ss.depth_raw,
      ss.substrate_raw,
      
      -- Match labels
      ss.temp_match,
      ss.sal_match,
      ss.depth_match,
      ss.substrate_match,
      
      -- Actual values
      ss.actual_temp,
      ss.actual_salinity,
      ss.actual_depth,
      ss.actual_substrate,
      ss.data_age_hours,
      ss.data_source,
      
      -- Weighted component scores
      ss.temp_raw * COALESCE(gw.temp_weight, 0.30) AS temp_weighted,
      ss.sal_raw * COALESCE(gw.sal_weight, 0.20) AS sal_weighted,
      ss.depth_raw * COALESCE(gw.depth_weight, 0.25) AS depth_weighted,
      ss.substrate_raw * COALESCE(gw.substrate_weight, 0.25) AS substrate_weighted,
      
      -- Final weighted score (0-1 scale)
      (
        ss.temp_raw * COALESCE(gw.temp_weight, 0.30) +
        ss.sal_raw * COALESCE(gw.sal_weight, 0.20) +
        ss.depth_raw * COALESCE(gw.depth_weight, 0.25) +
        ss.substrate_raw * COALESCE(gw.substrate_weight, 0.25)
      ) AS weighted_score
      
    FROM species_scores ss
    LEFT JOIN guild_weights gw ON ss.guild_category = gw.guild_category
  )
  
  SELECT 
    ws.species_code,
    ws.name_en,
    ws.scientific_name,
    
    -- Environmental score (0-10 scale for display)
    ROUND(ws.weighted_score * 10, 1) AS environmental_score,
    
    -- NEW: Numeric confidence percentage (0-100) for frontend
    ROUND(ws.weighted_score * 100, 0) AS confidence_percent,
    
    -- Text confidence label
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
  LIMIT 20;
  
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
  'Returns species predictions with real CMEMS environmental data, guild-specific weighting, and NUMERIC confidence_percent field for frontend display';

-- Test query
SELECT 
  species_code,
  species_name,
  confidence_percent,  -- Should now show 0-100
  confidence,          -- Shows 'high'/'medium'/'low'
  environmental_score,
  weight_profile
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
ORDER BY confidence_percent DESC
LIMIT 5;
