-- Migration: Create tide_cache table for WorldTides API response caching
-- Created: 2025-11-22
-- Purpose: Cache WorldTides API responses to reduce external API latency (680-1686ms per request)
--
-- Strategy:
-- - Tides are predictable and change slowly (predictable up to years in advance)
-- - Use spatial bucketing (3dp ~110m) to reuse cache across nearby coordinates
-- - Cache 7-day forecasts with 24-hour TTL
-- - Modeled after moon_cache table pattern
--
-- Performance Impact:
-- - Eliminates 680-1686ms external API call on cache hit
-- - Expected cache hit rate: >90% for common fishing locations

CREATE TABLE IF NOT EXISTS tide_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Spatial bucketing (3dp = ~110m resolution, sufficient for tide patterns)
  lat_bucket NUMERIC(6,3) NOT NULL,  -- Rounded to 3 decimal places
  lon_bucket NUMERIC(6,3) NOT NULL,  -- Rounded to 3 decimal places

  -- Date range for cached data
  start_date DATE NOT NULL,           -- Start of 7-day forecast
  days INTEGER NOT NULL DEFAULT 7,    -- Number of days in forecast

  -- WorldTides API response (stored as JSONB for flexibility)
  extremes JSONB NOT NULL,            -- Array of tide extremes: [{date, height, type}, ...]
  datum TEXT,                         -- Tide datum (e.g., 'CD' = Chart Datum)

  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Constraints
  CONSTRAINT unique_tide_cache UNIQUE (lat_bucket, lon_bucket, start_date)
);

-- Index for efficient cache lookup
CREATE INDEX IF NOT EXISTS idx_tide_cache_lookup
  ON tide_cache (lat_bucket, lon_bucket, start_date, expires_at);

-- Index for cache expiry cleanup (future background job)
CREATE INDEX IF NOT EXISTS idx_tide_cache_expiry
  ON tide_cache (expires_at);

-- Enable Row-Level Security
ALTER TABLE tide_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read from cache
CREATE POLICY "Allow authenticated users to read tide cache"
  ON tide_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write to cache (API routes)
CREATE POLICY "Allow service role to write tide cache"
  ON tide_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE tide_cache IS 'Cache for WorldTides API responses. Spatial bucketing at 3dp (~110m) with 24-hour TTL. Reduces external API latency from 680-1686ms to <10ms on cache hit.';

COMMENT ON COLUMN tide_cache.lat_bucket IS 'Latitude rounded to 3 decimal places (~110m resolution)';
COMMENT ON COLUMN tide_cache.lon_bucket IS 'Longitude rounded to 3 decimal places (~110m resolution)';
COMMENT ON COLUMN tide_cache.start_date IS 'Start date of the tide forecast (inclusive)';
COMMENT ON COLUMN tide_cache.extremes IS 'WorldTides API extremes array: [{date: ISO8601, height: number, type: "High"|"Low"}, ...]';
COMMENT ON COLUMN tide_cache.expires_at IS 'Cache expiry time. Default 24 hours from creation.';
