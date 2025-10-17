-- Enhancement 5: Weather Conditions Scoring (Enhanced RPC)
-- Add wind and barometric pressure awareness with GPS coordinates

-- Update ENHANCED RPC to accept weather parameters
DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced(text, date, numeric, numeric, text, numeric);

CREATE OR REPLACE FUNCTION get_environmental_predictions_enhanced(
  target_rectangle text,
  target_date date,
  user_lat numeric,
  user_lon numeric,
  substrate_type text DEFAULT NULL,
  depth_meters numeric DEFAULT NULL,
  current_wind_speed_ms numeric DEFAULT NULL,      -- Wind speed in m/s
  current_pressure_hpa numeric DEFAULT NULL        -- Barometric pressure in hPa
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
  habitat_bonus integer,
  lunar_score integer,
  weather_score integer,      -- NEW: Weather conditions score
  freshness_score integer,
  completeness_score integer,
  moon_phase text,
  moon_illumination numeric
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
      s.lunar_weight,
      s.wind_weight,          -- NEW: Query wind weight
      s.pressure_weight,      -- NEW: Query pressure weight
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
        WHEN depth_meters IS NULL THEN 10
        WHEN depth_meters BETWEEN be.depth_min_m AND be.depth_max_m THEN 20
        WHEN depth_meters BETWEEN (be.depth_min_m * 0.8) AND (be.depth_max_m * 1.2) THEN 15
        ELSE 8
      END as depth_score
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
  habitat_bonuses AS (
    SELECT
      be.species_id,
      CASE
        WHEN substrate_type IS NULL OR depth_meters IS NULL THEN 0
        WHEN substrate_type = 'rocky_reef' AND depth_meters BETWEEN 5 AND 25 THEN
          CASE
            WHEN be.name_en IN ('Octopus', 'Pollock', 'Ballan Wrasse') THEN 10
            WHEN be.name_en IN ('Black Bream', 'Red Gurnard') THEN 8
            ELSE 5
          END
        WHEN substrate_type = 'sandy_bottom' AND depth_meters BETWEEN 10 AND 40 THEN
          CASE
            WHEN be.name_en IN ('Plaice', 'Turbot', 'Flounder') THEN 10
            WHEN be.name_en IN ('Dover Sole', 'Dab') THEN 8
            ELSE 4
          END
        WHEN substrate_type = 'muddy_bottom' AND depth_meters BETWEEN 15 AND 60 THEN
          CASE
            WHEN be.name_en IN ('European Eel', 'Thornback Ray') THEN 10
            ELSE 5
          END
        WHEN substrate_type = 'mixed_ground' THEN 7
        WHEN substrate_type = 'kelp_forest' AND depth_meters BETWEEN 3 AND 20 THEN
          CASE
            WHEN be.name_en IN ('Ballan Wrasse', 'Pollock', 'Sea Bass') THEN 10
            ELSE 6
          END
        WHEN substrate_type = 'wrecks_structures' THEN
          CASE
            WHEN be.name_en IN ('Pollock', 'Conger Eel', 'Bib') THEN 10
            ELSE 7
          END
        ELSE 3
      END as habitat_bonus
    FROM biogeochemical_enhancements be
  ),
  lunar_matches AS (
    SELECT
      be.species_id,
      ROUND(
        CASE
          WHEN md.phase_category = 'full_moon' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'weak' THEN 15
              WHEN be.diurnal_sensitivity = 'moderate' THEN 10
              ELSE 7
            END
          WHEN md.phase_category = 'new_moon' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'strong' THEN 12
              WHEN be.diurnal_sensitivity = 'moderate' THEN 8
              ELSE 10
            END
          WHEN md.phase_category = 'quarter' THEN
            CASE
              WHEN be.diurnal_sensitivity = 'moderate' THEN 10
              ELSE 7
            END
          ELSE 6
        END * COALESCE(be.lunar_weight, 0.05)
      )::integer as lunar_score
    FROM biogeochemical_enhancements be
    CROSS JOIN moon_data md
  ),
  weather_matches AS (
    SELECT
      be.species_id,
      CASE
        -- If no weather data provided, neutral score
        WHEN current_wind_speed_ms IS NULL AND current_pressure_hpa IS NULL THEN 7
        
        -- Calculate combined wind and pressure score
        ELSE
          ROUND(
            (
              -- Wind component (0-10 scale)
              CASE
                WHEN current_wind_speed_ms IS NULL THEN 5
                WHEN current_wind_speed_ms < 3 THEN 10  -- Calm
                WHEN current_wind_speed_ms < 5 THEN 8   -- Light
                WHEN current_wind_speed_ms < 8 THEN 6   -- Moderate
                WHEN current_wind_speed_ms < 12 THEN 4  -- Fresh
                ELSE 2                                   -- Strong
              END * COALESCE(be.wind_weight, 0.5)        -- Weight importance
              +
              -- Pressure component (0-10 scale)
              CASE
                WHEN current_pressure_hpa IS NULL THEN 5
                WHEN current_pressure_hpa > 1020 THEN 10  -- High
                WHEN current_pressure_hpa >= 1010 THEN 7  -- Normal
                WHEN current_pressure_hpa >= 1000 THEN 9  -- Falling (pre-storm)
                ELSE 4                                     -- Low
              END * COALESCE(be.pressure_weight, 0.5)     -- Weight importance
            ) / (COALESCE(be.wind_weight, 0.5) + COALESCE(be.pressure_weight, 0.5))  -- Normalize
          )::integer
      END as weather_score
    FROM biogeochemical_enhancements be
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
         sm.substrate_score + 
         dm.depth_score + 
         lm.light_score + 
         hb.habitat_bonus + 
         lnm.lunar_score +
         wm.weather_score +
         fm.freshness_score + 
         cm.completeness_score
        )::numeric / 160 * 100  -- Max: 30+25+25+20+15+10+10+10+15+10 = 170, cap display at 100
      )::integer,
      100
    ) as confidence,
    (bbm.chlorophyll_score + bbm.oxygen_score + bbm.salinity_score)::integer as bio_band_score,
    tm.temp_score::integer,
    sm.substrate_score::integer,
    dm.depth_score::integer,
    lm.light_score::integer,
    hb.habitat_bonus::integer,
    lnm.lunar_score::integer,
    wm.weather_score::integer,
    fm.freshness_score::integer,
    cm.completeness_score::integer,
    md.phase_name as moon_phase,
    ROUND(md.illumination, 2) as moon_illumination
  FROM biogeochemical_enhancements be
  LEFT JOIN bio_band_matches bbm ON be.species_id = bbm.species_id
  LEFT JOIN temperature_matches tm ON be.species_id = tm.species_id
  LEFT JOIN substrate_matches sm ON be.species_id = sm.species_id
  LEFT JOIN depth_matches dm ON be.species_id = dm.species_id
  LEFT JOIN light_matches lm ON be.species_id = lm.species_id
  LEFT JOIN habitat_bonuses hb ON be.species_id = hb.species_id
  LEFT JOIN lunar_matches lnm ON be.species_id = lnm.species_id
  LEFT JOIN weather_matches wm ON be.species_id = wm.species_id
  LEFT JOIN freshness_matches fm ON be.species_id = fm.species_id
  LEFT JOIN completeness_matches cm ON be.species_id = cm.species_id
  CROSS JOIN moon_data md
  ORDER BY confidence DESC, be.name_en;
