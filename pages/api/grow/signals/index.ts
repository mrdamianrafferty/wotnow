import type { NextApiRequest, NextApiResponse } from 'next';
import { getDailyForecast } from '@/lib/grow/dailyForecast';
import {
  generateLocalSignals,
  type LocalSignal,
  type LocalSignalResult,
  type SignalPreferences,
  type SignalType,
} from '../../../../lib/grow/localSignals';

const OPENWEATHER_API_KEY =
  process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location, lat, lon, muted, minSeverity } = req.query;

  let latitude: number | undefined;
  let longitude: number | undefined;
  let locationName = 'Unknown Location';

  // Parse coordinates
  if (lat && lon) {
    latitude = parseFloat(lat as string);
    longitude = parseFloat(lon as string);
    locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  } else if (location) {
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
    // Fetch daily forecast: Open-Meteo (free) primary, OpenWeather One Call 3.0 backstop.
    const forecast = await getDailyForecast({
      lat: latitude,
      lon: longitude,
      apiKey: OPENWEATHER_API_KEY,
    });

    if (!forecast.length) {
      return res.status(500).json({ error: 'Failed to fetch weather data' });
    }

    // Parse preferences
    const preferences: SignalPreferences = {
      muted: muted ? (muted as string).split(',') as SignalType[] : [],
      minSeverity: (minSeverity as 'low' | 'moderate' | 'high' | 'critical') || 'low',
    };

    // Generate signals
    const signals: LocalSignal[] = generateLocalSignals(forecast, preferences);

    const result: LocalSignalResult = {
      signals,
      location: {
        lat: latitude,
        lon: longitude,
        name: locationName,
      },
      generatedAt: new Date().toISOString(),
      dataFreshness: new Date().toISOString(),
    };

    // Cache for 30 minutes (signals are weather-based, update frequently)
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json(result);
  } catch (error) {
    console.error('Local signals API error:', error);
    return res.status(500).json({
      error: 'Failed to generate local signals',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
