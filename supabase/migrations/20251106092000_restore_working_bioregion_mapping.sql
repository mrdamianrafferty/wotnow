-- Restore working biogeographic region mapping
-- Date: 2025-11-06 09:20
--
-- ROOT CAUSE ANALYSIS:
-- - Previous November 6 migrations changed from granular regions ('Atlantic', 'North Sea', etc.)
--   to broad 'NE_Atlantic' which doesn't match species.biogeographic_regions data
-- - They also added s.guild column reference which doesn't exist in species table
-- - They switched from findr_conditions_snapshots to findr_conditions_latest
--
-- SOLUTION:
-- - Use findr_conditions_latest (current table structure)
-- - Map to GRANULAR regions that match species data (like October 28 migration)
-- - Remove s.guild references (column doesn't exist)
-- - Remove bio band scoring that references non-existent tables
-- - Use simplified scoring logic that works with current schema

DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced CASCADE;

CREATE OR REPLACE FUNCTION get_environmental_predictions_enhanced(
  target_rectangle text,
  target_date date,
  user_lat numeric,
  user_lon numeric,
  substrate_type text DEFAULT NULL,
  depth_meters numeric DEFAULT NULL,
  current_wind_speed_ms numeric DEFAULT NULL,
  current_pressure_hpa numeric DEFAULT NULL,
  current_tide_stage text DEFAULT NULL,
  current_flow_speed_ms numeric DEFAULT NULL
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
  bite_score integer,
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
  depth_score integer,
  light_score integer,
  habitat_bonus integer,
  lunar_score integer,
  weather_score integer,
  freshness_score integer,
  completeness_score integer,
  moon_phase text,
  moon_illumination numeric,
  biogeographic_regions text[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_hour integer;
  time_category text;
  rectangle_region text;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

  -- Map to GRANULAR regions matching species.biogeographic_regions
  -- Based on working October 28 migration
  rectangle_region := CASE
    -- Mediterranean
    WHEN target_rectangle LIKE '07%' OR target_rectangle LIKE '08%' THEN 'Mediterranean'
    -- Atlantic and Bay of Biscay
    WHEN target_rectangle IN ('21D8', '21D9', '22D8', '22D9') THEN 'Atlantic'
    WHEN target_rectangle IN ('23E0', '23E1', '24E0', '24E1', '25E0', '25E1') THEN 'Bay of Biscay'
    WHEN target_rectangle LIKE '20%' OR target_rectangle LIKE '21%' THEN 'Atlantic'
    WHEN target_rectangle LIKE '22%' OR target_rectangle LIKE '23%' THEN 'Bay of Biscay'
    WHEN target_rectangle LIKE '24%' OR target_rectangle LIKE '25%' THEN 'IBI'
    WHEN target_rectangle LIKE '26%' OR target_rectangle LIKE '27%' THEN 'Bay of Biscay'
    WHEN target_rectangle LIKE '28%' OR target_rectangle LIKE '29%' THEN 'IBI'
    -- Celtic Sea and English Channel
    WHEN target_rectangle LIKE '30%' OR target_rectangle LIKE '31%' THEN 'Celtic Sea'
    WHEN target_rectangle LIKE '32%' OR target_rectangle LIKE '33%' THEN 'English Channel'
    WHEN target_rectangle LIKE '34%' THEN 'Celtic Sea'
    -- Irish Sea
    WHEN target_rectangle LIKE '35%' OR target_rectangle LIKE '36%' THEN 'Irish Sea'
    WHEN target_rectangle LIKE '37%' OR target_rectangle LIKE '38%' THEN 'Irish Sea'
    WHEN target_rectangle LIKE '39%' THEN 'Celtic Sea'
    -- North Sea
    WHEN target_rectangle LIKE '40%' OR target_rectangle LIKE '41%' THEN 'North Sea'
    WHEN target_rectangle LIKE '42%' OR target_rectangle LIKE '43%' THEN 'North Sea'
    WHEN target_rectangle LIKE '44%' OR target_rectangle LIKE '45%' THEN 'North Sea'
    WHEN target_rectangle LIKE '46%' OR target_rectangle LIKE '47%' THEN 'North Sea'
    WHEN target_rectangle LIKE '48%' OR target_rectangle LIKE '49%' THEN 'North Sea'
    -- Norwegian waters
    WHEN target_rectangle LIKE '50%' OR target_rectangle LIKE '51%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '52%' OR target_rectangle LIKE '53%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '54%' OR target_rectangle LIKE '55%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '56%' OR target_rectangle LIKE '57%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '58%' OR target_rectangle LIKE '59%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '60%' OR target_rectangle LIKE '61%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '62%' OR target_rectangle LIKE '63%' THEN 'Norwegian waters'
    WHEN target_rectangle LIKE '64%' OR target_rectangle LIKE '65%' THEN 'Norwegian waters'
    -- Default
    ELSE 'Atlantic'
  END;

  RETURN QUERY
  WITH recent_conditions AS (
    SELECT
      target_rectangle AS rectangle_code,
      rc.sea_temp_c,
      rc.chlorophyll_mg_m3,
      rc.dissolved_oxygen_mg_l,
      rc.salinity_psu,
      rc.captured_at as latest_capture
    FROM (SELECT 1) AS fallback
    LEFT JOIN findr_conditions_latest rc
      ON rc.rectangle_code = target_rectangle
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
      s.tide_weight,
      s.lunar_weight,
      s.wind_weight,
      s.pressure_weight,
      s.depth_min_m,
      s.depth_max_m,
      s.biogeographic_regions,
      rc.sea_temp_c,
      rc.chlorophyll_mg_m3,
      rc.dissolved_oxygen_mg_l,
      rc.salinity_psu,
      rc.latest_capture
    FROM species s
    CROSS JOIN recent_conditions rc
    WHERE s.name_en IS NOT NULL
      AND (
        s.biogeographic_regions IS NULL
        OR rectangle_region = ANY(s.biogeographic_regions)
      )
  ),
  bio_band_matches AS (
    SELECT
      be_outer.species_id,
      -- Simplified bioband scoring without guild (column doesn't exist)
      CASE
        WHEN be_outer.chlorophyll_mg_m3 BETWEEN 0.5 AND 2.0 THEN 35
        WHEN be_outer.chlorophyll_mg_m3 BETWEEN 0.3 AND 3.0 THEN 28
        WHEN be_outer.chlorophyll_mg_m3 IS NOT NULL THEN 20
        ELSE 15
      END as bio_band_score
    FROM biogeochemical_enhancements be_outer
  ),
  temp_matches AS (
    SELECT
      be.species_id,
      ROUND(
        CASE
          WHEN be.sea_temp_c IS NULL THEN 15
          WHEN be.temp_opt_c IS NULL OR array_length(be.temp_opt_c, 1) < 2 THEN 15
          WHEN be.sea_temp_c BETWEEN be.temp_opt_c[1] AND be.temp_opt_c[2] THEN 40
          WHEN be.sea_temp_c BETWEEN (be.temp_opt_c[1] - 2) AND (be.temp_opt_c[2] + 2) THEN 35
          WHEN be.sea_temp_c BETWEEN (be.temp_opt_c[1] - 4) AND (be.temp_opt_c[2] + 4) THEN 25
          ELSE 10
        END * COALESCE(be.temp_weight, 0.15)
      )::integer as temp_score
    FROM biogeochemical_enhancements be
  ),
  substrate_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN substrate_type IS NULL THEN 12
        WHEN
          (substrate_type = 'sand' AND ss.has_sand) OR
          (substrate_type = 'gravel' AND ss.has_gravel) OR
          (substrate_type = 'rock' AND ss.has_rock) OR
          (substrate_type = 'mud' AND ss.has_mud)
        THEN 25
        ELSE 10
      END as substrate_score
    FROM biogeochemical_enhancements be
    LEFT JOIN species_substrates ss ON be.species_code = ss.species_code
  ),
  depth_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN depth_meters IS NULL THEN 5
        WHEN depth_meters BETWEEN COALESCE(be.depth_min_m, 0) AND COALESCE(be.depth_max_m, 200) THEN 10
        WHEN depth_meters BETWEEN COALESCE(be.depth_min_m, 0) - 10 AND COALESCE(be.depth_max_m, 200) + 10 THEN 7
        ELSE 3
      END as depth_score
    FROM biogeochemical_enhancements be
  ),
  light_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.diurnal_sensitivity = 'strong' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 15
            WHEN time_category = 'night' THEN 12
            WHEN time_category = 'day' THEN 8
            ELSE 5
          END
        WHEN be.diurnal_sensitivity = 'moderate' THEN
          CASE
            WHEN time_category IN ('dawn', 'dusk') THEN 12
            WHEN time_category = 'day' THEN 10
            WHEN time_category = 'night' THEN 8
            ELSE 5
          END
        WHEN be.diurnal_sensitivity = 'weak' THEN 8
        ELSE 8
      END as light_score
    FROM biogeochemical_enhancements be
  ),
  habitat_bonuses AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.name_en IN ('Octopus', 'Pollock', 'Ballan Wrasse') THEN 10
        WHEN be.name_en IN ('Black Bream', 'Red Gurnard') THEN 8
        WHEN be.name_en IN ('Plaice', 'Turbot', 'Flounder') THEN 10
        WHEN be.name_en IN ('Dover Sole', 'Dab') THEN 8
        WHEN be.name_en IN ('European Eel', 'Thornback Ray') THEN 10
        WHEN be.name_en IN ('Ballan Wrasse', 'Pollock', 'Sea Bass') THEN 10
        WHEN be.name_en IN ('Pollock', 'Conger Eel', 'Bib') THEN 10
        ELSE 0
      END as habitat_bonus
    FROM biogeochemical_enhancements be
  ),
  lunar_matches AS (
    SELECT
      be.species_id,
      ROUND(
        CASE
          WHEN md.phase_name IN ('New Moon', 'Full Moon') THEN 10
          WHEN md.phase_name IN ('First Quarter', 'Last Quarter') THEN 8
          ELSE 6
        END * COALESCE(be.lunar_weight, 0.05)
      )::integer as lunar_score
    FROM biogeochemical_enhancements be
    CROSS JOIN moon_data md
  ),
  weather_matches AS (
    SELECT
      be.species_id,
      (
        CASE
          WHEN current_wind_speed_ms IS NULL THEN 7
          WHEN current_wind_speed_ms < 3 THEN 10
          WHEN current_wind_speed_ms < 7 THEN 8
          WHEN current_wind_speed_ms < 12 THEN 6
          ELSE 3
        END * COALESCE(be.wind_weight, 0.15) +
        CASE
          WHEN current_pressure_hpa IS NULL THEN 5
          WHEN current_pressure_hpa > 1020 THEN 10
          WHEN current_pressure_hpa > 1010 THEN 8
          WHEN current_pressure_hpa > 1000 THEN 6
          ELSE 4
        END * COALESCE(be.pressure_weight, 0.10)
      )::integer as weather_score
    FROM biogeochemical_enhancements be
  ),
  freshness_matches AS (
    SELECT
      be.species_id,
      CASE
        WHEN be.latest_capture IS NULL THEN 0
        WHEN be.latest_capture >= NOW() - INTERVAL '12 hours' THEN 10
        WHEN be.latest_capture >= NOW() - INTERVAL '24 hours' THEN 8
        WHEN be.latest_capture >= NOW() - INTERVAL '48 hours' THEN 6
        ELSE 3
      END as freshness_score
    FROM biogeochemical_enhancements be
  ),
  completeness_matches AS (
    SELECT
      be.species_id,
      (
        CASE WHEN be.sea_temp_c IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN be.chlorophyll_mg_m3 IS NOT NULL THEN 3 ELSE 0 END +
        CASE WHEN be.dissolved_oxygen_mg_l IS NOT NULL THEN 2 ELSE 0 END +
        CASE WHEN be.salinity_psu IS NOT NULL THEN 2 ELSE 0 END
      ) as completeness_score
    FROM biogeochemical_enhancements be
  )
  SELECT
    be.species_id,
    be.species_code,
    be.name_en,
    be.scientific_name,
    be.playful_bio_en,
    target_rectangle as ices_rectangle,
    target_date as prediction_date,
    LEAST(100, GREATEST(0,
      COALESCE(bbm.bio_band_score, 20) +
      COALESCE(tm.temp_score, 18) +
      COALESCE(sm.substrate_score, 12) +
      COALESCE(dm.depth_score, 5) +
      COALESCE(lm.light_score, 8) +
      COALESCE(hb.habitat_bonus, 0) +
      COALESCE(lum.lunar_score, 6) +
      COALESCE(wm.weather_score, 7) +
      COALESCE(fm.freshness_score, 0) +
      COALESCE(cm.completeness_score, 0)
    ))::integer as confidence,
    LEAST(100, GREATEST(0,
      COALESCE(bbm.bio_band_score, 20) +
      COALESCE(tm.temp_score, 18)
    ))::integer as bite_score,
    COALESCE(bbm.bio_band_score, 20) as bio_band_score,
    COALESCE(tm.temp_score, 18) as temp_score,
    COALESCE(sm.substrate_score, 12) as substrate_score,
    COALESCE(dm.depth_score, 5) as depth_score,
    COALESCE(lm.light_score, 8) as light_score,
    COALESCE(hb.habitat_bonus, 0) as habitat_bonus,
    COALESCE(lum.lunar_score, 6) as lunar_score,
    COALESCE(wm.weather_score, 7) as weather_score,
    COALESCE(fm.freshness_score, 0) as freshness_score,
    COALESCE(cm.completeness_score, 0) as completeness_score,
    md.phase_name as moon_phase,
    md.illumination as moon_illumination,
    be.biogeographic_regions
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN temp_matches tm ON be.species_id = tm.species_id
  LEFT JOIN substrate_matches sm ON be.species_id = sm.species_id
  LEFT JOIN depth_matches dm ON be.species_id = dm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN habitat_bonuses hb ON be.species_id = hb.species_id
  LEFT JOIN lunar_matches lum ON be.species_id = lum.species_id
  LEFT JOIN weather_matches wm ON be.species_id = wm.species_id
  LEFT JOIN freshness_matches fm ON be.species_id = fm.species_id
  LEFT JOIN completeness_matches cm ON be.species_id = cm.species_id
  CROSS JOIN moon_data md
  ORDER BY confidence DESC, bite_score DESC;
END;
$$;
