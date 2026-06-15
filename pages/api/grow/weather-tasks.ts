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
import { generateSmartTasks } from '@/lib/grow/smartTasks';
import type { SmartTaskContext, PlantInfo } from '@/lib/grow/smartTasks';
import type { ClimateZoneCode } from '@/lib/grow/climate';
import { getUnifiedWeatherData } from '@/lib/grow/weatherDataSource';
import { fetchOpenMeteoDailyForecastRaw } from '@/lib/services/weatherService';
import { mapOpenMeteoDaily } from '@/lib/grow/dailyForecast';

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

/**
 * Fetch weather forecast from Open-Meteo (free tier, no API key required)
 * Falls back gracefully if service unavailable
 */
async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecast[]> {
  // Validate coordinates
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Invalid coordinates');
  }

  try {
    const data = await fetchOpenMeteoDailyForecastRaw(lat, lon, 7);
    return mapOpenMeteoDaily(data);
  } catch (err) {
    console.error('[WeatherTasks] fetchWeatherForecast error:', err);
    // Return empty array rather than throwing - allows graceful fallback
    return [];
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
    const response = await fetch(url);

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

    // Check for personal weather station data first
    let stationData = null;
    let dataSource: 'personal_station' | 'forecast' = 'forecast';
    try {
      stationData = await getUnifiedWeatherData(supabase, userId, location.lat, location.lon);
      if (stationData && !stationData.is_stale) {
        dataSource = 'personal_station';
      }
    } catch (err) {
      console.warn('[WeatherTasks] Station data check failed, using forecast:', err);
    }

    // Fetch all data in parallel
    const [forecast, soil, plants] = await Promise.all([
      fetchWeatherForecast(location.lat, location.lon),
      fetchSoilConditions(location.lat, location.lon),
      fetchUserPlants(userId),
    ]);

    // If we have fresh personal station data, override current conditions in today's forecast
    if (dataSource === 'personal_station' && stationData && forecast.length > 0) {
      const today = forecast[0];
      if (stationData.temperature_c != null) {
        today.tempMin = Math.min(today.tempMin, stationData.temperature_c);
        today.tempMax = Math.max(today.tempMax, stationData.temperature_c);
      }
      if (stationData.humidity_percent != null) {
        today.humidity = stationData.humidity_percent;
      }
      if (stationData.wind_speed_mps != null) {
        today.windSpeed = stationData.wind_speed_mps * 3.6; // m/s to km/h
      }
    }

    // If personal station has soil sensors, override Open-Meteo soil data
    if (dataSource === 'personal_station' && stationData) {
      if (stationData.soil_temp_1_c != null) {
        soil.temp0cm = stationData.soil_temp_1_c;
      }
      if (stationData.soil_temp_2_c != null) {
        soil.temp6cm = stationData.soil_temp_2_c;
      }
      if (stationData.soil_moisture_1_pct != null) {
        soil.moisture0to1cm = stationData.soil_moisture_1_pct;
        soil.moisture1to3cm = stationData.soil_moisture_1_pct;
      }
      if (stationData.soil_moisture_2_pct != null) {
        soil.moisture3to9cm = stationData.soil_moisture_2_pct;
      }
    }

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

    // Generate smart tasks (frost, watering, planting, harvest, seasonal)
    // Load climate zone for seasonal task generation
    const { data: profileData } = await supabase
      .from('profiles')
      .select('preferences_json')
      .eq('id', userId)
      .maybeSingle();

    const prefs = profileData?.preferences_json as Record<string, unknown> | null;
    const climateZone = (prefs?.['climate_zone'] as ClimateZoneCode) ?? null;

    const smartPlants: PlantInfo[] = plants.map((p) => ({
      slug: p.plantSlug || p.plantName || 'unknown',
      name: p.plantName,
      frostTolerance: p.frostTolerance,
      frostProtectionNeeded: p.frostTolerance === 'tender',
      plantedAt: p.lastWateredAt, // Use lastWateredAt as proxy if planted_at unavailable
      waterNeeds: p.waterNeeds,
    }));

    const smartCtx: SmartTaskContext = {
      climateZone,
      elevation: null,
      userPlants: smartPlants,
      gardenConditions: {
        soilType: null,
        sunExposure: null,
        moisture: null,
        hasGreenhouse: false,
        hasRaisedBeds: false,
        hasColdFrame: false,
      },
      forecast,
      soilConditions: soil,
    };

    const smartTasks = generateSmartTasks(smartCtx);

    // Auto-create actionable tasks in grow_user_tasks (non-blocking)
    const actionableTasks = smartTasks.filter(
      (t) => t.isRelevant && (t.urgency === 'now' || t.urgency === 'soon')
    );

    for (const task of actionableTasks) {
      supabase
        .from('grow_user_tasks')
        .upsert(
          {
            user_id: userId,
            task_id: task.id,
            title: task.title,
            description: task.description,
            task_type: task.type,
            plant_slug: task.plants[0] || null,
            status: 'pending',
          },
          { onConflict: 'user_id,task_id', ignoreDuplicates: true }
        )
        .then(({ error: upsertError }) => {
          if (upsertError) {
            console.error('[WeatherTasks] Task upsert error:', upsertError);
          }
        });
    }

    return res.status(200).json({
      success: true,
      dataSource,
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
      smartTasks,
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
