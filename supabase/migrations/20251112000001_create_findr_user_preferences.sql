-- Create findr_user_preferences table for Findr-specific user settings
-- This complements the existing user_favourites and user_location_preferences tables

CREATE TABLE IF NOT EXISTS findr_user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Personal info
    display_name TEXT,

    -- Fishing style
    has_boat BOOLEAN DEFAULT false,
    fishing_techniques TEXT[] DEFAULT '{}', -- e.g., ['spinning', 'fly_fishing', 'bottom_fishing', 'trolling']
    favorite_habitats TEXT[] DEFAULT '{}', -- e.g., ['pier', 'sandy_beach', 'rocky_shore', 'estuary', 'deep_sea']

    -- Additional preferences (can be extended)
    preferences_json JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE findr_user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own preferences" ON findr_user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON findr_user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON findr_user_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON findr_user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_findr_user_preferences_user_id ON findr_user_preferences(user_id);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_findr_user_preferences_updated_at ON findr_user_preferences;
CREATE OR REPLACE FUNCTION update_findr_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_findr_user_preferences_updated_at
    BEFORE UPDATE ON findr_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_findr_user_preferences_updated_at();

-- Add helpful comments
COMMENT ON TABLE findr_user_preferences IS 'Stores Findr-specific user preferences for fishing style';
COMMENT ON COLUMN findr_user_preferences.display_name IS 'User display name for Findr (may differ from auth email)';
COMMENT ON COLUMN findr_user_preferences.has_boat IS 'Whether user has access to a boat for offshore fishing';
COMMENT ON COLUMN findr_user_preferences.fishing_techniques IS 'Array of preferred fishing techniques';
COMMENT ON COLUMN findr_user_preferences.favorite_habitats IS 'Array of preferred fishing habitats';
COMMENT ON COLUMN findr_user_preferences.preferences_json IS 'Additional preferences in JSON format for future extensibility';
