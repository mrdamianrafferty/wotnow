-- Fix substrate scoring logic to be more selective
-- Current issue: Species with has_mixed=true get 15pts for ANY substrate
-- Should only get tolerated score if they're generalists with ONLY mixed preference

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
  name_en varchar,
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
      s.depth_min_m,
      s.depth_max_m,
      s.depth_optimal_min_m,
      s.depth_optimal_max_m,
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
    -- Calculate bio-band matches for each species (same as before)
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
  substrate_depth_scores AS (
    -- IMPROVED: More selective substrate scoring
    SELECT
      be.species_id,
      CASE
        WHEN user_substrate IS NULL THEN 12  -- Default when no substrate provided
        -- Check for exact substrate match first
        WHEN EXISTS (
          SELECT 1
          FROM species_substrates ss
          WHERE ss.species_code = be.species_code
            AND (
              (user_substrate = 'sand' AND ss.has_sand = true) OR
              (user_substrate = 'rock' AND ss.has_rock = true) OR
              (user_substrate = 'gravel' AND ss.has_gravel = true) OR
              (user_substrate = 'mud' AND ss.has_mud = true) OR
              (user_substrate = 'mixed' AND ss.has_mixed = true)
            )
        ) THEN 25  -- Optimal: Species explicitly likes this substrate
        -- Check if species is highly adaptable (has 3+ substrate types)
        WHEN EXISTS (
          SELECT 1
          FROM species_substrates ss
          WHERE ss.species_code = be.species_code
            AND (
              (CASE WHEN ss.has_sand THEN 1 ELSE 0 END) +
              (CASE WHEN ss.has_rock THEN 1 ELSE 0 END) +
              (CASE WHEN ss.has_gravel THEN 1 ELSE 0 END) +
              (CASE WHEN ss.has_mud THEN 1 ELSE 0 END) +
              (CASE WHEN ss.has_mixed THEN 1 ELSE 0 END)
            ) >= 3
        ) THEN 15  -- Tolerated: Generalist species, adaptable
        ELSE 5  -- Poor match: Wrong substrate for this species
      END as substrate_score,
      -- Depth scoring (unchanged)
      CASE
        WHEN user_depth_m IS NULL THEN 12
        WHEN be.depth_optimal_min_m IS NOT NULL 
          AND be.depth_optimal_max_m IS NOT NULL 
          AND user_depth_m BETWEEN be.depth_optimal_min_m AND be.depth_optimal_max_m 
        THEN 20
        WHEN user_depth_m BETWEEN be.depth_min_m AND be.depth_max_m 
        THEN 15
        WHEN user_depth_m < be.depth_min_m 
          AND (be.depth_min_m - user_depth_m) <= 10 
        THEN 10
        WHEN user_depth_m > be.depth_max_m 
          AND (user_depth_m - be.depth_max_m) <= 20 
        THEN 10
        ELSE 5
      END as depth_score
    FROM biogeochemical_enhancements be
  )
  SELECT
    be.species_id,
    be.name_en,
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
      COALESCE(sds.substrate_score, 12)::integer +
      COALESCE(sds.depth_score, 12)::integer +
      (CASE
        WHEN DATE(be.latest_capture) = target_date THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 14
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 12
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 10
        ELSE 6
      END)::integer +
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 4 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND scientific_name IS NOT NULL) THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio_en IS NOT NULL) THEN 1 ELSE 0 END)
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
    COALESCE(sds.substrate_score, 12)::integer as substrate_score,
    COALESCE(sds.depth_score, 12)::integer as depth_score,
    (CASE
      WHEN DATE(be.latest_capture) = target_date THEN 15
      WHEN DATE(be.latest_capture) >= target_date - 1 THEN 14
      WHEN DATE(be.latest_capture) >= target_date - 3 THEN 12
      WHEN DATE(be.latest_capture) >= target_date - 7 THEN 10
      ELSE 6
    END)::integer as freshness_score,
    (
      (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 4 ELSE 0 END) +
      (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND scientific_name IS NOT NULL) THEN 2 ELSE 0 END) +
      (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio_en IS NOT NULL) THEN 1 ELSE 0 END)
    )::integer as completeness_score
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN substrate_depth_scores sds ON be.species_id = sds.species_id
  ORDER BY confidence DESC, be.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Fixed substrate scoring: 25pts=exact match, 15pts=generalist (3+ substrates), 5pts=mismatch. Depth scoring: 20pts=optimal, 15pts=tolerated, 5-10pts=marginal.';
