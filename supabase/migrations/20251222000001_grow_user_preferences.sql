-- Migration: Create grow_user_preferences table
-- Stores user gardening preferences from onboarding and settings

-- Create the preferences table
CREATE TABLE IF NOT EXISTS grow_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Location data
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  elevation INTEGER, -- meters, rounded to nearest 10m
  climate_zone TEXT,

  -- Garden conditions
  garden_features TEXT[] DEFAULT '{}',
  soil_type TEXT,
  sun_exposure TEXT,
  moisture TEXT,

  -- User interests and preferences
  interests TEXT[] DEFAULT '{}',
  skill_level TEXT,
  content_depth TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one preferences record per user
  CONSTRAINT grow_user_preferences_user_id_unique UNIQUE (user_id)
);

-- Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_grow_user_preferences_user_id
  ON grow_user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE grow_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view own preferences"
  ON grow_user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON grow_user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON grow_user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON grow_user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_grow_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS trigger_grow_user_preferences_updated_at ON grow_user_preferences;
CREATE TRIGGER trigger_grow_user_preferences_updated_at
  BEFORE UPDATE ON grow_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_grow_user_preferences_updated_at();

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON grow_user_preferences TO authenticated;

COMMENT ON TABLE grow_user_preferences IS 'Stores user gardening preferences for Grow Daisy app';
COMMENT ON COLUMN grow_user_preferences.elevation IS 'Elevation in meters, used for climate zone detection (>800m = mountain)';
COMMENT ON COLUMN grow_user_preferences.climate_zone IS 'Inferred climate zone code (e.g., atlantic_mild, mountain_cool)';
