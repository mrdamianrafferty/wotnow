/**
 * /api/cron/grow/weather-task-alerts
 *
 * Daily cron job to analyze weather and generate alerts for all users.
 * Sends push notifications for critical weather events (frost, heat, etc.)
 *
 * Schedule: Runs twice daily (6am and 6pm local time approximation)
 *
 * @module pages/api/cron/grow/weather-task-alerts
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeWeatherForTasks,
  WeatherForecast,
  SoilConditions,
  UserPlant,
  WeatherAlert,
} from '@/lib/grow/weatherTaskEngine';
import { sendPushNotification, NotificationType } from '@/lib/grow/notifications';

/**
 * Map alert types to notification types
 */
function mapAlertToNotificationType(alertType: string, severity: string): NotificationType {
  if (alertType === 'frost') return 'frost_alert';
  if (severity === 'critical' && ['storm', 'heat', 'wind', 'wind_desiccation'].includes(alertType)) {
    return 'extreme_weather';
  }
  // Pest/disease alerts use weather_threat notification type
  if (['late_blight', 'powdery_mildew', 'botrytis', 'aphids', 'slugs'].includes(alertType)) {
    return 'weather_threat';
  }
  return 'weather_threat';
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
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

/**
 * Fetch weather forecast from OpenWeather
 */
async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
  if (!OPENWEATHER_API_KEY) return [];

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) return [];

    const data = await response.json();
    const dailyMap = new Map<string, {
      temps: number[];
      humidity: number[];
      precipitation: number;
      precipProb: number[];
      windSpeed: number[];
      windGust: number[];
      description: string;
    }>();

    for (const item of data.list) {
      const date = item.dt_txt.split(' ')[0];

      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          temps: [],
          humidity: [],
          precipitation: 0,
          precipProb: [],
          windSpeed: [],
          windGust: [],
          description: item.weather[0]?.description || '',
        });
      }

      const day = dailyMap.get(date)!;
      day.temps.push(item.main.temp);
      day.humidity.push(item.main.humidity);
      day.precipitation += (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0);
      day.precipProb.push(item.pop * 100);
      day.windSpeed.push(item.wind.speed * 3.6);
      day.windGust.push((item.wind.gust || item.wind.speed) * 3.6);
    }

    const forecasts: WeatherForecast[] = [];
    for (const [date, day] of dailyMap.entries()) {
      forecasts.push({
        date,
        tempMin: Math.min(...day.temps),
        tempMax: Math.max(...day.temps),
        humidity: day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length,
        precipitation: day.precipitation,
        precipProbability: Math.max(...day.precipProb),
        windSpeed: day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length,
        windGust: Math.max(...day.windGust),
        uvIndex: 5,
        description: day.description,
      });
    }

    return forecasts.slice(0, 5);
  } catch (error) {
    console.error('[WeatherCron] Forecast error:', error);
    return [];
  }
}

/**
 * Fetch soil conditions from Open-Meteo
 */
