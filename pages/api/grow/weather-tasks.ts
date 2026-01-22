/**
 * /api/grow/weather-tasks
 *
 * API endpoint for weather-based task recommendations.
 * This is the KEY DIFFERENTIATOR - connecting weather to actionable tasks.
 *
 * GET: Get weather-based task recommendations for the user
 *
 * @module pages/api/grow/weather-tasks
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeWeatherForTasks,
  WeatherForecast,
  SoilConditions,
  UserPlant,
  WeatherTaskResult,
} from '@/lib/grow/weatherTaskEngine';

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

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Fetch weather forecast from OpenWeather
 */
async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
  if (!OPENWEATHER_API_KEY) {
    console.error('[WeatherTasks] OpenWeather API key not configured');
    throw new Error('Weather service not configured');
  }

  // Validate coordinates
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates');
  }

  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;

  try {
    const response = await fetchWithTimeout(url, 15000);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[WeatherTasks] OpenWeather error: ${response.status} - ${errorText}`);
      throw new Error(`Weather service error (${response.status})`);
    }

    const data = await response.json();

    if (!data.list || !Array.isArray(data.list)) {
      throw new Error('Invalid weather data received');
    }

  // Group by day and extract daily forecasts
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
    day.windSpeed.push(item.wind.speed * 3.6); // m/s to km/h
    day.windGust.push((item.wind.gust || item.wind.speed) * 3.6);
  }

  // Convert to forecast array
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
      uvIndex: 5, // OpenWeather free tier doesn't include UV
      description: day.description,
    });
  }

    return forecasts.slice(0, 7); // Return 7 days
  } catch (err) {
    console.error('[WeatherTasks] fetchWeatherForecast error:', err);
    throw err;
  }
}

/**
 * Default soil conditions when API fails
 */
function getDefaultSoilConditions(): SoilConditions {
  // Fallback values when Open-Meteo soil API is unavailable
  // Using 35% as a reasonable default for temperate climates
  console.warn('[WeatherTasks] Using default soil conditions - API may be unavailable');
  return {
    temp0cm: 15,
    temp6cm: 14,
    temp18cm: 12,
    temp54cm: 10,
    moisture0to1cm: 35,
    moisture1to3cm: 35,
    moisture3to9cm: 35,
    moisture9to27cm: 35,
  };
}

/**
 * Fetch soil conditions from Open-Meteo
 * Returns default values if API fails (non-critical data)
 */
async function fetchSoilConditions(lat: number, lon: number): Promise<SoilConditions> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&forecast_days=1`;

  try {
    const response = await fetchWithTimeout(url, 10000);

    if (!response.ok) {
      console.error(`[WeatherTasks] Open-Meteo error: ${response.status}`);
      return getDefaultSoilConditions();
    }

    const data = await response.json();
    const hourly = data.hourly;

    if (!hourly) {
      console.error('[WeatherTasks] Invalid soil data - no hourly data');
      return getDefaultSoilConditions();
    }

    // Get current hour's data (or average)
    const currentHour = new Date().getHours();
    const idx = Math.min(currentHour, (hourly.soil_temperature_0cm?.length || 1) - 1);

    return {
      temp0cm: hourly.soil_temperature_0cm?.[idx] ?? 15,
      temp6cm: hourly.soil_temperature_6cm?.[idx] ?? 14,
      temp18cm: hourly.soil_temperature_18cm?.[idx] ?? 12,
      temp54cm: hourly.soil_temperature_54cm?.[idx] ?? 10,
      moisture0to1cm: (hourly.soil_moisture_0_to_1cm?.[idx] ?? 0.35) * 100,
      moisture1to3cm: (hourly.soil_moisture_1_to_3cm?.[idx] ?? 0.35) * 100,
      moisture3to9cm: (hourly.soil_moisture_3_to_9cm?.[idx] ?? 0.35) * 100,
      moisture9to27cm: (hourly.soil_moisture_9_to_27cm?.[idx] ?? 0.35) * 100,
    };
  } catch (err) {
    console.error('[WeatherTasks] fetchSoilConditions error:', err);
    // Return defaults - soil data is nice-to-have, not critical
    return getDefaultSoilConditions();
  }
}

