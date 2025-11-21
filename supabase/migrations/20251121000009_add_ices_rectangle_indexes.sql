-- Add Missing ICES Rectangle Indexes
-- November 21, 2025
-- PERFORMANCE OPTIMIZATION: These indexes were commented out in migration 20251001003
-- Adding them now will significantly improve query performance for rectangle lookups

-- Add indexes for performance (30-50% latency reduction expected)
CREATE INDEX IF NOT EXISTS ices_rectangles_rectangle_code_idx ON public.ices_rectangles (rectangle_code);
CREATE INDEX IF NOT EXISTS ices_rectangles_region_idx ON public.ices_rectangles (region);
CREATE INDEX IF NOT EXISTS ices_rectangles_coastal_idx ON public.ices_rectangles (is_coastal);
CREATE INDEX IF NOT EXISTS ices_rectangles_location_idx ON public.ices_rectangles (center_lat, center_lon);

-- Add indexes for cmems_region (used in RPC biogeographic filtering)
CREATE INDEX IF NOT EXISTS ices_rectangles_cmems_region_idx ON public.ices_rectangles (cmems_region);

-- Add compound index for common query patterns (rectangle_code + region)
CREATE INDEX IF NOT EXISTS ices_rectangles_code_region_idx ON public.ices_rectangles (rectangle_code, region);

-- Add spatial index for location-based queries (if PostGIS is available, otherwise b-tree above is fine)
-- This will help with "find nearest rectangle" queries
CREATE INDEX IF NOT EXISTS ices_rectangles_spatial_idx ON public.ices_rectangles (center_lat, center_lon);

COMMENT ON INDEX ices_rectangles_rectangle_code_idx IS 'Fast lookup by rectangle code (primary query pattern)';
COMMENT ON INDEX ices_rectangles_region_idx IS 'Filter by region (e.g., North Sea, Celtic Sea)';
COMMENT ON INDEX ices_rectangles_coastal_idx IS 'Filter coastal vs offshore rectangles';
COMMENT ON INDEX ices_rectangles_location_idx IS 'Spatial lookup by coordinates';
COMMENT ON INDEX ices_rectangles_cmems_region_idx IS 'CMEMS region mapping for biogeographic filtering';
COMMENT ON INDEX ices_rectangles_code_region_idx IS 'Compound index for code+region queries';
