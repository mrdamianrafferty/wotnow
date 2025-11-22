-- Migration: Create weather_cache table for Met.no API response caching
-- Created: 2025-11-22
-- Purpose: Cache Met.no weather forecast API responses to reduce external API latency (100-300ms per request)
--
-- Strategy:
-- - Weather forecasts are relatively stable over short periods
-- - Use spatial bucketing (4dp ~11m resolution for weather accuracy)
-- - Use hourly time bucketing (forecasts valid for ~1 hour)
-- - 1-hour TTL (weather can change, but forecasts are updated hourly)
-- - Modeled after tide_cache pattern
--
-- Performance Impact:
-- - Eliminates 100-300ms external API call on cache hit
-- - Expected cache hit rate: >85% for active fishing times
-- - Reduces load on free Met.no API (respectful API usage)

CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Spatial bucketing (4dp = ~11m resolution, appropriate for weather)
  lat_bucket NUMERIC(6,4) NOT NULL,
  lon_bucket NUMERIC(7,4) NOT NULL,

  -- Temporal bucketing (hourly)
  forecast_hour TIMESTAMPTZ NOT NULL,  -- Truncated to hour

  -- Met.no API response (stored as JSONB for flexibility)
  forecast_data JSONB NOT NULL,  -- Full MetNoLocationForecastResponse

  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),

  -- Constraints
  CONSTRAINT unique_weather_cache UNIQUE (lat_bucket, lon_bucket, forecast_hour)
);

-- Index for efficient cache lookup
CREATE INDEX IF NOT EXISTS idx_weather_cache_lookup
  ON weather_cache (lat_bucket, lon_bucket, forecast_hour, expires_at);

-- Index for cache expiry cleanup (future background job)
CREATE INDEX IF NOT EXISTS idx_weather_cache_expiry
  ON weather_cache (expires_at);

-- Enable Row-Level Security
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read from cache
CREATE POLICY "Allow authenticated users to read weather cache"
  ON weather_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write to cache (API routes)
CREATE POLICY "Allow service role to write weather cache"
  ON weather_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE weather_cache IS 'Cache for Met.no weather forecast API responses. Spatial bucketing at 4dp (~11m) with 1-hour TTL. Reduces external API latency from 100-300ms to <10ms on cache hit.';

COMMENT ON COLUMN weather_cache.lat_bucket IS 'Latitude rounded to 4 decimal places (~11m resolution)';
COMMENT ON COLUMN weather_cache.lon_bucket IS 'Longitude rounded to 4 decimal places (~11m resolution)';
COMMENT ON COLUMN weather_cache.forecast_hour IS 'Forecast time truncated to the hour (for cache bucketing)';
COMMENT ON COLUMN weather_cache.forecast_data IS 'Met.no locationforecast API response: {properties: {timeseries: [...]}}';
COMMENT ON COLUMN weather_cache.expires_at IS 'Cache expiry time. Default 1 hour from creation.';
