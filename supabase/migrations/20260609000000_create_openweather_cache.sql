-- Migration: Create openweather_cache table for OpenWeather One Call 3.0 caching
-- Created: 2026-06-09
-- Purpose: Reduce OpenWeather One Call 3.0 usage (1000/day quota). The previous
--          in-memory cache does not survive Vercel serverless cold starts, so under
--          real traffic nearly every request was a fresh One Call 3.0 call.
--
-- Strategy:
-- - Dedicated table (NOT the Met.no-owned weather_cache, which has no provider column
--   and would clobber differently-shaped data).
-- - Single text cache_key encodes provider + 2dp coords (~1.1km) + hour + units + exclude.
-- - 30-minute TTL (current weather is stable over that window; forecasts update hourly).
-- - Modeled on the weather_cache / tide_cache pattern.

CREATE TABLE IF NOT EXISTS openweather_cache (
  cache_key TEXT PRIMARY KEY,

  -- Full getFullWeather() payload (OpenWeather One Call 3.0 normalized shape, or 2.5 fallback)
  forecast_data JSONB NOT NULL,

  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

-- Index for cache expiry cleanup / filtering
CREATE INDEX IF NOT EXISTS idx_openweather_cache_expiry
  ON openweather_cache (expires_at);

-- Enable Row-Level Security
ALTER TABLE openweather_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read from cache
DROP POLICY IF EXISTS "Allow authenticated users to read openweather cache" ON openweather_cache;
CREATE POLICY "Allow authenticated users to read openweather cache"
  ON openweather_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write to cache (API routes)
DROP POLICY IF EXISTS "Allow service role to write openweather cache" ON openweather_cache;
CREATE POLICY "Allow service role to write openweather cache"
  ON openweather_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE openweather_cache IS 'Durable cache for OpenWeather One Call 3.0 (getFullWeather) responses. 2dp spatial bucketing (~1.1km) + hourly bucketing, 30-minute TTL. Keeps One Call 3.0 within its daily quota.';
COMMENT ON COLUMN openweather_cache.cache_key IS 'ow3:{lat2dp}:{lon2dp}:{forecastHourISO}:{units}:{exclude}';
COMMENT ON COLUMN openweather_cache.forecast_data IS 'getFullWeather() FullWeather payload (One Call 3.0 normalized, or 2.5 fallback).';
COMMENT ON COLUMN openweather_cache.expires_at IS 'Cache expiry time. Default 30 minutes from creation.';
