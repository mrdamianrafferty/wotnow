-- ============================================================================
-- Performance Optimization: Materialize findr_conditions_latest
-- Generated: 2025-12-24
--
-- Problem: findr_conditions_latest accounts for 21.1% of DB load (276ms mean)
--   - Uses DISTINCT ON which recomputes on every query
--   - Called 3,146 times = ~14 minutes of DB time
--
-- Solution: Convert to materialized view refreshed every 30 minutes
-- Expected: 276ms -> <10ms per query
-- ============================================================================

-- Step 1: Drop dependent views first (CASCADE would be dangerous)
DROP VIEW IF EXISTS public.rectangle_data_quality;

-- Step 2: Drop the existing view
DROP VIEW IF EXISTS public.findr_conditions_latest;

-- Step 3: Create materialized view with same query
CREATE MATERIALIZED VIEW public.findr_conditions_latest AS
SELECT DISTINCT ON (rectangle_code)
  rectangle_code,
  captured_at,
  source,
  -- Marine conditions
  sea_temp_c,
  water_temp_c,
  wind_speed_kts,
  wind_direction_deg,
  wave_height_m,
  wave_period_s,
  wave_direction_deg,
  wind_sea_height_m,
  swell_height_m,
  current_speed_ms,
  current_direction_deg,
  current_east_ms,
  current_north_ms,
  sea_surface_height_m,
  -- Tide data
  next_high_tide_iso,
  next_low_tide_iso,
  tide_phase,
  tide_flow_speed_ms,
  -- Phase 1: Weather data
  air_pressure_hpa,
  cloud_cover_pct,
  -- Phase 2: Pressure trends
  pressure_trend_3h_hpa,
  pressure_trend_6h_hpa,
  pressure_trend_category,
  -- Water clarity & biogeochemical
  kd490,
  kd490_m1,
  water_clarity_kd490,
  secchi_depth_m,
  mixed_layer_depth_m,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  nitrate_umol_l,
  phosphate_umol_l,
  phytoplankton_mmol_m3,
  zooplankton_mmol_m3,
  primary_production_mg_c_m3_day,
  -- Raw JSON data
  hourly_marine_json,
  daily_marine_json,
  source_meta,
  -- Metadata
  snapshot_day,
  created_at
FROM public.findr_conditions_snapshots
ORDER BY rectangle_code, captured_at DESC;

-- Step 4: Add indexes for fast lookups
CREATE UNIQUE INDEX findr_conditions_latest_rectangle_idx
ON public.findr_conditions_latest (rectangle_code);

CREATE INDEX findr_conditions_latest_captured_at_idx
ON public.findr_conditions_latest (captured_at DESC);

CREATE INDEX findr_conditions_latest_source_idx
ON public.findr_conditions_latest (source);

-- Step 5: Create refresh function
CREATE OR REPLACE FUNCTION public.refresh_findr_conditions_latest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.findr_conditions_latest;
END;
$$;

COMMENT ON FUNCTION public.refresh_findr_conditions_latest() IS
'Refreshes the findr_conditions_latest materialized view. Called by pg_cron every 30 minutes.';

-- Step 6: Schedule refresh with pg_cron (every 30 minutes)
-- Note: pg_cron must be enabled in Supabase Dashboard > Database > Extensions
-- Run this manually after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'refresh-findr-conditions-latest',
--   '*/30 * * * *',
--   $$SELECT public.refresh_findr_conditions_latest()$$
-- );
--
-- Alternative: Call the refresh function from a GitHub Action or external cron:
--   curl -X POST https://your-project.supabase.co/rest/v1/rpc/refresh_findr_conditions_latest \
--     -H "apikey: YOUR_SERVICE_ROLE_KEY" \
--     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

-- Try to schedule if pg_cron is available (fails silently if not)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'refresh-findr-conditions-latest',
      '*/30 * * * *',
      'SELECT public.refresh_findr_conditions_latest()'
    );
    RAISE NOTICE 'pg_cron job scheduled for findr_conditions_latest refresh';
  ELSE
    RAISE NOTICE 'pg_cron not enabled - please enable it and schedule the refresh manually';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not schedule pg_cron job: %. Please schedule manually.', SQLERRM;
END;
$$;

-- Step 7: Recreate rectangle_data_quality view (was dependent on findr_conditions_latest)
CREATE OR REPLACE VIEW public.rectangle_data_quality AS
SELECT
  fcl.rectangle_code,
  fcl.sea_temp_c IS NOT NULL as has_temperature,
  fcl.salinity_psu IS NOT NULL as has_salinity,
  fcl.chlorophyll_mg_m3 IS NOT NULL as has_chlorophyll,
  fcl.dissolved_oxygen_mg_l IS NOT NULL as has_oxygen,
  fcl.captured_at as last_captured,
  NOW() - fcl.captured_at as data_age,
  COUNT(DISTINCT xref.cell_id) as num_grid_cells
FROM public.findr_conditions_latest fcl
LEFT JOIN public.grid_025deg_ices_xref xref ON xref.rectangle_code = fcl.rectangle_code
GROUP BY fcl.rectangle_code, fcl.sea_temp_c, fcl.salinity_psu,
         fcl.chlorophyll_mg_m3, fcl.dissolved_oxygen_mg_l, fcl.captured_at
ORDER BY has_temperature DESC, data_age ASC;

-- Step 8: Grant permissions
GRANT SELECT ON public.findr_conditions_latest TO anon, authenticated, service_role;
GRANT SELECT ON public.rectangle_data_quality TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_findr_conditions_latest() TO service_role;

-- Step 9: Add comments
COMMENT ON MATERIALIZED VIEW public.findr_conditions_latest IS
'Latest conditions snapshot for each rectangle. Materialized for performance, refreshed every 30 minutes by pg_cron.';

-- ============================================================================
-- Manual refresh (run after migration if needed):
--   SELECT public.refresh_findr_conditions_latest();
--
-- Check cron job status:
--   SELECT * FROM cron.job WHERE jobname = 'refresh-findr-conditions-latest';
--
-- Check last refresh:
--   SELECT pg_stat_get_last_analyze_time('findr_conditions_latest'::regclass);
-- ============================================================================
