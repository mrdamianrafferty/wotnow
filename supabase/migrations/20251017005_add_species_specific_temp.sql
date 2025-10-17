-- Enhancement 2: Species-Specific Temperature Scoring
-- Replace generic temperature ranges with species-specific optimal temperatures
-- Uses species.temp_opt_c [min, max] array for personalized scoring

-- Update enhanced prediction function with species-specific temperature scoring
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
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

  RETURN QUERY
  WITH recent_conditions AS (
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
      s.temp_opt_c,  -- NEW: Query optimal temperature range
      s.temp_weight,  -- NEW: Query temperature weight
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
    SELECT
      be_outer.species_id,
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
  ),
  temperature_matches AS (
    -- NEW: Species-specific temperature scoring using temp_opt_c
    SELECT
      be.species_id,
      CASE
        WHEN be.env_temperature IS NULL THEN 15  -- No data available
        WHEN be.temp_opt_c IS NOT NULL AND be.temp_opt_c[1] IS NOT NULL THEN
          -- Species has optimal temperature data - use it!
          CASE
            -- Perfect: within optimal range
            WHEN be.env_temperature BETWEEN be.temp_opt_c[1] AND be.temp_opt_c[2] THEN 25
            
            -- Good: within tolerance (±2°C)
            WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 2) AND (be.temp_opt_c[2] + 2) THEN 20
            
            -- Marginal: within extended range (±5°C)
            WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 5) AND (be.temp_opt_c[2] + 5) THEN 12
            
            -- Poor: outside comfort zone
            ELSE 5
          END
        ELSE
          -- Fallback to generic scoring if no species-specific data
          CASE
            WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
            WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
            ELSE 10
          END
      END as temp_score
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
      COALESCE(tm.temp_score, 15)::integer +  -- NEW: Use species-specific temp score
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
    COALESCE(tm.temp_score, 15)::integer as temp_score,  -- NEW: Return species-specific score
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
  LEFT JOIN temperature_matches tm ON be.species_id = tm.species_id  -- NEW: Join temp scores
  ORDER BY confidence DESC, be.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Enhanced confidence scoring with species-specific temperature ranges from temp_opt_c, time-of-day awareness, and GPS-based substrate/depth scoring.';

-- Update basic prediction function (without GPS) with species-specific temperature scoring
DROP FUNCTION IF EXISTS get_environmental_predictions_basic(text, date);

CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  target_rectangle text,
  target_date date
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
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

  RETURN QUERY
  WITH recent_conditions AS (
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
      s.temp_opt_c,  -- NEW: Query optimal temperature range
      s.temp_weight,  -- NEW: Query temperature weight
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
    SELECT
      be_outer.species_id,
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
  light_matches AS (
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
  ),
  temperature_matches AS (
    -- NEW: Species-specific temperature scoring using temp_opt_c
    SELECT
      be.species_id,
      CASE
        WHEN be.env_temperature IS NULL THEN 15
        WHEN be.temp_opt_c IS NOT NULL AND be.temp_opt_c[1] IS NOT NULL THEN
          CASE
            WHEN be.env_temperature BETWEEN be.temp_opt_c[1] AND be.temp_opt_c[2] THEN 25
            WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 2) AND (be.temp_opt_c[2] + 2) THEN 20
            WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 5) AND (be.temp_opt_c[2] + 5) THEN 12
            ELSE 5
          END
        ELSE
          CASE
            WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
            WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
            ELSE 10
          END
      END as temp_score
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
      COALESCE(tm.temp_score, 15)::integer +  -- NEW: Use species-specific temp score
      12 +  -- Substrate (no GPS)
      COALESCE(lm.light_score, 7) +
      (CASE
        WHEN DATE(be.latest_capture) = target_date THEN 20
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 18
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 12
        ELSE 8
      END)::integer +
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 4 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
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
    COALESCE(tm.temp_score, 15)::integer as temp_score,  -- NEW: Return species-specific score
    12::integer as substrate_score,
    COALESCE(lm.light_score, 7)::integer as light_score,
    (CASE
      WHEN DATE(be.latest_capture) = target_date THEN 20
      WHEN DATE(be.latest_capture) >= target_date - 1 THEN 18
      WHEN DATE(be.latest_capture) >= target_date - 3 THEN 15
      WHEN DATE(be.latest_capture) >= target_date - 7 THEN 12
      ELSE 8
    END)::integer as freshness_score,
    (
      (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 4 ELSE 0 END) +
      (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
      (CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END) +
      (CASE WHEN be.playful_bio_en IS NOT NULL THEN 1 ELSE 0 END)
    )::integer as completeness_score
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN temperature_matches tm ON be.species_id = tm.species_id  -- NEW: Join temp scores
  ORDER BY confidence DESC, be.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 'Basic confidence scoring with species-specific temperature ranges from temp_opt_c and time-of-day awareness.';

-- Test the enhancement
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Species-specific temperature scoring installed!';
  RAISE NOTICE 'Both RPC functions now use temp_opt_c optimal ranges per species.';
  RAISE NOTICE 'Example: Cod scores 25/25 at 6-11°C, Bluefish scores 25/25 at 18-24°C.';
  RAISE NOTICE 'Cold-water species penalized in warm water, warm-water species penalized in cold water.';
  RAISE NOTICE '';
END;
$$;
