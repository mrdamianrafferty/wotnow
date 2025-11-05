-- Phase 2: Add Pressure Trend & Cloud Cover Scoring to Bite Score
-- Migration: 20251105000003_add_pressure_cloud_scoring_to_bite_score.sql
-- Description: Enhance bite score with pressure trends, cloud cover, and light×cloud interaction
-- Related: docs/PHASE_2_PRESSURE_CLOUD_BITE_SCORE.md

-- Drop existing function to recreate with new weather scoring
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
    -- NEW: Add weather conditions from Findr
    weather_conditions AS (
      SELECT
        fcl.pressure_trend_3h_hpa,
        fcl.pressure_trend_6h_hpa,
        fcl.pressure_trend_category,
        fcl.cloud_cover_pct
      FROM findr_conditions_latest fcl
      WHERE fcl.rectangle_code = ices_rect
      LIMIT 1
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
        -- NEW: Cloud preference fields
        s.cloud_preference,
        s.cloud_weight,
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
        gc.captured_at,
        -- NEW: Weather data
        wc.pressure_trend_category,
        wc.cloud_cover_pct,
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
      LEFT JOIN weather_conditions wc ON TRUE  -- Single row, can join without condition
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

        -- NEW: WEATHER SCORE - Pressure Trend Scoring
        -- Falling pressure = fish feed aggressively before storm
        -- Steady pressure = consistent feeding
        -- Rising pressure = fish less active after storm
        (
          CASE
            WHEN be.pressure_trend_category IS NULL THEN 5  -- No trend data
            WHEN be.pressure_trend_category = 'falling' THEN 12  -- BEST: Fish sense approaching front
            WHEN be.pressure_trend_category = 'steady' THEN 10  -- Stable conditions
            WHEN be.pressure_trend_category = 'rising' THEN 8  -- Post-storm, less active
            WHEN be.pressure_trend_category = 'rapid_falling' THEN 6  -- Storm imminent, fish shelter
            ELSE 5
          END * COALESCE(be.pressure_sensitivity, 0.5)
        )::integer as weather_score,

        -- NEW: CLOUD COVER SCORE - Species-specific cloud preferences
        (
          CASE
            WHEN be.cloud_cover_pct IS NULL THEN 5  -- No data
            WHEN be.cloud_preference = 'overcast' THEN
              -- Ambush predators prefer low light
              CASE
                WHEN be.cloud_cover_pct > 80 THEN 10  -- Heavy overcast
                WHEN be.cloud_cover_pct > 60 THEN 8   -- Overcast
                WHEN be.cloud_cover_pct > 40 THEN 6   -- Partly cloudy
                ELSE 4  -- Clear skies (suboptimal)
              END
            WHEN be.cloud_preference = 'partly_cloudy' THEN
              -- Visual feeders need some light
              CASE
                WHEN be.cloud_cover_pct BETWEEN 40 AND 70 THEN 10  -- Ideal
                WHEN be.cloud_cover_pct BETWEEN 20 AND 80 THEN 8
                ELSE 6  -- Too clear or too overcast
              END
            WHEN be.cloud_preference = 'clear' THEN
              -- Daytime sight feeders prefer bright conditions
              CASE
                WHEN be.cloud_cover_pct < 30 THEN 10  -- Clear skies
                WHEN be.cloud_cover_pct < 50 THEN 8   -- Mostly clear
                WHEN be.cloud_cover_pct < 70 THEN 6   -- Partly cloudy
                ELSE 4  -- Overcast (suboptimal)
              END
            ELSE 5  -- Neutral species
          END * COALESCE(be.cloud_weight, 0.05)
        )::integer as cloud_score,

        -- NEW: LIGHT × CLOUD INTERACTION BONUS
        -- Dawn/dusk + overcast = prime ambush feeding time
        CASE
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 60 AND be.is_night_species THEN 3  -- Perfect ambush!
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 60 THEN 2  -- Good conditions
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 40 THEN 1  -- Slight bonus
          ELSE 0
        END as light_cloud_bonus,

        -- TIDAL SCORE: Weighted by tide_sensitivity (species-specific!)
        -- TODO: Enhance with actual tidal data (time to next tide change)
        (15 * COALESCE(be.tide_sensitivity, 0.4))::integer as tidal_score,

        -- SUBSTRATE/DEPTH/HABITAT: Same as before (location-based)
        10 as substrate_score,
        10 as depth_score,
        5 as habitat_bonus,

        -- FRESHNESS: Data recency
        CASE
          WHEN be.captured_at IS NOT NULL AND be.captured_at > NOW() - INTERVAL '24 hours' THEN 15
          ELSE 5
        END as freshness_score,

        10 as completeness_score,
        0 as bio_band_score
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
      -- Calculate confidence (average of all scores, weighted to 100)
      (
        (fs.temp_score + fs.light_score + fs.lunar_score + fs.weather_score +
         fs.cloud_score + fs.light_cloud_bonus + fs.tidal_score +
         fs.substrate_score + fs.depth_score + fs.habitat_bonus +
         fs.freshness_score + fs.completeness_score + fs.bio_band_score) * 100 / 130
      )::integer as confidence,
      -- Calculate bite_score (sum of all components including new cloud bonus)
      (
        fs.temp_score + fs.light_score + fs.lunar_score + fs.weather_score +
        fs.cloud_score + fs.light_cloud_bonus + fs.tidal_score +
        fs.substrate_score + fs.depth_score + fs.habitat_bonus
      )::integer as bite_score,
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
      (SELECT phase_name FROM moon_data) as moon_phase,
      (SELECT illumination FROM moon_data) as moon_illumination,
      fs.biogeographic_regions,
      TRUE as has_environmental_data,
      'CMEMS+Findr' as data_source
    FROM final_scores fs
    ORDER BY confidence DESC, bite_score DESC;

  ELSE
    -- Fallback: No grid data, return basic predictions
    RAISE NOTICE 'No grid data available for cell %, returning empty result', nearest_grid_cell;
    RETURN;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_global_fishing_predictions IS
'Global fishing predictions with pressure trend, cloud cover, and light×cloud interaction scoring. Uses CMEMS marine data + Findr weather data (pressure trends, cloud cover) for comprehensive bite score calculation.';
