-- Add species_id to get_fishing_confidence_v3 output
-- Fixes issue where modal can't look up species details because UUID is missing

DROP FUNCTION IF EXISTS get_fishing_confidence_v3(VARCHAR, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_fishing_confidence_v3(
  target_rectangle VARCHAR,
  target_date DATE,
  target_month INTEGER
)
RETURNS TABLE(
  species_id UUID,  -- ADD THIS FIELD
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
)
AS $$
BEGIN
  RETURN QUERY

  WITH
  rectangle_region AS (
    SELECT r.region AS region_code
    FROM ices_rectangles r
    WHERE r.rectangle_code = target_rectangle
    LIMIT 1
  ),
  species_scores AS (
    SELECT
      s.id AS species_id,
      s.species_code AS sp_code,
      s.name_en AS sp_name,
      s.catch_frequency_score,
      s.seasonal_score,
      s.temp_opt_c,
      s.max_depth AS max_depth_m,
      s.guild,
      s.substrate_sand,
      s.substrate_gravel,
      s.substrate_rock,
      s.substrate_mud,
      s.substrate_mixed,
      -- Weights
      COALESCE(s.temperature_weight, 0.20) AS temp_weight,
      COALESCE(s.chlorophyll_weight, 0.10) AS chlorophyll_weight,
      COALESCE(s.oxygen_weight, 0.10) AS oxygen_weight,
      COALESCE(s.clarity_weight, 0.10) AS clarity_weight,
      COALESCE(s.current_weight, 0.10) AS current_weight,
      COALESCE(s.wave_weight, 0.10) AS wave_weight,
      COALESCE(s.wind_weight, 0.10) AS wind_weight,
      COALESCE(s.lunar_weight, 0.10) AS lunar_weight,
      COALESCE(s.tidal_weight, 0.10) AS tidal_weight
    FROM species s
    WHERE s.is_active = true
  ),

  environmental_data AS (
    SELECT
      c.sea_temp_c,
      c.chlorophyll_mg_m3,
      c.oxygen_ml_l,
      c.kd490 AS clarity_kd490,
      c.current_speed_ms,
      c.wave_height_m,
      c.wind_speed_kts,
      c.moon_phase,
      c.captured_at,
      c.source
    FROM findr_conditions_latest c
    WHERE c.rectangle_code = target_rectangle
      AND DATE(c.captured_at) = target_date
    ORDER BY c.captured_at DESC
    LIMIT 1
  ),

  base_confidence AS (
    SELECT
      species_id,
      sp_code,
      sp_name,
      -- Base availability (0-40 scale)
      (COALESCE(catch_frequency_score, 5) * 2 + COALESCE(seasonal_score, 5) * 6) AS base_availability,
      catch_frequency_score AS catch_score,
      seasonal_score,

      -- Temperature scoring
      CASE
        WHEN temp_opt_c IS NULL OR array_length(temp_opt_c, 1) IS NULL THEN NULL
        WHEN (SELECT sea_temp_c FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT sea_temp_c FROM environmental_data) BETWEEN temp_opt_c[1] AND temp_opt_c[2] THEN 10.0
        WHEN (SELECT sea_temp_c FROM environmental_data) < temp_opt_c[1] THEN
          GREATEST(0, 10.0 - ABS((SELECT sea_temp_c FROM environmental_data) - temp_opt_c[1]))
        ELSE
          GREATEST(0, 10.0 - ABS((SELECT sea_temp_c FROM environmental_data) - temp_opt_c[2]))
      END AS temp_score_raw,

      -- Chlorophyll scoring
      CASE
        WHEN (SELECT chlorophyll_mg_m3 FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT chlorophyll_mg_m3 FROM environmental_data) BETWEEN 0.1 AND 2.0 THEN 10.0
        WHEN (SELECT chlorophyll_mg_m3 FROM environmental_data) < 0.1 THEN
          GREATEST(0, 10.0 * ((SELECT chlorophyll_mg_m3 FROM environmental_data) / 0.1))
        ELSE
          GREATEST(0, 10.0 - ((SELECT chlorophyll_mg_m3 FROM environmental_data) - 2.0) * 2)
      END AS chlorophyll_score_raw,

      -- Oxygen scoring
      CASE
        WHEN (SELECT oxygen_ml_l FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT oxygen_ml_l FROM environmental_data) >= 5.0 THEN 10.0
        WHEN (SELECT oxygen_ml_l FROM environmental_data) < 3.0 THEN 0.0
        ELSE ((SELECT oxygen_ml_l FROM environmental_data) - 3.0) / 2.0 * 10.0
      END AS oxygen_score_raw,

      -- Clarity scoring
      CASE
        WHEN (SELECT clarity_kd490 FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT clarity_kd490 FROM environmental_data) <= 0.1 THEN 10.0
        WHEN (SELECT clarity_kd490 FROM environmental_data) > 0.5 THEN 0.0
        ELSE (0.5 - (SELECT clarity_kd490 FROM environmental_data)) / 0.4 * 10.0
      END AS clarity_score_raw,

      -- Current scoring
      CASE
        WHEN (SELECT current_speed_ms FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT current_speed_ms FROM environmental_data) BETWEEN 0.2 AND 0.8 THEN 10.0
        WHEN (SELECT current_speed_ms FROM environmental_data) < 0.2 THEN
          (SELECT current_speed_ms FROM environmental_data) / 0.2 * 10.0
        ELSE GREATEST(0, 10.0 - ((SELECT current_speed_ms FROM environmental_data) - 0.8) * 5)
      END AS current_score_raw,

      -- Wave scoring
      CASE
        WHEN (SELECT wave_height_m FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT wave_height_m FROM environmental_data) <= 1.5 THEN 10.0
        WHEN (SELECT wave_height_m FROM environmental_data) > 3.0 THEN 0.0
        ELSE (3.0 - (SELECT wave_height_m FROM environmental_data)) / 1.5 * 10.0
      END AS wave_score_raw,

      -- Wind scoring
      CASE
        WHEN (SELECT wind_speed_kts FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT wind_speed_kts FROM environmental_data) <= 15 THEN 10.0
        WHEN (SELECT wind_speed_kts FROM environmental_data) > 25 THEN 0.0
        ELSE (25.0 - (SELECT wind_speed_kts FROM environmental_data)) / 10.0 * 10.0
      END AS wind_score_raw,

      -- Lunar scoring
      CASE
        WHEN (SELECT moon_phase FROM environmental_data) IS NULL THEN NULL
        WHEN (SELECT moon_phase FROM environmental_data) IN ('new_moon', 'full_moon') THEN 10.0
        WHEN (SELECT moon_phase FROM environmental_data) IN ('first_quarter', 'last_quarter') THEN 7.0
        ELSE 5.0
      END AS lunar_score_raw,

      -- Weights
      temp_weight,
      chlorophyll_weight,
      oxygen_weight,
      clarity_weight,
      current_weight,
      wave_weight,
      wind_weight,
      lunar_weight
    FROM species_scores
  ),

  with_seasonality AS (
    SELECT
      bc.*,

      -- Weighted sum of environmental scores
      (COALESCE(bc.temp_score_raw * bc.temp_weight, 0) +
       COALESCE(bc.chlorophyll_score_raw * bc.chlorophyll_weight, 0) +
       COALESCE(bc.oxygen_score_raw * bc.oxygen_weight, 0) +
       COALESCE(bc.clarity_score_raw * bc.clarity_weight, 0) +
       COALESCE(bc.current_score_raw * bc.current_weight, 0) +
       COALESCE(bc.wave_score_raw * bc.wave_weight, 0) +
       COALESCE(bc.wind_score_raw * bc.wind_weight, 0) +
       COALESCE(bc.lunar_score_raw * bc.lunar_weight, 0)) AS weighted_sum,

      -- Total available weight
      (CASE WHEN bc.temp_score_raw IS NOT NULL THEN bc.temp_weight ELSE 0 END +
       CASE WHEN bc.chlorophyll_score_raw IS NOT NULL THEN bc.chlorophyll_weight ELSE 0 END +
       CASE WHEN bc.oxygen_score_raw IS NOT NULL THEN bc.oxygen_weight ELSE 0 END +
       CASE WHEN bc.clarity_score_raw IS NOT NULL THEN bc.clarity_weight ELSE 0 END +
       CASE WHEN bc.current_score_raw IS NOT NULL THEN bc.current_weight ELSE 0 END +
       CASE WHEN bc.wave_score_raw IS NOT NULL THEN bc.wave_weight ELSE 0 END +
       CASE WHEN bc.wind_score_raw IS NOT NULL THEN bc.wind_weight ELSE 0 END +
       CASE WHEN bc.lunar_score_raw IS NOT NULL THEN bc.lunar_weight ELSE 0 END) AS available_weight,

      r.region_code,

      -- Calculate seasonal phase
      CASE
        WHEN srs.species_id IS NULL THEN 'no_data'::TEXT
        WHEN target_month = ANY (srs.peak_months) THEN 'peak'::TEXT
        WHEN target_month = ANY (srs.good_months) THEN 'good'::TEXT
        WHEN target_month = ANY (srs.possible_months) THEN 'possible'::TEXT
        ELSE 'out_of_season'::TEXT
      END AS seasonal_phase,

      -- Calculate seasonal weight
      CASE
        WHEN srs.species_id IS NULL THEN 1.0 -- no row → neutral
        WHEN target_month = ANY (srs.peak_months) THEN srs.weight_peak
        WHEN target_month = ANY (srs.good_months) THEN srs.weight_good
        WHEN target_month = ANY (srs.possible_months) THEN srs.weight_possible
        ELSE srs.weight_out_of_season
      END AS seasonal_weight,

      COALESCE(srs.availability_multiplier, 1.0) AS availability_multiplier,
      COALESCE(srs.source, 'no_data')::TEXT AS seasonality_source,
      srs.source_confidence AS seasonality_source_confidence

    FROM base_confidence bc
    CROSS JOIN rectangle_region r
    LEFT JOIN species_region_seasonality srs
      ON srs.species_id = bc.species_id
     AND srs.region_code = r.region_code
  )

  SELECT
    ws.species_id::UUID,  -- ADD THIS LINE
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
  ORDER BY confidence_percent DESC;

END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_fishing_confidence_v3 IS 'Confidence V3 with regional seasonality integration. Returns species_id (UUID), species_code, and seasonally-adjusted confidence. Uses species_region_seasonality table for per-region seasonal weights.';
