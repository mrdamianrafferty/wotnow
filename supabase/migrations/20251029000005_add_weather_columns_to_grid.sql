-- Add Real-Time Weather Columns to grid_conditions_latest
-- Week 1: Data Pipeline for Real-Time Bite Score Framework
--
-- COLUMNS ADDED:
-- 1. Wind/Wave: wind_speed_ms, wind_direction_deg, wind_gust_ms, wave_height_m
-- 2. Pressure: air_pressure_hpa, pressure_trend, pressure_3h_change_hpa
-- 3. Micro-Weather: cloud_cover_pct, precipitation_mm, precipitation_type
-- 4. Tide: next_high_tide_at, next_low_tide_at, tide_flow_speed_ms, tide_phase
-- 5. Water Clarity: kd490 (light attenuation coefficient)

-- ============================================================================
-- WIND & WAVE DATA
-- ============================================================================

ALTER TABLE grid_conditions_latest
ADD COLUMN IF NOT EXISTS wind_speed_ms double precision,
ADD COLUMN IF NOT EXISTS wind_direction_deg double precision,
ADD COLUMN IF NOT EXISTS wind_gust_ms double precision,
ADD COLUMN IF NOT EXISTS wave_height_m double precision,
ADD COLUMN IF NOT EXISTS wave_direction_deg double precision,
ADD COLUMN IF NOT EXISTS wave_period_s double precision;

COMMENT ON COLUMN grid_conditions_latest.wind_speed_ms IS
'Wind speed in meters per second (MET Norway standard). Convert to knots: × 1.94384';

COMMENT ON COLUMN grid_conditions_latest.wind_direction_deg IS
'Wind direction in degrees (0-360). 0/360 = North, 90 = East, 180 = South, 270 = West';

COMMENT ON COLUMN grid_conditions_latest.wind_gust_ms IS
'Wind gust speed in meters per second. Peak instantaneous wind speed';

COMMENT ON COLUMN grid_conditions_latest.wave_height_m IS
'Significant wave height in meters (Hs). Average height of highest 1/3 of waves';

COMMENT ON COLUMN grid_conditions_latest.wave_direction_deg IS
'Wave direction in degrees (0-360). Direction waves are coming FROM';

COMMENT ON COLUMN grid_conditions_latest.wave_period_s IS
'Wave period in seconds. Time between successive wave crests';

-- ============================================================================
-- BAROMETRIC PRESSURE
-- ============================================================================

ALTER TABLE grid_conditions_latest
ADD COLUMN IF NOT EXISTS air_pressure_hpa double precision,
ADD COLUMN IF NOT EXISTS pressure_trend text,
ADD COLUMN IF NOT EXISTS pressure_3h_change_hpa double precision;

COMMENT ON COLUMN grid_conditions_latest.air_pressure_hpa IS
'Barometric pressure at sea level in hectopascals (hPa). 1013 hPa = standard atmosphere';

COMMENT ON COLUMN grid_conditions_latest.pressure_trend IS
'Pressure trend: rising (>+1 hPa/3h), steady (±1 hPa/3h), falling (<-1 hPa/3h), rapid_drop (<-3 hPa/3h)';

COMMENT ON COLUMN grid_conditions_latest.pressure_3h_change_hpa IS
'Pressure change over last 3 hours in hPa. Positive = rising, negative = falling';

-- ============================================================================
-- MICRO-WEATHER (Clouds, Precipitation)
-- ============================================================================

ALTER TABLE grid_conditions_latest
ADD COLUMN IF NOT EXISTS cloud_cover_pct double precision,
ADD COLUMN IF NOT EXISTS precipitation_mm double precision,
ADD COLUMN IF NOT EXISTS precipitation_type text;

COMMENT ON COLUMN grid_conditions_latest.cloud_cover_pct IS
'Cloud cover percentage (0-100). 0 = clear sky, 100 = fully overcast';

COMMENT ON COLUMN grid_conditions_latest.precipitation_mm IS
'Precipitation amount in millimeters over last hour';

COMMENT ON COLUMN grid_conditions_latest.precipitation_type IS
'Precipitation type: none, drizzle, light_rain, moderate_rain, heavy_rain, snow, sleet, squall';

-- ============================================================================
-- TIDE DATA
-- ============================================================================

ALTER TABLE grid_conditions_latest
ADD COLUMN IF NOT EXISTS next_high_tide_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS next_low_tide_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS tide_height_m double precision,
ADD COLUMN IF NOT EXISTS tide_flow_speed_ms double precision,
ADD COLUMN IF NOT EXISTS tide_phase text;

COMMENT ON COLUMN grid_conditions_latest.next_high_tide_at IS
'Timestamp of next high tide (UTC)';

COMMENT ON COLUMN grid_conditions_latest.next_low_tide_at IS
'Timestamp of next low tide (UTC)';

COMMENT ON COLUMN grid_conditions_latest.tide_height_m IS
'Current tide height in meters relative to chart datum';

COMMENT ON COLUMN grid_conditions_latest.tide_flow_speed_ms IS
'Estimated tidal flow speed in meters/second. Calculated from time to next tide change. Max at mid-flood/mid-ebb, min at slack';

COMMENT ON COLUMN grid_conditions_latest.tide_phase IS
'Tide phase: early_flood, mid_flood, high, early_ebb, mid_ebb, low_slack. Calculated from tide times and flow speed';

-- ============================================================================
-- WATER CLARITY
-- ============================================================================

