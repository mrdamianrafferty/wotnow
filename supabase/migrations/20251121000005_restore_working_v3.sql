-- Restore Working V3 Function
-- November 21, 2025
-- Reverts to the last working version from 202511170004_fix_v3_region_mapping.sql
-- This was broken by migration 20251121000003 which introduced ambiguous species_id references

DROP FUNCTION IF EXISTS get_fishing_confidence_v3(TEXT, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_fishing_confidence_v3(
  target_rectangle TEXT,
  target_date DATE DEFAULT CURRENT_DATE,
  target_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  species_code VARCHAR(10),
  species_name VARCHAR(100),
  confidence_percent INTEGER,
  base_availability_score NUMERIC,
  environmental_match_score NUMERIC,
  seasonal_phase TEXT,
  seasonal_weight NUMERIC,
  availability_multiplier NUMERIC,
  seasonality_source TEXT,
  seasonality_source_confidence NUMERIC,
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

  -- Get biogeographic region(s) for the rectangle using CMEMS region mapping
  rectangle_regions AS (
    SELECT UNNEST(
      CASE cmems_region
        -- Iberia-Biscay-Ireland → Bay of Biscay, Iberian Coast
        WHEN 'IBI' THEN ARRAY['BIS', 'IBR']::TEXT[]
        -- Northwest Shelf → Northeast Atlantic, North Sea, Skagerrak/Kattegat
        WHEN 'NWS' THEN ARRAY['NEA', 'NSEA', 'SCA']::TEXT[]
        -- Baltic Sea → Baltic
        WHEN 'BAL' THEN ARRAY['BALT']::TEXT[]
        -- Mediterranean → Mediterranean
        WHEN 'MED' THEN ARRAY['MED']::TEXT[]
        -- Fallback: Try to use region field if it matches a biogeographic code
        ELSE CASE
          WHEN region IN ('BALT', 'BIS', 'IBR', 'MED', 'NEA', 'NSEA', 'SCA') THEN ARRAY[region]::TEXT[]
          ELSE ARRAY[]::TEXT[]
        END
      END
    ) AS biogeographic_region
    FROM ices_rectangles
    WHERE rectangle_code = target_rectangle
  ),

  -- Calculate V2-style scores for each species
  species_scores AS (
    SELECT
      s.id AS species_id,
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
        ELSE 5 -- Non-commercial species still get a baseline score
      END AS catch_score,

      -- Seasonal patterns (10 pts) - Using peak/good/possible months
      -- Note: V3 will override this with region-specific data if available
      CASE
        WHEN s.peak_months @> ARRAY[target_month] THEN 10
        WHEN s.good_months @> ARRAY[target_month] THEN 7
        WHEN s.possible_months @> ARRAY[target_month] THEN 3
        -- Empty seasonal arrays = lacking data, assume neutral
        WHEN array_length(s.peak_months, 1) IS NULL
          AND array_length(s.good_months, 1) IS NULL
          AND array_length(s.possible_months, 1) IS NULL THEN 5
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
          s.temp_opt_c[1]
        ) AND COALESCE(
          (s.environmental_preferences->'temperature'->>'optimal_max')::NUMERIC,
          s.temp_opt_c[2]
        ) THEN 10 -- Full score (10/10)
        WHEN c.sea_temp_c BETWEEN COALESCE(
          (s.environmental_preferences->'temperature'->>'tolerance_min')::NUMERIC,
          s.temp_opt_c[1] - 4
        ) AND COALESCE(
          (s.environmental_preferences->'temperature'->>'tolerance_max')::NUMERIC,
          s.temp_opt_c[2] + 4
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
    WHERE s.species_code IS NOT NULL
  ),

  -- Calculate normalized environmental match
  base_confidence AS (
    SELECT
      species_id,
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
  ),

  -- Add regional seasonality data (joining on biogeographic regions)
  with_seasonality AS (
    SELECT
      bc.*,
      rr.biogeographic_region AS region_code,
      srs.peak_months AS srs_peak_months,
      srs.good_months AS srs_good_months,
      srs.possible_months AS srs_possible_months,
      srs.availability_multiplier::NUMERIC,
      srs.weight_peak::NUMERIC,
      srs.weight_good::NUMERIC,
      srs.weight_possible::NUMERIC,
      srs.source AS seasonality_source,
      srs.source_confidence AS seasonality_source_confidence,

      -- Calculate seasonal phase
      CASE
        WHEN srs.species_id IS NULL THEN 'no_data'::TEXT
        WHEN target_month = ANY (srs.peak_months) THEN 'peak'::TEXT
        WHEN target_month = ANY (srs.good_months) THEN 'good'::TEXT
        WHEN target_month = ANY (srs.possible_months) THEN 'possible'::TEXT
        ELSE 'off'::TEXT
      END AS seasonal_phase,

      -- Calculate seasonal weight
      CASE
        WHEN srs.species_id IS NULL THEN 1.0::NUMERIC -- no row → neutral
        WHEN target_month = ANY (srs.peak_months) THEN srs.weight_peak::NUMERIC
        WHEN target_month = ANY (srs.good_months) THEN srs.weight_good::NUMERIC
        WHEN target_month = ANY (srs.possible_months) THEN srs.weight_possible::NUMERIC
        ELSE 0.0::NUMERIC -- explicitly out of season
      END AS seasonal_weight,

      -- Track which region matched (for debugging)
      ROW_NUMBER() OVER (PARTITION BY bc.species_id ORDER BY
        CASE
          WHEN srs.species_id IS NOT NULL THEN 1
          ELSE 2
        END
      ) AS region_rank

    FROM base_confidence bc
    CROSS JOIN rectangle_regions rr
    LEFT JOIN species_region_seasonality srs
      ON srs.species_id = bc.species_id
     AND srs.region_code = rr.biogeographic_region
  )

  -- Final output - use the best match per species (prioritize regions with data)
  SELECT
    ws.sp_code::VARCHAR(10),
    ws.sp_name::VARCHAR(100),

    -- Total confidence (0-100) - SEASONALLY ADJUSTED
    LEAST(100, ROUND(
      (ws.base_availability +
       (ws.weighted_sum / NULLIF(ws.available_weight, 0)::NUMERIC) * 60 / 10)
      * COALESCE(ws.seasonal_weight, 1.0)
      * COALESCE(ws.availability_multiplier, 1.0)
    ))::INTEGER AS confidence_percent,

    -- Component scores
    ws.base_availability::NUMERIC AS base_availability_score,
    ROUND((ws.weighted_sum / NULLIF(ws.available_weight, 0)::NUMERIC) * 60 / 10, 1) AS environmental_match_score,

    -- Seasonality fields
    ws.seasonal_phase::TEXT,
    ROUND(COALESCE(ws.seasonal_weight, 1.0), 2) AS seasonal_weight,
    COALESCE(ws.availability_multiplier, 1.0) AS availability_multiplier,
    ws.seasonality_source::TEXT,
    ws.seasonality_source_confidence::NUMERIC,

    -- Detailed breakdown
    jsonb_build_object(
      'base_availability', jsonb_build_object(
        'catch_score', ws.catch_score,
        'seasonal_score', ws.seasonal_score,
        'total', ws.base_availability
      ),
      'environmental_match', jsonb_build_object(
        'temperature', ws.temp_score_raw,
        'chlorophyll', ws.chlorophyll_score_raw,
        'oxygen', ws.oxygen_score_raw,
        'clarity', ws.clarity_score_raw,
        'currents', ws.current_score_raw,
        'waves', ws.wave_score_raw,
        'wind', ws.wind_score_raw,
        'lunar', ws.lunar_score_raw,
        'weighted_sum', ws.weighted_sum,
        'available_weight', ws.available_weight,
        'total', ROUND((ws.weighted_sum / NULLIF(ws.available_weight, 0)::NUMERIC) * 60 / 10, 1)
      ),
      'seasonality', jsonb_build_object(
        'phase', ws.seasonal_phase,
        'weight', ROUND(COALESCE(ws.seasonal_weight, 1.0), 2),
        'availability_multiplier', COALESCE(ws.availability_multiplier, 1.0),
        'source', ws.seasonality_source,
        'source_confidence', ws.seasonality_source_confidence,
        'region_code', ws.region_code
      )
    ) AS breakdown

  FROM with_seasonality ws
  WHERE ws.region_rank = 1  -- Use best match per species
  ORDER BY confidence_percent DESC;

END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_fishing_confidence_v3(TEXT, DATE, INTEGER) IS 'Confidence V3 with regional seasonality integration (RESTORED: working version). Maps CMEMS regions to biogeographic regions (IBI→{BIS,IBR}, NWS→{NEA,NSEA,SCA}, BAL→BALT, MED→MED). Joins species_region_seasonality on biogeographic region codes. Returns seasonally-adjusted confidence_percent multiplied by seasonal_weight * availability_multiplier.';
