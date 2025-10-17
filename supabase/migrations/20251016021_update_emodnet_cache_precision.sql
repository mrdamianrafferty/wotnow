-- Migration: Update EMODnet cache precision to ~100m grid
-- Created: 2025-10-16
-- Purpose: Increase coordinate precision to 3 decimal places (~110m at equator) to better capture bathymetry/substrate variation

BEGIN;

-- Drop dependent objects that rely on the old column precision
DROP VIEW IF EXISTS emodnet_cache_stats;

-- Widen coordinate precision to support rounding at 3 decimal places
ALTER TABLE emodnet_cache
  ALTER COLUMN lat TYPE NUMERIC(7,3) USING lat::NUMERIC(7,3),
  ALTER COLUMN lon TYPE NUMERIC(8,3) USING lon::NUMERIC(8,3);

COMMENT ON COLUMN emodnet_cache.lat IS 'Latitude rounded to 3 decimals (~110m precision at equator, ~70m at 50°N)';
COMMENT ON COLUMN emodnet_cache.lon IS 'Longitude rounded to 3 decimals (~110m precision at equator, ~70m at 50°N)';

-- Refresh getter with new rounding precision
CREATE OR REPLACE FUNCTION get_emodnet_cache(
  query_lat NUMERIC,
  query_lon NUMERIC
)
RETURNS TABLE(
  depth_meters NUMERIC,
  depth_confidence TEXT,
  substrate TEXT,
  substrate_confidence TEXT,
  substrate_raw_classification TEXT,
  cached BOOLEAN,
  cache_age_hours NUMERIC
) AS $$
DECLARE
  rounded_lat NUMERIC(7,3);
  rounded_lon NUMERIC(8,3);
BEGIN
  -- Round coordinates to 3 decimals (~100m grid)
  rounded_lat := ROUND(query_lat::numeric, 3);
  rounded_lon := ROUND(query_lon::numeric, 3);

  -- Try to find valid cache entry
  RETURN QUERY
  SELECT 
    c.depth_meters,
    c.depth_confidence,
    c.substrate,
    c.substrate_confidence,
    c.substrate_raw_classification,
    TRUE as cached,
    EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 as cache_age_hours
  FROM emodnet_cache c
  WHERE c.lat = rounded_lat
    AND c.lon = rounded_lon
    AND c.expires_at > NOW()
  LIMIT 1;

  -- Update access stats if found
  UPDATE emodnet_cache
  SET 
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE lat = rounded_lat
    AND lon = rounded_lon
    AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_emodnet_cache IS 'Retrieve cached EMODnet data if available and not expired using ~100m grid. Updates access statistics.';

-- Refresh setter with new rounding precision
CREATE OR REPLACE FUNCTION set_emodnet_cache(
  query_lat NUMERIC,
  query_lon NUMERIC,
  p_depth_meters NUMERIC DEFAULT NULL,
  p_depth_confidence TEXT DEFAULT NULL,
  p_substrate TEXT DEFAULT NULL,
  p_substrate_confidence TEXT DEFAULT NULL,
  p_substrate_raw TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  rounded_lat NUMERIC(7,3);
  rounded_lon NUMERIC(8,3);
BEGIN
  -- Round coordinates to 3 decimals (~100m grid)
  rounded_lat := ROUND(query_lat::numeric, 3);
  rounded_lon := ROUND(query_lon::numeric, 3);

  -- Insert or update cache entry
  INSERT INTO emodnet_cache (
    lat,
    lon,
    depth_meters,
    depth_confidence,
    substrate,
    substrate_confidence,
    substrate_raw_classification,
    last_error,
    error_count
  ) VALUES (
    rounded_lat,
    rounded_lon,
    p_depth_meters,
    p_depth_confidence,
    p_substrate,
    p_substrate_confidence,
    p_substrate_raw,
    p_error,
    CASE WHEN p_error IS NOT NULL THEN 1 ELSE 0 END
  )
  ON CONFLICT (lat, lon) DO UPDATE SET
    depth_meters = COALESCE(EXCLUDED.depth_meters, emodnet_cache.depth_meters),
    depth_confidence = COALESCE(EXCLUDED.depth_confidence, emodnet_cache.depth_confidence),
    substrate = COALESCE(EXCLUDED.substrate, emodnet_cache.substrate),
    substrate_confidence = COALESCE(EXCLUDED.substrate_confidence, emodnet_cache.substrate_confidence),
    substrate_raw_classification = COALESCE(EXCLUDED.substrate_raw_classification, emodnet_cache.substrate_raw_classification),
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '90 days',
    last_accessed_at = NOW(),
    access_count = 1,
    last_error = EXCLUDED.last_error,
    error_count = CASE 
      WHEN EXCLUDED.last_error IS NOT NULL THEN emodnet_cache.error_count + 1 
      ELSE 0 
    END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_emodnet_cache IS 'Store EMODnet API response in cache with 90-day TTL using ~100m grid. Upserts existing entries.';

-- Refresh invalidator with new precision constants
CREATE OR REPLACE FUNCTION invalidate_emodnet_cache(
  query_lat NUMERIC,
  query_lon NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  rounded_lat NUMERIC(7,3);
  rounded_lon NUMERIC(8,3);
  deleted_count INTEGER;
BEGIN
  rounded_lat := ROUND(query_lat::numeric, 3);
  rounded_lon := ROUND(query_lon::numeric, 3);

  DELETE FROM emodnet_cache
  WHERE lat = rounded_lat AND lon = rounded_lon;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_emodnet_cache IS 'Manually invalidate cache for a specific ~100m grid location. Returns true if entry existed.';

-- Recreate cache statistics view with updated precision
CREATE OR REPLACE VIEW emodnet_cache_stats AS
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at > NOW()) as valid_entries,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_entries,
  ROUND(AVG(access_count), 2) as avg_access_count,
  MAX(access_count) as max_access_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 1) as avg_age_days,
  COUNT(*) FILTER (WHERE last_error IS NOT NULL) as entries_with_errors,
  COUNT(DISTINCT lat || ',' || lon) as unique_locations
FROM emodnet_cache;

COMMENT ON VIEW emodnet_cache_stats IS 'Statistics about EMODnet cache usage and health';

COMMIT;
