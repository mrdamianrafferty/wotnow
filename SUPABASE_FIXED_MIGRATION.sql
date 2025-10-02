-- SUPABASE PRE-DNS MIGRATION SCRIPT (FIXED)
-- Run this in Supabase SQL Editor while DNS propagates
-- Fixed version addressing column name conflicts

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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_location_preferences' AND policyname = 'Users can view own location preferences') THEN
        CREATE POLICY "Users can view own location preferences" ON user_location_preferences
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_location_preferences' AND policyname = 'Users can insert own location preferences') THEN
        CREATE POLICY "Users can insert own location preferences" ON user_location_preferences
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_location_preferences' AND policyname = 'Users can update own location preferences') THEN
        CREATE POLICY "Users can update own location preferences" ON user_location_preferences
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_location_preferences' AND policyname = 'Users can delete own location preferences') THEN
        CREATE POLICY "Users can delete own location preferences" ON user_location_preferences
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for location preferences
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_user_id 
ON user_location_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_location_preferences_rectangles 
ON user_location_preferences USING GIN(preferred_rectangles);

CREATE INDEX IF NOT EXISTS idx_user_location_preferences_home_region 
ON user_location_preferences(home_region);

-- =============================================================================
-- PART 2: GPS CATCH LOGGING ENHANCEMENT
-- =============================================================================

-- 2. Create or enhance findr_catch_entries table
CREATE TABLE IF NOT EXISTS findr_catch_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    species_id TEXT NOT NULL,
    rectangle_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add GPS fields if they don't exist
DO $$
BEGIN
    -- Add GPS latitude if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findr_catch_entries' AND column_name = 'gps_latitude') THEN
        ALTER TABLE findr_catch_entries ADD COLUMN gps_latitude DECIMAL(10, 8);
    END IF;
    
    -- Add GPS longitude if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findr_catch_entries' AND column_name = 'gps_longitude') THEN
        ALTER TABLE findr_catch_entries ADD COLUMN gps_longitude DECIMAL(11, 8);
    END IF;
    
    -- Add location accuracy if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findr_catch_entries' AND column_name = 'location_accuracy') THEN
        ALTER TABLE findr_catch_entries ADD COLUMN location_accuracy INTEGER;
    END IF;
    
    -- Add location source if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'findr_catch_entries' AND column_name = 'location_source') THEN
        ALTER TABLE findr_catch_entries ADD COLUMN location_source TEXT DEFAULT 'rectangle';
        ALTER TABLE findr_catch_entries ADD CONSTRAINT chk_location_source CHECK (location_source IN ('gps', 'manual', 'rectangle'));
    END IF;
END $$;

-- Add indexes for location-based queries
CREATE INDEX IF NOT EXISTS idx_findr_catch_entries_gps_location 
ON findr_catch_entries(gps_latitude, gps_longitude) 
WHERE gps_latitude IS NOT NULL AND gps_longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_findr_catch_entries_location_source 
ON findr_catch_entries(location_source);

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

-- Enable RLS for ICES rectangles
ALTER TABLE ices_rectangles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ICES rectangles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ices_rectangles' AND policyname = 'Anyone can read ICES rectangles') THEN
        CREATE POLICY "Anyone can read ICES rectangles" ON ices_rectangles FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

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
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favourites' AND policyname = 'Users can view own favourites') THEN
        CREATE POLICY "Users can view own favourites" ON user_favourites
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favourites' AND policyname = 'Users can insert own favourites') THEN
        CREATE POLICY "Users can insert own favourites" ON user_favourites
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favourites' AND policyname = 'Users can update own favourites') THEN
        CREATE POLICY "Users can update own favourites" ON user_favourites
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_favourites' AND policyname = 'Users can delete own favourites') THEN
        CREATE POLICY "Users can delete own favourites" ON user_favourites
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create indexes for user favourites
CREATE INDEX IF NOT EXISTS idx_user_favourites_user_id ON user_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favourites_species_id ON user_favourites(species_id);

-- =============================================================================
-- PART 5: SAMPLE ICES RECTANGLES DATA
-- =============================================================================

-- Insert sample ICES rectangles data for key European fishing areas
-- First, let's check what columns exist in the table
DO $$
BEGIN
    -- Try to insert with minimal required columns first
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
EXCEPTION
    WHEN others THEN
        -- If that fails, try with additional boundary columns
        INSERT INTO ices_rectangles (
            rectangle_code, 
            region, 
            center_lat, 
            center_lon, 
            distance_to_shore_km,
            lat_south,
            lat_north, 
            lon_west,
            lon_east
        ) VALUES
          -- English Channel (approximate boundaries)
          ('31E8', 'English Channel', 50.25, 1.5, 5, 50.0, 50.5, 1.0, 2.0),
          ('31F0', 'English Channel', 50.75, 1.5, 8, 50.5, 51.0, 1.0, 2.0),
          ('31F1', 'English Channel', 50.75, 2.0, 12, 50.5, 51.0, 1.5, 2.5),
          ('31F2', 'English Channel', 50.75, 2.5, 15, 50.5, 51.0, 2.0, 3.0),
          
          -- North Sea
          ('32F3', 'Southern North Sea', 51.25, 3.0, 20, 51.0, 51.5, 2.5, 3.5),
          ('33F4', 'Central North Sea', 52.25, 4.0, 25, 52.0, 52.5, 3.5, 4.5),
          ('34F5', 'Northern North Sea', 53.25, 5.0, 30, 53.0, 53.5, 4.5, 5.5),
          
          -- Celtic Sea
          ('30E7', 'Celtic Sea', 49.25, 0.5, 18, 49.0, 49.5, 0.0, 1.0),
          ('31E9', 'Celtic Sea', 50.25, 2.0, 22, 50.0, 50.5, 1.5, 2.5),
          
          -- Bay of Biscay
          ('24E8', 'Bay of Biscay', 45.25, 1.5, 25, 45.0, 45.5, 1.0, 2.0),
          ('25E9', 'Bay of Biscay', 46.25, 2.0, 30, 46.0, 46.5, 1.5, 2.5),
          
          -- Irish Sea
          ('32E8', 'Irish Sea', 51.25, 1.5, 12, 51.0, 51.5, 1.0, 2.0),
          ('33E9', 'Irish Sea', 52.25, 2.0, 15, 52.0, 52.5, 1.5, 2.5),
          
          -- West of Scotland
          ('35F0', 'West of Scotland', 54.25, 1.5, 8, 54.0, 54.5, 1.0, 2.0),
          ('36F1', 'West of Scotland', 55.25, 2.0, 10, 55.0, 55.5, 1.5, 2.5)
        ON CONFLICT (rectangle_code) DO NOTHING;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify tables were created successfully
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN (
  'user_location_preferences',
  'ices_rectangles', 
  'user_favourites',
  'findr_catch_entries'
) 
ORDER BY tablename;

-- Check ICES rectangles data
SELECT rectangle_code, region, center_lat, center_lon, is_coastal 
FROM ices_rectangles 
ORDER BY region, rectangle_code 
LIMIT 10;

-- Display success message
SELECT 'Location system database migration completed successfully! 🎣' as status;