-- Fix bite_score calculation in get_global_fishing_predictions
--
-- BEFORE: bite_score = temp + substrate + depth + habitat (4 factors, WRONG!)
-- AFTER:  bite_score = temp + light + lunar + weather + bio_band + habitat (6 factors)
--
-- NOTE: Still missing tide_score (will be added in future migration)
-- Bite score represents FEEDING ACTIVITY, not habitat match
-- Confidence represents HABITAT MATCH (includes substrate, depth, freshness, completeness)

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
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
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
        CASE
          WHEN be.env_temperature IS NOT NULL AND be.optimal_temp IS NOT NULL THEN
            GREATEST(0, 20 - ABS(be.env_temperature - be.optimal_temp) * 2)::integer
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
      LEAST((fs.temp_score + fs.substrate_score + fs.depth_score + fs.light_score + fs.habitat_bonus +
             fs.lunar_score + fs.weather_score + fs.freshness_score + fs.completeness_score), 100)::integer as confidence,
      LEAST((fs.temp_score + fs.light_score + fs.lunar_score + fs.weather_score + fs.bio_band_score + fs.habitat_bonus), 100)::integer as bite_score,
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
      md.phase_name::text as moon_phase,
      md.illumination as moon_illumination,
      fs.biogeographic_regions,
      true as has_environmental_data,
      'grid_conditions' as data_source
    FROM final_scores fs
    CROSS JOIN moon_data md
    ORDER BY confidence DESC
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
        s.biogeographic_regions
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
      50 as bite_score,
      0 as bio_band_score,
      10 as temp_score,
      10 as substrate_score,
      10 as depth_score,
      10 as light_score,
      5 as habitat_bonus,
      5 as lunar_score,
      10 as weather_score,
      0 as freshness_score,
      0 as completeness_score,
      md.phase_name::text as moon_phase,
      md.illumination as moon_illumination,
      rs.biogeographic_regions,
      false as has_environmental_data,
      'biogeographic_region_only' as data_source
    FROM region_species rs
    CROSS JOIN moon_data md
    ORDER BY name_en
    LIMIT 100;
  END IF;
END;
$$;
