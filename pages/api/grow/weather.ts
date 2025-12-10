import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather } from '../../../lib/services/weatherService';

/* eslint-disable @typescript-eslint/no-explicit-any */

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

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
  // Otherwise geocode the location string
  else if (location) {
    const geo = await geocodeLocation(location as string);
    if (geo) {
      latitude = geo.lat;
      longitude = geo.lon;
      locationName = `${geo.name}, ${geo.country}`;
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
      })),
      // Marine data would require a separate API call - omit for now unless requested
      marine: marine === 'true' ? undefined : undefined,
      alerts: (weatherData.alerts || []).map((a: any) => ({
        title: a.event || 'Weather Alert',
        description: a.description || '',
        severity: a.tags?.includes('Extreme') ? 'warning' : 'watch',
      })),
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
