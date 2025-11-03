-- Add Daily Prediction Score to Favourites System
--
-- PROBLEM: Favourites grouping uses bite_score which includes intra-day factors (tides, light, lunar)
--          This causes species to move between Active/Good/Waiting groups throughout the day
--          based on tidal cycles rather than day-to-day environmental changes.
--
-- SOLUTION: Create daily_prediction_score that only includes factors that vary day-to-day:
--           - temp_score (water temperature changes slowly, day-to-day)
--           - bio_band_score (chlorophyll, oxygen, salinity vary day-to-day)
--           - weather_score (wind/pressure conditions vary day-to-day)
--
-- EXCLUDES from daily score (intra-day factors):
--           - light_score (cycles every day)
--           - tidal_score (cycles multiple times per day)
--           - lunar_score (cycles every day)
--
-- USER RATIONALE: "Every day has light and tides" - these shouldn't differentiate between days,
--                 only between times within a day.

-- Drop and recreate get_global_fishing_predictions with daily_prediction_score
DROP FUNCTION IF EXISTS get_global_fishing_predictions CASCADE;

CREATE OR REPLACE FUNCTION get_global_fishing_predictions(
  user_lat numeric,
  user_lon numeric,
  target_date date DEFAULT CURRENT_DATE,
  p_lang text DEFAULT 'en'
)
RETURNS TABLE (
  species_id uuid,
  species_code text,
  name_en text,
  scientific_name text,
  playful_bio_en text,
  grid_cell_id text,
  ices_rectangle text,
  prediction_date date,
  confidence integer,
  bite_score integer,
  daily_prediction_score integer,  -- NEW: For day-to-day comparisons
  bio_band_score integer,
  temp_score integer,
  substrate_score integer,
  depth_score integer,
  light_score integer,
  habitat_bonus integer,
  lunar_score integer,
  weather_score integer,
  tidal_score integer,
  freshness_score integer,
  completeness_score integer,
  moon_phase text,
  moon_illumination numeric,
  biogeographic_regions text[],
  has_environmental_data boolean,
  data_source text
)
LANGUAGE plpgsql
AS $$
DECLARE
  nearest_grid_cell text;
  biogeographic_region text;
  ices_rect text;
  has_grid_data boolean;
  current_hour integer;
  is_dawn_dusk boolean;
  is_night boolean;
  moon_illum numeric;
