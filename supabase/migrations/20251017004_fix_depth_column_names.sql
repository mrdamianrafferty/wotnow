-- Fix: Update enhanced prediction function to use correct depth column names
-- The previous migration used depth_min/depth_max instead of depth_min_m/depth_max_m

DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced(text, date, numeric, numeric, text, numeric);

CREATE OR REPLACE FUNCTION get_environmental_predictions_enhanced(
  target_rectangle text,
  target_date date,
  user_lat numeric DEFAULT NULL,
  user_lon numeric DEFAULT NULL,
  user_substrate text DEFAULT NULL,
  user_depth_m numeric DEFAULT NULL
)
RETURNS TABLE (
  species_id uuid,
  species_code varchar,
  name_en varchar,
  scientific_name varchar,
  playful_bio_en text,
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
  depth_score integer,
  light_score integer,
  freshness_score integer,
  completeness_score integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour integer;
  time_category text;
BEGIN
  -- Calculate current hour and time category
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

  RETURN QUERY
  WITH recent_conditions AS (
    -- Get most recent environmental data within 7 days (handles split snapshots)
    SELECT 
      rectangle_code,
      MAX(CASE WHEN sea_temp_c IS NOT NULL THEN sea_temp_c END) as sea_temp_c,
      MAX(CASE WHEN chlorophyll_mg_m3 IS NOT NULL THEN chlorophyll_mg_m3 END) as chlorophyll_mg_m3,
      MAX(CASE WHEN dissolved_oxygen_mg_l IS NOT NULL THEN dissolved_oxygen_mg_l END) as dissolved_oxygen_mg_l,
      MAX(CASE WHEN salinity_psu IS NOT NULL THEN salinity_psu END) as salinity_psu,
      MAX(captured_at) as latest_capture
    FROM findr_conditions_snapshots
    WHERE rectangle_code = target_rectangle
      AND DATE(captured_at) BETWEEN target_date - INTERVAL '7 days' AND target_date
    GROUP BY rectangle_code
  ),
  biogeochemical_enhancements AS (
    SELECT
      s.id as species_id,
      s.species_code,
      s.name_en,
      s.scientific_name,
      s.playful_bio_en,
      s.diurnal_sensitivity,
      s.light_weight,
      target_rectangle as ices_rectangle,
      target_date as prediction_date,
      rc.sea_temp_c as env_temperature,
      rc.chlorophyll_mg_m3 as env_chlorophyll,
      rc.dissolved_oxygen_mg_l as env_oxygen,
      rc.salinity_psu as env_salinity,
      rc.latest_capture
    FROM species s
    CROSS JOIN recent_conditions rc
    WHERE s.name_en IS NOT NULL
  ),
  bio_band_matches AS (
    -- Calculate bio-band matches for each species
    SELECT
      be_outer.species_id,
      -- Chlorophyll scoring
      CASE
        WHEN be_outer.env_chlorophyll IS NOT NULL THEN
          (SELECT 
            CASE
              WHEN bbt.level = ANY(sbb.happy_bands) THEN 10
              WHEN bbt.level = ANY(sbb.unhappy_bands) THEN 2
              ELSE 5
            END
          FROM species_bio_bands sbb
          LEFT JOIN LATERAL (
            SELECT level
            FROM bio_bands_thresholds
            WHERE parameter = 'chlorophyll'
              AND be_outer.env_chlorophyll >= threshold
            ORDER BY threshold DESC
            LIMIT 1
          ) bbt ON true
          WHERE sbb.species_id = be_outer.species_id
            AND sbb.parameter = 'chlorophyll'
          LIMIT 1)
        ELSE 0
      END as chlorophyll_score,
      -- Oxygen scoring
      CASE
        WHEN be_outer.env_oxygen IS NOT NULL THEN
          (SELECT 
            CASE
              WHEN bbt.level = ANY(sbb.happy_bands) THEN 10
              WHEN bbt.level = ANY(sbb.unhappy_bands) THEN 2
              ELSE 5
            END
          FROM species_bio_bands sbb
          LEFT JOIN LATERAL (
            SELECT level
            FROM bio_bands_thresholds
            WHERE parameter = 'oxygen'
              AND be_outer.env_oxygen >= threshold
            ORDER BY threshold DESC
            LIMIT 1
          ) bbt ON true
          WHERE sbb.species_id = be_outer.species_id
            AND sbb.parameter = 'oxygen'
          LIMIT 1)
        ELSE 0
      END as oxygen_score,
      -- Salinity scoring
      CASE
        WHEN be_outer.env_salinity IS NOT NULL THEN
          (SELECT 
            CASE
              WHEN bbt.level = ANY(sbb.happy_bands) THEN 10
              WHEN bbt.level = ANY(sbb.unhappy_bands) THEN 2
              ELSE 5
            END
          FROM species_bio_bands sbb
          LEFT JOIN LATERAL (
            SELECT level
            FROM bio_bands_thresholds
            WHERE parameter = 'salinity'
              AND be_outer.env_salinity >= threshold
            ORDER BY threshold DESC
            LIMIT 1
          ) bbt ON true
          WHERE sbb.species_id = be_outer.species_id
            AND sbb.parameter = 'salinity'
          LIMIT 1)
        ELSE 0
      END as salinity_score
    FROM biogeochemical_enhancements be_outer
  ),
  substrate_matches AS (
    -- Calculate substrate match score
    SELECT
      be.species_id,
      CASE
        WHEN user_substrate IS NULL THEN 12
        WHEN ss.species_code IS NULL THEN 10
        WHEN (
          (user_substrate = 'sand' AND ss.has_sand) OR
          (user_substrate = 'gravel' AND ss.has_gravel) OR
          (user_substrate = 'rock' AND ss.has_rock) OR
          (user_substrate = 'mud' AND ss.has_mud)
        ) THEN 25
        WHEN (ss.has_sand::int + ss.has_gravel::int + ss.has_rock::int + ss.has_mud::int + ss.has_mixed::int) >= 3 THEN 15
        ELSE 5
      END as substrate_score
    FROM biogeochemical_enhancements be
    LEFT JOIN species_substrates ss ON be.species_code = ss.species_code
  ),
  depth_matches AS (
    -- Calculate depth score (FIXED: use depth_min_m and depth_max_m)
    SELECT
      be.species_id,
      CASE
        WHEN user_depth_m IS NULL THEN 12
        WHEN s.depth_min_m IS NULL OR s.depth_max_m IS NULL THEN 10
        WHEN user_depth_m BETWEEN s.depth_min_m AND s.depth_max_m THEN 20
        WHEN user_depth_m BETWEEN (s.depth_min_m - 10) AND (s.depth_max_m + 10) THEN 15
        WHEN user_depth_m < s.depth_min_m AND (s.depth_min_m - user_depth_m) <= 20 THEN 10
        WHEN user_depth_m > s.depth_max_m AND (user_depth_m - s.depth_max_m) <= 20 THEN 10
        ELSE 5
      END as depth_score
    FROM biogeochemical_enhancements be
    JOIN species s ON be.species_id = s.id
  ),
  light_matches AS (
    -- Calculate time-of-day score based on diurnal sensitivity
    SELECT
      be.species_id,
      CASE
        WHEN time_category IN ('dawn', 'dusk') AND be.diurnal_sensitivity = 'strong' THEN 15
        WHEN time_category IN ('dawn', 'dusk') AND be.diurnal_sensitivity = 'moderate' THEN 10
        WHEN time_category IN ('dawn', 'dusk') THEN 8
        WHEN time_category = 'night' AND be.diurnal_sensitivity = 'strong' THEN 12
        WHEN time_category = 'night' AND be.diurnal_sensitivity = 'moderate' THEN 8
        WHEN time_category = 'night' THEN 5
        WHEN time_category = 'day' AND be.diurnal_sensitivity = 'weak' THEN 10
        WHEN time_category = 'day' AND be.diurnal_sensitivity = 'moderate' THEN 12
        WHEN time_category = 'day' THEN 8
        ELSE 7
      END as light_score
    FROM biogeochemical_enhancements be
  )
  SELECT
    be.species_id,
    be.species_code,
    be.name_en,
    be.scientific_name,
    be.playful_bio_en,
    be.ices_rectangle,
    be.prediction_date,
    LEAST(100, GREATEST(0, 
      LEAST(30, COALESCE(
        COALESCE(bbm.chlorophyll_score, 0) + 
        COALESCE(bbm.oxygen_score, 0) + 
        COALESCE(bbm.salinity_score, 0),
        15
      ))::integer +
      (CASE 
        WHEN be.env_temperature IS NULL THEN 15
        WHEN EXISTS (
          SELECT 1
          FROM species_bio_bands sbb
          JOIN LATERAL (
            SELECT level
            FROM bio_bands_thresholds
            WHERE parameter = 'surfaceTemperature'
              AND be.env_temperature >= threshold
            ORDER BY threshold DESC
            LIMIT 1
          ) bbt ON true
          WHERE sbb.species_id = be.species_id
            AND sbb.parameter = 'surface_temperature'
            AND bbt.level = ANY(sbb.happy_bands)
        ) THEN 25
        WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
        WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
        ELSE 10
      END)::integer +
      COALESCE(sm.substrate_score, 12) +
      COALESCE(dm.depth_score, 12) +
      COALESCE(lm.light_score, 7) +
      (CASE
        WHEN DATE(be.latest_capture) = target_date THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 13
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 11
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 9
        ELSE 6
      END)::integer +
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 4 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 2 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN be.playful_bio_en IS NOT NULL THEN 1 ELSE 0 END)
      )::integer
    ))::integer as confidence,
    LEAST(30, COALESCE(
      COALESCE(bbm.chlorophyll_score, 0) + 
      COALESCE(bbm.oxygen_score, 0) + 
      COALESCE(bbm.salinity_score, 0),
      15
    ))::integer as bio_band_score,
    (CASE 
      WHEN be.env_temperature IS NULL THEN 15
      WHEN EXISTS (
        SELECT 1
        FROM species_bio_bands sbb
        JOIN LATERAL (
          SELECT level
          FROM bio_bands_thresholds
          WHERE parameter = 'surfaceTemperature'
            AND be.env_temperature >= threshold
          ORDER BY threshold DESC
          LIMIT 1
        ) bbt ON true
        WHERE sbb.species_id = be.species_id
          AND sbb.parameter = 'surface_temperature'
          AND bbt.level = ANY(sbb.happy_bands)
      ) THEN 25
      WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
      WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
      ELSE 10
    END)::integer as temp_score,
    COALESCE(sm.substrate_score, 12)::integer as substrate_score,
    COALESCE(dm.depth_score, 12)::integer as depth_score,
    COALESCE(lm.light_score, 7)::integer as light_score,
    (CASE
      WHEN DATE(be.latest_capture) = target_date THEN 15
      WHEN DATE(be.latest_capture) >= target_date - 1 THEN 13
      WHEN DATE(be.latest_capture) >= target_date - 3 THEN 11
      WHEN DATE(be.latest_capture) >= target_date - 7 THEN 9
      ELSE 6
    END)::integer as freshness_score,
    (
      (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 4 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 2 ELSE 0 END) +
      (CASE WHEN be.name_en IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END) +
      (CASE WHEN be.playful_bio_en IS NOT NULL THEN 1 ELSE 0 END)
    )::integer as completeness_score
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN substrate_matches sm ON be.species_id = sm.species_id
  LEFT JOIN depth_matches dm ON be.species_id = dm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  ORDER BY confidence DESC, be.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Enhanced confidence scoring with time-of-day awareness and GPS-based substrate/depth scoring. Uses diurnal_sensitivity to boost dawn/dusk feeders.';
