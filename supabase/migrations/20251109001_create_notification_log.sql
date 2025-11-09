-- Create notification_log table for tracking sent notifications
-- This table prevents notification spam by tracking when notifications were sent

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'threshold_crossed', 'daily_digest', 'weekly_forecast'
  channel TEXT NOT NULL, -- 'push', 'email', 'sms'
  confidence_at_send INTEGER NOT NULL, -- Confidence score when notification was sent
  threshold_value INTEGER NOT NULL, -- Threshold that triggered the notification
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notification_data JSONB, -- Additional data about the notification

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_species_id ON notification_log(species_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_species ON notification_log(user_id, species_id, sent_at DESC);

-- Enable Row Level Security
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own notification logs
CREATE POLICY "Users can view their own notification logs"
  ON notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert notification logs"
  ON notification_log
  FOR INSERT
  WITH CHECK (true); -- Allow service role to insert (cron job needs this)

-- Add helpful comments
COMMENT ON TABLE notification_log IS 'Tracks sent notifications to prevent spam and provide notification history';
COMMENT ON COLUMN notification_log.user_id IS 'Reference to the authenticated user';
COMMENT ON COLUMN notification_log.species_id IS 'Species identifier that triggered the notification';
COMMENT ON COLUMN notification_log.notification_type IS 'Type of notification: threshold_crossed, daily_digest, weekly_forecast';
COMMENT ON COLUMN notification_log.channel IS 'Delivery channel: push, email, sms';
COMMENT ON COLUMN notification_log.confidence_at_send IS 'Confidence score when notification was sent (0-100)';
COMMENT ON COLUMN notification_log.threshold_value IS 'Threshold that triggered this notification';
COMMENT ON COLUMN notification_log.sent_at IS 'When the notification was sent';
COMMENT ON COLUMN notification_log.notification_data IS 'Additional notification metadata (location, conditions, etc.)';
