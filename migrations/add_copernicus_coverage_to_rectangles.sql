-- Migration: Add Copernicus Coverage Tracking to ICES Rectangles
--
-- Adds columns to track which rectangles have Copernicus coverage
-- and which are prioritized for regular monitoring
--
-- To deploy: Run this in Supabase SQL Editor

-- Add copernicus coverage tracking columns
ALTER TABLE ices_rectangles 
ADD COLUMN IF NOT EXISTS has_copernicus_coverage BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_coastal BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS copernicus_region TEXT CHECK (copernicus_region IN ('MED', 'BAL', 'IBI', 'NWS', 'ARCTIC', 'GLOBAL')),
ADD COLUMN IF NOT EXISTS priority_level INT DEFAULT 0 CHECK (priority_level BETWEEN 0 AND 5);

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_copernicus_coverage 
ON ices_rectangles(has_copernicus_coverage) 
WHERE has_copernicus_coverage = TRUE;

CREATE INDEX IF NOT EXISTS idx_ices_rectangles_coastal 
ON ices_rectangles(is_coastal) 
WHERE is_coastal = TRUE;

CREATE INDEX IF NOT EXISTS idx_ices_rectangles_priority 
ON ices_rectangles(priority_level DESC, rectangle_code) 
WHERE priority_level > 0;

-- Add comments
COMMENT ON COLUMN ices_rectangles.has_copernicus_coverage IS 
'TRUE if rectangle has successful Copernicus data retrieval, FALSE if known to fail, NULL if untested';

COMMENT ON COLUMN ices_rectangles.is_coastal IS 
'TRUE if rectangle is coastal (within 100km of shore), affects data availability';

COMMENT ON COLUMN ices_rectangles.copernicus_region IS 
'Which Copernicus Marine regional model covers this rectangle (MED/BAL/IBI/NWS/ARCTIC/GLOBAL)';

COMMENT ON COLUMN ices_rectangles.priority_level IS 
'Priority for regular monitoring: 0=unused, 1=low, 2=medium, 3=high, 4=critical, 5=always';