BEGIN
  -- Find nearest grid cell
  nearest_grid_cell := find_nearest_grid_cell(user_lat, user_lon);

  -- Determine biogeographic_region
  biogeographic_region := get_biogeographic_region_from_coords(user_lat, user_lon);

  -- Check if grid has environmental data
  SELECT EXISTS(
    SELECT 1 FROM grid_conditions_latest
    WHERE cell_id = nearest_grid_cell
  ) INTO has_grid_data;

  -- Try to find ICES rectangle (for European waters)
  SELECT rectangle_code INTO ices_rect
  FROM grid_025deg_ices_xref
  WHERE cell_id = nearest_grid_cell
  LIMIT 1;

  -- Calculate time-of-day factors (assuming UTC for now, could enhance with timezone)
  current_hour := EXTRACT(HOUR FROM NOW());
  is_dawn_dusk := (current_hour BETWEEN 5 AND 8) OR (current_hour BETWEEN 17 AND 20);
  is_night := (current_hour < 5) OR (current_hour > 20);

  -- Get moon illumination for lunar score calculation
  SELECT illumination INTO moon_illum
  FROM calculate_moon_phase(target_date)
  LIMIT 1;

  -- If grid has environmental data, use full environmental matching
  IF has_grid_data THEN
    RETURN QUERY
    WITH grid_conditions AS (
      SELECT
        gc.surface_temperature_c as sea_temp_c,
        gc.chlorophyll_mg_m3,
        gc.oxygen_mg_l as dissolved_oxygen_mg_l,
        gc.salinity_psu,
        gc.collected_at as captured_at
      FROM grid_conditions_latest gc
      WHERE gc.cell_id = nearest_grid_cell
    ),
    moon_data AS (
      SELECT
        (SELECT phase_name FROM calculate_moon_phase(target_date) LIMIT 1) as phase_name,
        (SELECT illumination FROM calculate_moon_phase(target_date) LIMIT 1) as illumination
    ),
    biogeochemical_enhancements AS (
      SELECT
        s.id as species_id,
        s.species_code::text,
        s.name_en::text,
        s.scientific_name::text,
        s.playful_bio_en,
        s.biogeographic_regions,
        s.temp_opt_c,
        s.is_night_species,
        s.tide_sensitivity,
        s.wind_sensitivity,
        s.pressure_sensitivity,
        s.temperature_sensitivity,
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
        gc.chlorophyll_mg_m3 as env_chlorophyll,
        gc.dissolved_oxygen_mg_l as env_oxygen,
        gc.salinity_psu as env_salinity,
        gc.captured_at,
        -- Extract optimal temperature (handle both single values and arrays)
        CASE
          WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
            -- If temp_opt_c is an array [min, max], use midpoint
            ((to_jsonb(s.temp_opt_c)->0)::numeric + (to_jsonb(s.temp_opt_c)->1)::numeric) / 2.0
          WHEN s.temp_opt_c IS NOT NULL THEN
            -- If single value, cast to numeric explicitly
            (to_jsonb(s.temp_opt_c))::numeric
          ELSE
            -- If null, return null
            NULL::numeric
        END as optimal_temp
      FROM species s
      CROSS JOIN grid_conditions gc
      WHERE s.name_en IS NOT NULL
        AND (
          s.biogeographic_regions IS NULL
          OR biogeographic_region = ANY(s.biogeographic_regions)
          OR biogeographic_region IS NULL
        )
    ),
    final_scores AS (
      SELECT
        be.species_id,
        be.species_code,
        be.name_en,
        be.scientific_name,
        be.playful_bio_en,
        be.grid_id,
        be.ices_rectangle,
        be.prediction_date,
        be.biogeographic_regions,
        -- TEMPERATURE SCORE: Weighted by species temperature_sensitivity
        CASE
          WHEN be.env_temperature IS NOT NULL AND be.optimal_temp IS NOT NULL THEN
            (GREATEST(0, 20 - ABS(be.env_temperature - be.optimal_temp) * 2) *
             COALESCE(be.temperature_sensitivity, 0.5))::integer
          ELSE 10
        END as temp_score,
        -- LIGHT SCORE: Species-specific based on is_night_species
        CASE
          WHEN be.is_night_species AND is_night THEN 20  -- Night feeders at night = excellent
          WHEN be.is_night_species AND is_dawn_dusk THEN 15  -- Night feeders at dawn/dusk = good
          WHEN be.is_night_species THEN 5  -- Night feeders in daylight = poor
          WHEN is_dawn_dusk THEN 15  -- Day feeders at dawn/dusk = good
          WHEN is_night THEN 5  -- Day feeders at night = poor
          ELSE 10  -- Day feeders in daylight = moderate
        END as light_score,
        -- LUNAR SCORE: Species-specific (some prefer new moon, some full moon)
        CASE
          WHEN be.is_night_species THEN
            (20 - (moon_illum * 15))::integer  -- Night species: darker = better (5-20 range)
          ELSE
            (5 + (moon_illum * 10))::integer  -- Day species: brighter = slightly better (5-15 range)
        END as lunar_score,
        -- WEATHER SCORE: Weighted by wind_sensitivity and pressure_sensitivity
        (10 * COALESCE(be.wind_sensitivity, 0.5))::integer as weather_score,
        -- TIDAL SCORE: Weighted by tide_sensitivity (species-specific!)
        (15 * COALESCE(be.tide_sensitivity, 0.4))::integer as tidal_score,
        -- BIO BAND SCORE: Chlorophyll + Oxygen + Salinity matching (max 30)
        (
          score_bio_parameter(be.species_id, 'chlorophyll'::text, be.env_chlorophyll::numeric) +
          score_bio_parameter(be.species_id, 'oxygen'::text, be.env_oxygen::numeric) +
          score_bio_parameter(be.species_id, 'salinity'::text, be.env_salinity::numeric)
        ) as bio_band_score,
        -- SUBSTRATE/DEPTH/HABITAT: Same as before (location-based)
        10 as substrate_score,
        10 as depth_score,
        5 as habitat_bonus,
        -- FRESHNESS: Data recency
        CASE
          WHEN be.captured_at IS NOT NULL AND be.captured_at > NOW() - INTERVAL '24 hours' THEN 15
          ELSE 5
        END as freshness_score,
        10 as completeness_score
      FROM biogeochemical_enhancements be
    )
    SELECT
      fs.species_id,
      fs.species_code,
      fs.name_en,
      fs.scientific_name,
      fs.playful_bio_en,
      fs.grid_id as grid_cell_id,
      fs.ices_rectangle,
      fs.prediction_date,
      -- CONFIDENCE: Comprehensive score including all factors + data quality
      LEAST((fs.temp_score + fs.substrate_score + fs.depth_score + fs.light_score + fs.habitat_bonus +
             fs.lunar_score + fs.weather_score + fs.tidal_score + fs.freshness_score + fs.completeness_score + fs.bio_band_score), 100)::integer as confidence,
      -- BITE SCORE: Real-time fishing success (includes intra-day factors)
      LEAST((fs.temp_score + fs.light_score + fs.lunar_score + fs.weather_score + fs.tidal_score + fs.bio_band_score + fs.habitat_bonus), 100)::integer as bite_score,
      -- DAILY PREDICTION SCORE: Day-to-day environmental conditions only
      -- Excludes light_score, tidal_score, lunar_score (intra-day factors)
      -- Max realistic score: ~60 (temp 20 + bio 30 + weather 10)
      LEAST((fs.temp_score + fs.bio_band_score + fs.weather_score), 100)::integer as daily_prediction_score,
      fs.bio_band_score,
      fs.temp_score,
      fs.substrate_score,
      fs.depth_score,
      fs.light_score,
      fs.habitat_bonus,
      fs.lunar_score,
      fs.weather_score,
      fs.tidal_score,
      fs.freshness_score,
      fs.completeness_score,
      md.phase_name::text as moon_phase,
      md.illumination as moon_illumination,
      fs.biogeographic_regions,
      true as has_environmental_data,
      'grid_conditions' as data_source
    FROM final_scores fs
    CROSS JOIN moon_data md
    ORDER BY daily_prediction_score DESC, bite_score DESC  -- Sort by daily score first!
    LIMIT 100;

  -- If NO grid data, return all species in biogeographic region with basic scores
  ELSE
    RETURN QUERY
    WITH moon_data AS (
      SELECT
        (SELECT phase_name FROM calculate_moon_phase(target_date) LIMIT 1) as phase_name,
        (SELECT illumination FROM calculate_moon_phase(target_date) LIMIT 1) as illumination
    ),
    region_species AS (
      SELECT
        s.id as species_id,
        s.species_code::text,
        s.name_en::text,
        s.scientific_name::text,
        s.playful_bio_en,
        s.biogeographic_regions,
        s.is_night_species,
        s.tide_sensitivity,
        s.wind_sensitivity
      FROM species s
      WHERE s.name_en IS NOT NULL
        AND (
          s.biogeographic_regions IS NULL
          OR biogeographic_region = ANY(s.biogeographic_regions)
          OR biogeographic_region IS NULL
        )
    )
    SELECT
      rs.species_id,
      rs.species_code,
      rs.name_en,
      rs.scientific_name,
      rs.playful_bio_en,
      nearest_grid_cell as grid_cell_id,
      ices_rect as ices_rectangle,
      target_date as prediction_date,
      50 as confidence,
      -- Even without environmental data, use species-specific time-of-day preferences
      LEAST((
        10 +  -- base temp_score
        CASE
          WHEN rs.is_night_species AND is_night THEN 20
          WHEN rs.is_night_species AND is_dawn_dusk THEN 15
          WHEN rs.is_night_species THEN 5
          WHEN is_dawn_dusk THEN 15
          WHEN is_night THEN 5
          ELSE 10
        END +  -- light_score
        (10 * COALESCE(rs.tide_sensitivity, 0.4))::integer +  -- tidal_score
        (10 * COALESCE(rs.wind_sensitivity, 0.5))::integer  -- weather_score
      ), 100)::integer as bite_score,
      -- Daily score without environmental data (just weather baseline)
      (10 * COALESCE(rs.wind_sensitivity, 0.5))::integer as daily_prediction_score,
      0 as bio_band_score,  -- No bio data available
      10 as temp_score,
      10 as substrate_score,
      10 as depth_score,
      CASE
        WHEN rs.is_night_species AND is_night THEN 20
        WHEN rs.is_night_species AND is_dawn_dusk THEN 15
        WHEN rs.is_night_species THEN 5
        WHEN is_dawn_dusk THEN 15
        WHEN is_night THEN 5
        ELSE 10
      END as light_score,
      5 as habitat_bonus,
      5 as lunar_score,
      (10 * COALESCE(rs.wind_sensitivity, 0.5))::integer as weather_score,
      (10 * COALESCE(rs.tide_sensitivity, 0.4))::integer as tidal_score,
      0 as freshness_score,
      0 as completeness_score,
      md.phase_name::text as moon_phase,
      md.illumination as moon_illumination,
      rs.biogeographic_regions,
      false as has_environmental_data,
      'biogeographic_region_only' as data_source
    FROM region_species rs
    CROSS JOIN moon_data md
    ORDER BY daily_prediction_score DESC, bite_score DESC
    LIMIT 100;
  END IF;
