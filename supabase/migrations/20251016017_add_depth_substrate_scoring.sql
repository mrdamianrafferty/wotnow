-- Add depth and substrate scoring to confidence predictions
-- This migration adds:
-- 1. Depth preference columns to species table
-- 2. Enhanced RPC function with lat/lon parameters for dynamic substrate/depth scoring

-- ============================================================================
-- 1. ADD DEPTH COLUMNS TO SPECIES TABLE
-- ============================================================================

ALTER TABLE species ADD COLUMN IF NOT EXISTS depth_min_m INTEGER DEFAULT 0;
ALTER TABLE species ADD COLUMN IF NOT EXISTS depth_max_m INTEGER DEFAULT 100;
ALTER TABLE species ADD COLUMN IF NOT EXISTS depth_optimal_min_m INTEGER;
ALTER TABLE species ADD COLUMN IF NOT EXISTS depth_optimal_max_m INTEGER;

COMMENT ON COLUMN species.depth_min_m IS 'Minimum depth tolerance in meters (absolute minimum)';
COMMENT ON COLUMN species.depth_max_m IS 'Maximum depth tolerance in meters (absolute maximum)';
COMMENT ON COLUMN species.depth_optimal_min_m IS 'Optimal depth range minimum in meters (where species thrives)';
COMMENT ON COLUMN species.depth_optimal_max_m IS 'Optimal depth range maximum in meters (where species thrives)';

-- ============================================================================
-- 2. CREATE ENHANCED PREDICTION FUNCTION WITH LAT/LON SUPPORT
-- ============================================================================

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
  substrate_depth_scores AS (
    -- Calculate substrate and depth scores based on user location
    SELECT
      be.species_id,
      -- Substrate scoring (0-25 pts)
      CASE
        WHEN user_substrate IS NULL THEN 12  -- Default when no substrate provided
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
        ) THEN 25  -- Optimal substrate match
        WHEN EXISTS (
          SELECT 1
          FROM species_substrates ss
          WHERE ss.species_code = be.species_code
            AND ss.has_mixed = true  -- Generalist, tolerates most substrates
        ) THEN 15  -- Tolerated substrate
        ELSE 5  -- Poor substrate match
      END as substrate_score,
      -- Depth scoring (0-20 pts)
      CASE
        WHEN user_depth_m IS NULL THEN 12  -- Default when no depth provided
        WHEN be.depth_optimal_min_m IS NOT NULL 
          AND be.depth_optimal_max_m IS NOT NULL 
          AND user_depth_m BETWEEN be.depth_optimal_min_m AND be.depth_optimal_max_m 
        THEN 20  -- Optimal depth
        WHEN user_depth_m BETWEEN be.depth_min_m AND be.depth_max_m 
        THEN 15  -- Tolerated depth
        WHEN user_depth_m < be.depth_min_m 
          AND (be.depth_min_m - user_depth_m) <= 10 
        THEN 10  -- Slightly too shallow
        WHEN user_depth_m > be.depth_max_m 
          AND (user_depth_m - be.depth_max_m) <= 20 
        THEN 10  -- Slightly too deep
        ELSE 5  -- Poor depth match
      END as depth_score
    FROM biogeochemical_enhancements be
  )
  SELECT
    be.species_id,
    be.name_en,
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
      COALESCE(sds.substrate_score, 12)::integer +
      -- Depth scoring (0-20)
      COALESCE(sds.depth_score, 12)::integer +
      -- Data freshness scoring (0-15, reduced from 20 to make room for depth)
      (CASE
        WHEN DATE(be.latest_capture) = target_date THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 14
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 12
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 10
        ELSE 6
      END)::integer +
      -- Species data completeness (0-15)
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.species_code = be.species_code) THEN 4 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND scientific_name IS NOT NULL) THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio_en IS NOT NULL) THEN 1 ELSE 0 END)
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

COMMENT ON FUNCTION get_environmental_predictions_enhanced IS 'Enhanced confidence scoring with lat/lon-based substrate and depth scoring. Accepts optional user_lat, user_lon, user_substrate (from EMODnet), and user_depth_m (from EMODnet bathymetry).';

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Check depth columns were added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'species'
      AND column_name = 'depth_min_m'
  ) THEN
    RAISE EXCEPTION 'depth_min_m column not added to species table';
  END IF;
  
  RAISE NOTICE '✅ Depth columns added successfully';
END;
$$;
