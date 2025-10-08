-- SUPABASE PRE-DNS MIGRATION SCRIPT
-- Run this in Supabase SQL Editor while DNS propagates
-- Contains all location system and core Findr functionality

-- =============================================================================
-- PART 1: LOCATION SYSTEM (Priority: HIGH)
-- =============================================================================

-- 1. Create user location preferences table
CREATE TABLE IF NOT EXISTS user_location_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Location preferences
    preferred_rectangles TEXT[] DEFAULT '{}',
    home_region TEXT,
    max_distance INTEGER DEFAULT 50,
    
    -- Privacy settings
    share_gps BOOLEAN DEFAULT false,
    share_course BOOLEAN DEFAULT true,
    auto_detect BOOLEAN DEFAULT false,
    
    -- Metadata
    location_source TEXT DEFAULT 'manual' CHECK (location_source IN ('manual', 'gps', 'ip')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Enable Row Level Security for location preferences
ALTER TABLE user_location_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for location preferences
CREATE POLICY "Users can view own location preferences" ON user_location_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location preferences" ON user_location_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location preferences" ON user_location_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own location preferences" ON user_location_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for location preferences
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_user_id 
ON user_location_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_location_preferences_rectangles 
ON user_location_preferences USING GIN(preferred_rectangles);

CREATE INDEX IF NOT EXISTS idx_user_location_preferences_home_region 
ON user_location_preferences(home_region);

-- Add updated_at trigger for location preferences
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_location_preferences_updated_at 
    BEFORE UPDATE ON user_location_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE user_location_preferences IS 'Stores user location preferences for the Findr fishing app';
COMMENT ON COLUMN user_location_preferences.preferred_rectangles IS 'Array of preferred ICES rectangle codes';
COMMENT ON COLUMN user_location_preferences.home_region IS 'User''s home fishing region';
COMMENT ON COLUMN user_location_preferences.max_distance IS 'Maximum distance from home region in km';
COMMENT ON COLUMN user_location_preferences.share_gps IS 'Whether user allows sharing precise GPS coordinates';
COMMENT ON COLUMN user_location_preferences.share_course IS 'Whether user allows sharing coarse location (city level)';
COMMENT ON COLUMN user_location_preferences.auto_detect IS 'Whether to automatically detect user location';

-- =============================================================================
-- PART 2: GPS CATCH LOGGING ENHANCEMENT
-- =============================================================================

-- 2. Add GPS location fields to findr_catch_entries table
-- First check if table exists, if not create a basic version
CREATE TABLE IF NOT EXISTS findr_catch_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    species_id TEXT NOT NULL,
    rectangle_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add GPS fields
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

-- Add helpful comments for GPS fields
COMMENT ON COLUMN findr_catch_entries.gps_latitude IS 'Precise GPS latitude where fish was caught (optional)';
COMMENT ON COLUMN findr_catch_entries.gps_longitude IS 'Precise GPS longitude where fish was caught (optional)';
COMMENT ON COLUMN findr_catch_entries.location_accuracy IS 'GPS accuracy in meters (optional)';
COMMENT ON COLUMN findr_catch_entries.location_source IS 'How location was determined: gps, manual, or rectangle';

-- =============================================================================
-- PART 3: ICES RECTANGLES REFERENCE DATA
-- =============================================================================

-- 3. Create ICES rectangles reference table
CREATE TABLE IF NOT EXISTS public.ices_rectangles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rectangle_code text NOT NULL UNIQUE,
  region text NOT NULL,
  center_lat numeric NOT NULL,
  center_lon numeric NOT NULL,
  distance_to_shore_km numeric,
  is_coastal boolean GENERATED ALWAYS AS (
    CASE 
      WHEN distance_to_shore_km IS NULL THEN true
      WHEN distance_to_shore_km <= 10 THEN true
      ELSE false
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for ICES rectangles
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_code ON ices_rectangles(rectangle_code);
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_region ON ices_rectangles(region);
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_location ON ices_rectangles(center_lat, center_lon);
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_coastal ON ices_rectangles(is_coastal);

-- Enable RLS for ICES rectangles (read-only for all authenticated users)
ALTER TABLE ices_rectangles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ICES rectangles" ON ices_rectangles FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- PART 4: CORE FINDR TABLES
-- =============================================================================

-- 4. Create user favourites table
CREATE TABLE IF NOT EXISTS public.user_favourites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  species_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure unique favourites per user
  UNIQUE(user_id, species_id)
);

-- Enable RLS for user favourites
ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user favourites
CREATE POLICY "Users can view own favourites" ON user_favourites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favourites" ON user_favourites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favourites" ON user_favourites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favourites" ON user_favourites
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for user favourites
CREATE INDEX IF NOT EXISTS idx_user_favourites_user_id ON user_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favourites_species_id ON user_favourites(species_id);

-- Add updated_at trigger for favourites
CREATE TRIGGER update_user_favourites_updated_at 
    BEFORE UPDATE ON user_favourites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 5: PERFORMANCE CACHING TABLES
-- =============================================================================

-- 5. Create moon cache table
CREATE TABLE IF NOT EXISTS public.moon_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat_bucket numeric NOT NULL,
  lon_bucket numeric NOT NULL,
  local_date date NOT NULL,
  moon_phase text,
  moon_illumination numeric,
  moonrise timestamptz,
  moonset timestamptz,
  sunrise timestamptz,
  sunset timestamptz,
  cached_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(lat_bucket, lon_bucket, local_date)
);

