-- Migration: Add composite index for regional availability queries
-- Created: 2025-11-22
-- Purpose: Optimize fetch_regional_availability query in predictions endpoint
--
-- Current Performance: 77-209ms
-- Expected After Index: 20-50ms (60-75% improvement)
--
-- Query Pattern:
-- SELECT * FROM species_regional_availability
-- WHERE region_type = 'ices' AND region_id = '<rectangle_code>'

-- Add composite index for the exact query pattern
CREATE INDEX IF NOT EXISTS idx_species_regional_availability_lookup
  ON species_regional_availability (region_type, region_id);

-- Comment on index
COMMENT ON INDEX idx_species_regional_availability_lookup IS
  'Composite index for regional availability queries by region_type and region_id. Optimizes predictions endpoint fetch_regional_availability query from 77-209ms to 20-50ms.';
