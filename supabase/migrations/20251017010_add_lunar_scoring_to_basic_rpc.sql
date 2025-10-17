-- Enhancement 4: Lunar (Moon Phase) Scoring
-- Add moon phase awareness to species predictions
-- Uses species.lunar_weight and calculate_moon_phase() function

-- First, let's check which RPC function currently exists and what it returns
-- We need to add lunar_score and moon_phase fields to the return type

-- Update BASIC prediction function with lunar scoring
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
  light_score integer,
  lunar_score integer,       -- NEW: Lunar scoring
  freshness_score integer,
  completeness_score integer,
  moon_phase text,            -- NEW: Moon phase name
  moon_illumination numeric   -- NEW: Moon illumination percentage
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
  moon_data AS (
    SELECT * FROM calculate_moon_phase(target_date)
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
      s.temp_opt_c,
      s.temp_weight,
      s.lunar_weight,         -- NEW: Query lunar weight
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
  temperature_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.env_temperature BETWEEN be.temp_opt_c[1] AND be.temp_opt_c[2] THEN 25
        WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 2) AND (be.temp_opt_c[2] + 2) THEN 20
        WHEN be.env_temperature BETWEEN (be.temp_opt_c[1] - 5) AND (be.temp_opt_c[2] + 5) THEN 12
        ELSE 5
      END as temp_score
    FROM biogeochemical_enhancements be
  ),
  light_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN time_category IN ('dawn', 'dusk') THEN
          CASE
            WHEN COALESCE(be.light_weight, 0.5) >= 0.75 THEN 15
            WHEN COALESCE(be.light_weight, 0.5) >= 0.5 THEN 10
            ELSE 8
          END
        WHEN time_category = 'night' THEN
          CASE
            WHEN COALESCE(be.light_weight, 0.5) <= 0.25 THEN 12
            WHEN COALESCE(be.light_weight, 0.5) <= 0.5 THEN 8
            ELSE 5
          END
        ELSE -- day
          CASE
            WHEN COALESCE(be.light_weight, 0.5) < 0.5 THEN 10
            WHEN COALESCE(be.light_weight, 0.5) >= 0.5 THEN 12
            ELSE 8
          END
      END as light_score
    FROM biogeochemical_enhancements be
  ),
  lunar_matches AS (
    SELECT
      be.species_id,
      ROUND(
        CASE
          -- Full moon: Best for nocturnal and visual predators
          WHEN md.phase_category = 'full_moon' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'weak' THEN 15  -- Nocturnal species love full moon
              WHEN be.diurnal_sensitivity = 'moderate' THEN 10
              ELSE 7  -- Diurnal species get some benefit
            END
          
          -- New moon: Best for ambush predators in darker conditions
          WHEN md.phase_category = 'new_moon' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'strong' THEN 12  -- Diurnal species can hunt in darkness
              WHEN be.diurnal_sensitivity = 'moderate' THEN 8
              ELSE 10  -- Nocturnal get moderate benefit
            END
          
          -- Quarter moons: Moderate benefit for transitional feeders
          WHEN md.phase_category = 'quarter' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'moderate' THEN 10
              ELSE 7
            END
          
          -- Crescent/Gibbous: Standard benefit
          ELSE 6
        END * COALESCE(be.lunar_weight, 0.05)
      )::integer as lunar_score
    FROM biogeochemical_enhancements be
    CROSS JOIN moon_data md
  ),
  freshness_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN DATE(be.latest_capture) = target_date THEN 15
        WHEN DATE(be.latest_capture) >= target_date - INTERVAL '2 days' THEN 12
        WHEN DATE(be.latest_capture) >= target_date - INTERVAL '5 days' THEN 8
        WHEN DATE(be.latest_capture) >= target_date - INTERVAL '10 days' THEN 5
        ELSE 2
      END as freshness_score
    FROM biogeochemical_enhancements be
  ),
  completeness_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.env_temperature IS NOT NULL
         AND be.env_chlorophyll IS NOT NULL
         AND be.env_oxygen IS NOT NULL
         AND be.env_salinity IS NOT NULL THEN 10
        WHEN be.env_temperature IS NOT NULL
         AND be.env_chlorophyll IS NOT NULL THEN 7
        WHEN be.env_temperature IS NOT NULL THEN 5
        ELSE 2
      END as completeness_score
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
    LEAST(
      (
        ((bbm.chlorophyll_score + bbm.oxygen_score + bbm.salinity_score) + 
         tm.temp_score + 
         lm.light_score + 
         lnm.lunar_score +
         fm.freshness_score + 
         cm.completeness_score
        )::numeric / 105 * 100  -- Max: 30+25+15+10+15+10 = 105
      )::integer,
      100
    ) as confidence,
    (bbm.chlorophyll_score + bbm.oxygen_score + bbm.salinity_score)::integer as bio_band_score,
    tm.temp_score::integer,
    lm.light_score::integer,
    lnm.lunar_score::integer,
    fm.freshness_score::integer,
    cm.completeness_score::integer,
    md.phase_name as moon_phase,
    ROUND(md.illumination, 2) as moon_illumination
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN temperature_matches tm ON be.species_id = tm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN lunar_matches lnm ON be.species_id = lnm.species_id
  LEFT JOIN freshness_matches fm ON be.species_id = fm.species_id
  LEFT JOIN completeness_matches cm ON be.species_id = cm.species_id
  CROSS JOIN moon_data md
  ORDER BY confidence DESC, be.name_en;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_environmental_predictions_basic(text, date) TO authenticated, anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Lunar scoring integrated into basic RPC!';
  RAISE NOTICE 'Added fields: lunar_score, moon_phase, moon_illumination';
  RAISE NOTICE '';
  RAISE NOTICE 'Scoring logic:';
  RAISE NOTICE '  • Full moon + nocturnal: 15 * lunar_weight';
  RAISE NOTICE '  • New moon + diurnal: 12 * lunar_weight';
  RAISE NOTICE '  • Quarter + moderate: 10 * lunar_weight';
  RAISE NOTICE '  • Default: 6-7 * lunar_weight';
  RAISE NOTICE '';
  RAISE NOTICE 'Max confidence calculation updated: 30+25+15+10+15+10 = 105 points';
END $$;
