-- Migration: Add EMODnet API response caching
-- Created: 2025-10-16
-- Purpose: Cache bathymetry and substrate data (90-day TTL) to reduce API latency

-- EMODnet data is extremely stable (seabed doesn't change quickly)
-- Aggressive caching: 90 days (3 months)
-- Coordinates rounded to 2 decimal places (~1km precision)

CREATE TABLE IF NOT EXISTS emodnet_cache (
  id BIGSERIAL PRIMARY KEY,
  
  -- Location key (rounded to 2 decimals for ~1km grid)
  lat NUMERIC(4,2) NOT NULL,  -- e.g., 50.07
  lon NUMERIC(5,2) NOT NULL,  -- e.g., -5.53
  
  -- Bathymetry data
  depth_meters NUMERIC(8,2),
  depth_confidence TEXT,
  depth_source TEXT DEFAULT 'emodnet',
  
  -- Substrate data
  substrate TEXT,  -- rock, sand, gravel, mud, mixed, unknown
  substrate_confidence TEXT,
  substrate_source TEXT DEFAULT 'emodnet',
  substrate_raw_classification TEXT,
  
  -- Cache metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_count INTEGER NOT NULL DEFAULT 1,
  
  -- Error tracking
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  
  CONSTRAINT unique_location UNIQUE (lat, lon)
);

-- Index for fast lookups by location
CREATE INDEX idx_emodnet_cache_location ON emodnet_cache(lat, lon);

-- Index for cache cleanup (remove expired entries)
CREATE INDEX idx_emodnet_cache_expires ON emodnet_cache(expires_at);

-- Index for popular locations (most accessed)
CREATE INDEX idx_emodnet_cache_access ON emodnet_cache(access_count DESC);

-- Comments for documentation
COMMENT ON TABLE emodnet_cache IS 'Cache for EMODnet bathymetry and substrate API responses. Seabed data is stable - 90 day TTL is safe.';
COMMENT ON COLUMN emodnet_cache.lat IS 'Latitude rounded to 2 decimals (~1.1km precision at equator, ~700m at 50°N)';
COMMENT ON COLUMN emodnet_cache.lon IS 'Longitude rounded to 2 decimals (~1.1km precision at equator, ~700m at 50°N)';
COMMENT ON COLUMN emodnet_cache.expires_at IS 'Cache expires after 90 days. Seabed substrate and depth change very slowly.';
COMMENT ON COLUMN emodnet_cache.access_count IS 'Track popular fishing locations for analytics and cache prioritization';

-- Function to get cached EMODnet data (checks expiry, updates access stats)
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
  rounded_lat NUMERIC(4,2);
  rounded_lon NUMERIC(5,2);
BEGIN
  -- Round coordinates to 2 decimals (~1km grid)
  rounded_lat := ROUND(query_lat::numeric, 2);
  rounded_lon := ROUND(query_lon::numeric, 2);
  
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

COMMENT ON FUNCTION get_emodnet_cache IS 'Retrieve cached EMODnet data if available and not expired. Updates access statistics.';

-- Function to store EMODnet API response in cache
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
  rounded_lat NUMERIC(4,2);
  rounded_lon NUMERIC(5,2);
BEGIN
  -- Round coordinates to 2 decimals (~1km grid)
  rounded_lat := ROUND(query_lat::numeric, 2);
  rounded_lon := ROUND(query_lon::numeric, 2);
  
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

COMMENT ON FUNCTION set_emodnet_cache IS 'Store EMODnet API response in cache with 90-day TTL. Upserts existing entries.';

-- Function to clean up expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_emodnet_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM emodnet_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_emodnet_cache IS 'Remove expired cache entries. Returns count of deleted rows.';

-- Function to invalidate cache for specific location (manual override)
CREATE OR REPLACE FUNCTION invalidate_emodnet_cache(
  query_lat NUMERIC,
  query_lon NUMERIC
)
RETURNS BOOLEAN AS $$
DECLARE
  rounded_lat NUMERIC(4,2);
  rounded_lon NUMERIC(5,2);
  deleted_count INTEGER;
BEGIN
  rounded_lat := ROUND(query_lat::numeric, 2);
  rounded_lon := ROUND(query_lon::numeric, 2);
  
  DELETE FROM emodnet_cache
  WHERE lat = rounded_lat AND lon = rounded_lon;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_emodnet_cache IS 'Manually invalidate cache for a specific location. Returns true if entry existed.';

-- View for cache statistics
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

-- Grant permissions (adjust as needed for your role setup)
-- GRANT SELECT ON emodnet_cache TO anon, authenticated;
-- GRANT EXECUTE ON FUNCTION get_emodnet_cache TO anon, authenticated;
