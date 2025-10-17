-- Migration: Increase moon cache coordinate precision to ~100m grid
-- Created: 2025-10-16
-- Purpose: Align lunar/sun cache buckets with 3 decimal (~110m) precision used by weather services

BEGIN;

-- Update bucket precision (previously numeric(5,1))
ALTER TABLE public.moon_cache
  ALTER COLUMN lat_bucket TYPE NUMERIC(7,3) USING lat_bucket::NUMERIC(7,3),
  ALTER COLUMN lon_bucket TYPE NUMERIC(8,3) USING lon_bucket::NUMERIC(8,3);

-- Normalise existing rows to 3-decimal buckets
UPDATE public.moon_cache
SET
  lat_bucket = ROUND(lat_bucket::numeric, 3),
  lon_bucket = ROUND(lon_bucket::numeric, 3);

-- Document the tighter grid
COMMENT ON COLUMN public.moon_cache.lat_bucket IS 'Latitude bucket rounded to 3 decimals (~110m precision at equator, ~70m at 50°N)';
COMMENT ON COLUMN public.moon_cache.lon_bucket IS 'Longitude bucket rounded to 3 decimals (~110m precision at equator, ~70m at 50°N)';

COMMIT;