async function fetchSoilConditions(lat: number, lon: number): Promise<SoilConditions> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&forecast_days=1`;
    const response = await fetch(url);

    if (!response.ok) {
      return defaultSoilConditions();
    }

    const data = await response.json();
    const hourly = data.hourly;
    const currentHour = new Date().getHours();
    const idx = Math.min(currentHour, (hourly.soil_temperature_0cm?.length || 1) - 1);

    return {
      temp0cm: hourly.soil_temperature_0cm?.[idx] ?? 15,
      temp6cm: hourly.soil_temperature_6cm?.[idx] ?? 14,
      temp18cm: hourly.soil_temperature_18cm?.[idx] ?? 12,
      temp54cm: hourly.soil_temperature_54cm?.[idx] ?? 10,
      moisture0to1cm: (hourly.soil_moisture_0_to_1cm?.[idx] ?? 0.3) * 100,
      moisture1to3cm: (hourly.soil_moisture_1_to_3cm?.[idx] ?? 0.3) * 100,
      moisture3to9cm: (hourly.soil_moisture_3_to_9cm?.[idx] ?? 0.3) * 100,
      moisture9to27cm: (hourly.soil_moisture_9_to_27cm?.[idx] ?? 0.3) * 100,
    };
  } catch (error) {
    console.error('[WeatherCron] Soil error:', error);
    return defaultSoilConditions();
  }
}

function defaultSoilConditions(): SoilConditions {
  return {
    temp0cm: 15,
    temp6cm: 14,
    temp18cm: 12,
    temp54cm: 10,
    moisture0to1cm: 30,
    moisture1to3cm: 30,
    moisture3to9cm: 30,
    moisture9to27cm: 30,
  };
}

/**
 * Send push notification for weather alert
 */
async function sendAlertNotification(
  userId: string,
  alert: WeatherAlert
): Promise<boolean> {
  try {
    // Determine notification icon and URL
    let icon = '/icons/weather-alert.png';
    let url = '/grow/weather';

    if (alert.type === 'frost') {
      icon = '/icons/frost-alert.png';
      url = '/grow/weather?alert=frost';
    } else if (alert.type === 'heat') {
      icon = '/icons/heat-alert.png';
    } else if (alert.type === 'wind' || alert.type === 'wind_desiccation') {
      icon = '/icons/wind-alert.png';
    } else if (['late_blight', 'powdery_mildew', 'botrytis'].includes(alert.type)) {
      icon = '/icons/disease-alert.png';
      url = '/grow/weather?alert=disease';
    } else if (['aphids', 'slugs'].includes(alert.type)) {
      icon = '/icons/pest-alert.png';
      url = '/grow/weather?alert=pest';
    }

    // Use the centralized notification system which handles:
    // - Fetching subscriptions
    // - Checking preferences
    // - Respecting quiet hours
    const result = await sendPushNotification({
      userId,
      notificationType: mapAlertToNotificationType(alert.type, alert.severity),
      payload: {
        title: alert.title,
        body: alert.suggestedAction,
        icon,
        data: {
          url,
          alertType: alert.type,
          alertId: alert.forecastDate,
        },
      },
      respectPreferences: true,
      respectQuietHours: true,
    });

    return result.sent > 0;
  } catch (error) {
    console.error('[WeatherCron] Notification error:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  const authHeader = req.headers.authorization;
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const startTime = Date.now();
  let usersProcessed = 0;
  let alertsGenerated = 0;
  let notificationsSent = 0;

  try {
    // Get all users with location set and notification preferences
    const { data: users, error: usersError } = await supabase
      .from('grow_user_preferences')
      .select('user_id, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (usersError || !users) {
      console.error('[WeatherCron] Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    console.log(`[WeatherCron] Processing ${users.length} users with locations`);

    // Process users in batches to avoid rate limits
    const BATCH_SIZE = 10;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (userPref) => {
        const userId = userPref.user_id;
        const lat = userPref.latitude;
        const lon = userPref.longitude;

        try {
          // Fetch weather and soil data
          const [forecast, soil] = await Promise.all([
            fetchWeatherForecast(lat, lon),
            fetchSoilConditions(lat, lon),
          ]);

          if (forecast.length === 0) {
            return;
          }

          // Fetch user's plants
          const { data: plantsData } = await supabase
            .from('grow_user_plants')
            .select('id, plant_name, plant_slug, frost_tolerance, water_needs, temperature_min_c, temperature_max_c')
            .eq('user_id', userId);

          const plants: UserPlant[] = (plantsData || []).map(p => ({
            id: p.id,
            plantName: p.plant_name,
            plantSlug: p.plant_slug,
            frostTolerance: p.frost_tolerance,
            waterNeeds: p.water_needs,
            temperatureMin: p.temperature_min_c,
            temperatureMax: p.temperature_max_c,
          }));

          // Analyze weather
          const result = analyzeWeatherForTasks(forecast, soil, plants);

          usersProcessed++;

          // Process critical and warning alerts
          for (const alert of result.alerts) {
            if (alert.severity === 'critical' || alert.severity === 'warning') {
              // Check if we already sent this alert
              const { data: existing } = await supabase
                .from('grow_weather_alerts')
                .select('id')
                .eq('user_id', userId)
                .eq('alert_type', alert.type)
                .eq('forecast_date', alert.forecastDate)
                .single();

              if (!existing) {
                // Store the alert
                await supabase.from('grow_weather_alerts').insert({
                  user_id: userId,
                  alert_type: alert.type,
                  severity: alert.severity,
                  title: alert.title,
                  message: alert.message,
                  forecast_date: alert.forecastDate,
                  forecast_value: alert.forecastValue,
                  affected_plant_ids: alert.affectedPlantIds,
                  expires_at: new Date(new Date(alert.forecastDate).getTime() + 48 * 60 * 60 * 1000).toISOString(),
                });

                alertsGenerated++;

                // Send push notification for critical alerts
                if (alert.severity === 'critical') {
                  const sent = await sendAlertNotification(userId, alert);
                  if (sent) notificationsSent++;
                }
              }
            }
          }
        } catch (error) {
          console.error(`[WeatherCron] Error processing user ${userId}:`, error);
        }
      }));

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < users.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duration = Date.now() - startTime;

    console.log(`[WeatherCron] Complete: ${usersProcessed} users, ${alertsGenerated} alerts, ${notificationsSent} notifications in ${duration}ms`);

    return res.status(200).json({
      success: true,
      usersProcessed,
      alertsGenerated,
      notificationsSent,
      durationMs: duration,
    });
  } catch (error) {
    console.error('[WeatherCron] Error:', error);
    return res.status(500).json({
      error: 'Cron job failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
