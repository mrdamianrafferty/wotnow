import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedFullWeather, fetchOpenMeteoWeather } from '../../../lib/services/weatherService';
import { getOpenWeatherKey } from '../../../lib/utils/openWeatherKey';
import { geocodeForward } from '../../../lib/utils/serverGeocode';
import { WMO_DESCRIPTIONS } from '../../../lib/grow/dailyForecast';

/* eslint-disable @typescript-eslint/no-explicit-any */

const OPENWEATHER_API_KEY = getOpenWeatherKey();

// Soil data interface
interface SoilData {
  temperature: {
    surface: number | null;    // 0cm
    shallow: number | null;    // 6cm
    mid: number | null;        // 18cm
    deep: number | null;       // 54cm
  };
  moisture: {
    surface: number | null;    // 0-1cm (m³/m³)
    shallow: number | null;    // 1-3cm
    mid: number | null;        // 3-9cm
    deep: number | null;       // 9-27cm
  };
  timestamp: string | null;
}

interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

// Geocode a location string to coordinates (Nominatim primary, OpenWeather fallback)
async function geocodeLocation(location: string): Promise<GeoLocation | null> {
  const [result] = await geocodeForward(location, 1);
  return result ? { lat: result.lat, lon: result.lon, name: result.name, country: result.country || '' } : null;
}

// WMO weather code -> OpenWeather-style "main" category, so mapCondition() and
// the daily/hourly transforms below keep working unchanged for both sources.
function wmoToMain(code: number | undefined): string {
  if (code == null) return 'Clear';
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2 || code === 3) return 'Clouds';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Clear';
}

const SYNODIC_MONTH_DAYS = 29.530588853;
// Known new moon reference: 2000-01-06 18:14 UTC
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

// Local moon-phase calculation (0 = new, 0.5 = full), matching OpenWeather's
// moon_phase convention, so getMoonPhase() downstream needs no changes.
function computeMoonPhase(dateMs: number): number {
  const daysSinceReference = (dateMs - REFERENCE_NEW_MOON_MS) / (24 * 60 * 60 * 1000);
  const phase = (daysSinceReference % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  return phase < 0 ? phase + 1 : phase;
}

/**
 * Fetch current + hourly + daily weather from Open-Meteo (free, no key) and
 * adapt it into the same shape OpenWeather One Call 3.0 returns, so the
 * existing response-building code below (current/hourly/daily transforms)
 * works unchanged regardless of which source supplied the data.
 */
async function fetchOpenMeteoAsOneCallShape(lat: number, lon: number): Promise<any | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    forecast_days: '7',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  const data = await res.json();

  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;
  if (!current || !hourly || !daily?.time?.length) return null;

  // Find the hourly index closest to "now" (UTC) to source dew_point/uvi/visibility,
  // which Open-Meteo only exposes on the hourly series, not `current`.
  const nowMs = Date.now();
  let hourIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < (hourly.time?.length ?? 0); i++) {
    const diff = Math.abs(Date.parse(`${hourly.time[i]}Z`) - nowMs);
    if (diff < bestDiff) { bestDiff = diff; hourIdx = i; }
  }

  const currentMain = wmoToMain(current.weather_code);
  const sunriseMs = Date.parse(`${daily.sunrise?.[0]}Z`);
  const sunsetMs = Date.parse(`${daily.sunset?.[0]}Z`);

  const owCurrent = {
    temp: current.temperature_2m,
    feels_like: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    wind_speed: current.wind_speed_10m,
    wind_deg: current.wind_direction_10m,
    weather: [{ description: WMO_DESCRIPTIONS[current.weather_code] || 'Unknown', main: currentMain }],
    uvi: hourly.uv_index?.[hourIdx],
    visibility: hourly.visibility?.[hourIdx],
    pressure: current.pressure_msl,
    dew_point: hourly.dew_point_2m?.[hourIdx],
    sunrise: Number.isFinite(sunriseMs) ? sunriseMs / 1000 : undefined,
    sunset: Number.isFinite(sunsetMs) ? sunsetMs / 1000 : undefined,
    rain: typeof current.rain === 'number' ? { '1h': current.rain } : undefined,
    snow: typeof current.snowfall === 'number' ? { '1h': current.snowfall * 10 } : undefined,
  };

  const owDaily = (daily.time as string[]).map((dateStr: string, i: number) => {
    const dt = Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      12
    );
    const main = wmoToMain(daily.weather_code?.[i]);
    return {
      dt: dt / 1000,
      temp: { min: daily.temperature_2m_min?.[i], max: daily.temperature_2m_max?.[i] },
      weather: [{ description: WMO_DESCRIPTIONS[daily.weather_code?.[i]] || 'Unknown', main }],
      wind_speed: daily.wind_speed_10m_max?.[i],
      pop: (daily.precipitation_probability_max?.[i] ?? 0) / 100,
      rain: daily.rain_sum?.[i],
      snow: typeof daily.snowfall_sum?.[i] === 'number' ? daily.snowfall_sum[i] * 10 : undefined,
      moon_phase: computeMoonPhase(dt),
    };
  });

  const owHourly = (hourly.time as string[])
    .map((timeStr: string, i: number) => ({ ms: Date.parse(`${timeStr}Z`), i }))
    .filter(({ ms }) => ms >= nowMs - 60 * 60 * 1000)
    .slice(0, 24)
    .map(({ i }) => ({
      dt: Date.parse(`${hourly.time[i]}Z`) / 1000,
      temp: hourly.temperature_2m?.[i],
      pop: (hourly.precipitation_probability?.[i] ?? 0) / 100,
      weather: [{ main: wmoToMain(hourly.weather_code?.[i]) }],
      wind_speed: hourly.wind_speed_10m?.[i],
      humidity: hourly.relative_humidity_2m?.[i],
      rain: typeof hourly.rain?.[i] === 'number' ? { '1h': hourly.rain[i] } : undefined,
      snow: typeof hourly.snowfall?.[i] === 'number' ? { '1h': hourly.snowfall[i] * 10 } : undefined,
    }));

  return {
    source: 'openmeteo',
    current: owCurrent,
    daily: owDaily,
    hourly: owHourly,
    alerts: [], // Open-Meteo has no global alerts equivalent; OpenWeather fallback still supplies these when used.
  };
}

