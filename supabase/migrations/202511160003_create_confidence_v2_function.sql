-- New confidence scoring formula with data normalization
-- November 16, 2025
-- Formula: Base Availability (40) + Environmental Match (60) with normalization

CREATE OR REPLACE FUNCTION get_fishing_confidence_v2(
  target_rectangle TEXT,
  target_date DATE DEFAULT CURRENT_DATE,
  target_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  species_code VARCHAR(10),
  species_name TEXT,
  confidence_percent INTEGER,
  base_availability_score NUMERIC,
  environmental_match_score NUMERIC,
  breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get latest environmental data for the rectangle
  latest_conditions AS (
    SELECT
      sea_temp_c,
      salinity_psu,
      chlorophyll_mg_m3,
      dissolved_oxygen_mg_l,
      kd490,
      current_speed_ms,
      wind_speed_kts
    FROM findr_conditions_latest
    WHERE rectangle_code = target_rectangle
    ORDER BY captured_at DESC
    LIMIT 1
  ),

  -- Calculate scores for each species
  species_scores AS (
    SELECT
      s.species_code AS sp_code,
      s.name_en AS sp_name,

      -- ============================================
      -- BASE AVAILABILITY (40 points)
      -- ============================================

      -- Catch data (30 pts) - Using catches_2024 as proxy
      CASE
        WHEN s.catches_2024 >= 50 THEN 30
        WHEN s.catches_2024 >= 25 THEN 25
        WHEN s.catches_2024 >= 10 THEN 20
        WHEN s.catches_2024 >= 5 THEN 15
        WHEN s.catches_2024 >= 1 THEN 10
        WHEN s.biogeographic_regions @> ARRAY[target_rectangle] THEN 5
        ELSE 0
      END AS catch_score,

      -- Seasonal patterns (10 pts) - Using peak/good/possible months
      CASE
        WHEN s.peak_months @> ARRAY[target_month] THEN 10
        WHEN s.good_months @> ARRAY[target_month] THEN 7
        WHEN s.possible_months @> ARRAY[target_month] THEN 3
        ELSE 0
      END AS seasonal_score,

      -- ============================================
      -- ENVIRONMENTAL MATCH (60 points) - NORMALIZED
      -- ============================================

      -- Temperature (25 pts weight)
      CASE
        WHEN c.sea_temp_c IS NULL THEN NULL
        WHEN c.sea_temp_c BETWEEN COALESCE(
          (s.environmental_preferences->'temperature'->>'optimal_min')::NUMERIC,
          (s.temp_opt_c->0)::NUMERIC
        ) AND COALESCE(
          (s.environmental_preferences->'temperature'->>'optimal_max')::NUMERIC,
          (s.temp_opt_c->1)::NUMERIC
        ) THEN 10 -- Full score (10/10)
        WHEN c.sea_temp_c BETWEEN COALESCE(
          (s.environmental_preferences->'temperature'->>'tolerance_min')::NUMERIC,
          (s.temp_opt_c->0)::NUMERIC - 4
        ) AND COALESCE(
          (s.environmental_preferences->'temperature'->>'tolerance_max')::NUMERIC,
          (s.temp_opt_c->1)::NUMERIC + 4
        ) THEN 7 -- Good (7/10)
        ELSE 3 -- Marginal (3/10)
      END AS temp_score_raw,

      -- Chlorophyll (10 pts weight)
      CASE
        WHEN c.chlorophyll_mg_m3 IS NULL OR s.chlorophyll_preference IS NULL THEN NULL
        WHEN s.chlorophyll_preference = 'indifferent' THEN 7 -- Neutral
        WHEN s.chlorophyll_preference = 'high' AND c.chlorophyll_mg_m3 > 3.0 THEN 10
        WHEN s.chlorophyll_preference = 'high' AND c.chlorophyll_mg_m3 > 1.5 THEN 7
        WHEN s.chlorophyll_preference = 'medium' AND c.chlorophyll_mg_m3 BETWEEN 0.5 AND 3.0 THEN 10
        WHEN s.chlorophyll_preference = 'medium' AND c.chlorophyll_mg_m3 BETWEEN 0.2 AND 5.0 THEN 7
        WHEN s.chlorophyll_preference = 'low' AND c.chlorophyll_mg_m3 < 0.5 THEN 10
        WHEN s.chlorophyll_preference = 'low' AND c.chlorophyll_mg_m3 < 1.0 THEN 7
        ELSE 5 -- Suboptimal
      END AS chlorophyll_score_raw,

      -- Oxygen (10 pts weight)
      CASE
        WHEN c.dissolved_oxygen_mg_l IS NULL OR s.oxygen_comfortable IS NULL THEN NULL
        WHEN c.dissolved_oxygen_mg_l > s.oxygen_comfortable THEN 10 -- Comfortable
        WHEN c.dissolved_oxygen_mg_l > COALESCE(s.oxygen_survival, s.oxygen_comfortable * 0.6) THEN 5 -- Survival
        ELSE 0 -- Hypoxic
      END AS oxygen_score_raw,

      -- Clarity (5 pts weight) - Using kd490
      CASE
        WHEN c.kd490 IS NULL THEN NULL
        -- Species with no preference get neutral score
        WHEN COALESCE(s.water_clarity_weight, 0) < 0.1 THEN 7
        -- Clear water preference (high clarity weight)
        WHEN s.water_clarity_weight > 0.5 AND c.kd490 < 0.1 THEN 10
        WHEN s.water_clarity_weight > 0.5 AND c.kd490 < 0.2 THEN 7
        -- Turbid water tolerance (high turbidity weight)
        WHEN COALESCE(s.turbidity_weight, 0) > 0.5 AND c.kd490 > 0.3 THEN 10
        WHEN COALESCE(s.turbidity_weight, 0) > 0.5 AND c.kd490 > 0.15 THEN 7
        ELSE 5 -- Neutral
      END AS clarity_score_raw,

      -- Currents (3 pts weight)
      CASE
        WHEN c.current_speed_ms IS NULL OR s.flow_preference IS NULL THEN NULL
        WHEN s.flow_preference = 'gentle' AND c.current_speed_ms < 0.2 THEN 10
        WHEN s.flow_preference = 'gentle' AND c.current_speed_ms < 0.5 THEN 7
        WHEN s.flow_preference = 'moderate' AND c.current_speed_ms BETWEEN 0.2 AND 0.8 THEN 10
        WHEN s.flow_preference = 'moderate' AND c.current_speed_ms BETWEEN 0.1 AND 1.2 THEN 7
        WHEN s.flow_preference = 'strong' AND c.current_speed_ms > 0.8 THEN 10
        WHEN s.flow_preference = 'strong' AND c.current_speed_ms > 0.5 THEN 7
        ELSE 5 -- Suboptimal
      END AS current_score_raw,

      -- Waves (3 pts weight) - Placeholder until we have wave data
      CASE
        WHEN s.wave_tolerance IS NULL THEN NULL
        -- Indifferent species get neutral score
        ELSE 7
      END AS wave_score_raw,

      -- Wind (2 pts weight)
      CASE
        WHEN c.wind_speed_kts IS NULL THEN NULL
        -- Species with low wind sensitivity (>0.5) tolerate high winds
        WHEN COALESCE(s.wind_sensitivity, 0.5) < 0.3 THEN 10 -- Not sensitive
        WHEN c.wind_speed_kts < 13.6 THEN 10 -- Calm (<7 m/s or <15 mph)
        WHEN c.wind_speed_kts < 21.4 THEN 7 -- Moderate (7-11 m/s or 15-25 mph)
        ELSE 3 -- Windy (>11 m/s or >25 mph)
      END AS wind_score_raw,

      -- Lunar (2 pts weight) - Placeholder until we have moon phase data
      CASE
        WHEN s.lunar_weight IS NULL OR s.lunar_weight < 0.05 THEN NULL
        ELSE 7 -- Neutral for now
      END AS lunar_score_raw

    FROM species s
    CROSS JOIN latest_conditions c
    WHERE s.code IS NOT NULL
  ),

  -- Calculate normalized environmental match
  normalized_scores AS (
    SELECT
      sp_code,
      sp_name,
      catch_score,
      seasonal_score,

      -- Base availability total (max 40)
      (catch_score + seasonal_score) AS base_availability,

      -- Calculate available weight for normalization
      (25 + -- Temperature always counted
       CASE WHEN chlorophyll_score_raw IS NOT NULL THEN 10 ELSE 0 END +
       CASE WHEN oxygen_score_raw IS NOT NULL THEN 10 ELSE 0 END +
       CASE WHEN clarity_score_raw IS NOT NULL THEN 5 ELSE 0 END +
       CASE WHEN current_score_raw IS NOT NULL THEN 3 ELSE 0 END +
       CASE WHEN wave_score_raw IS NOT NULL THEN 3 ELSE 0 END +
       CASE WHEN wind_score_raw IS NOT NULL THEN 2 ELSE 0 END +
       CASE WHEN lunar_score_raw IS NOT NULL THEN 2 ELSE 0 END
      ) AS available_weight,

      -- Calculate weighted sum (only for available data)
      (COALESCE(temp_score_raw, 0) * 25 +
       COALESCE(chlorophyll_score_raw, 0) * 10 +
       COALESCE(oxygen_score_raw, 0) * 10 +
       COALESCE(clarity_score_raw, 0) * 5 +
       COALESCE(current_score_raw, 0) * 3 +
       COALESCE(wave_score_raw, 0) * 3 +
       COALESCE(wind_score_raw, 0) * 2 +
       COALESCE(lunar_score_raw, 0) * 2
      ) AS weighted_sum,

      -- Individual scores for breakdown
      temp_score_raw,
      chlorophyll_score_raw,
      oxygen_score_raw,
      clarity_score_raw,
      current_score_raw,
      wave_score_raw,
      wind_score_raw,
      lunar_score_raw

    FROM species_scores
  )

  SELECT
    ns.sp_code,
    ns.sp_name,

    -- Total confidence (0-100)
    LEAST(100, ROUND(
      ns.base_availability +
      (ns.weighted_sum / NULLIF(ns.available_weight, 0)::NUMERIC) * 60 / 10
    ))::INTEGER AS confidence_percent,

    -- Component scores
    ns.base_availability AS base_availability_score,
    ROUND((ns.weighted_sum / NULLIF(ns.available_weight, 0)::NUMERIC) * 60 / 10, 1) AS environmental_match_score,

    -- Detailed breakdown
    jsonb_build_object(
      'base_availability', jsonb_build_object(
        'catch_score', ns.catch_score,
        'seasonal_score', ns.seasonal_score,
        'total', ns.base_availability
      ),
      'environmental_match', jsonb_build_object(
        'temperature', ns.temp_score_raw,
        'chlorophyll', ns.chlorophyll_score_raw,
        'oxygen', ns.oxygen_score_raw,
        'clarity', ns.clarity_score_raw,
        'currents', ns.current_score_raw,
        'waves', ns.wave_score_raw,
        'wind', ns.wind_score_raw,
        'lunar', ns.lunar_score_raw,
        'weighted_sum', ns.weighted_sum,
        'available_weight', ns.available_weight,
        'total', ROUND((ns.weighted_sum / NULLIF(ns.available_weight, 0)::NUMERIC) * 60 / 10, 1)
      )
    ) AS breakdown

  FROM normalized_scores ns
  WHERE ns.base_availability > 0 -- Filter out impossible species
  ORDER BY confidence_percent DESC;

END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_fishing_confidence_v2 IS 'New confidence scoring formula with data normalization. Returns confidence (0-100) based on catch data, seasonal patterns, and normalized environmental matching. Only scores based on available data - does not penalize missing values.';
