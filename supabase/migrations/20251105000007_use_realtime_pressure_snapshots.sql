-- Phase 2: Integrate Real-Time Pressure Snapshots into Bite Score
-- Migration: 20251105000007_use_realtime_pressure_snapshots.sql
-- Description: Replace findr_conditions_latest pressure data with real-time pressure_snapshots
-- Strategy: Use get_pressure_trend() helper to fetch hourly pressure data
-- Related: docs/PRESSURE_TREND_DATA_STRATEGY.md

-- Drop existing function to recreate with real-time pressure data
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
  solunar_score integer,
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
    -- NEW: Get real-time pressure data from pressure_snapshots using helper function
    pressure_data AS (
      SELECT
        pt.pressure_hpa,
        pt.trend_3h_hpa,
        pt.trend_category,
        pt.captured_at as pressure_captured_at,
        pt.age_minutes as pressure_age_minutes
      FROM get_pressure_trend(user_lat, user_lon, NOW()) pt
    ),
    weather_conditions AS (
      SELECT
        -- Pressure data now comes from pressure_snapshots (real-time, hourly)
        pd.trend_3h_hpa as pressure_trend_3h_hpa,
        pd.trend_category as pressure_trend_category,
        pd.pressure_age_minutes,
        -- Cloud cover still from findr_conditions_latest (daily snapshot)
        fcl.cloud_cover_pct
      FROM findr_conditions_latest fcl
      LEFT JOIN pressure_data pd ON TRUE
      WHERE fcl.rectangle_code = ices_rect
      LIMIT 1
    ),
    moon_data AS (
      SELECT
        (SELECT phase_name FROM calculate_moon_phase(target_date) LIMIT 1) as phase_name,
        (SELECT illumination FROM calculate_moon_phase(target_date) LIMIT 1) as illumination,
        -- Get moon transit data for Solunar scoring
        mc.moonrise_iso,
        mc.moonset_iso,
        mc.moon_transit_iso
      FROM moon_cache mc
      WHERE mc.lat_bucket = ROUND(user_lat::numeric, 0)::numeric
        AND mc.lon_bucket = ROUND(user_lon::numeric, 0)::numeric
        AND mc.local_date = target_date
      LIMIT 1
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
        s.cloud_preference,
        s.cloud_weight,
        nearest_grid_cell as grid_id,
        ices_rect as ices_rectangle,
        target_date as prediction_date,
        gc.sea_temp_c as env_temperature,
        gc.captured_at,
        wc.pressure_trend_category,
        wc.pressure_age_minutes,
        wc.cloud_cover_pct,
        -- Moon data for Solunar scoring
        md.moonrise_iso,
        md.moonset_iso,
        md.moon_transit_iso,
        -- Extract optimal temperature
        CASE
          WHEN jsonb_typeof(to_jsonb(s.temp_opt_c)) = 'array' THEN
            ((to_jsonb(s.temp_opt_c)->0)::numeric + (to_jsonb(s.temp_opt_c)->1)::numeric) / 2.0
          WHEN s.temp_opt_c IS NOT NULL THEN
            (to_jsonb(s.temp_opt_c))::numeric
          ELSE
            NULL::numeric
        END as optimal_temp
      FROM species s
      CROSS JOIN grid_conditions gc
      LEFT JOIN weather_conditions wc ON TRUE
      CROSS JOIN moon_data md
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
          WHEN be.is_night_species AND is_night THEN 20
          WHEN be.is_night_species AND is_dawn_dusk THEN 15
          WHEN be.is_night_species THEN 5
          WHEN is_dawn_dusk THEN 15
          WHEN is_night THEN 5
          ELSE 10
        END as light_score,

        -- LUNAR SCORE: Base moon illumination score (species-specific)
        CASE
          WHEN be.is_night_species THEN
            (20 - (moon_illum * 15))::integer  -- Night species: darker = better (5-20 range)
          ELSE
            (5 + (moon_illum * 10))::integer  -- Day species: brighter = slightly better (5-15 range)
        END as lunar_score,

        -- SOLUNAR SCORE - Bonus for major/minor feeding periods
        (
          WITH solunar_check AS (
            SELECT * FROM is_in_solunar_period(
              NOW()::timestamptz,
              be.moonrise_iso,
              be.moonset_iso,
              be.moon_transit_iso
            )
          )
          SELECT
            CASE
              WHEN sc.in_major_period AND moon_illum > 0.8 THEN 5
              WHEN sc.in_major_period AND moon_illum > 0.5 THEN 4
              WHEN sc.in_major_period THEN 3
              WHEN sc.in_minor_period AND moon_illum > 0.8 THEN 4
              WHEN sc.in_minor_period AND moon_illum > 0.5 THEN 3
              WHEN sc.in_minor_period THEN 2
              ELSE 0
            END
          FROM solunar_check sc
        )::integer as solunar_score,

        -- WEATHER SCORE - Real-time Pressure Trend Scoring
        -- NEW: Uses hourly pressure_snapshots data instead of daily findr_conditions_latest
        -- If pressure data is stale (>90 min), fall back to neutral score
        (
          CASE
            WHEN be.pressure_trend_category IS NULL THEN 5
            WHEN be.pressure_age_minutes IS NOT NULL AND be.pressure_age_minutes > 90 THEN 8  -- Stale data: neutral-good
            WHEN be.pressure_trend_category = 'falling' THEN 12
            WHEN be.pressure_trend_category = 'steady' THEN 10
            WHEN be.pressure_trend_category = 'rising' THEN 8
            WHEN be.pressure_trend_category = 'rapid_falling' THEN 6
            ELSE 5
          END * COALESCE(be.pressure_sensitivity, 0.5)
        )::integer as weather_score,

        -- CLOUD COVER SCORE - Species-specific cloud preferences
        (
          CASE
            WHEN be.cloud_cover_pct IS NULL THEN 5
            WHEN be.cloud_preference = 'overcast' THEN
              CASE
                WHEN be.cloud_cover_pct > 80 THEN 10
                WHEN be.cloud_cover_pct > 60 THEN 8
                WHEN be.cloud_cover_pct > 40 THEN 6
                ELSE 4
              END
            WHEN be.cloud_preference = 'partly_cloudy' THEN
              CASE
                WHEN be.cloud_cover_pct BETWEEN 40 AND 70 THEN 10
                WHEN be.cloud_cover_pct BETWEEN 20 AND 80 THEN 8
                ELSE 6
              END
            WHEN be.cloud_preference = 'clear' THEN
              CASE
                WHEN be.cloud_cover_pct < 30 THEN 10
                WHEN be.cloud_cover_pct < 50 THEN 8
                WHEN be.cloud_cover_pct < 70 THEN 6
                ELSE 4
              END
            ELSE 5
          END * COALESCE(be.cloud_weight, 0.05)
        )::integer as cloud_score,

        -- LIGHT × CLOUD INTERACTION BONUS
        CASE
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 60 AND be.is_night_species THEN 3
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 60 THEN 2
          WHEN is_dawn_dusk AND be.cloud_cover_pct > 40 THEN 1
          ELSE 0
        END as light_cloud_bonus,

        -- TIDAL SCORE: Weighted by tide_sensitivity
        (15 * COALESCE(be.tide_sensitivity, 0.4))::integer as tidal_score,

        -- SUBSTRATE/DEPTH/HABITAT: Location-based
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
        (fs.temp_score + fs.light_score + fs.lunar_score + fs.solunar_score + fs.weather_score +
         fs.cloud_score + fs.light_cloud_bonus + fs.tidal_score +
         fs.substrate_score + fs.depth_score + fs.habitat_bonus +
         fs.freshness_score + fs.completeness_score + fs.bio_band_score) * 100 / 135
      )::integer as confidence,
      -- Calculate bite_score (sum of all components)
      (
        fs.temp_score + fs.light_score + fs.lunar_score + fs.solunar_score + fs.weather_score +
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
      fs.solunar_score,
      fs.weather_score,
      fs.tidal_score,
      fs.freshness_score,
      fs.completeness_score,
      (SELECT phase_name FROM moon_data) as moon_phase,
      (SELECT illumination FROM moon_data) as moon_illumination,
      fs.biogeographic_regions,
      TRUE as has_environmental_data,
      'CMEMS+Pressure+Solunar' as data_source
    FROM final_scores fs
    ORDER BY confidence DESC, bite_score DESC;

  ELSE
    -- Fallback: No grid data, return empty result
    RAISE NOTICE 'No grid data available for cell %, returning empty result', nearest_grid_cell;
    RETURN;
  END IF;
END;
$$;

COMMENT ON FUNCTION get_global_fishing_predictions IS
'Global fishing predictions with REAL-TIME hourly pressure data from pressure_snapshots table. Uses get_pressure_trend() helper to fetch latest pressure readings with 3h/6h trends. Includes Solunar Theory bonuses, species-specific cloud preferences, and environmental matching. Pressure data staleness checked (>90min = fallback to neutral score).';
