-- Migration: 20251206000001_create_cache_cleanup_function.sql
-- Description: Create automated cache cleanup function to prevent database bloat
-- This function can be called via Supabase cron jobs or pg_cron

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_stale_cache_data()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  weather_deleted BIGINT := 0;
  conditions_deleted BIGINT := 0;
  moon_deleted BIGINT := 0;
  tide_deleted BIGINT := 0;
  translation_deleted BIGINT := 0;
BEGIN
  -- 1. Weather cache: Keep only last 3 days (weather data is time-sensitive)
  DELETE FROM weather_cache 
  WHERE cached_at < NOW() - INTERVAL '3 days';
  GET DIAGNOSTICS weather_deleted = ROW_COUNT;

  -- 2. Findr conditions snapshots: Keep only last 14 days
  DELETE FROM findr_conditions_snapshots 
  WHERE snapshot_day < CURRENT_DATE - INTERVAL '14 days';
  GET DIAGNOSTICS conditions_deleted = ROW_COUNT;

  -- 3. Moon cache: Keep only last 60 days (lunar cycles repeat)
  DELETE FROM moon_cache 
  WHERE created_at < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS moon_deleted = ROW_COUNT;

  -- 4. Tide cache: Keep only last 7 days (tide data is time-sensitive)
  DELETE FROM tide_cache 
  WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS tide_deleted = ROW_COUNT;

  -- 5. Translation cache: Keep only last 90 days (translations rarely change)
  DELETE FROM translation_cache 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS translation_deleted = ROW_COUNT;

  -- Return summary of deletions
  RETURN QUERY 
  SELECT 'weather_cache'::TEXT, weather_deleted
  UNION ALL
  SELECT 'findr_conditions_snapshots'::TEXT, conditions_deleted
  UNION ALL
  SELECT 'moon_cache'::TEXT, moon_deleted
  UNION ALL
  SELECT 'tide_cache'::TEXT, tide_deleted
  UNION ALL
  SELECT 'translation_cache'::TEXT, translation_deleted;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cleanup_stale_cache_data() TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION cleanup_stale_cache_data() IS 
'Removes stale cache data to prevent database bloat. 
Retention periods:
- weather_cache: 3 days
- findr_conditions_snapshots: 14 days  
- moon_cache: 60 days
- tide_cache: 7 days
- translation_cache: 90 days

Call via: SELECT * FROM cleanup_stale_cache_data();
Schedule via Supabase Dashboard > Database > Extensions > pg_cron';

-- ============================================
-- SETUP INSTRUCTIONS FOR SCHEDULED CLEANUP
-- ============================================
-- 
-- Option 1: Supabase Cron (Recommended)
-- Go to: Dashboard > Database > Extensions > Enable pg_cron
-- Then run:
--
-- SELECT cron.schedule(
--   'cleanup-stale-cache',           -- job name
--   '0 3 * * *',                     -- daily at 3 AM UTC
--   $$SELECT * FROM cleanup_stale_cache_data()$$
-- );
--
-- Option 2: Call from API endpoint
-- Create an API route that calls: supabase.rpc('cleanup_stale_cache_data')
-- Trigger via Vercel cron or external scheduler
--
-- To check scheduled jobs: SELECT * FROM cron.job;
-- To remove a job: SELECT cron.unschedule('cleanup-stale-cache');
