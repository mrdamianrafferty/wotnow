-- Fix RPC function to use correct column names from moon_cache table
-- The table has: moon_phase_name, moon_illumination_pct, local_date
-- NOT: phase, illumination, date

DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced(
  TEXT, DATE, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC
);

CREATE FUNCTION get_environmental_predictions_enhanced(
  target_rectangle TEXT,
  target_date DATE,
  user_lat NUMERIC DEFAULT NULL,
  user_lon NUMERIC DEFAULT NULL,
  substrate_type TEXT DEFAULT NULL,
  depth_meters NUMERIC DEFAULT NULL,
  current_wind_speed_ms NUMERIC DEFAULT NULL,
  current_pressure_hpa NUMERIC DEFAULT NULL,
  current_tide_stage TEXT DEFAULT NULL,
  current_flow_speed_ms NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  species_code TEXT,
  species_id TEXT,
  species_common_name TEXT,
  species_scientific_name TEXT,
  confidence_percent INT,
  guild TEXT,
  species_badges TEXT[],
  diurnal_sensitivity TEXT,
  preferred_tide_stage TEXT[],
  temp_opt_c NUMERIC[],
  flow_preference TEXT,
  light_weight NUMERIC,
  temp_weight NUMERIC,
  tide_weight NUMERIC,
  lunar_weight NUMERIC,
  bio_band_score NUMERIC,
  temp_score NUMERIC,
  tide_score NUMERIC,
  light_score NUMERIC,
  lunar_score NUMERIC,
  habitat_bonus NUMERIC,
  factors JSONB,
  data_freshness TEXT,
  moon_phase TEXT,
  moon_illumination NUMERIC,
  playful_bio_en TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  rectangle_record RECORD;
  condition_record RECORD;
  time_category TEXT;
  v_moon_phase TEXT;
  v_moon_illumination NUMERIC;
  rectangle_region TEXT;
  v_water_temp_c NUMERIC;
  v_salinity_psu NUMERIC;
  v_data_age_hours NUMERIC;
BEGIN
  -- Fetch rectangle metadata (FIXED: use "region" instead of "biogeographic_region")
  SELECT center_lat, center_lon, region
  INTO rectangle_record
  FROM ices_rectangles
  WHERE rectangle_code = target_rectangle
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'Rectangle not found: %', target_rectangle;
    RETURN;
  END IF;

  -- Store region for filtering species
  rectangle_region := rectangle_record.region;

  -- Fetch environmental conditions from findr_conditions_latest
  -- FIXED: Use correct column names (sea_temp_c/water_temp_c, salinity_psu)
  -- Note: substrate column doesn't exist in this table, rely on parameter only
  SELECT
    COALESCE(water_temp_c, sea_temp_c) as temperature,
    salinity_psu,
    EXTRACT(EPOCH FROM (NOW() - captured_at)) / 3600 as age_hours
  INTO condition_record
  FROM findr_conditions_latest
  WHERE rectangle_code = target_rectangle
  ORDER BY captured_at DESC
  LIMIT 1;

  IF FOUND THEN
    v_water_temp_c := condition_record.temperature;
    v_salinity_psu := condition_record.salinity_psu;
    v_data_age_hours := condition_record.age_hours;
  ELSE
    RAISE NOTICE 'No environmental data found for rectangle: %', target_rectangle;
    v_water_temp_c := NULL;
    v_salinity_psu := NULL;
    v_data_age_hours := NULL;
  END IF;

  -- Determine time category based on target time (using 12:00 UTC as midday for now)
  time_category := CASE
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 6 AND 8 THEN 'dawn'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 18 AND 20 THEN 'dusk'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 10 AND 16 THEN 'midday'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 0 AND 5 OR EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 21 AND 23 THEN 'night'
    ELSE 'day'
  END;

  -- Fetch moon data (FIXED: use correct column names)
  -- Table has: moon_phase_name (not phase), moon_illumination_pct (not illumination), local_date (not date)
  SELECT moon_phase_name, moon_illumination_pct
  INTO v_moon_phase, v_moon_illumination
  FROM moon_cache
  WHERE local_date = target_date
  LIMIT 1;

  -- Main query with bite score parameters included
  RETURN QUERY
  WITH base_enriched AS (
    SELECT
      s.species_code,
      s.id::TEXT AS species_id,
      s.name_en,
      s.scientific_name,
      s.playful_bio_en,
      s.guild,
      s.species_badges,
      s.diurnal_sensitivity,
      s.preferred_tide_stage,
      s.light_weight,
      s.temp_opt_c,
      s.flow_preference,
      s.temp_weight,
      s.tide_weight,
      s.lunar_weight,
      v_water_temp_c AS actual_temp,
      v_salinity_psu AS actual_salinity,
      substrate_type AS actual_substrate,  -- Only from parameter, not from conditions table
      COALESCE(depth_meters, 20) AS actual_depth,
      v_data_age_hours AS data_age_hours
    FROM species s
    WHERE s.status = 'active'
      AND (
        rectangle_region = ANY(s.biogeographic_regions)
        OR s.biogeographic_regions IS NULL
        OR array_length(s.biogeographic_regions, 1) IS NULL
      )
  ),
  temp_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.actual_temp >= be.temp_opt_c[1] AND be.actual_temp <= be.temp_opt_c[2] THEN 10 * COALESCE(be.temp_weight, 1.0)
        WHEN be.actual_temp IS NOT NULL THEN 3 * COALESCE(be.temp_weight, 1.0)
        ELSE 0
      END AS temp_score
    FROM base_enriched be
  ),
  light_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.diurnal_sensitivity = 'strong' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 15
            WHEN time_category = 'night' THEN 10
            WHEN time_category = 'midday' THEN 3
            ELSE 5
          END
        WHEN be.diurnal_sensitivity = 'moderate' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 10
            WHEN time_category = 'night' THEN 7
            WHEN time_category = 'midday' THEN 5
            ELSE 6
          END
        WHEN be.diurnal_sensitivity = 'low' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 5
            WHEN time_category = 'night' THEN 5
            WHEN time_category = 'midday' THEN 6
            ELSE 6
          END
        ELSE 5
      END * COALESCE(be.light_weight, 1.0) AS light_score
    FROM base_enriched be
  ),
  tide_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN current_tide_stage IS NULL THEN 5
        WHEN current_tide_stage = ANY(be.preferred_tide_stage) THEN 10 * COALESCE(be.tide_weight, 1.0)
        ELSE 3 * COALESCE(be.tide_weight, 1.0)
      END AS tide_score
    FROM base_enriched be
  ),
  lunar_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN v_moon_illumination IS NULL THEN 5
        WHEN v_moon_illumination >= 0.7 AND v_moon_phase IN ('Full Moon', 'Waxing Gibbous', 'Waning Gibbous') THEN 10 * COALESCE(be.lunar_weight, 1.0)
        WHEN v_moon_illumination <= 0.3 AND v_moon_phase IN ('New Moon', 'Waxing Crescent', 'Waning Crescent') THEN 8 * COALESCE(be.lunar_weight, 1.0)
        ELSE 5 * COALESCE(be.lunar_weight, 1.0)
      END AS lunar_score
    FROM base_enriched be
  ),
  habitat_bonuses AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.actual_substrate IS NOT NULL AND be.actual_substrate = be.guild THEN 5
        ELSE 0
      END AS habitat_bonus
    FROM base_enriched be
  ),
  guild_weights AS (
    SELECT
      be.species_id,
      CASE be.guild
        WHEN 'pelagic' THEN 1.2
        WHEN 'reef_kelp' THEN 1.0
        WHEN 'benthic' THEN 0.9
        WHEN 'surf_estuary' THEN 1.1
        WHEN 'cephalopod' THEN 1.0
        ELSE 1.0
      END AS guild_multiplier
    FROM base_enriched be
  )
  SELECT
    be.species_code,
    be.species_id,
    be.name_en AS species_common_name,
    be.scientific_name AS species_scientific_name,
    LEAST(100, GREATEST(0, ROUND(
      (COALESCE(tm.temp_score, 0) + COALESCE(lm.light_score, 0) + COALESCE(tdm.tide_score, 0) + COALESCE(lum.lunar_score, 0) + COALESCE(hb.habitat_bonus, 0)) * COALESCE(gw.guild_multiplier, 1.0)
    )::INT)) AS confidence_percent,
    be.guild,
    be.species_badges,
    be.diurnal_sensitivity,
    be.preferred_tide_stage,
    be.temp_opt_c,
    be.flow_preference,
    be.light_weight,
    be.temp_weight,
    be.tide_weight,
    be.lunar_weight,
    COALESCE(tm.temp_score, 0) * COALESCE(gw.guild_multiplier, 1.0) AS bio_band_score,
    COALESCE(tm.temp_score, 0) AS temp_score,
    COALESCE(tdm.tide_score, 0) AS tide_score,
    COALESCE(lm.light_score, 0) AS light_score,
    COALESCE(lum.lunar_score, 0) AS lunar_score,
    COALESCE(hb.habitat_bonus, 0) AS habitat_bonus,
    jsonb_build_object(
      'temperature', be.actual_temp,
      'salinity', be.actual_salinity,
      'substrate', be.actual_substrate,
      'depth', be.actual_depth,
      'time_category', time_category
    ) AS factors,
    CASE
      WHEN be.data_age_hours IS NULL THEN 'unknown'
      WHEN be.data_age_hours < 24 THEN 'fresh'
      WHEN be.data_age_hours < 48 THEN 'recent'
      ELSE 'stale'
    END AS data_freshness,
    v_moon_phase AS moon_phase,
    v_moon_illumination AS moon_illumination,
    be.playful_bio_en
  FROM base_enriched be
  LEFT JOIN temp_matches tm ON be.species_id = tm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN tide_matches tdm ON be.species_id = tdm.species_id
  LEFT JOIN lunar_matches lum ON be.species_id = lum.species_id
  LEFT JOIN habitat_bonuses hb ON be.species_id = hb.species_id
  LEFT JOIN guild_weights gw ON be.species_id = gw.species_id
  ORDER BY confidence_percent DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_environmental_predictions_enhanced(TEXT, DATE, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC) TO authenticated, anon;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Enhanced confidence scoring with time-of-day awareness. FIXED: Uses correct column names from all tables - ices_rectangles.region, findr_conditions_latest (sea_temp_c/water_temp_c, salinity_psu), moon_cache (moon_phase_name, moon_illumination_pct, local_date).';
