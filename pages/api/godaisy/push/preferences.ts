/**
 * /api/godaisy/push/preferences
 *
 * Manages notification preferences for Go Daisy users.
 *
 * GET: Retrieve current notification preferences
 * PUT: Update notification preferences
 *
 * @module pages/api/godaisy/push/preferences
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface GoDaisyNotificationPreferences {
  weatherAlerts?: boolean;
  extremeWeather?: boolean;
  activityRecommendations?: boolean;
  astronomyAlerts?: boolean;
  tideAlerts?: boolean;
  quietStartHour?: number;
  quietEndHour?: number;
  timezone?: string;
  maxDailyNotifications?: number;
}

const DEFAULT_PREFERENCES: GoDaisyNotificationPreferences = {
  weatherAlerts: true,
  extremeWeather: true,
  activityRecommendations: true,
  astronomyAlerts: true,
  tideAlerts: true,
  quietStartHour: 22,
  quietEndHour: 7,
  timezone: 'Europe/Dublin',
  maxDailyNotifications: 10,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('godaisy_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(200).json({
            preferences: DEFAULT_PREFERENCES,
            isDefault: true,
          });
        }
        console.error('[GoDaisyPreferences] Error fetching preferences:', error);
        return res.status(500).json({ error: 'Failed to fetch preferences' });
      }

      const preferences: GoDaisyNotificationPreferences = {
        weatherAlerts: data.weather_alerts,
        extremeWeather: data.extreme_weather,
        activityRecommendations: data.activity_recommendations,
        astronomyAlerts: data.astronomy_alerts,
        tideAlerts: data.tide_alerts,
        quietStartHour: data.quiet_start_hour,
        quietEndHour: data.quiet_end_hour,
        timezone: data.timezone,
        maxDailyNotifications: data.max_daily_notifications,
      };

      return res.status(200).json({ preferences, isDefault: false });
    } catch (error) {
      console.error('[GoDaisyPreferences] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    const updates = req.body as GoDaisyNotificationPreferences;

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.weatherAlerts !== undefined) dbUpdates.weather_alerts = updates.weatherAlerts;
    if (updates.extremeWeather !== undefined) dbUpdates.extreme_weather = updates.extremeWeather;
    if (updates.activityRecommendations !== undefined) dbUpdates.activity_recommendations = updates.activityRecommendations;
    if (updates.astronomyAlerts !== undefined) dbUpdates.astronomy_alerts = updates.astronomyAlerts;
    if (updates.tideAlerts !== undefined) dbUpdates.tide_alerts = updates.tideAlerts;
    if (updates.quietStartHour !== undefined) dbUpdates.quiet_start_hour = updates.quietStartHour;
    if (updates.quietEndHour !== undefined) dbUpdates.quiet_end_hour = updates.quietEndHour;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    if (updates.maxDailyNotifications !== undefined) dbUpdates.max_daily_notifications = updates.maxDailyNotifications;

    try {
      const { error } = await supabase
        .from('godaisy_notification_preferences')
        .upsert(
          { user_id: userId, ...dbUpdates },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('[GoDaisyPreferences] Error updating preferences:', error);
        return res.status(500).json({ error: 'Failed to update preferences' });
      }

      return res.status(200).json({ success: true, message: 'Preferences updated' });
    } catch (error) {
      console.error('[GoDaisyPreferences] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
