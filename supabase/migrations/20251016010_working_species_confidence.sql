-- WORKING species-specific confidence scoring
-- Date: 16 October 2025
-- Fixes: Query recent data window (not exact date), simplified bio_bands matching

CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  target_rectangle TEXT,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  species_name TEXT,
  base_score NUMERIC,
  baitfish_index NUMERIC,
  visibility_index NUMERIC,
  habitat_index NUMERIC,
  bio_multiplier NUMERIC,
  final_score NUMERIC,
  confidence NUMERIC,
  has_bio_data BOOLEAN,
  species_code TEXT,
  scientific_name TEXT,
  rationale JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
  data_window_start DATE := target_date - INTERVAL '7 days';
BEGIN
  RETURN QUERY
  WITH 
  -- Get most recent environmental data (within 7-day window)
  recent_conditions AS (
    SELECT 
      AVG(chlorophyll_mg_m3) as avg_chlorophyll,
      AVG(dissolved_oxygen_mg_l) as avg_oxygen,
      AVG(salinity_psu) as avg_salinity,
      AVG(sea_temp_c) as avg_temperature,
      MAX(DATE(captured_at)) as latest_date,
      COUNT(*) as snapshot_count
    FROM findr_conditions_snapshots
    WHERE rectangle_code = target_rectangle
      AND DATE(captured_at) BETWEEN data_window_start AND target_date
  ),
  species_base_scores AS (
    SELECT 
      s.id as species_id,
      s.scientific_name,
      s.name_en,
      s.species_code,
      (CASE 
        WHEN s.name_en IN ('Mackerel', 'Bass', 'Pollock') THEN 70
        WHEN s.name_en IN ('Cod', 'Whiting', 'Plaice') THEN 65
        ELSE 55
      END)::numeric as base_prediction_score
    FROM species s
    WHERE s.name_en IS NOT NULL
    ORDER BY s.name_en
    LIMIT 30
  ),
  biogeochemical_enhancements AS (
    SELECT 
      sbs.*,
      rc.avg_chlorophyll,
      rc.avg_oxygen,
      rc.avg_salinity,
      rc.avg_temperature,
      rc.latest_date as data_date,
      (rc.snapshot_count > 0) as has_bio_data,
      -- Baitfish index
      COALESCE(rc.avg_chlorophyll, 0.5) * 10 as baitfish_index,
      -- Visibility index
      COALESCE(rc.avg_salinity, 35) / 3.5 as visibility_index,
      -- Habitat quality
      COALESCE(rc.avg_oxygen, 8) as habitat_index
    FROM species_base_scores sbs
    CROSS JOIN recent_conditions rc
  ),
  confidence_scores AS (
    SELECT 
      be.*,
      
      -- COMPONENT 1: Species-specific bio-band matching (0-30 points)
      (
        -- Chlorophyll match
        CASE 
          WHEN be.avg_chlorophyll IS NULL THEN 5
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'chlorophyll'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'chlorophyll'
                  AND be.avg_chlorophyll >= bbt.threshold
                  AND bbt.level = ANY(sbb.happy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 10  -- Happy band match
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'chlorophyll'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'chlorophyll'
                  AND be.avg_chlorophyll >= bbt.threshold
                  AND bbt.level = ANY(sbb.unhappy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 2  -- Unhappy band match
          ELSE 5  -- No preference or neutral
        END +
        -- Oxygen match
        CASE 
          WHEN be.avg_oxygen IS NULL THEN 5
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'oxygen'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'oxygen'
                  AND be.avg_oxygen >= bbt.threshold
                  AND bbt.level = ANY(sbb.happy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 10
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'oxygen'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'oxygen'
                  AND be.avg_oxygen >= bbt.threshold
                  AND bbt.level = ANY(sbb.unhappy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 2
          ELSE 5
        END +
        -- Salinity match
        CASE 
          WHEN be.avg_salinity IS NULL THEN 5
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'salinity'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'salinity'
                  AND be.avg_salinity >= bbt.threshold
                  AND bbt.level = ANY(sbb.happy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 10
          WHEN EXISTS (
            SELECT 1 FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id 
              AND sbb.parameter = 'salinity'
              AND EXISTS (
                SELECT 1 FROM bio_bands_thresholds bbt
                WHERE bbt.parameter = 'salinity'
                  AND be.avg_salinity >= bbt.threshold
                  AND bbt.level = ANY(sbb.unhappy_bands)
                ORDER BY bbt.threshold DESC
                LIMIT 1
              )
          ) THEN 2
          ELSE 5
        END
      )::integer as bio_band_score,
      
      -- COMPONENT 2: Temperature match (0-25 points)
      CASE 
        WHEN be.avg_temperature IS NULL THEN 12
        WHEN EXISTS (
          SELECT 1 FROM species_bio_bands sbb
          WHERE sbb.species_id = be.species_id 
            AND sbb.parameter = 'surfaceTemperature'
            AND EXISTS (
              SELECT 1 FROM bio_bands_thresholds bbt
              WHERE bbt.parameter = 'surfaceTemperature'
                AND be.avg_temperature >= bbt.threshold
                AND bbt.level = ANY(sbb.happy_bands)
              ORDER BY bbt.threshold DESC
              LIMIT 1
            )
        ) THEN 25
        WHEN EXISTS (
          SELECT 1 FROM species_bio_bands sbb
          WHERE sbb.species_id = be.species_id 
            AND sbb.parameter = 'surfaceTemperature'
            AND EXISTS (
              SELECT 1 FROM bio_bands_thresholds bbt
              WHERE bbt.parameter = 'surfaceTemperature'
                AND be.avg_temperature >= bbt.threshold
                AND bbt.level = ANY(sbb.unhappy_bands)
              ORDER BY bbt.threshold DESC
              LIMIT 1
            )
        ) THEN 8
        ELSE 
          -- Generic temperature scoring for species without preferences
          CASE 
            WHEN be.avg_temperature BETWEEN 12 AND 18 THEN 20
            WHEN be.avg_temperature BETWEEN 8 AND 22 THEN 15
            WHEN be.avg_temperature BETWEEN 5 AND 25 THEN 12
            ELSE 8
          END
      END::integer as temp_score,
      
      -- COMPONENT 3: Substrate preference (0-20 points) - placeholder for lat/lon
      (
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.name_en = be.name_en)
          THEN 12  -- Has preferences (will improve with lat/lon)
          ELSE 10  -- No data
        END
      )::integer as substrate_score,
      
      -- COMPONENT 4: Data freshness (0-20 points)
      CASE
        WHEN be.data_date IS NULL THEN 8
        WHEN (target_date - be.data_date) = 0 THEN 20
        WHEN (target_date - be.data_date) = 1 THEN 18
        WHEN (target_date - be.data_date) BETWEEN 2 AND 3 THEN 15
        WHEN (target_date - be.data_date) BETWEEN 4 AND 7 THEN 12
        ELSE 8
      END::integer as freshness_score,
      
      -- COMPONENT 5: Species data completeness (0-15 points)
      (
        CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_id = be.species_id LIMIT 1) THEN 6 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM species_substrates WHERE name_en = be.name_en LIMIT 1) THEN 4 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio_en IS NOT NULL AND playful_bio_en != '') THEN 3 ELSE 0 END +
        CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END
      )::integer as completeness_score
      
    FROM biogeochemical_enhancements be
  ),
  scored_predictions AS (
    SELECT 
      cs.*, 
      1.0 + ((cs.baitfish_index + cs.visibility_index + cs.habitat_index) / 30.0 * 0.5) as bio_multiplier,
      LEAST(100, GREATEST(35, 
        cs.bio_band_score + cs.temp_score + cs.substrate_score + 
        cs.freshness_score + cs.completeness_score
      ))::numeric as total_confidence
    FROM confidence_scores cs
  )
  SELECT 
    sp.name_en::text, 
    sp.base_prediction_score, 
    sp.baitfish_index, 
    sp.visibility_index, 
    sp.habitat_index, 
    sp.bio_multiplier,
    (sp.base_prediction_score * sp.bio_multiplier)::numeric as final_score, 
    sp.total_confidence as confidence, 
    sp.has_bio_data,
    sp.species_code::text, 
    sp.scientific_name::text,
    jsonb_build_array(
      CASE WHEN sp.baitfish_index > 7 THEN 'High chlorophyll levels indicate abundant baitfish' 
           WHEN sp.baitfish_index > 4 THEN 'Moderate baitfish activity detected' 
           ELSE 'Baseline feeding conditions present' END,
      CASE WHEN sp.visibility_index > 8 THEN 'Excellent water clarity for hunting' 
           WHEN sp.visibility_index > 6 THEN 'Good water conditions for activity' 
           ELSE 'Stable water conditions' END,
      CASE WHEN sp.habitat_index > 9 THEN 'Optimal oxygen levels support high activity' 
           WHEN sp.habitat_index > 7 THEN 'Healthy oxygen levels promote feeding' 
           ELSE 'Adequate habitat conditions' END,
      CASE WHEN sp.bio_multiplier > 1.3 THEN 'Environmental conditions highly favorable' 
           WHEN sp.bio_multiplier > 1.15 THEN 'Conditions conducive to good catches' 
           ELSE 'Standard conditions for this species' END,
      'Confidence: Bio-match ' || sp.bio_band_score || '/30, Temp ' || sp.temp_score || 
      '/25, Habitat ' || sp.substrate_score || '/20, Fresh ' || sp.freshness_score || 
      '/20, Profile ' || sp.completeness_score || '/15'
    ) as rationale
  FROM scored_predictions sp
  ORDER BY final_score DESC, sp.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Species-specific confidence scoring using 7-day data window:
- Queries recent data (up to 7 days back) to handle split snapshots
- Bio-match: Species happy/unhappy bands vs actual conditions
- Temperature: Species thermal preferences
- Substrate: Species habitat (placeholder for lat/lon enhancement)
- Freshness: Data recency weighting
- Completeness: Species profile quality
Returns varied confidence scores per species based on preferences.';
