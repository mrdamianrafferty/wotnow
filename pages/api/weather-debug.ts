import type { NextApiRequest, NextApiResponse } from 'next';

interface WeatherDebugResult {
  success: boolean;
  message?: string;
  step?: string;
  geocoding?: {
    success: boolean;
    location?: string;
    coords?: { lat: number; lon: number };
    error?: string;
  };
  weatherApi?: {
    success: boolean;
    source?: string;
    error?: string;
  };
  preview?: {
    temperature?: number;
    description?: string;
    humidity?: number;
    hasSoilData?: boolean;
    hasMarineData?: boolean;
  };
  error?: string;
  details?: string;
  suggestion?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WeatherDebugResult>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { location } = req.query;
  
  if (!location || typeof location !== 'string') {
    return res.status(400).json({ 
      success: false, 
      error: 'Location parameter is required',
      suggestion: 'Add ?location=YourCity,Country to the URL'
    });
  }

  try {
    // Step 1: Geocode the location
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'WotNow/1.0 (https://godaisy.io)'
      }
    });

    if (!geocodeResponse.ok) {
      return res.status(500).json({
        success: false,
        step: 'geocoding',
        geocoding: {
          success: false,
          error: `Geocoding API returned ${geocodeResponse.status}`
        },
        error: 'Failed to geocode location'
      });
    }

    const geocodeData = await geocodeResponse.json() as Array<{ lat: string; lon: string; display_name: string }>;
    
    if (!geocodeData || geocodeData.length === 0) {
      return res.status(404).json({
        success: false,
        step: 'geocoding',
        geocoding: {
          success: false,
          error: 'Location not found'
        },
        error: `Could not find location: ${location}`,
        suggestion: 'Try a more specific location like "City, Country"'
      });
    }

    const lat = parseFloat(geocodeData[0].lat);
    const lon = parseFloat(geocodeData[0].lon);
    const displayName = geocodeData[0].display_name;

    // Step 2: Fetch weather data from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      return res.status(500).json({
        success: false,
        step: 'weather',
        geocoding: {
          success: true,
          location: displayName,
          coords: { lat, lon }
        },
        weatherApi: {
          success: false,
          error: `Weather API returned ${weatherResponse.status}`
        },
        error: 'Failed to fetch weather data'
      });
    }

    const weatherData = await weatherResponse.json() as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };

    // Step 3: Check for soil data availability (optional)
    let hasSoilData = false;
    try {
      const soilUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_moisture_0_to_1cm&forecast_days=1`;
      const soilResponse = await fetch(soilUrl);
      if (soilResponse.ok) {
        const soilData = await soilResponse.json() as { hourly?: { soil_temperature_0cm?: number[] } };
        hasSoilData = Boolean(soilData?.hourly?.soil_temperature_0cm?.[0]);
      }
    } catch {
      // Soil data not available
    }

    // Step 4: Check for marine data availability (optional)
    let hasMarineData = false;
    try {
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height`;
      const marineResponse = await fetch(marineUrl);
      if (marineResponse.ok) {
        const marineData = await marineResponse.json() as { current?: { wave_height?: number } };
        hasMarineData = marineData?.current?.wave_height !== undefined;
      }
    } catch {
      // Marine data not available (inland location)
    }

    // Map weather code to description
    const weatherDescriptions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };

    const weatherCode = weatherData?.current?.weather_code ?? 0;
    const description = weatherDescriptions[weatherCode] || `Unknown (code ${weatherCode})`;

    return res.status(200).json({
      success: true,
      message: 'Weather data fetched successfully',
      geocoding: {
        success: true,
        location: displayName,
        coords: { lat, lon }
      },
      weatherApi: {
        success: true,
        source: 'Open-Meteo'
      },
      preview: {
        temperature: weatherData?.current?.temperature_2m,
        description,
        humidity: weatherData?.current?.relative_humidity_2m,
        hasSoilData,
        hasMarineData
      }
    });

  } catch (error) {
    const err = error as { message?: string };
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      details: String(error)
    });
  }
}
