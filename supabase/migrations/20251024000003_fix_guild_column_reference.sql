-- Fix guild column reference in global predictions function
-- The species table doesn't have a guild column

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
  time_category text;
BEGIN
  -- Find nearest grid cell
  nearest_grid_cell := find_nearest_grid_cell(user_lat, user_lon);

  -- Determine biogeographic region
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

  -- Get time of day category
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC');
  time_category := get_time_of_day_category(current_hour);

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
      SELECT * FROM calculate_moon_phase(target_date)
    ),
    biogeochemical_enhancements AS (
      SELECT
        s.id as species_id,
        s.species_code::text,
        s.name_en::text,
        s.scientific_name::text,
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
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
        gc.chlorophyll_mg_m3 as env_chlorophyll,
        gc.dissolved_oxygen_mg_l as env_oxygen,
        gc.salinity_psu as env_salinity,
        gc.captured_at
      FROM species s
      CROSS JOIN grid_conditions gc
      WHERE s.name_en IS NOT NULL
        AND (
          s.biogeographic_regions IS NULL
          OR biogeographic_region = ANY(s.biogeographic_regions)
          OR biogeographic_region IS NULL  -- If region unknown, show all species
        )
    ),
    scored_predictions AS (
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

        -- Environmental scoring (simplified for now)
        CASE
          WHEN be.env_temperature IS NOT NULL AND be.temp_opt_c IS NOT NULL THEN
            GREATEST(0, 20 - ABS(be.env_temperature - be.temp_opt_c) * 2)::integer
          ELSE 10
        END as temp_score,

        10 as substrate_score,
        10 as depth_score,
        15 as light_score,
        5 as habitat_bonus,
        5 as lunar_score,
        10 as weather_score,
        CASE
          WHEN be.captured_at IS NOT NULL AND be.captured_at > NOW() - INTERVAL '24 hours' THEN 15
          ELSE 5
        END as freshness_score,
        10 as completeness_score,
        0 as bio_band_score
      FROM biogeochemical_enhancements be
    ),
    final_scores AS (
      SELECT
        *,
        (temp_score + substrate_score + depth_score + habitat_bonus) as bite_score,
        (temp_score + substrate_score + depth_score + light_score + habitat_bonus +
         lunar_score + weather_score + freshness_score + completeness_score) as confidence
      FROM scored_predictions
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
      LEAST(fs.confidence, 100)::integer as confidence,
      LEAST(fs.bite_score, 100)::integer as bite_score,
      fs.bio_band_score,
      fs.temp_score,
      fs.substrate_score,
      fs.depth_score,
      fs.light_score,
      fs.habitat_bonus,
      fs.lunar_score,
      fs.weather_score,
      fs.freshness_score,
      fs.completeness_score,
      md.phase::text as moon_phase,
      md.illumination as moon_illumination,
      fs.biogeographic_regions,
      true as has_environmental_data,
      'grid_conditions' as data_source
    FROM final_scores fs
    CROSS JOIN moon_data md
    ORDER BY fs.confidence DESC, fs.bite_score DESC
    LIMIT 100;

  -- If NO grid data, return all species in biogeographic region with basic scores
  ELSE
    RETURN QUERY
    WITH moon_data AS (
      SELECT * FROM calculate_moon_phase(target_date)
    ),
    region_species AS (
      SELECT
        s.id as species_id,
        s.species_code::text,
        s.name_en::text,
        s.scientific_name::text,
        s.playful_bio_en,
        s.biogeographic_regions
      FROM species s
      WHERE s.name_en IS NOT NULL
        AND (
          s.biogeographic_regions IS NULL
          OR biogeographic_region = ANY(s.biogeographic_regions)
          OR biogeographic_region IS NULL  -- If region unknown, show all species
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
      50::integer as confidence,  -- Base confidence when no environmental data
      30::integer as bite_score,
      0::integer as bio_band_score,
      10::integer as temp_score,
      10::integer as substrate_score,
      10::integer as depth_score,
      15::integer as light_score,
      5::integer as habitat_bonus,
      5::integer as lunar_score,
      10::integer as weather_score,
      0::integer as freshness_score,
      0::integer as completeness_score,
      md.phase::text as moon_phase,
      md.illumination as moon_illumination,
      rs.biogeographic_regions,
      false as has_environmental_data,
      'biogeographic_region_only' as data_source
    FROM region_species rs
    CROSS JOIN moon_data md
    ORDER BY rs.species_code
    LIMIT 100;

  END IF;
END;
$$;

COMMENT ON FUNCTION get_global_fishing_predictions IS
  'Returns fishing predictions for any worldwide location using global grid. Uses environmental data if available, otherwise returns all species in biogeographic region. Never returns empty results.';
