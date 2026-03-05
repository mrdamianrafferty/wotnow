import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather, fetchOpenMeteoWeather } from '../../../lib/services/weatherService';

/* eslint-disable @typescript-eslint/no-explicit-any */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

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

// Geocode a location string to coordinates
async function geocodeLocation(location: string): Promise<GeoLocation | null> {
  if (!OPENWEATHER_API_KEY) return null;
  
  try {
    const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(geocodeUrl);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].name,
        country: data[0].country,
      };
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
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
  // Otherwise check if the location string is actually coordinates (e.g. "43.4702, -5.2995")
  else if (location) {
    const locStr = (location as string).trim();
    const coordMatch = locStr.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
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

  if (!OPENWEATHER_API_KEY) {
    return res.status(500).json({ error: 'Weather service not configured' });
  }

  try {
    // Use the same weather service as Go Daisy - always returns metric
    const weatherData = await getFullWeather({
      lat: latitude,
      lon: longitude,
      apiKey: OPENWEATHER_API_KEY,
      options: { units: 'metric' }
    }) as any; // OpenWeather One Call 3.0 response

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
