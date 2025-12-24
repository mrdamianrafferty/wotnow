-- ============================================================================
-- Performance Optimization: Spatial Index for grid_025deg
-- Generated: 2025-12-24
--
-- Problem: grid_025deg queries account for ~27% of DB load
--   - Unfiltered queries: 837ms mean (785 calls)
--   - Bbox filtered queries: 152ms mean (2,962 calls)
--
-- Solution: Add composite index for bounding box range queries
-- ============================================================================

-- Index for bounding box range queries (lon_max >= x AND lon_min <= y AND ...)
-- This covers the common query pattern:
--   WHERE lon_max >= $1 AND lon_min <= $2 AND lat_max >= $3 AND lat_min <= $4
CREATE INDEX IF NOT EXISTS grid_025deg_bbox_idx
ON public.grid_025deg (lon_min, lon_max, lat_min, lat_max);

-- Also add individual column indexes for partial range queries
CREATE INDEX IF NOT EXISTS grid_025deg_lat_range_idx
ON public.grid_025deg (lat_min, lat_max);

CREATE INDEX IF NOT EXISTS grid_025deg_lon_range_idx
ON public.grid_025deg (lon_min, lon_max);

-- Update statistics for query planner
ANALYZE public.grid_025deg;

COMMENT ON INDEX public.grid_025deg_bbox_idx IS
'Composite index for bounding box queries - optimizes lat/lon range filtering';
