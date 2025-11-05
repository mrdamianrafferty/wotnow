-- Phase 2: Create pressure_snapshots table for real-time pressure trend data
-- Migration: 20251105000006_create_pressure_snapshots_table.sql
-- Description: Store hourly pressure readings from MET Norway at rounded coordinates
-- Strategy: Round coordinates to 0 decimal places (per MET Norway caching recommendation)
-- Related: docs/PRESSURE_TREND_DATA_STRATEGY.md

-- Create table for pressure snapshots
CREATE TABLE IF NOT EXISTS pressure_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_rounded integer NOT NULL,     -- Rounded to 0 decimal places (e.g., 51)
  lon_rounded integer NOT NULL,     -- Rounded to 0 decimal places (e.g., 0)
  captured_at timestamptz NOT NULL,
  pressure_hpa numeric NOT NULL,
  pressure_3h_ago_hpa numeric,      -- For trend calculation
  pressure_6h_ago_hpa numeric,      -- For trend calculation
  trend_3h_hpa numeric,             -- Δ pressure over 3 hours
  trend_6h_hpa numeric,             -- Δ pressure over 6 hours
  trend_category text,              -- 'rising', 'steady', 'falling', 'rapid_falling', 'unknown'
  source text NOT NULL DEFAULT 'met_norway',
  raw_json jsonb,                   -- Store full MET Norway timeseries for debugging
  created_at timestamptz DEFAULT now(),

  -- Ensure one snapshot per coordinate per hour
  UNIQUE(lat_rounded, lon_rounded, captured_at)
);

-- Index for fast lookups by coordinates and time
CREATE INDEX idx_pressure_snapshots_coords_time
  ON pressure_snapshots(lat_rounded, lon_rounded, captured_at DESC);

-- Index for finding recent snapshots
CREATE INDEX idx_pressure_snapshots_captured_at
  ON pressure_snapshots(captured_at DESC);

-- Index for trend category queries
CREATE INDEX idx_pressure_snapshots_trend
  ON pressure_snapshots(trend_category);

-- Add check constraint for valid trend categories
ALTER TABLE pressure_snapshots
  ADD CONSTRAINT pressure_snapshots_trend_category_check
  CHECK (trend_category IN ('rising', 'steady', 'falling', 'rapid_falling', 'unknown'));

-- Add check constraint for reasonable pressure values (950-1050 hPa is typical range)
ALTER TABLE pressure_snapshots
  ADD CONSTRAINT pressure_snapshots_pressure_range_check
  CHECK (pressure_hpa BETWEEN 900 AND 1100);

-- Helper function to get pressure trend for a location
CREATE OR REPLACE FUNCTION get_pressure_trend(
  p_lat numeric,
  p_lon numeric,
  p_time timestamptz DEFAULT NOW()
) RETURNS TABLE (
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
BEGIN
  -- Round coordinates to match stored data
  rounded_lat := ROUND(p_lat);
  rounded_lon := ROUND(p_lon);

  RETURN QUERY
  SELECT
    ps.pressure_hpa,
    ps.trend_3h_hpa,
    ps.trend_category,
    ps.captured_at,
    EXTRACT(EPOCH FROM (p_time - ps.captured_at))::integer / 60 AS age_minutes
  FROM pressure_snapshots ps
  WHERE ps.lat_rounded = rounded_lat
    AND ps.lon_rounded = rounded_lon
    AND ps.captured_at <= p_time
  ORDER BY ps.captured_at DESC
  LIMIT 1;
END;
$$;

-- Grant permissions
GRANT SELECT ON pressure_snapshots TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_pressure_trend(numeric, numeric, timestamptz) TO authenticated, anon;

-- Enable RLS (but allow read for all authenticated users)
ALTER TABLE pressure_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to pressure snapshots"
  ON pressure_snapshots
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Service role can insert/update (for cron jobs)
CREATE POLICY "Allow service role full access"
  ON pressure_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE pressure_snapshots IS
'Hourly pressure readings from MET Norway at rounded coordinates (0 decimal places). Used for calculating pressure trends in bite score predictions. Coordinates are rounded per MET Norway''s caching recommendation.';

COMMENT ON COLUMN pressure_snapshots.lat_rounded IS
'Latitude rounded to 0 decimal places (e.g., 51.234 → 51). Creates ~111km grid, appropriate for pressure systems.';

COMMENT ON COLUMN pressure_snapshots.lon_rounded IS
'Longitude rounded to 0 decimal places (e.g., -0.127 → 0). Creates ~111km grid, appropriate for pressure systems.';

COMMENT ON COLUMN pressure_snapshots.trend_3h_hpa IS
'Pressure change over 3 hours (current - 3h ago). Positive = rising, negative = falling.';

COMMENT ON COLUMN pressure_snapshots.trend_category IS
'Categorized trend: rising (≥+2 hPa), steady (-2 to +2), falling (≤-2), rapid_falling (≤-5), unknown (insufficient data).';

COMMENT ON FUNCTION get_pressure_trend IS
'Get most recent pressure trend for a location by rounding coordinates and finding nearest snapshot. Returns pressure, trend, category, and data age.';
