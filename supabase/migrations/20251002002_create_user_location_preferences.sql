-- Create user location preferences table
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

-- Enable Row Level Security
ALTER TABLE user_location_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own location preferences" ON user_location_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own location preferences" ON user_location_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location preferences" ON user_location_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own location preferences" ON user_location_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_user_id ON user_location_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_preferred_rectangles ON user_location_preferences USING GIN(preferred_rectangles);
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_home_region ON user_location_preferences(home_region);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_location_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_location_preferences_updated_at
    BEFORE UPDATE ON user_location_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_location_preferences_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_location_preferences IS 'Stores user location preferences and privacy settings for Findr fishing predictions';
COMMENT ON COLUMN user_location_preferences.preferred_rectangles IS 'Array of ICES rectangle codes user prefers to fish in';
COMMENT ON COLUMN user_location_preferences.home_region IS 'User''s general fishing region (e.g., "English Channel", "North Sea")';
COMMENT ON COLUMN user_location_preferences.max_distance IS 'Maximum distance (km) user willing to travel for fishing';
COMMENT ON COLUMN user_location_preferences.share_gps IS 'Whether user consents to GPS location sharing';
COMMENT ON COLUMN user_location_preferences.share_course IS 'Whether user consents to coarse location sharing (city-level)';
COMMENT ON COLUMN user_location_preferences.auto_detect IS 'Whether to automatically detect user location';
COMMENT ON COLUMN user_location_preferences.location_source IS 'How location was determined: manual, gps, or ip';