ALTER TABLE grid_conditions_latest
ADD COLUMN IF NOT EXISTS kd490 double precision;

COMMENT ON COLUMN grid_conditions_latest.kd490 IS
'Diffuse attenuation coefficient at 490nm (m⁻¹). Water clarity metric from CMEMS. Lower = clearer. Typical: 0.04 (very clear) to 0.5+ (very turbid)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate tide phase from tide times
CREATE OR REPLACE FUNCTION calculate_tide_phase(
  p_current_time timestamp with time zone,
  p_next_high timestamp with time zone,
  p_next_low timestamp with time zone
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  minutes_to_high integer;
  minutes_to_low integer;
  minutes_to_next integer;
  is_flooding boolean;
BEGIN
  -- Calculate minutes to each tide
  minutes_to_high := EXTRACT(EPOCH FROM (p_next_high - p_current_time)) / 60;
  minutes_to_low := EXTRACT(EPOCH FROM (p_next_low - p_current_time)) / 60;

  -- Determine if we're flooding (approaching high) or ebbing (approaching low)
  is_flooding := ABS(minutes_to_high) < ABS(minutes_to_low);
  minutes_to_next := LEAST(ABS(minutes_to_high), ABS(minutes_to_low));

  -- Classify phase based on time to next tide change
  IF is_flooding THEN
    IF minutes_to_next < 30 THEN
      RETURN 'high';  -- Within 30 min of high tide = slack
    ELSIF minutes_to_next < 120 THEN
      RETURN 'mid_flood';  -- 30-120 min to high = mid-flood (peak flow)
    ELSE
      RETURN 'early_flood';  -- >120 min to high = early flood (building flow)
    END IF;
  ELSE
    IF minutes_to_next < 30 THEN
      RETURN 'low_slack';  -- Within 30 min of low tide = slack
    ELSIF minutes_to_next < 120 THEN
      RETURN 'mid_ebb';  -- 30-120 min to low = mid-ebb (peak flow)
    ELSE
      RETURN 'early_ebb';  -- >120 min to low = early ebb (building flow)
    END IF;
  END IF;
END;
$$;

-- Calculate tide flow speed (meters/second) from phase
CREATE OR REPLACE FUNCTION calculate_tide_flow_speed(
  p_current_time timestamp with time zone,
  p_next_high timestamp with time zone,
  p_next_low timestamp with time zone
)
RETURNS double precision
LANGUAGE plpgsql
AS $$
DECLARE
  minutes_to_high integer;
  minutes_to_low integer;
  minutes_to_next integer;
  phase_fraction double precision;
  max_flow_speed constant double precision := 2.0;  -- Typical max: 2 m/s (3.9 knots)
BEGIN
  -- Calculate minutes to each tide
  minutes_to_high := EXTRACT(EPOCH FROM (p_next_high - p_current_time)) / 60;
  minutes_to_low := EXTRACT(EPOCH FROM (p_next_low - p_current_time)) / 60;
  minutes_to_next := LEAST(ABS(minutes_to_high), ABS(minutes_to_low));

  -- Flow speed peaks at mid-tide (180 min before change), drops to zero at slack (0 min)
  -- Use sine wave: flow = max_flow * sin((π/2) * (1 - minutes_to_next/180))
  IF minutes_to_next > 180 THEN
    -- Early phase: building flow
    phase_fraction := (360 - minutes_to_next) / 180.0;
  ELSE
    -- Mid to slack: peak flow declining to zero
    phase_fraction := minutes_to_next / 180.0;
  END IF;

  -- Sine curve: 0 at slack, max at 90 min (mid-tide)
  RETURN max_flow_speed * SIN(RADIANS(90 * (1 - phase_fraction)));
END;
$$;

-- Calculate pressure trend from 3-hour change
CREATE OR REPLACE FUNCTION calculate_pressure_trend(
  pressure_change_hpa double precision
)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  IF pressure_change_hpa IS NULL THEN
    RETURN 'unknown';
  ELSIF pressure_change_hpa <= -3 THEN
    RETURN 'rapid_drop';
  ELSIF pressure_change_hpa < -1 THEN
    RETURN 'falling';
  ELSIF pressure_change_hpa <= 1 THEN
    RETURN 'steady';
  ELSE
    RETURN 'rising';
  END IF;
END;
$$;

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE '✅ grid_conditions_latest schema updated!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS ADDED:';
  RAISE NOTICE '  Wind/Wave: wind_speed_ms, wind_direction_deg, wind_gust_ms, wave_height_m';
  RAISE NOTICE '  Pressure: air_pressure_hpa, pressure_trend, pressure_3h_change_hpa';
  RAISE NOTICE '  Micro-Weather: cloud_cover_pct, precipitation_mm, precipitation_type';
  RAISE NOTICE '  Tide: next_high_tide_at, tide_flow_speed_ms, tide_phase';
  RAISE NOTICE '  Clarity: kd490 (water clarity metric)';
  RAISE NOTICE '';
  RAISE NOTICE 'HELPER FUNCTIONS CREATED:';
  RAISE NOTICE '  - calculate_tide_phase(current_time, next_high, next_low)';
  RAISE NOTICE '  - calculate_tide_flow_speed(current_time, next_high, next_low)';
  RAISE NOTICE '  - calculate_pressure_trend(pressure_change_hpa)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update data ingestion scripts to populate these columns';
END $$;
