-- Add flag for core coastal fishing zones (<10km from shore)
-- This allows us to optimize data ingestion by focusing on areas
-- where recreational fishing actually happens, while keeping all
-- rectangles in the database for potential future use

ALTER TABLE ices_rectangles
ADD COLUMN IF NOT EXISTS is_coastal_fishing_zone BOOLEAN DEFAULT false;

-- Mark rectangles within 10km of shore as coastal fishing zones
-- These are the primary areas for shore and boat fishing
UPDATE ices_rectangles
SET is_coastal_fishing_zone = true
WHERE distance_to_shore_km < 10;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_coastal_fishing
ON ices_rectangles(is_coastal_fishing_zone)
WHERE is_coastal_fishing_zone = true;

-- Add helpful comment
COMMENT ON COLUMN ices_rectangles.is_coastal_fishing_zone IS
'True for rectangles within 10km of shore - the core zones for recreational coastal fishing.
Only these rectangles will have Copernicus data ingested.
Reduces ingestion from 225 to 104 rectangles (54% reduction).
Other rectangles remain in database but are "commented out" for data collection.';
