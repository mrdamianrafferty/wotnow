-- Migration: 20260514016_fix_cache_cleanup_function.sql
-- Fix: cleanup_stale_cache_data() was timing out because it tried to delete
-- hundreds of thousands of rows in a single statement. Now uses batched deletes
-- and removes the statement timeout for the duration of the call.

CREATE OR REPLACE FUNCTION cleanup_stale_cache_data()
RETURNS TABLE (
  table_name TEXT,
  rows_deleted BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  weather_deleted   BIGINT := 0;
  conditions_deleted BIGINT := 0;
  moon_deleted      BIGINT := 0;
  tide_deleted      BIGINT := 0;
  translation_deleted BIGINT := 0;
  batch_size        INT := 5000;
  deleted_now       BIGINT;
BEGIN
  -- Remove the statement timeout for this cleanup run so large backlogs
  -- don't cause the function to fail silently via the Vercel cron.
  SET LOCAL statement_timeout = '0';

  -- 1. Weather cache: keep only last 3 days — batch to handle large backlogs
  LOOP
    DELETE FROM weather_cache
    WHERE id IN (
      SELECT id FROM weather_cache
      WHERE cached_at < NOW() - INTERVAL '3 days'
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted_now = ROW_COUNT;
    weather_deleted := weather_deleted + deleted_now;
    EXIT WHEN deleted_now < batch_size;
  END LOOP;

  -- 2. Findr conditions snapshots: keep only last 14 days
  LOOP
    DELETE FROM findr_conditions_snapshots
    WHERE id IN (
      SELECT id FROM findr_conditions_snapshots
      WHERE snapshot_day < CURRENT_DATE - INTERVAL '14 days'
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted_now = ROW_COUNT;
    conditions_deleted := conditions_deleted + deleted_now;
    EXIT WHEN deleted_now < batch_size;
  END LOOP;

  -- 3. Moon cache: keep only last 60 days
  LOOP
    DELETE FROM moon_cache
    WHERE id IN (
      SELECT id FROM moon_cache
      WHERE cached_at < NOW() - INTERVAL '60 days'
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted_now = ROW_COUNT;
    moon_deleted := moon_deleted + deleted_now;
    EXIT WHEN deleted_now < batch_size;
  END LOOP;

  -- 4. Tide cache: keep only last 7 days
  LOOP
    DELETE FROM tide_cache
    WHERE id IN (
      SELECT id FROM tide_cache
      WHERE cached_at < NOW() - INTERVAL '7 days'
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted_now = ROW_COUNT;
    tide_deleted := tide_deleted + deleted_now;
    EXIT WHEN deleted_now < batch_size;
  END LOOP;

  -- 5. Translation cache: keep only last 90 days
  LOOP
    DELETE FROM translation_cache
    WHERE id IN (
      SELECT id FROM translation_cache
      WHERE created_at < NOW() - INTERVAL '90 days'
      LIMIT batch_size
    );
    GET DIAGNOSTICS deleted_now = ROW_COUNT;
    translation_deleted := translation_deleted + deleted_now;
    EXIT WHEN deleted_now < batch_size;
  END LOOP;

  RETURN QUERY
  SELECT 'weather_cache'::TEXT,              weather_deleted
  UNION ALL
  SELECT 'findr_conditions_snapshots'::TEXT, conditions_deleted
  UNION ALL
  SELECT 'moon_cache'::TEXT,                moon_deleted
  UNION ALL
  SELECT 'tide_cache'::TEXT,                tide_deleted
  UNION ALL
  SELECT 'translation_cache'::TEXT,         translation_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_stale_cache_data() TO service_role;
