-- ============================================================================
-- Grow Daisy Local Signals - Signal Preferences Table
-- ============================================================================
-- This migration creates the table for storing user signal preferences
-- (muted signal types, minimum severity threshold)
-- ============================================================================

-- Create signal preferences table
CREATE TABLE IF NOT EXISTS grow_signal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  muted_signals TEXT[] DEFAULT ARRAY[]::TEXT[],
  min_severity TEXT DEFAULT 'low' CHECK (min_severity IN ('low', 'moderate', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE grow_signal_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own signal preferences"
  ON grow_signal_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal preferences"
  ON grow_signal_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own signal preferences"
  ON grow_signal_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal preferences"
  ON grow_signal_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_grow_signal_preferences_user_id
  ON grow_signal_preferences(user_id);

-- Comment
COMMENT ON TABLE grow_signal_preferences IS 'User preferences for local signals (muted types, severity threshold)';

-- ============================================================================
-- Signal dismissals table (for tracking dismissed individual signals)
-- ============================================================================
CREATE TABLE IF NOT EXISTS grow_signal_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(user_id, signal_id)
);

-- Enable RLS
ALTER TABLE grow_signal_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own signal dismissals"
  ON grow_signal_dismissals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signal dismissals"
  ON grow_signal_dismissals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signal dismissals"
  ON grow_signal_dismissals FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_grow_signal_dismissals_user_id
  ON grow_signal_dismissals(user_id);

CREATE INDEX IF NOT EXISTS idx_grow_signal_dismissals_expires_at
  ON grow_signal_dismissals(expires_at);

-- Comment
COMMENT ON TABLE grow_signal_dismissals IS 'Tracks dismissed individual signals (temporary, expires after validity period)';

-- Cleanup function for expired dismissals
CREATE OR REPLACE FUNCTION cleanup_expired_signal_dismissals()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM grow_signal_dismissals WHERE expires_at < now();
END;
$$;

-- Comment
COMMENT ON FUNCTION cleanup_expired_signal_dismissals IS 'Removes expired signal dismissals (can be called via cron)';
