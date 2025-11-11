-- Create user_push_tokens table for iOS push notifications
-- Stores APNS device tokens for sending push notifications

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can manage own push tokens"
  ON user_push_tokens
  FOR ALL
  USING (auth.uid() = user_id);

-- Create index for efficient lookups
CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_platform ON user_push_tokens(platform);

-- Add comment
COMMENT ON TABLE user_push_tokens IS 'Stores device push notification tokens for iOS (APNS) and Android (FCM). Used by cron jobs to send hot bite alerts.';
