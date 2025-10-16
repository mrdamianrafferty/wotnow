-- Species-specific enhanced confidence scoring
-- Date: 16 October 2025
-- Uses actual species preferences to calculate varied confidence scores

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
BEGIN
  RETURN QUERY
  WITH species_base_scores AS (
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
      COALESCE((SELECT AVG(chlorophyll_mg_m3)::numeric FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND chlorophyll_mg_m3 IS NOT NULL), 0.5) * 10 as baitfish_index,
      COALESCE((SELECT AVG(salinity_psu)::numeric FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND salinity_psu IS NOT NULL), 35) / 3.5 as visibility_index,
      COALESCE((SELECT AVG(dissolved_oxygen_mg_l)::numeric FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND dissolved_oxygen_mg_l IS NOT NULL), 8) as habitat_index,
      (SELECT AVG(chlorophyll_mg_m3) FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND chlorophyll_mg_m3 IS NOT NULL) as env_chlorophyll,
      (SELECT AVG(dissolved_oxygen_mg_l) FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND dissolved_oxygen_mg_l IS NOT NULL) as env_oxygen,
      (SELECT AVG(salinity_psu) FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND salinity_psu IS NOT NULL) as env_salinity,
      (SELECT AVG(sea_temp_c) FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date AND sea_temp_c IS NOT NULL) as env_temperature,
      (SELECT MAX(DATE(captured_at)) FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) <= target_date) as data_date,
      EXISTS (SELECT 1 FROM findr_conditions_snapshots WHERE rectangle_code = target_rectangle AND DATE(captured_at) = target_date) as has_bio_data
    FROM species_base_scores sbs
  ),
  confidence_scores AS (
    SELECT be.*,
      -- SPECIES-SPECIFIC Bio-band scoring (0-30 points)
      -- Check if this species has bio_bands and if they match current conditions
      (
        SELECT COALESCE(
          (
            -- Count how many parameters are in happy bands
            SELECT COUNT(*) * 10 
            FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id
              AND (
                (sbb.parameter = 'chlorophyll' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'chlorophyll' 
                    AND be.env_chlorophyll >= bbt.threshold
                    AND bbt.level = ANY(sbb.happy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
                OR
                (sbb.parameter = 'oxygen' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'oxygen'
                    AND be.env_oxygen >= bbt.threshold
                    AND bbt.level = ANY(sbb.happy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
                OR
                (sbb.parameter = 'salinity' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'salinity'
                    AND be.env_salinity >= bbt.threshold
                    AND bbt.level = ANY(sbb.happy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
              )
          ) +
          (
            -- Subtract points for unhappy bands
            SELECT COUNT(*) * -5
            FROM species_bio_bands sbb
            WHERE sbb.species_id = be.species_id
              AND (
                (sbb.parameter = 'chlorophyll' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'chlorophyll'
                    AND be.env_chlorophyll >= bbt.threshold
                    AND bbt.level = ANY(sbb.unhappy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
                OR
                (sbb.parameter = 'oxygen' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'oxygen'
                    AND be.env_oxygen >= bbt.threshold
                    AND bbt.level = ANY(sbb.unhappy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
                OR
                (sbb.parameter = 'salinity' AND EXISTS (
                  SELECT 1 FROM bio_bands_thresholds bbt 
                  WHERE bbt.parameter = 'salinity'
                    AND be.env_salinity >= bbt.threshold
                    AND bbt.level = ANY(sbb.unhappy_bands)
                  ORDER BY bbt.threshold DESC LIMIT 1
                ))
              )
          ),
        15)  -- Default if no bio_bands data
      )::integer as bio_band_score,
      
      -- SPECIES-SPECIFIC Temperature scoring (0-25 points)
      CASE 
        WHEN be.env_temperature IS NULL THEN 15
        WHEN EXISTS (
          SELECT 1 FROM species_bio_bands sbb
          JOIN bio_bands_thresholds bbt ON bbt.parameter = 'surfaceTemperature'
          WHERE sbb.species_id = be.species_id
            AND sbb.parameter = 'surfaceTemperature'
            AND be.env_temperature >= bbt.threshold
            AND bbt.level = ANY(sbb.happy_bands)
          ORDER BY bbt.threshold DESC LIMIT 1
        ) THEN 25  -- Perfect temperature
        WHEN EXISTS (
          SELECT 1 FROM species_bio_bands sbb
          JOIN bio_bands_thresholds bbt ON bbt.parameter = 'surfaceTemperature'
          WHERE sbb.species_id = be.species_id
            AND sbb.parameter = 'surfaceTemperature'
            AND be.env_temperature >= bbt.threshold
            AND bbt.level = ANY(sbb.unhappy_bands)
          ORDER BY bbt.threshold DESC LIMIT 1
        ) THEN 10  -- Poor temperature
        ELSE 
          -- Fallback to generic temperature ranges if no species data
          CASE 
            WHEN be.env_temperature BETWEEN 10 AND 20 THEN 20
            WHEN be.env_temperature BETWEEN 5 AND 25 THEN 15
            ELSE 10
          END
      END::integer as temp_score,
      
      -- SPECIES-SPECIFIC Substrate scoring (0-20 points)
      -- Note: Rectangle-level only, will improve with lat/lon
      (
        SELECT CASE
          WHEN EXISTS (SELECT 1 FROM species_substrates ss WHERE ss.name_en = be.name_en)
          THEN 
            -- Has substrate preferences, give mid-range score for now
            -- TODO: Add lat/lon-based substrate matching
            12
          ELSE 10  -- No substrate data
        END
      )::integer as substrate_score,
      
      -- Data freshness (0-20 points)
      CASE
        WHEN be.data_date IS NULL THEN 10
        WHEN (target_date - be.data_date) = 0 THEN 20
        WHEN (target_date - be.data_date) = 1 THEN 18
        WHEN (target_date - be.data_date) BETWEEN 2 AND 3 THEN 15
        WHEN (target_date - be.data_date) BETWEEN 4 AND 7 THEN 12
        WHEN (target_date - be.data_date) BETWEEN 8 AND 14 THEN 8
        ELSE 5
      END::integer as freshness_score,
      
      -- Species completeness (0-15 points)
      (
        CASE WHEN EXISTS (SELECT 1 FROM species_bio_bands WHERE species_id = be.species_id LIMIT 1) THEN 6 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM species_substrates WHERE name_en = be.name_en LIMIT 1) THEN 4 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM species WHERE id = be.species_id AND playful_bio_en IS NOT NULL AND playful_bio_en != '') THEN 3 ELSE 0 END +
        CASE WHEN be.scientific_name IS NOT NULL THEN 2 ELSE 0 END
      )::integer as completeness_score
    FROM biogeochemical_enhancements be
  ),
  scored_predictions AS (
    SELECT cs.*, 
      1.0 + ((cs.baitfish_index + cs.visibility_index + cs.habitat_index) / 30.0 * 0.5) as bio_multiplier,
      LEAST(100, GREATEST(35, cs.bio_band_score + cs.temp_score + cs.substrate_score + cs.freshness_score + cs.completeness_score))::numeric as total_confidence
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
      CASE WHEN sp.baitfish_index > 7 THEN 'High chlorophyll levels indicate abundant baitfish in the area' WHEN sp.baitfish_index > 4 THEN 'Moderate baitfish activity detected from water conditions' ELSE 'Baseline feeding conditions present' END,
      CASE WHEN sp.visibility_index > 8 THEN 'Excellent water clarity for hunting and feeding' WHEN sp.visibility_index > 6 THEN 'Good water conditions for fish activity' ELSE 'Stable water conditions' END,
      CASE WHEN sp.habitat_index > 9 THEN 'Optimal oxygen levels support high fish activity' WHEN sp.habitat_index > 7 THEN 'Healthy oxygen levels promote feeding' ELSE 'Adequate habitat conditions' END,
      CASE WHEN sp.bio_multiplier > 1.3 THEN 'Environmental conditions are highly favorable' WHEN sp.bio_multiplier > 1.15 THEN 'Conditions are conducive to good catches' ELSE 'Standard conditions for this species' END,
      'Confidence: Bio-match ' || sp.bio_band_score || '/30, Temp ' || sp.temp_score || '/25, Substrate ' || sp.substrate_score || '/20, Fresh ' || sp.freshness_score || '/20, Data ' || sp.completeness_score || '/15'
    ) as rationale
  FROM scored_predictions sp
  ORDER BY final_score DESC, sp.name_en;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 
'Species-specific confidence scoring (0-100):
- Bio-match (0-30): Compares species happy/unhappy bands against actual conditions
- Temperature (0-25): Species thermal preference matching
- Substrate (0-20): Species habitat preferences (rectangle-level, will improve with lat/lon)
- Freshness (0-20): Data recency
- Completeness (0-15): Species profile quality
Each species gets unique score based on its preferences vs current conditions.';
