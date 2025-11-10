-- Create user_notification_preferences table for global notification settings
-- This table stores user preferences for fishing alerts and email digests

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Hot Bite Alerts (85%+ confidence, in-app push notifications)
  hot_bite_alerts_enabled BOOLEAN DEFAULT true,
  hot_bite_channels JSONB DEFAULT '{"push": true}'::jsonb,

  -- Daily Email Digest (all favourites with confidence tiers)
  daily_email_enabled BOOLEAN DEFAULT false,
  daily_email_time TIME DEFAULT '08:00:00',

  -- Weekly Forecast Email (7-day chart for trip planning)
  weekly_forecast_enabled BOOLEAN DEFAULT false,
  weekly_forecast_day INTEGER DEFAULT 1, -- 1=Monday, 7=Sunday
  weekly_forecast_time TIME DEFAULT '08:00:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id
  ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_hot_bite
  ON user_notification_preferences(user_id) WHERE hot_bite_alerts_enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_daily_email
  ON user_notification_preferences(user_id) WHERE daily_email_enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_weekly_forecast
  ON user_notification_preferences(user_id) WHERE weekly_forecast_enabled = true;

-- Enable Row Level Security
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can update their own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can delete their own notification preferences" ON user_notification_preferences;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON user_notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notification_preferences_updated_at();

-- Add helpful comments
COMMENT ON TABLE user_notification_preferences IS 'Stores global notification preferences for fishing alerts and email digests';
COMMENT ON COLUMN user_notification_preferences.user_id IS 'Reference to the authenticated user (unique - one row per user)';
COMMENT ON COLUMN user_notification_preferences.hot_bite_alerts_enabled IS 'Enable instant in-app alerts for favourite species at 85%+ confidence';
COMMENT ON COLUMN user_notification_preferences.hot_bite_channels IS 'Delivery channels for hot bite alerts (currently only push)';
COMMENT ON COLUMN user_notification_preferences.daily_email_enabled IS 'Enable daily email digest with all favourites tiered by confidence';
COMMENT ON COLUMN user_notification_preferences.daily_email_time IS 'Time of day to send daily email (user timezone)';
COMMENT ON COLUMN user_notification_preferences.weekly_forecast_enabled IS 'Enable weekly forecast email with 7-day confidence charts';
COMMENT ON COLUMN user_notification_preferences.weekly_forecast_day IS 'Day of week to send forecast (1=Monday, 7=Sunday)';
COMMENT ON COLUMN user_notification_preferences.weekly_forecast_time IS 'Time of day to send weekly forecast (user timezone)';
