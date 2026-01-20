/**
 * /api/grow/push/preferences
 *
 * Manages notification preferences for Grow Daisy users.
 *
 * GET: Retrieve current notification preferences
 * PUT: Update notification preferences
 *
 * @module pages/api/grow/push/preferences
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface NotificationPreferences {
  // Weather alerts (BLOOM+ feature)
  frostAlerts?: boolean;
  weatherThreats?: boolean;
  extremeWeather?: boolean;

  // Task reminders (all tiers)
  wateringReminders?: boolean;
  taskReminders?: boolean;

  // Plant care alerts
  plantHealthAlerts?: boolean;
  harvestReminders?: boolean;

  // Community alerts (future)
  localPestAlerts?: boolean;
  communityTips?: boolean;

  // Quiet hours
  quietStartHour?: number;
  quietEndHour?: number;
  timezone?: string;

  // Frequency
  maxDailyNotifications?: number;
}

// Default preferences for new users
const DEFAULT_PREFERENCES: NotificationPreferences = {
  frostAlerts: true,
  weatherThreats: true,
  extremeWeather: true,
  wateringReminders: true,
  taskReminders: true,
  plantHealthAlerts: true,
  harvestReminders: true,
  localPestAlerts: false,
  communityTips: false,
  quietStartHour: 22,
  quietEndHour: 7,
  timezone: 'Europe/Dublin',
  maxDailyNotifications: 10,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);

  // Verify the token and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('grow_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences yet - return defaults
          return res.status(200).json({
            preferences: DEFAULT_PREFERENCES,
            isDefault: true,
          });
        }
        console.error('[GrowPushPreferences] Error fetching preferences:', error);
        return res.status(500).json({ error: 'Failed to fetch preferences' });
      }

      // Map DB columns to camelCase response
      const preferences: NotificationPreferences = {
        frostAlerts: data.frost_alerts,
        weatherThreats: data.weather_threats,
        extremeWeather: data.extreme_weather,
        wateringReminders: data.watering_reminders,
        taskReminders: data.task_reminders,
        plantHealthAlerts: data.plant_health_alerts,
        harvestReminders: data.harvest_reminders,
        localPestAlerts: data.local_pest_alerts,
        communityTips: data.community_tips,
        quietStartHour: data.quiet_start_hour,
        quietEndHour: data.quiet_end_hour,
        timezone: data.timezone,
        maxDailyNotifications: data.max_daily_notifications,
      };

      return res.status(200).json({
        preferences,
        isDefault: false,
      });
    } catch (error) {
      console.error('[GrowPushPreferences] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'PUT') {
    const updates = req.body as NotificationPreferences;

    // Build update object mapping camelCase to snake_case
    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.frostAlerts !== undefined) dbUpdates.frost_alerts = updates.frostAlerts;
    if (updates.weatherThreats !== undefined) dbUpdates.weather_threats = updates.weatherThreats;
    if (updates.extremeWeather !== undefined) dbUpdates.extreme_weather = updates.extremeWeather;
    if (updates.wateringReminders !== undefined) dbUpdates.watering_reminders = updates.wateringReminders;
    if (updates.taskReminders !== undefined) dbUpdates.task_reminders = updates.taskReminders;
    if (updates.plantHealthAlerts !== undefined) dbUpdates.plant_health_alerts = updates.plantHealthAlerts;
    if (updates.harvestReminders !== undefined) dbUpdates.harvest_reminders = updates.harvestReminders;
    if (updates.localPestAlerts !== undefined) dbUpdates.local_pest_alerts = updates.localPestAlerts;
    if (updates.communityTips !== undefined) dbUpdates.community_tips = updates.communityTips;
    if (updates.quietStartHour !== undefined) dbUpdates.quiet_start_hour = updates.quietStartHour;
    if (updates.quietEndHour !== undefined) dbUpdates.quiet_end_hour = updates.quietEndHour;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    if (updates.maxDailyNotifications !== undefined) dbUpdates.max_daily_notifications = updates.maxDailyNotifications;

    try {
      // Upsert preferences (create if not exists)
      const { error } = await supabase
        .from('grow_notification_preferences')
        .upsert(
          {
            user_id: userId,
            ...dbUpdates,
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) {
        console.error('[GrowPushPreferences] Error updating preferences:', error);
        return res.status(500).json({ error: 'Failed to update preferences' });
      }

      console.log(`[GrowPushPreferences] Preferences updated for user ${userId}`);
      return res.status(200).json({
        success: true,
        message: 'Preferences updated',
      });
    } catch (error) {
      console.error('[GrowPushPreferences] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