// Map OpenWeather condition to simple condition string
function mapCondition(weatherMain: string): string {
  const conditionMap: Record<string, string> = {
    'Clear': 'sunny',
    'Clouds': 'cloudy',
    'Rain': 'rain',
    'Drizzle': 'light rain',
    'Thunderstorm': 'thunderstorm',
    'Snow': 'snow',
    'Mist': 'mist',
    'Fog': 'fog',
    'Haze': 'haze',
  };
  return conditionMap[weatherMain] || weatherMain.toLowerCase();
}

// Format time from unix timestamp
function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// Format hour from unix timestamp
function formatHour(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', { 
    hour: '2-digit',
    minute: '2-digit',
    hour12: false 
  });
}

// Get day name from unix timestamp
function getDayName(timestamp: number, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, lat, lon, marine } = req.query;

  let latitude: number | undefined;
  let longitude: number | undefined;
  let locationName = 'Unknown Location';

  // If lat/lon provided directly, use them
  if (lat && lon) {
    latitude = parseFloat(lat as string);
    longitude = parseFloat(lon as string);
    locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  }
  // Otherwise check if the location string contains coordinates
  else if (location) {
    const locStr = (location as string).trim();
    // Match bare "43.4702, -5.2995" or embedded "(43.4702, -5.2995)" e.g. "Current location (43.4702, -5.2995)"
    const coordMatch =
      locStr.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/) ||
      locStr.match(/\((-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\)/);
    if (coordMatch) {
      latitude = parseFloat(coordMatch[1]);
      longitude = parseFloat(coordMatch[2]);
      locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    } else {
      const geo = await geocodeLocation(locStr);
      if (geo) {
        latitude = geo.lat;
        longitude = geo.lon;
        locationName = `${geo.name}, ${geo.country}`;
      }
    }
  }

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Location required. Provide lat/lon or location string.' });
  }

  try {
    // Free-first: Open-Meteo (no key, no quota) primary, OpenWeather One Call
    // 3.0 (Supabase-cached) only as a backstop when Open-Meteo fails.
    let weatherData: any = null;
    try {
      weatherData = await fetchOpenMeteoAsOneCallShape(latitude, longitude);
    } catch (omError) {
      console.warn('[grow/weather] Open-Meteo failed, falling back to OpenWeather:', omError);
    }

    if (!weatherData) {
      if (!OPENWEATHER_API_KEY) {
        return res.status(500).json({ error: 'Weather service not configured' });
      }
      weatherData = await getCachedFullWeather({
        lat: latitude,
        lon: longitude,
        apiKey: OPENWEATHER_API_KEY,
        options: { units: 'metric' }
      }) as any; // OpenWeather One Call 3.0 response
    }

    if (!weatherData) {
      return res.status(500).json({ error: 'Failed to fetch weather data' });
    }

    // Fetch soil data from Open-Meteo (FREE, no API key needed)
    let soilData: SoilData | null = null;
    try {
      const today = new Date().toISOString().split('T')[0];
      const omData = await fetchOpenMeteoWeather(latitude, longitude, today, today) as any;
      
      if (omData?.hourly) {
        // Find the current hour index (or closest to noon for representative soil temps)
        const currentHour = new Date().getHours();
        const hourIndex = Math.min(currentHour, (omData.hourly.time?.length ?? 1) - 1);
        
        soilData = {
          temperature: {
            surface: omData.hourly.soil_temperature_0cm?.[hourIndex] ?? null,
            shallow: omData.hourly.soil_temperature_6cm?.[hourIndex] ?? null,
            mid: omData.hourly.soil_temperature_18cm?.[hourIndex] ?? null,
            deep: omData.hourly.soil_temperature_54cm?.[hourIndex] ?? null,
          },
          moisture: {
            surface: omData.hourly.soil_moisture_0_to_1cm?.[hourIndex] ?? null,
            shallow: omData.hourly.soil_moisture_1_to_3cm?.[hourIndex] ?? null,
            mid: omData.hourly.soil_moisture_3_to_9cm?.[hourIndex] ?? null,
            deep: omData.hourly.soil_moisture_9_to_27cm?.[hourIndex] ?? null,
          },
          timestamp: omData.hourly.time?.[hourIndex] ?? null,
        };
      }
    } catch (soilError) {
      console.warn('Failed to fetch soil data from Open-Meteo:', soilError);
      // Continue without soil data - it's optional
    }

    // Transform to WeatherApiResponse format expected by WeatherPage
    const current = weatherData.current || {} as any;
    const daily = (weatherData.daily || []) as any[];
    const hourly = (weatherData.hourly || []) as any[];

    const response = {
      current: {
        location: locationName,
        temperature: Math.round(current.temp ?? 0),
        feelsLike: Math.round(current.feels_like ?? current.temp ?? 0),
        condition: current.weather?.[0]?.description || 'unknown',
        high: Math.round(daily[0]?.temp?.max ?? current.temp ?? 0),
        low: Math.round(daily[0]?.temp?.min ?? current.temp ?? 0),
        windSpeed: Math.round(current.wind_speed ?? 0),
        windDirection: getWindDirection(current.wind_deg ?? 0),
        humidity: current.humidity ?? 0,
        uvIndex: Math.round(current.uvi ?? 0),
        precipitation: Math.round((daily[0]?.pop ?? 0) * 100),
        precipMM: (() => {
          // Current precipitation from the current hour rain/snow data
          const r = typeof current.rain === 'object' ? (current.rain?.['1h'] ?? 0) : 0;
          const s = typeof current.snow === 'object' ? (current.snow?.['1h'] ?? 0) : 0;
          // Also add today's total from daily forecast
          const dailyR = typeof daily[0]?.rain === 'number' ? daily[0].rain : 0;
          const dailyS = typeof daily[0]?.snow === 'number' ? daily[0].snow : 0;
          return dailyR + dailyS + r + s;
        })(),
        visibility: Math.round((current.visibility ?? 10000) / 1000),
        pressure: current.pressure ?? 1013,
        dewPoint: Math.round(current.dew_point ?? 0),
        sunrise: formatTime(current.sunrise ?? 0),
        sunset: formatTime(current.sunset ?? 0),
        moonPhase: getMoonPhase(daily[0]?.moon_phase ?? 0),
        lastFrostDate: 'N/A',
        nextFrostDate: 'N/A',
        growingSeason: true,
        growingDaysRemaining: 0,
        soilWorkability: getSoilWorkability(current.humidity ?? 50, daily[0]?.pop ?? 0),
        plantingAdvice: getPlantingAdvice(current.temp ?? 15, daily[0]?.pop ?? 0),
      },
      hourly: hourly.slice(0, 24).map((h: any) => ({
        time: formatHour(h.dt),
        temperature: Math.round(h.temp ?? 0),
        precipitation: Math.round((h.pop ?? 0) * 100),
        precipMM: (() => {
          const r = typeof h.rain === 'object' ? (h.rain?.['1h'] ?? 0) : 0;
          const s = typeof h.snow === 'object' ? (h.snow?.['1h'] ?? 0) : 0;
          return r + s;
        })(),
        condition: mapCondition(h.weather?.[0]?.main || 'Clear'),
        windSpeed: Math.round(h.wind_speed ?? 0),
        humidity: h.humidity ?? 0,
      })),
      daily: daily.slice(0, 7).map((d: any, i: number) => ({
        day: getDayName(d.dt, i),
        high: Math.round(d.temp?.max ?? 0),
        low: Math.round(d.temp?.min ?? 0),
        condition: mapCondition(d.weather?.[0]?.main || 'Clear'),
        rainChance: Math.round((d.pop ?? 0) * 100),
        wind: Math.round(d.wind_speed ?? 0),
        precipMM: (() => {
          const r = typeof d.rain === 'number' ? d.rain : 0;
          const s = typeof d.snow === 'number' ? d.snow : 0;
          const total = r + s;
          return Number.isFinite(total) ? total : undefined;
        })(),
      })),
      // Marine data would require a separate API call - omit for now unless requested
      marine: marine === 'true' ? undefined : undefined,
      alerts: (weatherData.alerts || []).map((a: any) => ({
        title: a.event || 'Weather Alert',
        description: a.description || '',
        severity: a.tags?.includes('Extreme') ? 'warning' : 'watch',
      })),
      // Real soil data from Open-Meteo (FREE) - format for SoilConditionsCard
      soil: soilData ? {
        // Use surface temperature (0cm) as the primary soil temp
        temperature: Math.round((soilData.temperature.surface ?? soilData.temperature.shallow ?? 10) * 10) / 10,
        // Convert moisture from m³/m³ to percentage (0-100) for display
        // Typical soil moisture: 0.1-0.4 m³/m³ = 10-40%
        moisture: Math.round((soilData.moisture.surface ?? soilData.moisture.shallow ?? 0.35) * 100),
        // Derive compaction/structure from moisture level
        compaction: getSoilCompaction(soilData.moisture.surface ?? soilData.moisture.shallow ?? 0.35),
        // Recommendation based on soil conditions
        recommendation: getSoilRecommendation(
          soilData.temperature.surface ?? 10,
          soilData.moisture.surface ?? 0.35
        ),
        // Also include detailed multi-depth data for advanced users
        detailed: soilData,
      } : null,
    };

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(response);

  } catch (error) {
    console.error('Weather API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch weather', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper functions
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function getMoonPhase(phase: number): string {
  if (phase === 0 || phase === 1) return 'New Moon';
  if (phase < 0.25) return 'Waxing Crescent';
  if (phase === 0.25) return 'First Quarter';
  if (phase < 0.5) return 'Waxing Gibbous';
  if (phase === 0.5) return 'Full Moon';
  if (phase < 0.75) return 'Waning Gibbous';
  if (phase === 0.75) return 'Last Quarter';
  return 'Waning Crescent';
}

function getSoilWorkability(humidity: number, rainChance: number): string {
  if (rainChance > 0.7 || humidity > 90) return 'Too Wet';
  if (humidity < 30) return 'Too Dry';
  if (humidity >= 40 && humidity <= 70 && rainChance < 0.3) return 'Ideal';
  return 'Workable';
}

function getPlantingAdvice(temp: number, _rainChance: number): string {
  if (temp < 5) return 'Too cold for most planting. Focus on indoor seed starting or cold-hardy crops under protection.';
  if (temp < 10) return 'Good for cold-hardy vegetables like kale, spinach, and peas. Protect tender seedlings.';
  if (temp >= 10 && temp <= 20) return 'Ideal conditions for most cool-season crops. Great time for transplanting.';
  if (temp > 20 && temp <= 25) return 'Perfect for warm-season crops. Ensure adequate watering.';
  if (temp > 25) return 'Hot conditions - water early morning or evening. Provide shade for leafy greens.';
  return 'Check local conditions for specific planting advice.';
}

// Derive soil compaction/structure from moisture level (m³/m³)
function getSoilCompaction(moisture: number): string {
  if (moisture > 0.45) return 'Waterlogged - avoid working';
  if (moisture > 0.35) return 'Moist - good for planting';
  if (moisture > 0.25) return 'Ideal - well-drained';
  if (moisture > 0.15) return 'Dry - water before planting';
  return 'Very dry - deep watering needed';
}

// Generate soil recommendation based on temperature and moisture
function getSoilRecommendation(temp: number, moisture: number): string {
  // Too cold
  if (temp < 5) {
    return 'Soil too cold for most seeds. Wait for warmer conditions or use cloches/cold frames.';
  }
  
  // Cold soil
  if (temp < 10) {
    if (moisture > 0.4) return 'Cold and wet soil. Allow to drain before working. Good for hardy crops under protection.';
    if (moisture < 0.2) return 'Cold and dry soil. Ideal for early preparation. Add compost to improve structure.';
    return 'Cool soil suitable for peas, broad beans, and hardy greens. Protect tender seedlings.';
  }
  
  // Ideal temp range
  if (temp >= 10 && temp <= 18) {
    if (moisture > 0.4) return 'Good temperature but soil is wet. Wait 1-2 days before planting to avoid compaction.';
    if (moisture < 0.2) return 'Ideal temperature but soil needs water. Irrigate before planting for best germination.';
    return 'Perfect soil conditions for transplanting and direct sowing most crops.';
  }
  
  // Warm soil
  if (temp > 18) {
    if (moisture > 0.4) return 'Warm and moist - watch for fungal issues. Good drainage essential.';
    if (moisture < 0.2) return 'Warm and dry - mulch to retain moisture. Water deeply before planting.';
    return 'Excellent conditions for warm-season crops like tomatoes, peppers, and squash.';
  }
  
  return 'Check local conditions for specific soil recommendations.';
}
