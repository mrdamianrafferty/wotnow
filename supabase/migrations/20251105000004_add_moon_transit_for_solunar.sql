-- Phase 2: Add Moon Transit Time for Solunar Theory
-- Migration: 20251105000004_add_moon_transit_for_solunar.sql
-- Description: Add moon transit (upper culmination) time to support Solunar Theory bite score
-- Related: docs/PHASE_2_PRESSURE_CLOUD_BITE_SCORE.md section 2.7

-- Add moon transit column to moon_cache
ALTER TABLE moon_cache
ADD COLUMN IF NOT EXISTS moon_transit_iso timestamptz;

COMMENT ON COLUMN moon_cache.moon_transit_iso IS
'Time when moon crosses meridian (overhead/underfoot). Used for Solunar Theory major periods.';

-- Create helper function to calculate approximate moon transit
-- Transit ≈ midpoint between moonrise and moonset
CREATE OR REPLACE FUNCTION calculate_moon_transit(
  moonrise timestamptz,
  moonset timestamptz
) RETURNS timestamptz
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If we have both moonrise and moonset, return midpoint
  IF moonrise IS NOT NULL AND moonset IS NOT NULL THEN
    -- Handle case where moonset is before moonrise (crosses midnight)
    IF moonset < moonrise THEN
      -- Add 24 hours to moonset for calculation
      RETURN moonrise + ((moonset + INTERVAL '24 hours' - moonrise) / 2);
    ELSE
      RETURN moonrise + ((moonset - moonrise) / 2);
    END IF;
  END IF;

  -- If we only have one, estimate transit 6 hours after moonrise or 6 hours before moonset
  IF moonrise IS NOT NULL THEN
    RETURN moonrise + INTERVAL '6 hours';
  END IF;

  IF moonset IS NOT NULL THEN
    RETURN moonset - INTERVAL '6 hours';
  END IF;

  -- No data available
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION calculate_moon_transit(timestamptz, timestamptz) IS
'Calculates approximate moon transit time (upper culmination) from moonrise/moonset. Used for Solunar Theory major feeding periods.';

-- Backfill moon_transit_iso for existing records
UPDATE moon_cache
SET moon_transit_iso = calculate_moon_transit(moonrise_iso, moonset_iso)
WHERE moon_transit_iso IS NULL
  AND (moonrise_iso IS NOT NULL OR moonset_iso IS NOT NULL);

-- Create helper function to check if current time is within Solunar period
CREATE OR REPLACE FUNCTION is_in_solunar_period(
  current_time_utc timestamptz,
  moonrise timestamptz,
  moonset timestamptz,
  moon_transit timestamptz
) RETURNS TABLE (
  in_major_period boolean,
  in_minor_period boolean,
  minutes_to_major integer,
  minutes_to_minor integer
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  major_window_hours numeric := 1.0;  -- ±1 hour from transit = 2 hour window
  minor_window_hours numeric := 1.0;  -- ±1 hour from rise/set = 2 hour window
BEGIN
  -- Check major period (moon transit ± 1 hour)
  in_major_period := FALSE;
  minutes_to_major := NULL;

  IF moon_transit IS NOT NULL THEN
    IF current_time_utc BETWEEN
       (moon_transit - (major_window_hours || ' hours')::interval) AND
       (moon_transit + (major_window_hours || ' hours')::interval) THEN
      in_major_period := TRUE;
      minutes_to_major := 0;
    ELSE
      -- Calculate minutes until next major period
      minutes_to_major := EXTRACT(EPOCH FROM (moon_transit - current_time_utc)) / 60;
      IF minutes_to_major < 0 THEN
        -- If transit passed, calculate until tomorrow's transit (approximate)
        minutes_to_major := minutes_to_major + 1440; -- 24 hours * 60 min
      END IF;
    END IF;
  END IF;

  -- Check minor periods (moonrise/moonset ± 1 hour)
  in_minor_period := FALSE;
  minutes_to_minor := NULL;

  IF moonrise IS NOT NULL THEN
    IF current_time_utc BETWEEN
       (moonrise - (minor_window_hours || ' hours')::interval) AND
       (moonrise + (minor_window_hours || ' hours')::interval) THEN
      in_minor_period := TRUE;
      minutes_to_minor := 0;
    END IF;
  END IF;

  IF NOT in_minor_period AND moonset IS NOT NULL THEN
    IF current_time_utc BETWEEN
       (moonset - (minor_window_hours || ' hours')::interval) AND
       (moonset + (minor_window_hours || ' hours')::interval) THEN
      in_minor_period := TRUE;
      minutes_to_minor := 0;
    END IF;
  END IF;

  -- If not in minor period, calculate minutes to nearest one
  IF NOT in_minor_period THEN
    IF moonrise IS NOT NULL THEN
      minutes_to_minor := EXTRACT(EPOCH FROM (moonrise - current_time_utc)) / 60;
      IF moonset IS NOT NULL THEN
        minutes_to_minor := LEAST(minutes_to_minor, EXTRACT(EPOCH FROM (moonset - current_time_utc)) / 60);
      END IF;
    ELSIF moonset IS NOT NULL THEN
      minutes_to_minor := EXTRACT(EPOCH FROM (moonset - current_time_utc)) / 60;
    END IF;
  END IF;

  RETURN QUERY SELECT in_major_period, in_minor_period, minutes_to_major::integer, minutes_to_minor::integer;
END;
$$;

COMMENT ON FUNCTION is_in_solunar_period(timestamptz, timestamptz, timestamptz, timestamptz) IS
'Checks if current time falls within Solunar Theory feeding periods. Major period: ±1hr from moon transit. Minor periods: ±1hr from moonrise/moonset.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_moon_transit(timestamptz, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_in_solunar_period(timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated, anon;
