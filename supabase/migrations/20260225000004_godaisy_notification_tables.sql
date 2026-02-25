-- =============================================================================
-- Go Daisy Notification Tables
-- Mirrors Grow Daisy notification infrastructure for Go Daisy activity alerts.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Push Subscriptions (Web Push API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS godaisy_push_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh_key    TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  device_name   TEXT,
  user_agent    TEXT,
  is_active     BOOLEAN DEFAULT true,
  failed_count  INT DEFAULT 0,
  last_used_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

-- RLS
ALTER TABLE godaisy_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON godaisy_push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on godaisy_push_subscriptions"
  ON godaisy_push_subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_godaisy_push_subs_user
  ON godaisy_push_subscriptions (user_id)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 2. Notification Preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS godaisy_notification_preferences (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Weather alerts
  weather_alerts            BOOLEAN DEFAULT true,
  extreme_weather           BOOLEAN DEFAULT true,

  -- Activity recommendations
  activity_recommendations  BOOLEAN DEFAULT true,

  -- Astronomy alerts
  astronomy_alerts          BOOLEAN DEFAULT true,

  -- Tide alerts (coastal users)
  tide_alerts               BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_start_hour          INT DEFAULT 22,
  quiet_end_hour            INT DEFAULT 7,
  timezone                  TEXT DEFAULT 'Europe/Dublin',

  -- Frequency
  max_daily_notifications   INT DEFAULT 10,

  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE godaisy_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON godaisy_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access on godaisy_notification_preferences"
  ON godaisy_notification_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. Notification Log (audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS godaisy_notification_log (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES godaisy_push_subscriptions(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  title             TEXT NOT NULL,
  body              TEXT,
  data              JSONB,
  status            TEXT NOT NULL DEFAULT 'pending',
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE godaisy_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON godaisy_notification_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on godaisy_notification_log"
  ON godaisy_notification_log
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for recent notifications per user
CREATE INDEX IF NOT EXISTS idx_godaisy_notification_log_user
  ON godaisy_notification_log (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. RPC helpers (mirror Grow Daisy patterns)
-- ---------------------------------------------------------------------------

-- Get active push subscriptions for a user
CREATE OR REPLACE FUNCTION godaisy_get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, endpoint, p256dh_key, auth_key
  FROM godaisy_push_subscriptions
  WHERE user_id = p_user_id
    AND is_active = true
    AND failed_count < 5
  ORDER BY last_used_at DESC;
$$;

-- Record push success
CREATE OR REPLACE FUNCTION godaisy_record_push_success(p_subscription_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE godaisy_push_subscriptions
  SET last_used_at = now(),
      failed_count = 0,
      updated_at = now()
  WHERE id = p_subscription_id;
$$;

-- Record push failure
CREATE OR REPLACE FUNCTION godaisy_record_push_failure(p_subscription_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE godaisy_push_subscriptions
  SET failed_count = failed_count + 1,
      is_active = CASE WHEN failed_count >= 4 THEN false ELSE is_active END,
      updated_at = now()
  WHERE id = p_subscription_id;
$$;

-- Get users eligible for a notification type (with optional geo-filter)
CREATE OR REPLACE FUNCTION godaisy_get_users_for_notification(
  p_notification_type TEXT,
  p_location_lat DOUBLE PRECISION DEFAULT NULL,
  p_location_lng DOUBLE PRECISION DEFAULT NULL,
  p_radius_km DOUBLE PRECISION DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  subscription_id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.user_id,
    s.id AS subscription_id,
    s.endpoint,
    s.p256dh_key,
    s.auth_key
  FROM godaisy_push_subscriptions s
  LEFT JOIN godaisy_notification_preferences p ON p.user_id = s.user_id
  WHERE s.is_active = true
    AND s.failed_count < 5
    AND (
      CASE p_notification_type
        WHEN 'weather_alert' THEN COALESCE(p.weather_alerts, true)
        WHEN 'extreme_weather' THEN COALESCE(p.extreme_weather, true)
        WHEN 'activity_recommendation' THEN COALESCE(p.activity_recommendations, true)
        WHEN 'astronomy_alert' THEN COALESCE(p.astronomy_alerts, true)
        WHEN 'tide_alert' THEN COALESCE(p.tide_alerts, true)
        ELSE true
      END
    );
$$;
