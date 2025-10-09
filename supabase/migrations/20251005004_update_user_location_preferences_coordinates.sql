-- Update user_location_preferences to store precise coordinates and labels
ALTER TABLE user_location_preferences
    ADD COLUMN IF NOT EXISTS home_coordinates JSONB,
    ADD COLUMN IF NOT EXISTS home_place_name TEXT,
    ADD COLUMN IF NOT EXISTS home_location_name TEXT;

-- Ensure check constraint matches expected sources
ALTER TABLE user_location_preferences
    DROP CONSTRAINT IF EXISTS user_location_preferences_location_source_check,
    ADD CONSTRAINT user_location_preferences_location_source_check
        CHECK (location_source = ANY (ARRAY['manual', 'gps', 'ip']));

-- Refresh updated_at trigger to use shared helper if available
DROP TRIGGER IF EXISTS update_user_location_preferences_updated_at ON user_location_preferences;

-- Prefer shared update function when present
CREATE TRIGGER update_user_location_preferences_updated_at
    BEFORE UPDATE ON user_location_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index JSON coordinates for spatial lookups
CREATE INDEX IF NOT EXISTS idx_user_location_preferences_coordinates
    ON user_location_preferences
    USING GIN (home_coordinates);
