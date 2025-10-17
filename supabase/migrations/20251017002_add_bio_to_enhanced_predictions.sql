-- Add species_code, scientific_name, and playful_bio_en to enhanced prediction function output
-- This ensures bios are available in swipable cards for all species (enhanced version)

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
  freshness_score integer,
  completeness_score integer
)
LANGUAGE plpgsql
AS $$
BEGIN
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
        WHEN user_substrate IS NULL THEN 12  -- Default when no substrate data
        WHEN ss.species_code IS NULL THEN 10  -- No preference data - assume adaptable
        WHEN (
          (user_substrate = 'sand' AND ss.has_sand) OR
          (user_substrate = 'gravel' AND ss.has_gravel) OR
          (user_substrate = 'rock' AND ss.has_rock) OR
          (user_substrate = 'mud' AND ss.has_mud)
        ) THEN 25  -- Exact match
        WHEN (ss.has_sand::int + ss.has_gravel::int + ss.has_rock::int + ss.has_mud::int + ss.has_mixed::int) >= 3 THEN 15  -- Generalist (tolerates many substrates)
        ELSE 5  -- Mismatch
      END as substrate_score
    FROM biogeochemical_enhancements be
    LEFT JOIN species_substrates ss ON be.species_code = ss.species_code
  ),
  depth_matches AS (
    -- Calculate depth score
    SELECT
      be.species_id,
      CASE
        WHEN user_depth_m IS NULL THEN 12  -- Default when no depth data
        WHEN s.depth_min IS NULL OR s.depth_max IS NULL THEN 10  -- No preference data
        WHEN user_depth_m BETWEEN s.depth_min AND s.depth_max THEN 20  -- Within optimal range
        WHEN user_depth_m BETWEEN (s.depth_min - 10) AND (s.depth_max + 10) THEN 15  -- Close to optimal
        WHEN user_depth_m < s.depth_min AND (s.depth_min - user_depth_m) <= 20 THEN 10  -- Shallow marginal
        WHEN user_depth_m > s.depth_max AND (user_depth_m - s.depth_max) <= 20 THEN 10  -- Deep marginal
        ELSE 5  -- Outside typical range
      END as depth_score
    FROM biogeochemical_enhancements be
    JOIN species s ON be.species_id = s.id
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
      -- Bio-band scoring (0-30)
      LEAST(30, COALESCE(
        COALESCE(bbm.chlorophyll_score, 0) + 
        COALESCE(bbm.oxygen_score, 0) + 
        COALESCE(bbm.salinity_score, 0),
        15
      ))::integer +
      -- Temperature scoring (0-25)
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
      -- Substrate scoring (0-25)
      COALESCE(sm.substrate_score, 12) +
      -- Depth scoring (0-20)
      COALESCE(dm.depth_score, 12) +
      -- Data freshness scoring (0-15)
      (CASE
        WHEN DATE(be.latest_capture) = target_date THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 13
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 11
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 9
        ELSE 6
      END)::integer +
      -- Species data completeness (0-10)
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 4 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 2 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN be.playful_bio_en IS NOT NULL THEN 1 ELSE 0 END)
      )::integer
    ))::integer as confidence,
    -- Return component scores
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
  ORDER BY confidence DESC, be.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Enhanced confidence scoring with lat/lon-based substrate and depth scoring. Now includes species_code, scientific_name, and playful_bio_en for complete fish card display.';