END;
$$;

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '✅ Daily Prediction Score ADDED!';
  RAISE NOTICE '';
  RAISE NOTICE 'Three scoring systems now available:';
  RAISE NOTICE '';
  RAISE NOTICE '1. CONFIDENCE (comprehensive environmental match):';
  RAISE NOTICE '   • All environmental factors';
  RAISE NOTICE '   • All time-based factors';
  RAISE NOTICE '   • Data quality metrics';
  RAISE NOTICE '   • Max: 100 points';
  RAISE NOTICE '';
  RAISE NOTICE '2. BITE SCORE (real-time fishing success):';
  RAISE NOTICE '   • temp_score + bio_band_score + weather_score';
  RAISE NOTICE '   • light_score + tidal_score + lunar_score + habitat_bonus';
  RAISE NOTICE '   • Max: 100 points';
  RAISE NOTICE '   • USE FOR: Intra-day timing advice ("Best Window Today")';
  RAISE NOTICE '';
  RAISE NOTICE '3. DAILY PREDICTION SCORE (day-to-day comparisons):';
  RAISE NOTICE '   • temp_score (0-20): Water temperature match';
  RAISE NOTICE '   • bio_band_score (0-30): Chlorophyll + Oxygen + Salinity';
  RAISE NOTICE '   • weather_score (0-10): Wind/pressure conditions';
  RAISE NOTICE '   • Max realistic: ~60 points';
  RAISE NOTICE '   • USE FOR: Species grouping (Active/Good/Waiting)';
  RAISE NOTICE '   • EXCLUDES: Tides, light, lunar (cycle daily)';
  RAISE NOTICE '';
  RAISE NOTICE 'Rationale: "Every day has light and tides" - these shouldnt';
  RAISE NOTICE 'differentiate between days, only between times within a day.';
END $$;
