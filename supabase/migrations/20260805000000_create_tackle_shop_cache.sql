-- Migration: Create tackle_shop_cache table for Google Places tackle-shop lookups
-- Created: 2026-08-05
-- Purpose: The hourly notification cron (pages/api/cron/check-notifications.ts) was
-- calling the legacy Google Places Nearby Search API fresh for every qualifying user,
-- every hour, with no caching at all -- part of the ~250/day Places API volume found
-- during the 2026-08 Cloud Billing investigation. Tackle shops don't move and a user's
-- fishing spot rarely changes, so this caches results the same way lib/findNearbyTackleShops.ts
-- already does client-side (0.5-degree bucketing, 30-day TTL) -- but server-side and
-- persistent, so it survives across cron runs and serverless instances (unlike the
-- in-memory Map in pages/api/places/nearby.ts, which resets on every cold start).
--
-- Strategy:
-- - Spatial bucketing at 0.5 degrees (~55km) -- coarse on purpose, tackle shop
--   relevance doesn't need to be tighter than "same general area"
-- - 30-day TTL -- tackle shops are a slow-changing dataset
-- - Single nearest shop only (matches NearbyTackleShop usage in the notification email)

CREATE TABLE IF NOT EXISTS tackle_shop_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Spatial bucketing (0.5 degrees ~= 55km, matches lib/findNearbyTackleShops.ts)
  lat_bucket NUMERIC(4,1) NOT NULL,
  lon_bucket NUMERIC(4,1) NOT NULL,

  -- Nearest tackle shop result (NearbyTackleShop shape from lib/findr/emailTemplates.ts),
  -- or NULL if the last lookup found nothing nearby -- still worth caching so a shop-less
  -- area doesn't get re-queried every run.
  shop JSONB,

  -- Cache metadata
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  CONSTRAINT unique_tackle_shop_cache UNIQUE (lat_bucket, lon_bucket)
);

CREATE INDEX IF NOT EXISTS idx_tackle_shop_cache_lookup
  ON tackle_shop_cache (lat_bucket, lon_bucket, expires_at);

CREATE INDEX IF NOT EXISTS idx_tackle_shop_cache_expiry
  ON tackle_shop_cache (expires_at);

ALTER TABLE tackle_shop_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read tackle shop cache" ON tackle_shop_cache;
CREATE POLICY "Allow authenticated users to read tackle shop cache"
  ON tackle_shop_cache
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role to write tackle shop cache" ON tackle_shop_cache;
CREATE POLICY "Allow service role to write tackle shop cache"
  ON tackle_shop_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE tackle_shop_cache IS 'Server-side cache for the nearest-tackle-shop Google Places lookup. Spatial bucketing at 0.5 degrees (~55km) with 30-day TTL. Replaces the uncached per-request call in the hourly notification cron.';
COMMENT ON COLUMN tackle_shop_cache.lat_bucket IS 'Latitude rounded to nearest 0.5 degrees';
COMMENT ON COLUMN tackle_shop_cache.lon_bucket IS 'Longitude rounded to nearest 0.5 degrees';
COMMENT ON COLUMN tackle_shop_cache.shop IS 'Cached NearbyTackleShop JSON, or NULL when no shop was found nearby';
COMMENT ON COLUMN tackle_shop_cache.expires_at IS 'Cache expiry time. Default 30 days from creation.';
