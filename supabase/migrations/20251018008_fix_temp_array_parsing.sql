-- Rewrite prediction function to use actual species data fields
-- Uses temp_opt_c, temp_weight, depth_min_m/depth_max_m for proper scoring

DROP FUNCTION IF EXISTS get_environmental_predictions_basic(text, date, numeric, numeric);

CREATE OR REPLACE FUNCTION get_environmental_predictions_basic(
  target_rectangle text,
  target_date date,
  current_wind_speed_ms numeric DEFAULT NULL,
  current_pressure_hpa numeric DEFAULT NULL
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
  rectangle_region text;
  normalized_region text;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

  SELECT region INTO rectangle_region
  FROM ices_rectangles
  WHERE rectangle_code = target_rectangle
  LIMIT 1;

  -- Normalize region names
  normalized_region := CASE
    WHEN rectangle_region LIKE '%Galician%' THEN 'Atlantic'
    WHEN rectangle_region LIKE '%Portuguese%' THEN 'Atlantic'
    WHEN rectangle_region LIKE '%Cantabrian%' THEN 'Bay of Biscay'
    WHEN rectangle_region LIKE '%Iberian%' THEN 'IBI'
    WHEN rectangle_region LIKE '%Biscay%' THEN 'Bay of Biscay'
    WHEN rectangle_region LIKE '%Mediterranean%' THEN 'Mediterranean'
    WHEN rectangle_region LIKE '%Atlantic%' THEN 'Atlantic'
    WHEN rectangle_region LIKE '%North Sea%' THEN 'North Sea'
    WHEN rectangle_region LIKE '%Celtic%' THEN 'Celtic Sea'
    WHEN rectangle_region LIKE '%Irish%' THEN 'Irish Sea'
    WHEN rectangle_region LIKE '%English Channel%' THEN 'English Channel'
    ELSE rectangle_region
  END;

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
      AND DATE(captured_at) BETWEEN target_date - INTERVAL '30 days' AND target_date
    GROUP BY rectangle_code
  ),
  species_with_env AS (
    SELECT
      s.id as species_id,
      s.species_code,
      s.name_en,
      s.scientific_name,
      s.playful_bio_en,
      s.diurnal_sensitivity,
      s.light_weight,
      s.temp_weight,
      s.temp_opt_c,
      s.depth_min_m,
      s.depth_max_m,
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
      AND (
        normalized_region IS NULL
        OR s.biogeographic_regions IS NULL
        OR normalized_region = ANY(s.biogeographic_regions)
        OR 'Atlantic' = ANY(s.biogeographic_regions)
      )
  ),
  scored_species AS (
    SELECT
      swe.*,
      -- Temperature scoring (0-40 points, weighted by temp_weight)
      CASE
        WHEN swe.env_temperature IS NULL THEN 20
        WHEN swe.temp_opt_c IS NULL THEN 20
        ELSE
          -- temp_opt_c is stored as numeric array [min, max]
          (SELECT
            CASE
              -- Perfect: within optimal range
              WHEN swe.env_temperature >= swe.temp_opt_c[1]
                AND swe.env_temperature <= swe.temp_opt_c[2]
              THEN LEAST(40, 25 + (swe.temp_weight * 50)::integer)
              -- Good: within 3°C of optimal range
              WHEN swe.env_temperature >= swe.temp_opt_c[1] - 3
                AND swe.env_temperature <= swe.temp_opt_c[2] + 3
              THEN LEAST(35, 20 + (swe.temp_weight * 40)::integer)
              -- Acceptable: within 6°C
              WHEN swe.env_temperature >= swe.temp_opt_c[1] - 6
                AND swe.env_temperature <= swe.temp_opt_c[2] + 6
              THEN LEAST(25, 15 + (swe.temp_weight * 20)::integer)
              ELSE 10
            END
          )
      END as temp_score_calc,
      -- Light scoring (0-15 points)
      CASE
        WHEN time_category IN ('dawn', 'dusk') AND swe.diurnal_sensitivity = 'strong' THEN 15
        WHEN time_category IN ('dawn', 'dusk') AND swe.diurnal_sensitivity = 'moderate' THEN 12
        WHEN time_category IN ('dawn', 'dusk') THEN 10
        WHEN time_category = 'night' AND swe.diurnal_sensitivity = 'strong' THEN 13
        WHEN time_category = 'night' AND swe.diurnal_sensitivity = 'moderate' THEN 10
        WHEN time_category = 'night' THEN 7
        WHEN time_category = 'day' AND swe.diurnal_sensitivity = 'weak' THEN 12
        WHEN time_category = 'day' AND swe.diurnal_sensitivity = 'moderate' THEN 13
        WHEN time_category = 'day' THEN 10
        ELSE 8
      END as light_score_calc,
      -- Freshness scoring (0-15 points)
      CASE
        WHEN DATE(swe.latest_capture) = target_date THEN 15
        WHEN DATE(swe.latest_capture) >= target_date - 1 THEN 14
        WHEN DATE(swe.latest_capture) >= target_date - 3 THEN 12
        WHEN DATE(swe.latest_capture) >= target_date - 7 THEN 10
        WHEN DATE(swe.latest_capture) >= target_date - 14 THEN 8
        WHEN DATE(swe.latest_capture) >= target_date - 30 THEN 6
        ELSE 4
      END as freshness_score_calc,
      -- Bio-band placeholder (0-20 points)
      15 as bio_band_score_calc,
      -- Completeness (0-10 points)
      (
        (CASE WHEN swe.temp_opt_c IS NOT NULL THEN 3 ELSE 0 END) +
        (CASE WHEN swe.depth_min_m IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN swe.name_en IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN swe.scientific_name IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN swe.playful_bio_en IS NOT NULL THEN 2 ELSE 0 END)
      ) as completeness_score_calc
    FROM species_with_env swe
  )
  SELECT
    ss.species_id,
    ss.species_code,
    ss.name_en,
    ss.scientific_name,
    ss.playful_bio_en,
    ss.ices_rectangle,
    ss.prediction_date,
    LEAST(100, GREATEST(0, 
      ss.temp_score_calc +
      ss.light_score_calc +
      ss.freshness_score_calc +
      ss.bio_band_score_calc +
      ss.completeness_score_calc
    ))::integer as confidence,
    ss.bio_band_score_calc::integer as bio_band_score,
    ss.temp_score_calc::integer as temp_score,
    12::integer as substrate_score,
    ss.light_score_calc::integer as light_score,
    ss.freshness_score_calc::integer as freshness_score,
    ss.completeness_score_calc::integer as completeness_score
  FROM scored_species ss
  ORDER BY confidence DESC, ss.name_en
  LIMIT 50;
END;
$$;

COMMENT ON FUNCTION get_environmental_predictions_basic IS 'Uses temp_opt_c and temp_weight for proper temperature-based scoring with biogeographic filtering';