-- Create indexes for moon cache
CREATE INDEX IF NOT EXISTS idx_moon_cache_location_date ON moon_cache(lat_bucket, lon_bucket, local_date);
CREATE INDEX IF NOT EXISTS idx_moon_cache_date ON moon_cache(local_date);

-- 6. Create findr conditions snapshots table
CREATE TABLE IF NOT EXISTS public.findr_conditions_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rectangle_code text NOT NULL,
  snapshot_date date NOT NULL,
  conditions jsonb NOT NULL,
  data_sources text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint for one snapshot per rectangle per date
  UNIQUE(rectangle_code, snapshot_date)
);

-- Create indexes for conditions snapshots
CREATE INDEX IF NOT EXISTS idx_findr_conditions_rectangle_date ON findr_conditions_snapshots(rectangle_code, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_findr_conditions_date ON findr_conditions_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_findr_conditions_jsonb ON findr_conditions_snapshots USING GIN(conditions);

-- =============================================================================
-- PART 6: SAMPLE ICES RECTANGLES DATA
-- =============================================================================

-- Insert sample ICES rectangles data for key European fishing areas
INSERT INTO ices_rectangles (rectangle_code, region, center_lat, center_lon, distance_to_shore_km) VALUES
  -- English Channel
  ('31E8', 'English Channel', 50.25, 1.5, 5),
  ('31F0', 'English Channel', 50.75, 1.5, 8),
  ('31F1', 'English Channel', 50.75, 2.0, 12),
  ('31F2', 'English Channel', 50.75, 2.5, 15),
  
  -- North Sea
  ('32F3', 'Southern North Sea', 51.25, 3.0, 20),
  ('33F4', 'Central North Sea', 52.25, 4.0, 25),
  ('34F5', 'Northern North Sea', 53.25, 5.0, 30),
  
  -- Celtic Sea
  ('30E7', 'Celtic Sea', 49.25, 0.5, 18),
  ('31E9', 'Celtic Sea', 50.25, 2.0, 22),
  
  -- Bay of Biscay
  ('24E8', 'Bay of Biscay', 45.25, 1.5, 25),
  ('25E9', 'Bay of Biscay', 46.25, 2.0, 30),
  
  -- Irish Sea
  ('32E8', 'Irish Sea', 51.25, 1.5, 12),
  ('33E9', 'Irish Sea', 52.25, 2.0, 15),
  
  -- West of Scotland
  ('35F0', 'West of Scotland', 54.25, 1.5, 8),
  ('36F1', 'West of Scotland', 55.25, 2.0, 10)
ON CONFLICT (rectangle_code) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables were created successfully
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename IN (
  'user_location_preferences',
  'ices_rectangles', 
  'user_favourites',
  'findr_catch_entries',
  'moon_cache',
  'findr_conditions_snapshots'
) 
ORDER BY tablename;

-- Check ICES rectangles data
SELECT rectangle_code, region, center_lat, center_lon, is_coastal 
FROM ices_rectangles 
ORDER BY region, rectangle_code 
LIMIT 10;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN (
  'user_location_preferences',
  'ices_rectangles',
  'user_favourites'
)
ORDER BY tablename, policyname;

-- Display success message
SELECT 'Location system database migration completed successfully!' as status;