/**
 * Fetch user's plants
 */
async function fetchUserPlants(userId: string): Promise<UserPlant[]> {
  const { data, error } = await supabase
    .from('grow_user_plants')
    .select('id, plant_name, plant_slug, frost_tolerance, water_needs, temperature_min_c, temperature_max_c, last_watered_at, watering_frequency_days')
    .eq('user_id', userId);

  if (error) {
    console.error('[WeatherTasks] Error fetching plants:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    plantName: p.plant_name,
    plantSlug: p.plant_slug,
    frostTolerance: p.frost_tolerance,
    waterNeeds: p.water_needs,
    temperatureMin: p.temperature_min_c,
    temperatureMax: p.temperature_max_c,
    lastWateredAt: p.last_watered_at,
    wateringFrequencyDays: p.watering_frequency_days,
  }));
}

/**
 * Fetch user's location from preferences
 */
async function fetchUserLocation(userId: string): Promise<{ lat: number; lon: number } | null> {
  const { data, error } = await supabase
    .from('grow_user_preferences')
    .select('latitude, longitude')
    .eq('user_id', userId)
    .single();

  if (error || !data?.latitude || !data?.longitude) {
    return null;
  }

  return { lat: data.latitude, lon: data.longitude };
}

/**
 * Store alerts asynchronously (non-blocking)
 */
async function storeAlertsAsync(userId: string, alerts: WeatherTaskResult['alerts']): Promise<void> {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');

  for (const alert of criticalAlerts) {
    try {
      // Check if we already have this alert
      const { data: existing } = await supabase
        .from('grow_weather_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('alert_type', alert.type)
        .eq('forecast_date', alert.forecastDate)
        .single();

      if (!existing) {
        const { error } = await supabase.from('grow_weather_alerts').insert({
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

        if (error) {
          console.error('[WeatherTasks] Alert insert error:', error);
        }
      }
    } catch (err) {
      console.error('[WeatherTasks] Error storing alert:', alert.type, err);
    }
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user
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

  try {
    // Get user's location
    const location = await fetchUserLocation(userId);

    if (!location) {
      return res.status(400).json({
        error: 'Location not set',
        message: 'Please set your garden location in settings to get weather-based recommendations.',
      });
    }

    // Fetch all data in parallel
    const [forecast, soil, plants] = await Promise.all([
      fetchWeatherForecast(location.lat, location.lon),
      fetchSoilConditions(location.lat, location.lon),
      fetchUserPlants(userId),
    ]);

    // Get planned activities from query (optional)
    const plannedActivities = (req.query.activities as string)?.split(',') || [];

    // Run the weather task engine
    const result: WeatherTaskResult = analyzeWeatherForTasks(
      forecast,
      soil,
      plants,
      plannedActivities
    );

    // Store any critical alerts in the database (non-blocking)
    // Don't let storage failures break the response
    if (result.alerts.some(a => a.severity === 'critical' || a.severity === 'warning')) {
      storeAlertsAsync(userId, result.alerts).catch(err => {
        console.error('[WeatherTasks] Failed to store alerts:', err);
      });
    }

    return res.status(200).json({
      success: true,
      location: {
        latitude: location.lat,
        longitude: location.lon,
      },
      forecast: forecast.slice(0, 5), // Return 5-day forecast summary
      soil: {
        temperature6cm: soil.temp6cm,
        moisture1to3cm: soil.moisture1to3cm,
        // Include all soil data for premium users
        temperature0cm: soil.temp0cm,
        temperature18cm: soil.temp18cm,
        temperature54cm: soil.temp54cm,
        moisture0to1cm: soil.moisture0to1cm,
        moisture3to9cm: soil.moisture3to9cm,
        moisture9to27cm: soil.moisture9to27cm,
      },
      plantCount: plants.length,
      result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[WeatherTasks] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate weather tasks',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
