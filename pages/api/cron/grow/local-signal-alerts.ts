/**
 * /api/cron/grow/local-signal-alerts
 *
 * Cron job endpoint for sending Local Signal push notifications.
 * Runs every 6 hours (offset from weather-alerts by 3 hours).
 *
 * Checks for high/critical severity local signals and sends push notifications
 * to users who have enabled local_signal_alerts.
 *
 * @module pages/api/cron/grow/local-signal-alerts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  generateLocalSignals,
  getUrgentSignals,
} from '@/lib/grow/localSignals';
import type { WeatherForecast } from '@/lib/grow/weatherTaskEngine';
import { getDailyForecast } from '@/lib/grow/dailyForecast';
import { sendPushNotification, createLocalSignalPayload } from '@/lib/grow/notifications';
import { verifyCronAuth } from '@/lib/cron-auth';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// =============================================================================
// TYPES
// =============================================================================

interface UserWithLocation {
  user_id: string;
  latitude: number;
  longitude: number;
  location: string | null;
  timezone: string;
}

interface AlertResult {
  userId: string;
  signalType: string;
  severity: string;
  sent: boolean;
  error?: string;
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[LocalSignalAlerts] Starting local signal alert check...');

  try {
    // Get users with active push subscriptions and local_signal_alerts enabled
    const { data: notifPrefs, error: prefsError } = await supabase
      .from('grow_notification_preferences')
      .select('user_id, local_signal_alerts, timezone')
      .eq('local_signal_alerts', true);

    if (prefsError) {
      console.warn('[LocalSignalAlerts] Could not fetch notification preferences:', prefsError);
      // Continue anyway - default to true for users without preferences
    }

    // Get user IDs that have local signal alerts enabled
    const enabledUserIds = new Set(notifPrefs?.map((p) => p.user_id) || []);

    // Get all users with active push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('grow_push_subscriptions')
      .select('user_id')
      .eq('is_active', true);

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users with active push subscriptions',
        processed: 0,
      });
    }

    // Get unique user IDs that either have local_signal_alerts enabled or no preference set (default enabled)
    const activeUserIds = [...new Set(subscriptions.map((s) => s.user_id))];

    // Filter to users who have local signal alerts enabled (or no preference = default enabled)
    // If we couldn't fetch preferences, assume all users want notifications
    const usersToNotify = notifPrefs
      ? activeUserIds.filter((id) => enabledUserIds.has(id) || !notifPrefs.find(p => p.user_id === id))
      : activeUserIds;

    console.log(`[LocalSignalAlerts] Found ${usersToNotify.length} users to check for local signals`);

    // Get user locations
    const { data: userLocations, error: locError } = await supabase
      .from('grow_user_preferences')
      .select('user_id, latitude, longitude, location')
      .in('user_id', usersToNotify)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (locError) {
      console.warn('[LocalSignalAlerts] Could not fetch user locations:', locError);
    }

    if (!userLocations || userLocations.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users with valid locations',
        processed: 0,
      });
    }

    console.log(`[LocalSignalAlerts] ${userLocations.length} users have valid locations`);

    // Group users by approximate location (0.5 degree grid) to reduce API calls
    const locationGrid = new Map<string, UserWithLocation[]>();
    for (const user of userLocations) {
      const gridKey = `${Math.round(user.latitude * 2) / 2}_${Math.round(user.longitude * 2) / 2}`;
      if (!locationGrid.has(gridKey)) {
        locationGrid.set(gridKey, []);
      }
      const timezone = notifPrefs?.find(p => p.user_id === user.user_id)?.timezone || 'Europe/Dublin';
      locationGrid.get(gridKey)!.push({
        ...user,
        timezone,
      });
    }

    console.log(`[LocalSignalAlerts] Grouped into ${locationGrid.size} location grids`);

    const results: AlertResult[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Process each location grid
    for (const [gridKey, users] of locationGrid) {
      // Use the first user's coordinates as representative for the grid
      const representative = users[0];

      try {
        // Fetch weather for this location
        const weather = await fetchWeatherForLocation(representative.latitude, representative.longitude);
        if (!weather) {
          console.warn(`[LocalSignalAlerts] Could not fetch weather for grid ${gridKey}`);
          continue;
        }

        // Generate local signals
        const signals = generateLocalSignals(weather);
        const urgentSignals = getUrgentSignals(signals);

        if (urgentSignals.length === 0) {
          continue; // No urgent signals for this location
        }

        console.log(`[LocalSignalAlerts] Found ${urgentSignals.length} urgent signals for grid ${gridKey}`);

        // Send notifications to all users in this grid
        for (const user of users) {
          for (const signal of urgentSignals) {
            // Check if we already sent this signal type today
            const { count } = await supabase
              .from('grow_notification_log')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.user_id)
              .eq('notification_type', 'local_signal')
              .like('data', `%"signalType":"${signal.type}"%`)
              .gte('created_at', `${today}T00:00:00Z`);

            if (count && count > 0) {
              continue; // Already sent this signal type today
            }

            // Check if user has muted this signal type
            const { data: signalPrefs } = await supabase
              .from('grow_signal_preferences')
              .select('muted_signals')
              .eq('user_id', user.user_id)
              .single();

            if (signalPrefs?.muted_signals?.includes(signal.type)) {
              continue; // User has muted this signal type
            }

            // Send the notification
            const payload = createLocalSignalPayload({
              signalType: signal.type,
              severity: signal.severity,
              title: signal.title,
              message: signal.description,
              advice: signal.advice,
              location: user.location || undefined,
            });

            const result = await sendPushNotification({
              userId: user.user_id,
              notificationType: 'local_signal',
              payload,
              respectPreferences: true,
              respectQuietHours: true,
            });

            results.push({
              userId: user.user_id,
              signalType: signal.type,
              severity: signal.severity,
              sent: result.sent > 0,
              error: result.errors.join(', ') || undefined,
            });
          }
        }
      } catch (error) {
        console.error(`[LocalSignalAlerts] Error processing grid ${gridKey}:`, error);
      }
    }

    const sentCount = results.filter((r) => r.sent).length;
    console.log(`[LocalSignalAlerts] Completed. Sent ${sentCount} alerts out of ${results.length} checks`);

    return res.status(200).json({
      success: true,
      processed: userLocations.length,
      grids: locationGrid.size,
      alertsSent: sentCount,
      results,
    });
  } catch (error) {
    console.error('[LocalSignalAlerts] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// =============================================================================
// WEATHER FETCHING
// =============================================================================

async function fetchWeatherForLocation(lat: number, lon: number): Promise<WeatherForecast[] | null> {
  // Free-first: Open-Meteo is primary, OpenWeather One Call 3.0 is only a backstop.
  // This keeps the cron off the One Call 3.0 quota for its bulk per-grid-cell fetches.
  const forecast = await getDailyForecast({ lat, lon, apiKey: OPENWEATHER_API_KEY });
  return forecast.length ? forecast : null;
}

// =============================================================================
// VERCEL CRON CONFIG
// =============================================================================

export const config = {
  maxDuration: 60,
};
