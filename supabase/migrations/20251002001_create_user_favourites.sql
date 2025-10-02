-- Create user_favourites table for tracking species preferences
-- This table stores which species users are tracking and their notification preferences

CREATE TABLE IF NOT EXISTS user_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  notifications_enabled BOOLEAN DEFAULT false,
  notification_threshold INTEGER DEFAULT 70,
  notification_channels JSONB DEFAULT '{"push": false, "email": false, "sms": false}'::jsonb,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a user can only favourite a species once
  UNIQUE(user_id, species_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favourites_user_id ON user_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favourites_species_id ON user_favourites(species_id);
CREATE INDEX IF NOT EXISTS idx_user_favourites_added_at ON user_favourites(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_favourites_notifications ON user_favourites(user_id) WHERE notifications_enabled = true;

-- Enable Row Level Security
ALTER TABLE user_favourites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own favourites" ON user_favourites;
DROP POLICY IF EXISTS "Users can insert their own favourites" ON user_favourites;
DROP POLICY IF EXISTS "Users can update their own favourites" ON user_favourites;
DROP POLICY IF EXISTS "Users can delete their own favourites" ON user_favourites;

-- RLS Policies: Users can only access their own favourites
CREATE POLICY "Users can view their own favourites"
  ON user_favourites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favourites"
  ON user_favourites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favourites"
  ON user_favourites
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favourites"
  ON user_favourites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_favourites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_user_favourites_updated_at ON user_favourites;
CREATE TRIGGER update_user_favourites_updated_at
  BEFORE UPDATE ON user_favourites
  FOR EACH ROW
  EXECUTE FUNCTION update_user_favourites_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_favourites IS 'Stores user favourite species for tracking and notifications';
COMMENT ON COLUMN user_favourites.user_id IS 'Reference to the authenticated user';
COMMENT ON COLUMN user_favourites.species_id IS 'Species identifier (e.g., COD, BASS, MACKEREL)';
COMMENT ON COLUMN user_favourites.notifications_enabled IS 'Whether user wants notifications for this species';
COMMENT ON COLUMN user_favourites.notification_threshold IS 'Confidence threshold (0-100) to trigger notifications';
COMMENT ON COLUMN user_favourites.notification_channels IS 'Notification delivery preferences (push, email, sms)';
COMMENT ON COLUMN user_favourites.last_checked IS 'Last time conditions were checked for this species';
