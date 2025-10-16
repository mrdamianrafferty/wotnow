-- Fix ambiguous column reference in bio_band_matches CTE

DROP FUNCTION IF EXISTS get_environmental_predictions_basic(text, date);

CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  target_rectangle text,
  target_date date
)
RETURNS TABLE (
  species_id uuid,
  name_en text,
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
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
      s.name_en,
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
  confidence_scores AS (
    SELECT
      be.species_id,
      be.name_en,
      be.ices_rectangle,
      be.prediction_date,
      be.env_temperature,
      be.latest_capture,
      -- Bio-band scoring (0-30): Sum of individual parameter scores
      LEAST(30, COALESCE(
        COALESCE(bbm.chlorophyll_score, 0) + 
        COALESCE(bbm.oxygen_score, 0) + 
        COALESCE(bbm.salinity_score, 0),
        15  -- Default if no bio_bands data
      ))::integer as bio_band_score,
      
      -- Temperature scoring (0-25): Check surface_temperature parameter (snake_case!)
      CASE 
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
            AND sbb.parameter = 'surface_temperature'  -- FIXED: Use snake_case
            AND bbt.level = ANY(sbb.happy_bands)
        ) THEN 25
        WHEN be.env_temperature >= 8 AND be.env_temperature <= 18 THEN 20
        WHEN be.env_temperature >= 5 AND be.env_temperature <= 22 THEN 15
        ELSE 10
      END::integer as temp_score,
      
      -- Substrate scoring (0-20): Placeholder - needs lat/lon implementation
      12::integer as substrate_score,
      
      -- Data freshness scoring (0-20)
      CASE
        WHEN DATE(be.latest_capture) = target_date THEN 20
        WHEN DATE(be.latest_capture) >= target_date - 1 THEN 18
        WHEN DATE(be.latest_capture) >= target_date - 3 THEN 15
        WHEN DATE(be.latest_capture) >= target_date - 7 THEN 12
        ELSE 8
      END::integer as freshness_score,
      
      -- Species data completeness (0-15)
      (
        (CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_bio_bands.species_id = be.species_id) THEN 6 ELSE 0 END) +
        (CASE WHEN EXISTS (
          SELECT 1 FROM species_substrates ss 
          JOIN species sp ON sp.species_code = ss.species_code 
          WHERE sp.id = be.species_id
        ) THEN 4 ELSE 0 END) +
        (CASE WHEN be.name_en IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND scientific_name IS NOT NULL) THEN 2 ELSE 0 END) +
        (CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio IS NOT NULL) THEN 1 ELSE 0 END)
      )::integer as completeness_score
    FROM biogeochemical_enhancements be
    LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  )
  SELECT
    cs.species_id,
    cs.name_en,
    cs.ices_rectangle,
    cs.prediction_date,
    LEAST(100, GREATEST(0, 
      cs.bio_band_score + 
      cs.temp_score + 
      cs.substrate_score + 
      cs.freshness_score + 
      cs.completeness_score
    ))::integer as confidence,
    cs.bio_band_score,
    cs.temp_score,
    cs.substrate_score,
    cs.freshness_score,
    cs.completeness_score
  FROM confidence_scores cs
  ORDER BY confidence DESC, cs.name_en;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION get_environmental_predictions_basic IS 'Enhanced confidence scoring with species-specific bio-band matching. Fixed parameter name mismatch (surface_temperature vs surfaceTemperature), uses 7-day window for environmental data, and fixed ambiguous column references.';
