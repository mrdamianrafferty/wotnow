-- Add biogeographic region mapping to RPC function
-- Issue: Rectangle.region values (e.g., 'English Channel') don't match species.biogeographic_regions (e.g., 'NE_Atlantic')
-- Solution: Map rectangle codes to broad biogeographic regions that match species data

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
  v_water_temp_c NUMERIC;
  v_salinity_psu NUMERIC;
  v_data_age_hours NUMERIC;
  time_category TEXT;
  v_moon_phase TEXT;
  v_moon_illumination NUMERIC;
  rectangle_region TEXT;
BEGIN
  -- Map rectangle codes to broad biogeographic regions (NE_Atlantic, Mediterranean, etc.)
  -- that match what species actually use in their biogeographic_regions column
  rectangle_region := CASE
    -- Mediterranean rectangles (07xx, 08xx)
    WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'

    -- Northeast Atlantic - All European waters (20xx-65xx)
    WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '22%' OR target_rectangle LIKE '23%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '24%' OR target_rectangle LIKE '25%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '26%' OR target_rectangle LIKE '27%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '28%' OR target_rectangle LIKE '29%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '30%' OR target_rectangle LIKE '31%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '32%' OR target_rectangle LIKE '33%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '34%' OR target_rectangle LIKE '35%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '36%' OR target_rectangle LIKE '37%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '38%' OR target_rectangle LIKE '39%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '40%' OR target_rectangle LIKE '41%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '42%' OR target_rectangle LIKE '43%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '44%' OR target_rectangle LIKE '45%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '46%' OR target_rectangle LIKE '47%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '48%' OR target_rectangle LIKE '49%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '50%' OR target_rectangle LIKE '51%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '52%' OR target_rectangle LIKE '53%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '54%' OR target_rectangle LIKE '55%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '56%' OR target_rectangle LIKE '57%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '58%' OR target_rectangle LIKE '59%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '60%' OR target_rectangle LIKE '61%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '62%' OR target_rectangle LIKE '63%' THEN 'NE_Atlantic'
    WHEN target_rectangle LIKE '64%' OR target_rectangle LIKE '65%' THEN 'NE_Atlantic'

    -- Northwest Atlantic - US East Coast (70xx-76xx)
    WHEN target_rectangle LIKE '70%' OR target_rectangle LIKE '71%' THEN 'NW_Atlantic'
    WHEN target_rectangle LIKE '72%' OR target_rectangle LIKE '73%' THEN 'NW_Atlantic'
    WHEN target_rectangle LIKE '74%' OR target_rectangle LIKE '75%' THEN 'NW_Atlantic'
    WHEN target_rectangle LIKE '76%' THEN 'NW_Atlantic'

    -- Gulf of Mexico (90xx-94xx)
    WHEN target_rectangle LIKE '90%' OR target_rectangle LIKE '91%' THEN 'Gulf_of_Mexico'
    WHEN target_rectangle LIKE '92%' OR target_rectangle LIKE '93%' THEN 'Gulf_of_Mexico'
    WHEN target_rectangle LIKE '94%' THEN 'Gulf_of_Mexico'

    -- Caribbean (95xx-97xx)
    WHEN target_rectangle LIKE '95%' OR target_rectangle LIKE '96%' THEN 'Caribbean'
    WHEN target_rectangle LIKE '97%' THEN 'Caribbean'

    -- Northeast Pacific - US/Canada West Coast (77xx-85xx)
    WHEN target_rectangle LIKE '77%' OR target_rectangle LIKE '78%' THEN 'NE_Pacific'
    WHEN target_rectangle LIKE '79%' OR target_rectangle LIKE '80%' THEN 'NE_Pacific'
    WHEN target_rectangle LIKE '81%' OR target_rectangle LIKE '82%' THEN 'NE_Pacific'
    WHEN target_rectangle LIKE '83%' OR target_rectangle LIKE '84%' THEN 'NE_Pacific'
    WHEN target_rectangle LIKE '85%' THEN 'NE_Pacific'

    -- Gulf of Alaska (86xx-88xx)
    WHEN target_rectangle LIKE '86%' OR target_rectangle LIKE '87%' THEN 'Gulf_of_Alaska'
    WHEN target_rectangle LIKE '88%' THEN 'Gulf_of_Alaska'

    -- Hawaii (98xx)
    WHEN target_rectangle LIKE '98%' THEN 'Hawaii'

    -- Default to NE_Atlantic for European waters
    ELSE 'NE_Atlantic'
  END;

  RAISE NOTICE 'Rectangle %, mapped to biogeographic region: %', target_rectangle, rectangle_region;

  -- Fetch environmental conditions using correct column names
  SELECT
    COALESCE(water_temp_c, sea_temp_c) as temperature,
    salinity_psu,
    EXTRACT(EPOCH FROM (NOW() - captured_at)) / 3600 as age_hours
  INTO v_water_temp_c, v_salinity_psu, v_data_age_hours
  FROM findr_conditions_latest
  WHERE rectangle_code = target_rectangle
  ORDER BY captured_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No environmental data found for rectangle: %', target_rectangle;
    v_water_temp_c := NULL;
    v_salinity_psu := NULL;
    v_data_age_hours := NULL;
  END IF;

  -- Determine time category based on target time
  time_category := CASE
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 6 AND 8 THEN 'dawn'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 18 AND 20 THEN 'dusk'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 10 AND 16 THEN 'midday'
    WHEN EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 0 AND 5 OR EXTRACT(HOUR FROM target_date::timestamp) BETWEEN 21 AND 23 THEN 'night'
    ELSE 'day'
  END;

  -- Fetch moon data using correct column names
  SELECT moon_phase_name, moon_illumination_pct
  INTO v_moon_phase, v_moon_illumination
  FROM moon_cache
  WHERE local_date = target_date
  ORDER BY cached_at DESC
  LIMIT 1;

  -- Main query with explicit NUMERIC casting throughout
  RETURN QUERY
  WITH base_enriched AS (
    SELECT
      s.species_code::TEXT,
      s.id::TEXT AS species_id,
      s.name_en::TEXT,
      s.scientific_name::TEXT,
      s.playful_bio_en,
      s.guild::TEXT,
      s.species_badges,
      s.diurnal_sensitivity::TEXT,
      s.preferred_tide_stage,
      s.light_weight,
      s.temp_opt_c,
      s.flow_preference::TEXT,
      s.temp_weight,
      s.tide_weight,
      s.lunar_weight,
      v_water_temp_c AS actual_temp,
      v_salinity_psu AS actual_salinity,
      substrate_type AS actual_substrate,
      COALESCE(depth_meters, 20) AS actual_depth,
      v_data_age_hours AS data_age_hours
    FROM species s
    WHERE
      rectangle_region = ANY(s.biogeographic_regions)
      OR s.biogeographic_regions IS NULL
      OR array_length(s.biogeographic_regions, 1) IS NULL
  ),
  temp_matches AS (
    SELECT
      be.species_id,
      (CASE
        WHEN be.actual_temp >= be.temp_opt_c[1] AND be.actual_temp <= be.temp_opt_c[2] THEN 10.0 * COALESCE(be.temp_weight, 1.0)
        WHEN be.actual_temp IS NOT NULL THEN 3.0 * COALESCE(be.temp_weight, 1.0)
        ELSE 0.0
      END)::NUMERIC AS temp_score
    FROM base_enriched be
  ),
  light_matches AS (
    SELECT
      be.species_id,
      (CASE
        WHEN be.diurnal_sensitivity = 'strong' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 15.0
            WHEN time_category = 'night' THEN 10.0
            WHEN time_category = 'midday' THEN 3.0
            ELSE 5.0
          END
        WHEN be.diurnal_sensitivity = 'moderate' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 12.0
            WHEN time_category IN ('day', 'midday') THEN 8.0
            ELSE 5.0
          END
        WHEN be.diurnal_sensitivity = 'weak' THEN 8.0
        ELSE 5.0
      END * COALESCE(be.light_weight, 1.0))::NUMERIC AS light_score
    FROM base_enriched be
  ),
  lunar_matches AS (
    SELECT
      be.species_id,
      (CASE
        WHEN v_moon_illumination > 0.75 THEN 8.0 * COALESCE(be.lunar_weight, 1.0)
        WHEN v_moon_illumination > 0.25 THEN 5.0 * COALESCE(be.lunar_weight, 1.0)
        ELSE 3.0 * COALESCE(be.lunar_weight, 1.0)
      END)::NUMERIC AS lunar_score
    FROM base_enriched be
  ),
  tide_matches AS (
    SELECT
      be.species_id,
      (CASE
        WHEN current_tide_stage IS NOT NULL AND current_tide_stage = ANY(be.preferred_tide_stage) THEN 10.0 * COALESCE(be.tide_weight, 1.0)
        WHEN current_tide_stage IS NOT NULL THEN 5.0 * COALESCE(be.tide_weight, 1.0)
        ELSE 5.0 * COALESCE(be.tide_weight, 1.0)
      END)::NUMERIC AS tide_score
    FROM base_enriched be
  ),
  bio_band_scores AS (
    SELECT
      be.species_id,
      (CASE
        WHEN be.guild = 'pelagic' THEN
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.4,
            COALESCE(lm.light_score, 0.0) * 0.3,
            COALESCE(lum.lunar_score, 0.0) * 0.2,
            COALESCE(tim.tide_score, 0.0) * 0.1
          )
        WHEN be.guild = 'reef_kelp' THEN
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.3,
            COALESCE(lm.light_score, 0.0) * 0.25,
            COALESCE(tim.tide_score, 0.0) * 0.25,
            COALESCE(lum.lunar_score, 0.0) * 0.2
          )
        WHEN be.guild = 'benthic' THEN
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.25,
            COALESCE(tim.tide_score, 0.0) * 0.3,
            COALESCE(lum.lunar_score, 0.0) * 0.25,
            COALESCE(lm.light_score, 0.0) * 0.2
          )
        WHEN be.guild = 'surf_estuary' THEN
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.25,
            COALESCE(tim.tide_score, 0.0) * 0.35,
            COALESCE(lm.light_score, 0.0) * 0.2,
            COALESCE(lum.lunar_score, 0.0) * 0.2
          )
        WHEN be.guild = 'cephalopod' THEN
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.35,
            COALESCE(lm.light_score, 0.0) * 0.3,
            COALESCE(lum.lunar_score, 0.0) * 0.2,
            COALESCE(tim.tide_score, 0.0) * 0.15
          )
        ELSE
          GREATEST(
            COALESCE(tm.temp_score, 0.0) * 0.3,
            COALESCE(lm.light_score, 0.0) * 0.25,
            COALESCE(tim.tide_score, 0.0) * 0.25,
            COALESCE(lum.lunar_score, 0.0) * 0.2
          )
      END * 10.0)::NUMERIC AS bio_band_score
    FROM base_enriched be
    LEFT JOIN temp_matches tm ON be.species_id = tm.species_id
    LEFT JOIN light_matches lm ON be.species_id = lm.species_id
    LEFT JOIN lunar_matches lum ON be.species_id = lum.species_id
    LEFT JOIN tide_matches tim ON be.species_id = tim.species_id
  ),
  habitat_bonuses AS (
    SELECT
      be.species_id,
      (CASE
        WHEN be.actual_substrate IS NOT NULL THEN 5.0
        ELSE 0.0
      END)::NUMERIC AS habitat_bonus
    FROM base_enriched be
  )
  SELECT
    be.species_code,
    be.species_id,
    be.name_en,
    be.scientific_name,
    LEAST(GREATEST(
      COALESCE(bbs.bio_band_score, 0.0) + COALESCE(hb.habitat_bonus, 0.0),
      0.0
    ), 100.0)::INT AS confidence_percent,
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
    COALESCE(bbs.bio_band_score, 0.0)::NUMERIC AS bio_band_score,
    COALESCE(tm.temp_score, 0.0)::NUMERIC AS temp_score,
    COALESCE(tim.tide_score, 0.0)::NUMERIC AS tide_score,
    COALESCE(lm.light_score, 0.0)::NUMERIC AS light_score,
    COALESCE(lum.lunar_score, 0.0)::NUMERIC AS lunar_score,
    COALESCE(hb.habitat_bonus, 0.0)::NUMERIC AS habitat_bonus,
    jsonb_build_object(
      'temperature', jsonb_build_object('actual', be.actual_temp, 'score', COALESCE(tm.temp_score, 0.0)),
      'salinity', jsonb_build_object('actual', be.actual_salinity, 'score', 0.0),
      'substrate', jsonb_build_object('actual', be.actual_substrate, 'score', COALESCE(hb.habitat_bonus, 0.0)),
      'depth', jsonb_build_object('actual', be.actual_depth, 'score', 0.0),
      'data_age_hours', be.data_age_hours
    ) AS factors,
    CASE
      WHEN be.data_age_hours IS NULL THEN 'unknown'
      WHEN be.data_age_hours < 24 THEN 'fresh'
      WHEN be.data_age_hours < 48 THEN 'recent'
      WHEN be.data_age_hours < 96 THEN 'older'
      ELSE 'stale'
    END AS data_freshness,
    v_moon_phase,
    v_moon_illumination,
    be.playful_bio_en
  FROM base_enriched be
  LEFT JOIN temp_matches tm ON be.species_id = tm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN lunar_matches lum ON be.species_id = lum.species_id
  LEFT JOIN tide_matches tim ON be.species_id = tim.species_id
  LEFT JOIN bio_band_scores bbs ON be.species_id = bbs.species_id
  LEFT JOIN habitat_bonuses hb ON be.species_id = hb.species_id
  ORDER BY confidence_percent DESC, be.species_code;
END;
$$;

GRANT EXECUTE ON FUNCTION get_environmental_predictions_enhanced(TEXT, DATE, NUMERIC, NUMERIC, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, NUMERIC) TO authenticated, anon;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'FIXED: Added biogeographic region mapping. Maps rectangle codes to broad regions (NE_Atlantic, Mediterranean, etc.) that match species.biogeographic_regions values. All type casts applied.';