END;
$$;

GRANT EXECUTE ON FUNCTION get_environmental_predictions_enhanced(text, date, numeric, numeric, text, numeric, numeric, numeric) TO authenticated, anon;

DO $$
BEGIN
  RAISE NOTICE '✅ Weather scoring integrated into enhanced RPC!';
  RAISE NOTICE 'Added weather_score field (0-10 points)';
  RAISE NOTICE '';
  RAISE NOTICE 'Weather scoring logic (same as basic):';
  RAISE NOTICE '  Wind component:';
  RAISE NOTICE '    • Calm (< 3 m/s): 10 * wind_weight';
  RAISE NOTICE '    • Light (3-5 m/s): 8 * wind_weight';
  RAISE NOTICE '    • Moderate (5-8 m/s): 6 * wind_weight';
  RAISE NOTICE '    • Fresh (8-12 m/s): 4 * wind_weight';
  RAISE NOTICE '    • Strong (> 12 m/s): 2 * wind_weight';
  RAISE NOTICE '  Pressure component:';
  RAISE NOTICE '    • High (> 1020 hPa): 10 * pressure_weight';
  RAISE NOTICE '    • Normal (1010-1020 hPa): 7 * pressure_weight';
  RAISE NOTICE '    • Falling (1000-1010 hPa): 9 * pressure_weight (pre-storm feeding)';
  RAISE NOTICE '    • Low (< 1000 hPa): 4 * pressure_weight';
  RAISE NOTICE '';
  RAISE NOTICE 'Optional parameters: current_wind_speed_ms, current_pressure_hpa';
  RAISE NOTICE 'If omitted, neutral score of 7 applied';
END $$;
