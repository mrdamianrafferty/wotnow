-- ============================================================================
-- ADD LOCAL SIGNAL ALERTS PREFERENCE
-- ============================================================================
-- Adds the local_signal_alerts column to grow_notification_preferences
-- for weather-based regional gardening alerts (pest pressure, disease risk, weather damage)
-- ============================================================================

-- Add the column (default to true - opt-out model)
ALTER TABLE public.grow_notification_preferences
ADD COLUMN IF NOT EXISTS local_signal_alerts BOOLEAN DEFAULT true;

-- Add comment
COMMENT ON COLUMN public.grow_notification_preferences.local_signal_alerts
  IS 'Enable weather-based regional alerts (pest pressure, disease risk, weather damage)';

-- Update the get_users_for_notification function to include local_signal type
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
      (p_notification_type = 'local_pest' AND p.local_pest_alerts = true) OR
      (p_notification_type = 'local_signal' AND COALESCE(p.local_signal_alerts, true) = true)
    )
    -- Check quiet hours (simplified - full implementation would use timezone)
    AND (
      EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(p.timezone, 'Europe/Dublin'))
      NOT BETWEEN p.quiet_start_hour AND p.quiet_end_hour
      OR p.quiet_start_hour >= p.quiet_end_hour  -- Handles overnight quiet hours
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
