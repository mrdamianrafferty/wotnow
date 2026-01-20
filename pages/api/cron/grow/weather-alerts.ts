/**
 * /api/cron/grow/weather-alerts
 *
 * Cron job endpoint for checking weather conditions and sending alerts.
 * Should be called every 6 hours by Vercel Cron or similar scheduler.
 *
 * Checks for:
 * - Frost conditions (temp dropping below 2°C in next 48 hours)
 * - Extreme weather (heat waves, storms)
 * - Pest/disease favorable conditions (high humidity + warm temps)
 *
 * @module pages/api/cron/grow/weather-alerts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  sendPushNotification,
  createFrostAlertPayload,
  createPestRiskPayload,
} from '@/lib/grow/notifications';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

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

interface UserWithPreferences {
  user_id: string;
  frost_alerts: boolean;
  weather_threats: boolean;
  extreme_weather: boolean;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  timezone: string;
}

interface WeatherForecast {
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    condition: string;
  };
  hourly: Array<{
    dt: number;
    temp: number;
    humidity: number;
    condition: string;
  }>;
  daily: Array<{
    dt: number;
    tempMin: number;
    tempMax: number;
    humidity: number;
    condition: string;
  }>;
}

interface AlertResult {
  userId: string;
  alertType: string;
  sent: boolean;
  error?: string;
}

// =============================================================================
// HANDLER
// =============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret (Vercel cron jobs send this header)
  const cronSecret = req.headers['authorization']?.replace('Bearer ', '');

  // Allow if it matches cron secret or if we're in development
  if (process.env.NODE_ENV === 'production' && CRON_SECRET && cronSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('[WeatherAlerts] Starting weather alert check...');

  try {
    // Get all users with notification preferences and active push subscriptions
    const { data: users, error: usersError } = await supabase
      .from('grow_notification_preferences')
      .select(`
        user_id,
        frost_alerts,
        weather_threats,
        extreme_weather,
        timezone
      `)
      .or('frost_alerts.eq.true,weather_threats.eq.true,extreme_weather.eq.true');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users with weather alerts enabled',
        processed: 0,
      });
    }

    console.log(`[WeatherAlerts] Found ${users.length} users with alerts enabled`);

    // Get user preferences (locations) from profiles
    const userIds = users.map(u => u.user_id);
    const { data: preferences, error: prefsError } = await supabase
      .from('grow_user_preferences')
      .select('user_id, latitude, longitude, location')
      .in('user_id', userIds);

    if (prefsError) {
      console.warn('[WeatherAlerts] Could not fetch user preferences:', prefsError);
    }

    // Merge preferences with notification settings
    const prefMap = new Map(preferences?.map(p => [p.user_id, p]) || []);
    const usersWithLocations: UserWithPreferences[] = users
      .map(u => ({
        ...u,
        latitude: prefMap.get(u.user_id)?.latitude || null,
        longitude: prefMap.get(u.user_id)?.longitude || null,
        location: prefMap.get(u.user_id)?.location || null,
      }))
      .filter(u => u.latitude && u.longitude);

    console.log(`[WeatherAlerts] ${usersWithLocations.length} users have valid locations`);

    const results: AlertResult[] = [];

    // Process each user
    for (const user of usersWithLocations) {
      try {
        // Check if user has active push subscriptions
        const { count } = await supabase
          .from('grow_push_subscriptions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.user_id)
          .eq('is_active', true);

        if (!count || count === 0) {
          continue; // Skip users without active subscriptions
        }

        // Fetch weather for user's location
        const weather = await fetchWeatherForecast(user.latitude!, user.longitude!);
        if (!weather) continue;

        // Check for frost
        if (user.frost_alerts) {
          const frostResult = await checkAndSendFrostAlert(user, weather);
          if (frostResult) results.push(frostResult);
        }

        // Check for pest/disease conditions
        if (user.weather_threats) {
          const threatResult = await checkAndSendThreatAlert(user, weather);
          if (threatResult) results.push(threatResult);
        }

        // Check for extreme weather
        if (user.extreme_weather) {
          const extremeResult = await checkAndSendExtremeWeatherAlert(user, weather);
          if (extremeResult) results.push(extremeResult);
        }
      } catch (error) {
        console.error(`[WeatherAlerts] Error processing user ${user.user_id}:`, error);
        results.push({
          userId: user.user_id,
          alertType: 'error',
          sent: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const sentCount = results.filter(r => r.sent).length;
    console.log(`[WeatherAlerts] Completed. Sent ${sentCount} alerts out of ${results.length} checks`);

    return res.status(200).json({
      success: true,
      processed: usersWithLocations.length,
      alertsSent: sentCount,
      results,
    });
  } catch (error) {
    console.error('[WeatherAlerts] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// =============================================================================
// WEATHER FETCHING
// =============================================================================

async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('[WeatherAlerts] No OpenWeather API key configured');
    return null;
  }

  try {
    // Use OpenWeather One Call API for comprehensive forecast
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Fallback to 2.5 API if 3.0 not available
      const fallbackUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const fallbackResponse = await fetch(fallbackUrl);

      if (!fallbackResponse.ok) {
        console.error('[WeatherAlerts] Weather API error:', await fallbackResponse.text());
        return null;
      }

      const fallbackData = await fallbackResponse.json();
      return parseFallbackForecast(fallbackData);
    }

    const data = await response.json();
    return parseOneCallForecast(data);
  } catch (error) {
    console.error('[WeatherAlerts] Error fetching weather:', error);
    return null;
  }
}

function parseOneCallForecast(data: Record<string, unknown>): WeatherForecast {
  const current = data.current as Record<string, unknown>;
  const hourly = data.hourly as Array<Record<string, unknown>>;
  const daily = data.daily as Array<Record<string, unknown>>;

  return {
    current: {
      temp: current.temp as number,
      humidity: current.humidity as number,
      windSpeed: current.wind_speed as number,
      condition: ((current.weather as Array<{ main: string }>)?.[0]?.main) || 'Unknown',
    },
    hourly: (hourly || []).slice(0, 48).map(h => ({
      dt: h.dt as number,
      temp: h.temp as number,
      humidity: h.humidity as number,
      condition: ((h.weather as Array<{ main: string }>)?.[0]?.main) || 'Unknown',
    })),
    daily: (daily || []).slice(0, 7).map(d => {
      const temp = d.temp as Record<string, number>;
      return {
        dt: d.dt as number,
        tempMin: temp.min,
        tempMax: temp.max,
        humidity: d.humidity as number,
        condition: ((d.weather as Array<{ main: string }>)?.[0]?.main) || 'Unknown',
      };
    }),
  };
}

function parseFallbackForecast(data: Record<string, unknown>): WeatherForecast {
  const list = data.list as Array<Record<string, unknown>>;

  // Extract hourly-ish data from 3-hour forecast
  const hourly = (list || []).slice(0, 16).map(item => {
    const main = item.main as Record<string, number>;
    return {
      dt: item.dt as number,
      temp: main.temp,
      humidity: main.humidity,
      condition: ((item.weather as Array<{ main: string }>)?.[0]?.main) || 'Unknown',
    };
  });

  // Aggregate into daily
  const dailyMap = new Map<string, { temps: number[]; humidity: number[]; condition: string; dt: number }>();
  for (const h of hourly) {
    const date = new Date(h.dt * 1000).toDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { temps: [], humidity: [], condition: h.condition, dt: h.dt });
    }
    const day = dailyMap.get(date)!;
    day.temps.push(h.temp);
    day.humidity.push(h.humidity);
  }

  const daily = Array.from(dailyMap.values()).map(d => ({
    dt: d.dt,
    tempMin: Math.min(...d.temps),
    tempMax: Math.max(...d.temps),
    humidity: Math.round(d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length),
    condition: d.condition,
  }));

  return {
    current: hourly[0] ? {
      temp: hourly[0].temp,
      humidity: hourly[0].humidity,
      windSpeed: 0,
      condition: hourly[0].condition,
    } : { temp: 10, humidity: 50, windSpeed: 0, condition: 'Unknown' },
    hourly,
    daily,
  };
}

// =============================================================================
// ALERT CHECKS
// =============================================================================

async function checkAndSendFrostAlert(
  user: UserWithPreferences,
  weather: WeatherForecast
): Promise<AlertResult | null> {
  const FROST_THRESHOLD = 2; // Celsius

  // Check next 48 hours for frost
  const frostHour = weather.hourly.find(h => h.temp <= FROST_THRESHOLD);

  if (!frostHour) {
    return null; // No frost expected
  }

  // Check if we already sent a frost alert today
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('grow_notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('notification_type', 'frost_alert')
    .gte('created_at', `${today}T00:00:00Z`);

  if (count && count > 0) {
    return null; // Already sent frost alert today
  }

  // Calculate when frost is expected
  const frostTime = new Date(frostHour.dt * 1000);
  const now = new Date();
  const hoursUntilFrost = Math.round((frostTime.getTime() - now.getTime()) / (1000 * 60 * 60));
  const expectedTime = hoursUntilFrost <= 12 ? 'tonight' : hoursUntilFrost <= 24 ? 'tomorrow night' : 'in 2 days';

  // Send the alert
  const payload = createFrostAlertPayload({
    temperature: Math.round(frostHour.temp),
    location: user.location || 'your area',
    expectedTime,
  });

  const result = await sendPushNotification({
    userId: user.user_id,
    notificationType: 'frost_alert',
    payload,
    respectPreferences: false, // Already checked
    respectQuietHours: true,
  });

  return {
    userId: user.user_id,
    alertType: 'frost_alert',
    sent: result.sent > 0,
    error: result.errors.join(', ') || undefined,
  };
}

async function checkAndSendThreatAlert(
  user: UserWithPreferences,
  weather: WeatherForecast
): Promise<AlertResult | null> {
  // Conditions that favor pests/diseases:
  // - High humidity (>70%) + warm temps (15-25°C) = fungal diseases
  // - Extended wet periods = late blight, downy mildew
  // - Hot dry conditions = spider mites, aphids

  const current = weather.current;
  const threats: { name: string; riskLevel: 'low' | 'medium' | 'high' }[] = [];

  // Check for fungal disease conditions
  if (current.humidity > 70 && current.temp >= 15 && current.temp <= 25) {
    const wetDays = weather.daily.filter(d =>
      d.humidity > 70 && ['Rain', 'Drizzle', 'Thunderstorm'].includes(d.condition)
    ).length;

    if (wetDays >= 2) {
      threats.push({ name: 'Powdery Mildew', riskLevel: 'high' });
    } else if (current.humidity > 80) {
      threats.push({ name: 'Fungal Disease', riskLevel: 'medium' });
    }
  }

  // Check for late blight conditions (cool + wet)
  if (current.humidity > 80 && current.temp >= 10 && current.temp <= 20) {
    threats.push({ name: 'Late Blight', riskLevel: 'high' });
  }

  // Check for pest conditions (hot + dry)
  if (current.humidity < 50 && current.temp > 25) {
    threats.push({ name: 'Aphids & Spider Mites', riskLevel: 'medium' });
  }

  if (threats.length === 0) {
    return null;
  }

  // Check if we already sent a threat alert today
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('grow_notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('notification_type', 'weather_threat')
    .gte('created_at', `${today}T00:00:00Z`);

  if (count && count > 0) {
    return null; // Already sent threat alert today
  }

  // Send alert for highest risk threat
  const highestThreat = threats.sort((a, b) => {
    const riskOrder = { high: 3, medium: 2, low: 1 };
    return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
  })[0];

  const payload = createPestRiskPayload({
    threatName: highestThreat.name,
    riskLevel: highestThreat.riskLevel,
    affectedPlants: ['tomatoes', 'peppers', 'cucumbers'], // Generic for now
  });

  const result = await sendPushNotification({
    userId: user.user_id,
    notificationType: 'weather_threat',
    payload,
    respectPreferences: false,
    respectQuietHours: true,
  });

  return {
    userId: user.user_id,
    alertType: 'weather_threat',
    sent: result.sent > 0,
    error: result.errors.join(', ') || undefined,
  };
}

async function checkAndSendExtremeWeatherAlert(
  user: UserWithPreferences,
  weather: WeatherForecast
): Promise<AlertResult | null> {
  const extremeConditions: string[] = [];

  // Heat wave: temps above 30°C
  if (weather.current.temp > 30 || weather.daily.some(d => d.tempMax > 30)) {
    extremeConditions.push('Heat wave');
  }

  // Storm
  if (weather.current.condition === 'Thunderstorm' ||
      weather.hourly.some(h => h.condition === 'Thunderstorm')) {
    extremeConditions.push('Thunderstorm');
  }

  // High winds (would need wind data)
  if (weather.current.windSpeed > 15) { // m/s
    extremeConditions.push('High winds');
  }

  if (extremeConditions.length === 0) {
    return null;
  }

  // Check if we already sent an extreme weather alert today
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('grow_notification_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.user_id)
    .eq('notification_type', 'extreme_weather')
    .gte('created_at', `${today}T00:00:00Z`);

  if (count && count > 0) {
    return null;
  }

  const payload = {
    title: `${extremeConditions[0]} Warning`,
    body: `${extremeConditions.join(' and ')} expected in ${user.location || 'your area'}. Protect your plants!`,
    icon: '/icons/grow-icon-192.png',
    badge: '/icons/grow-badge-72.png',
    tag: 'extreme-weather',
    requireInteraction: true,
    data: {
      type: 'extreme_weather',
      conditions: extremeConditions,
      url: '/grow/weather',
    },
  };

  const result = await sendPushNotification({
    userId: user.user_id,
    notificationType: 'extreme_weather',
    payload,
    respectPreferences: false,
    respectQuietHours: true,
  });

  return {
    userId: user.user_id,
    alertType: 'extreme_weather',
    sent: result.sent > 0,
    error: result.errors.join(', ') || undefined,
  };
}

// =============================================================================
// VERCEL CRON CONFIG
// =============================================================================

export const config = {
  maxDuration: 60, // Allow up to 60 seconds for processing
};
