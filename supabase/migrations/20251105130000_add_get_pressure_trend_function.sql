-- Add get_pressure_trend() function for Phase 2
-- Date: 2025-11-05 13:00
--
-- This migration creates the get_pressure_trend() function that was referenced
-- but not created in the Phase 2 migration.

BEGIN;

-- ============================================================================
-- PART 1: DROP OLD FUNCTION AND CREATE get_pressure_trend() FUNCTION
-- ============================================================================

-- Drop the existing function (it might have different parameter defaults)
DROP FUNCTION IF EXISTS get_pressure_trend CASCADE;

CREATE OR REPLACE FUNCTION get_pressure_trend(
  p_lat numeric,
  p_lon numeric,
  p_time timestamptz
)
RETURNS TABLE (
  pressure_hpa numeric,
  trend_3h_hpa numeric,
  trend_category text,
  captured_at timestamptz,
  age_minutes integer
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  rounded_lat integer;
  rounded_lon integer;
  current_pressure_record RECORD;
  pressure_3h_ago_record RECORD;
BEGIN
  -- Round coordinates to match pressure_snapshots rounding
  rounded_lat := ROUND(p_lat);
  rounded_lon := ROUND(p_lon);

  -- Get current pressure (most recent snapshot within 90 minutes)
  SELECT
    ps.pressure_hpa,
    ps.captured_at
  INTO current_pressure_record
  FROM pressure_snapshots ps
  WHERE ps.lat_rounded = rounded_lat
    AND ps.lon_rounded = rounded_lon
    AND ps.captured_at <= p_time
    AND ps.captured_at >= p_time - INTERVAL '90 minutes'
  ORDER BY ps.captured_at DESC
  LIMIT 1;

  -- If no current pressure, return NULL
  IF current_pressure_record IS NULL THEN
    RETURN;
  END IF;

  -- Get pressure 3 hours ago (within ±30 minute window)
  SELECT
    ps.pressure_hpa,
    ps.captured_at
  INTO pressure_3h_ago_record
  FROM pressure_snapshots ps
  WHERE ps.lat_rounded = rounded_lat
    AND ps.lon_rounded = rounded_lon
    AND ps.captured_at <= (p_time - INTERVAL '3 hours' + INTERVAL '30 minutes')
    AND ps.captured_at >= (p_time - INTERVAL '3 hours' - INTERVAL '30 minutes')
  ORDER BY ABS(EXTRACT(EPOCH FROM (ps.captured_at - (p_time - INTERVAL '3 hours'))))
  LIMIT 1;

  -- Calculate trend and category
  IF pressure_3h_ago_record IS NOT NULL THEN
    trend_3h_hpa := current_pressure_record.pressure_hpa - pressure_3h_ago_record.pressure_hpa;

    -- Classify trend
    IF trend_3h_hpa <= -5.0 THEN
      trend_category := 'rapid_falling';
    ELSIF trend_3h_hpa <= -2.0 THEN
      trend_category := 'falling';
    ELSIF trend_3h_hpa >= 2.0 THEN
      trend_category := 'rising';
    ELSE
      trend_category := 'steady';
    END IF;
  ELSE
    -- No historical data, assume steady
    trend_3h_hpa := NULL;
    trend_category := 'steady';
  END IF;

  -- Calculate age
  age_minutes := EXTRACT(EPOCH FROM (p_time - current_pressure_record.captured_at)) / 60;

  -- Return result
  pressure_hpa := current_pressure_record.pressure_hpa;
  captured_at := current_pressure_record.captured_at;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION get_pressure_trend IS
'Gets current pressure and 3-hour trend for a location. Returns NULL if no recent data. Classifies trend as rapid_falling (≤-5.0), falling (≤-2.0), rising (≥+2.0), or steady.';

COMMIT;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_pressure_trend() function created!';
  RAISE NOTICE '';
  RAISE NOTICE 'Function signature:';
  RAISE NOTICE '  get_pressure_trend(lat numeric, lon numeric, time timestamptz)';
  RAISE NOTICE '';
  RAISE NOTICE 'Returns:';
  RAISE NOTICE '  - pressure_hpa: Current pressure';
  RAISE NOTICE '  - trend_3h_hpa: Change over 3 hours';
  RAISE NOTICE '  - trend_category: rapid_falling/falling/rising/steady';
  RAISE NOTICE '  - captured_at: Timestamp of measurement';
  RAISE NOTICE '  - age_minutes: How old the data is';
  RAISE NOTICE '';
END $$;
