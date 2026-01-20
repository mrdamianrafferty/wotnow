-- ============================================================================
-- GROW DAISY PUSH NOTIFICATIONS
-- ============================================================================
-- Database schema for web push notifications
--
-- Created: 2026-01-20
-- ============================================================================

-- =============================================================================
-- PUSH SUBSCRIPTIONS TABLE
-- =============================================================================
-- Stores Web Push API subscription data for each user/device

CREATE TABLE IF NOT EXISTS public.grow_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,  -- Public key for encryption
  auth_key TEXT NOT NULL,    -- Auth secret for encryption

  -- Device/browser identification
  device_name TEXT,          -- User-friendly name (e.g., "Chrome on MacBook")
  user_agent TEXT,           -- Full user agent string

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  failed_count INTEGER DEFAULT 0,  -- Track delivery failures

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate subscriptions per endpoint
  UNIQUE(user_id, endpoint)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_grow_push_subscriptions_user ON public.grow_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_push_subscriptions_active ON public.grow_push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_grow_push_subscriptions_endpoint ON public.grow_push_subscriptions(endpoint);

-- RLS policies
ALTER TABLE public.grow_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.grow_push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
  ON public.grow_push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all push subscriptions" ON public.grow_push_subscriptions;
CREATE POLICY "Service role can manage all push subscriptions"
  ON public.grow_push_subscriptions FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- =============================================================================
-- Per-user preferences for what notifications to receive

CREATE TABLE IF NOT EXISTS public.grow_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Weather alerts (BLOOM+ feature)
  frost_alerts BOOLEAN DEFAULT true,
  weather_threats BOOLEAN DEFAULT true,      -- Pest/disease conditions
  extreme_weather BOOLEAN DEFAULT true,      -- Heat waves, storms

  -- Task reminders (all tiers)
  watering_reminders BOOLEAN DEFAULT true,
  task_reminders BOOLEAN DEFAULT true,

  -- Plant care alerts
  plant_health_alerts BOOLEAN DEFAULT true,  -- Based on conditions
  harvest_reminders BOOLEAN DEFAULT true,

  -- Community alerts (future)
  local_pest_alerts BOOLEAN DEFAULT false,   -- "Aphids reported nearby"
  community_tips BOOLEAN DEFAULT false,

  -- Quiet hours (don't send between these times)
  quiet_start_hour INTEGER DEFAULT 22,       -- 10 PM
  quiet_end_hour INTEGER DEFAULT 7,          -- 7 AM
  timezone TEXT DEFAULT 'Europe/Dublin',

  -- Frequency limits
  max_daily_notifications INTEGER DEFAULT 10,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE public.grow_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.grow_notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
  ON public.grow_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all notification preferences" ON public.grow_notification_preferences;
CREATE POLICY "Service role can manage all notification preferences"
  ON public.grow_notification_preferences FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- NOTIFICATION LOG TABLE
-- =============================================================================
-- Track sent notifications for analytics and rate limiting

CREATE TABLE IF NOT EXISTS public.grow_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES public.grow_push_subscriptions(id) ON DELETE SET NULL,

  -- Notification details
  notification_type TEXT NOT NULL,  -- 'frost_alert', 'watering_reminder', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,                       -- Additional payload data

  -- Delivery status
  status TEXT DEFAULT 'pending',    -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  error_message TEXT,

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_notification_log_user ON public.grow_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_notification_log_type ON public.grow_notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_grow_notification_log_status ON public.grow_notification_log(status);
CREATE INDEX IF NOT EXISTS idx_grow_notification_log_created ON public.grow_notification_log(created_at);

-- Partition hint for future: consider partitioning by created_at for large volumes

-- RLS policies
ALTER TABLE public.grow_notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification log" ON public.grow_notification_log;
CREATE POLICY "Users can view own notification log"
  ON public.grow_notification_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage notification log" ON public.grow_notification_log;
CREATE POLICY "Service role can manage notification log"
  ON public.grow_notification_log FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get active subscriptions for a user
CREATE OR REPLACE FUNCTION public.grow_get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  device_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.endpoint,
    s.p256dh_key,
    s.auth_key,
    s.device_name
  FROM public.grow_push_subscriptions s
  WHERE s.user_id = p_user_id
    AND s.is_active = true
    AND s.failed_count < 3;  -- Skip subscriptions with too many failures
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get users to notify for a specific alert type
CREATE OR REPLACE FUNCTION public.grow_get_users_for_notification(
  p_notification_type TEXT,
  p_location_lat FLOAT DEFAULT NULL,
  p_location_lng FLOAT DEFAULT NULL,
  p_radius_km FLOAT DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  subscription_id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT,
  timezone TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    s.id as subscription_id,
    s.endpoint,
    s.p256dh_key,
    s.auth_key,
    COALESCE(p.timezone, 'Europe/Dublin') as timezone
  FROM public.grow_push_subscriptions s
  JOIN public.grow_notification_preferences p ON p.user_id = s.user_id
  WHERE s.is_active = true
    AND s.failed_count < 3
    -- Check notification type preference
    AND (
      (p_notification_type = 'frost_alert' AND p.frost_alerts = true) OR
      (p_notification_type = 'weather_threat' AND p.weather_threats = true) OR
      (p_notification_type = 'extreme_weather' AND p.extreme_weather = true) OR
      (p_notification_type = 'watering_reminder' AND p.watering_reminders = true) OR
      (p_notification_type = 'task_reminder' AND p.task_reminders = true) OR
      (p_notification_type = 'plant_health' AND p.plant_health_alerts = true) OR
      (p_notification_type = 'harvest_reminder' AND p.harvest_reminders = true) OR
      (p_notification_type = 'local_pest' AND p.local_pest_alerts = true)
    )
    -- Check quiet hours (simplified - full implementation would use timezone)
    AND (
      EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(p.timezone, 'Europe/Dublin'))
      NOT BETWEEN p.quiet_start_hour AND p.quiet_end_hour
      OR p.quiet_start_hour >= p.quiet_end_hour  -- Handles overnight quiet hours
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record notification failure and deactivate if too many failures
CREATE OR REPLACE FUNCTION public.grow_record_push_failure(p_subscription_id UUID)
RETURNS VOID AS $$
DECLARE
  v_failed_count INTEGER;
BEGIN
  UPDATE public.grow_push_subscriptions
  SET
    failed_count = failed_count + 1,
    updated_at = now()
  WHERE id = p_subscription_id
  RETURNING failed_count INTO v_failed_count;

  -- Deactivate if 3+ failures
  IF v_failed_count >= 3 THEN
    UPDATE public.grow_push_subscriptions
    SET is_active = false
    WHERE id = p_subscription_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record successful push delivery
CREATE OR REPLACE FUNCTION public.grow_record_push_success(p_subscription_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.grow_push_subscriptions
  SET
    failed_count = 0,
    last_used_at = now(),
    updated_at = now()
  WHERE id = p_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.grow_push_subscriptions IS 'Web Push API subscription data for Grow Daisy notifications';
COMMENT ON TABLE public.grow_notification_preferences IS 'Per-user notification preferences for Grow Daisy';
COMMENT ON TABLE public.grow_notification_log IS 'Log of sent notifications for analytics and debugging';
COMMENT ON FUNCTION public.grow_get_user_push_subscriptions IS 'Get active push subscriptions for a user';
COMMENT ON FUNCTION public.grow_get_users_for_notification IS 'Get users who should receive a specific notification type';
