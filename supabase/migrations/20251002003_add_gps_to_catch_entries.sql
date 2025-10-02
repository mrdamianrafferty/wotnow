-- Add GPS location fields to findr_catch_entries table
ALTER TABLE findr_catch_entries 
ADD COLUMN IF NOT EXISTS gps_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS gps_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'rectangle' CHECK (location_source IN ('gps', 'manual', 'rectangle'));

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_findr_catch_entries_gps_location 
ON findr_catch_entries(gps_latitude, gps_longitude) 
WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_findr_catch_entries_location_source 
ON findr_catch_entries(location_source);

-- Add helpful comments
COMMENT ON COLUMN findr_catch_entries.gps_latitude IS 'Precise GPS latitude where fish was caught (optional)';
COMMENT ON COLUMN findr_catch_entries.gps_longitude IS 'Precise GPS longitude where fish was caught (optional)';
COMMENT ON COLUMN findr_catch_entries.location_accuracy IS 'GPS accuracy in meters (optional)';
COMMENT ON COLUMN findr_catch_entries.location_source IS 'How location was determined: gps, manual, or rectangle';