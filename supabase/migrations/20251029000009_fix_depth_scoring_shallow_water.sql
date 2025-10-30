-- Fix depth scoring to be neutral in shallow water (<20m)
-- Only apply species-specific depth scoring in deeper water (>=20m)
--
-- PROBLEM: Currently giving all species 10 points for depth even when actual_depth=0
-- This inflates confidence scores without providing meaningful information
--
-- SOLUTION:
-- - If depth < 20m: depth_score = 0 (neutral, no contribution to confidence)
-- - If depth >= 20m: score based on species depth preferences
-- - Show "shallow - not scored" in UI when depth < 20m

DROP FUNCTION IF EXISTS get_global_fishing_predictions CASCADE;

CREATE OR REPLACE FUNCTION get_global_fishing_predictions(
  user_lat numeric,
  user_lon numeric,
  target_date date DEFAULT CURRENT_DATE,
  p_lang text DEFAULT 'en',
  user_depth_m numeric DEFAULT NULL  -- NEW: Optional actual depth from bathymetry
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
  data_source text,
  factors jsonb
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
  actual_depth numeric;
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

  -- Use provided depth or default to NULL (unknown)
  actual_depth := user_depth_m;

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
        s.depth_min_m,
        s.depth_max_m,
        s.preferred_habitat,
        s.is_night_species,
        s.tide_sensitivity,
        s.wind_sensitivity,
        s.pressure_sensitivity,
        s.temperature_sensitivity,
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
        gc.salinity_psu as env_salinity,
        gc.captured_at,
        -- Extract optimal temperature (handle both single values and arrays)
        CASE
          WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
            ((to_jsonb(s.temp_opt_c)->0)::numeric + (to_jsonb(s.temp_opt_c)->1)::numeric) / 2.0
          WHEN s.temp_opt_c IS NOT NULL THEN
            (to_jsonb(s.temp_opt_c))::numeric
          ELSE
            NULL::numeric
        END as optimal_temp,
        -- Extract temperature range as string for species_pref
        CASE
          WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
            (to_jsonb(s.temp_opt_c)->0)::text || '-' || (to_jsonb(s.temp_opt_c)->1)::text
          WHEN s.temp_opt_c IS NOT NULL THEN
            (to_jsonb(s.temp_opt_c))::text
          ELSE
            NULL
        END as temp_pref_str,
        -- Extract depth range as string for species_pref
        CASE
          WHEN s.depth_min_m IS NOT NULL AND s.depth_max_m IS NOT NULL THEN
            s.depth_min_m::text || '-' || s.depth_max_m::text || 'm'
          WHEN s.depth_min_m IS NOT NULL THEN
            s.depth_min_m::text || 'm+'
          WHEN s.depth_max_m IS NOT NULL THEN
            '0-' || s.depth_max_m::text || 'm'
          ELSE
            NULL
        END as depth_pref_str,
        -- Format preferred habitat as comma-separated string
        CASE
          WHEN s.preferred_habitat IS NOT NULL AND array_length(s.preferred_habitat, 1) > 0 THEN
            array_to_string(s.preferred_habitat, ', ')
          ELSE
            NULL
        END as substrate_pref_str
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
        be.env_temperature,
        be.env_salinity,
        be.temp_pref_str,
        be.depth_pref_str,
        be.substrate_pref_str,
        be.depth_min_m,
        be.depth_max_m,
        -- TEMPERATURE SCORE: Weighted by species temperature_sensitivity
        CASE
          WHEN be.env_temperature IS NOT NULL AND be.optimal_temp IS NOT NULL THEN
            (GREATEST(0, 20 - ABS(be.env_temperature - be.optimal_temp) * 2) *
             COALESCE(be.temperature_sensitivity, 0.5))::integer
          ELSE 10
        END as temp_score,
        -- Temperature match quality for factors
        CASE
          WHEN be.env_temperature IS NULL OR be.optimal_temp IS NULL THEN 'unknown'
          WHEN ABS(be.env_temperature - be.optimal_temp) <= 2 THEN 'optimal'
          WHEN ABS(be.env_temperature - be.optimal_temp) <= 5 THEN 'acceptable'
          ELSE 'poor'
        END as temp_match,
        -- DEPTH SCORE: Only score if depth >= 20m, otherwise neutral (0 points)
        CASE
          WHEN actual_depth IS NULL OR actual_depth < 20 THEN 0  -- Shallow water: no depth scoring
          WHEN be.depth_min_m IS NULL OR be.depth_max_m IS NULL THEN 0  -- Unknown species depth: neutral
          WHEN actual_depth >= be.depth_min_m AND actual_depth <= be.depth_max_m THEN 15  -- Within optimal range
          WHEN actual_depth >= be.depth_min_m - 10 AND actual_depth <= be.depth_max_m + 10 THEN 10  -- Close to range
          WHEN actual_depth >= be.depth_min_m - 20 AND actual_depth <= be.depth_max_m + 20 THEN 5  -- Acceptable range
          ELSE 0  -- Outside preferred depth
        END as depth_score_calc,
        -- Depth match quality for factors
        CASE
          WHEN actual_depth IS NULL OR actual_depth < 20 THEN 'shallow'  -- Will show "shallow - not scored" in UI
          WHEN be.depth_min_m IS NULL OR be.depth_max_m IS NULL THEN 'unknown'
          WHEN actual_depth >= be.depth_min_m AND actual_depth <= be.depth_max_m THEN 'optimal'
          WHEN actual_depth >= be.depth_min_m - 10 AND actual_depth <= be.depth_max_m + 10 THEN 'acceptable'
          WHEN actual_depth >= be.depth_min_m - 20 AND actual_depth <= be.depth_max_m + 20 THEN 'poor'
          ELSE 'unsuitable'
        END as depth_match,
        -- LIGHT SCORE: Species-specific based on is_night_species
        CASE
          WHEN be.is_night_species AND is_night THEN 20
          WHEN be.is_night_species AND is_dawn_dusk THEN 15
          WHEN be.is_night_species THEN 5
          WHEN is_dawn_dusk THEN 15
          WHEN is_night THEN 5
          ELSE 10
        END as light_score,
        -- LUNAR SCORE: Species-specific
        CASE
          WHEN be.is_night_species THEN
            (20 - (moon_illum * 15))::integer
          ELSE
            (5 + (moon_illum * 10))::integer
        END as lunar_score,
        -- WEATHER SCORE: Weighted by wind_sensitivity and pressure_sensitivity
        (10 * COALESCE(be.wind_sensitivity, 0.5))::integer as weather_score,
        -- TIDAL SCORE: Weighted by tide_sensitivity
        (15 * COALESCE(be.tide_sensitivity, 0.4))::integer as tidal_score,
        -- SUBSTRATE: Placeholder (will be improved later with actual substrate matching)
        10 as substrate_score,
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
      LEAST((fs.temp_score + fs.substrate_score + fs.depth_score_calc + fs.light_score + fs.habitat_bonus +
             fs.lunar_score + fs.weather_score + fs.tidal_score + fs.freshness_score + fs.completeness_score), 100)::integer as confidence,
      -- BITE SCORE: Now includes depth only if depth >= 20m
      LEAST((fs.temp_score + fs.light_score + fs.lunar_score + fs.weather_score + fs.tidal_score + fs.bio_band_score + fs.habitat_bonus + fs.depth_score_calc), 100)::integer as bite_score,
      fs.bio_band_score,
      fs.temp_score,
      fs.substrate_score,
      fs.depth_score_calc as depth_score,
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
      'grid_conditions' as data_source,
      -- Build factors JSONB with species preferences
      jsonb_build_object(
        'temperature', jsonb_build_object(
          'actual', fs.env_temperature,
          'match', fs.temp_match,
          'score', fs.temp_score,
          'species_pref', fs.temp_pref_str
        ),
        'salinity', CASE
          WHEN fs.env_salinity IS NOT NULL THEN
            jsonb_build_object(
              'actual', fs.env_salinity,
              'match', 'unknown',
              'score', 0,
              'species_pref', NULL
            )
          ELSE NULL
        END,
        'depth', jsonb_build_object(
          'actual', actual_depth,
          'match', fs.depth_match,
          'score', fs.depth_score_calc,
          'species_pref', fs.depth_pref_str
        ),
        'substrate', jsonb_build_object(
          'actual', 'mixed',
          'match', 'unknown',
          'score', fs.substrate_score,
          'species_pref', fs.substrate_pref_str
        )
      ) as factors
    FROM final_scores fs
    CROSS JOIN moon_data md
    ORDER BY bite_score DESC, confidence DESC
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
        s.wind_sensitivity,
        s.temp_opt_c,
        s.depth_min_m,
        s.depth_max_m,
        s.preferred_habitat,
        -- Format preferences as strings
        CASE
          WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
            (to_jsonb(s.temp_opt_c)->0)::text || '-' || (to_jsonb(s.temp_opt_c)->1)::text
          WHEN s.temp_opt_c IS NOT NULL THEN
            (to_jsonb(s.temp_opt_c))::text
          ELSE NULL
        END as temp_pref_str,
        CASE
          WHEN s.depth_min_m IS NOT NULL AND s.depth_max_m IS NOT NULL THEN
            s.depth_min_m::text || '-' || s.depth_max_m::text || 'm'
          WHEN s.depth_min_m IS NOT NULL THEN
            s.depth_min_m::text || 'm+'
          WHEN s.depth_max_m IS NOT NULL THEN
            '0-' || s.depth_max_m::text || 'm'
          ELSE NULL
        END as depth_pref_str,
        CASE
          WHEN s.preferred_habitat IS NOT NULL AND array_length(s.preferred_habitat, 1) > 0 THEN
            array_to_string(s.preferred_habitat, ', ')
          ELSE NULL
        END as substrate_pref_str
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
      0 as bio_band_score,
      10 as temp_score,
      10 as substrate_score,
      0 as depth_score,  -- No depth scoring without environmental data
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
      5 as freshness_score,
      10 as completeness_score,
      md.phase_name::text as moon_phase,
      md.illumination as moon_illumination,
      rs.biogeographic_regions,
      false as has_environmental_data,
      'no_grid_data' as data_source,
      -- Even without environmental data, return species preferences for UI display
      jsonb_build_object(
        'temperature', jsonb_build_object(
          'actual', NULL,
          'match', 'unknown',
          'score', 10,
          'species_pref', rs.temp_pref_str
        ),
        'depth', jsonb_build_object(
          'actual', NULL,
          'match', 'shallow',  -- Assume shallow if no data
          'score', 0,
          'species_pref', rs.depth_pref_str
        ),
        'substrate', jsonb_build_object(
          'actual', NULL,
          'match', 'unknown',
          'score', 10,
          'species_pref', rs.substrate_pref_str
        )
      ) as factors
    FROM region_species rs
    CROSS JOIN moon_data md
    ORDER BY bite_score DESC
    LIMIT 100;
  END IF;
END;
$$;
