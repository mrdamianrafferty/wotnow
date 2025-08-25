import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather } from '../../lib/openweather';
import { createHash } from 'crypto';

// In-memory cache for API responses
const CACHE: Record<string, { 
  data: any; 
  timestamp: number; 
  expiresAt: number;
}> = {};

// Cache duration for environmental data (15 minutes)
const CACHE_DURATION_MS = 15 * 60 * 1000;

// Generate a cache key from request parameters
function generateCacheKey(lat: number, lon: number): string {
  return createHash('md5').update(`${lat}-${lon}`).digest('hex');
}

async function fetchOpenMeteoAirPollen(lat: number, lon: number) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  
  // Open-Meteo API only allows up to 2025-08-24
  const MAX_END_DATE = '2025-08-24';
  const MAX_DATE = new Date('2025-08-24');
  
  // If current date is beyond the max supported date,
  // use max date as both start and end to get the most recent available data
  let start, end;
  
  if (now > MAX_DATE) {
    // We're beyond the max date, so use the max date as both start and end
    // and we'll note in the response that data may be stale
    console.log('Current date beyond Open-Meteo max supported date, using historical data');
    start = '2025-08-24'; // Max date
    end = '2025-08-24';   // Max date
  } else {
    // Normal case - we're within the supported date range
    start = today;
    const endDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    end = endDate.toISOString().split('T')[0]; // 8 days later
    if (end > MAX_END_DATE) end = MAX_END_DATE;
  }

  const hourlyVars = [
    'alder_pollen',
    'birch_pollen', 
    'grass_pollen',
    'ragweed_pollen',
    'us_aqi' // Add air quality index
  ];

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&` +
    `hourly=${hourlyVars.join(',')}&` +
    `start_date=${start}&end_date=${end}&` +
    `timezone=auto`;

  console.log('Open-Meteo air quality URL:', url);

  try {
    // Add timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    console.log('Open-Meteo response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Open-Meteo error response:', errorText);
      throw new Error(`Open-Meteo air/pollen ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Open-Meteo data received successfully');
    return data;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, forceRefresh } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon parameters" });
  }
  
  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    const shouldForceRefresh = forceRefresh === 'true';
    
    console.log(`Weather API called for lat: ${latitude}, lon: ${longitude}, forceRefresh: ${shouldForceRefresh}`);
    
    // Check cache first
    const cacheKey = generateCacheKey(latitude, longitude);
    const now = Date.now();
    
    // Return cached data if it exists and is still valid (unless forceRefresh is true)
    if (!shouldForceRefresh && CACHE[cacheKey] && now < CACHE[cacheKey].expiresAt) {
      console.log('Returning cached weather data');
      return res.status(200).json({
        ...CACHE[cacheKey].data,
        fromCache: true,
        cacheAge: Math.round((now - CACHE[cacheKey].timestamp) / 1000) + 's'
      });
    }
    
    // Get OpenWeather data using new service module
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!apiKey) {
      console.error('Missing OpenWeather API key in environment variables');
      return res.status(500).json({ 
        error: 'Configuration error',
        details: 'Missing OpenWeather API key. Please check server configuration.'
      });
    }
    
    console.log(`Weather API processing request for lat: ${latitude}, lon: ${longitude}`);
    
    // Add timeouts and better error handling for each API call
    let weatherData, pollenResponse;
    
    try {
      // Call getFullWeather with a timeout
      weatherData = await Promise.race([
        getFullWeather({ lat: latitude, lon: longitude, apiKey }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('OpenWeather API timeout')), 10000))
      ]);
      
      // Validate the response structure to ensure we have what we need
      if (!weatherData || (weatherData.source === 'onecall3' && !weatherData.list)) {
        throw new Error('Invalid OpenWeather response format');
      }
      
      console.log('OpenWeather data fetched successfully');
      
      // Debug the OpenWeather data to check if UVI is present
      console.log('OpenWeather data structure:');
      if (weatherData && weatherData.list && weatherData.list.length > 0) {
        console.log('- First day UVI:', weatherData.list[0].uvi);
        console.log('- UVI debug flag:', weatherData.list[0]._debug_uvi_included);
        console.log('- Sample weather data day structure:', JSON.stringify({
          dt: weatherData.list[0].dt,
          main: {
            temp: weatherData.list[0].main.temp,
            // other fields omitted for brevity
          },
          uvi: weatherData.list[0].uvi,
          // other important fields for debugging
        }));
      } else {
        console.log('No daily forecast data found in OpenWeather response');
      }
    } catch (weatherError) {
      console.error('Failed to fetch OpenWeather data:', weatherError);
      throw new Error(`OpenWeather API error: ${weatherError instanceof Error ? weatherError.message : 'Unknown error'}`);
    }
    
    try {
      // Call Open-Meteo API with a timeout
      pollenResponse = await Promise.race([
        fetchOpenMeteoAirPollen(latitude, longitude),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Open-Meteo API timeout')), 10000))
      ]);
      console.log('Open-Meteo data fetched successfully');
    } catch (pollenError) {
      console.error('Failed to fetch Open-Meteo data:', pollenError);
      // Continue with weatherData only if pollen API fails
      pollenResponse = { hourly: { time: [] } };
      console.log('Continuing with weather data only (no pollen)');
    }
    
    const transformedData = weatherData;
    // Process pollen and air quality data by day
    const pollenByDate: Record<string, any> = {};
    const airQualityByDate: Record<string, any> = {};
    
    // Safely extract pollen hours with fallback for missing data
    let pollenHours: any[] = [];
    try {
      if (pollenResponse?.hourly?.time) {
        pollenHours = pollenResponse.hourly.time.map((t: string, i: number) => ({
          time: t,
          alder: pollenResponse.hourly.alder_pollen?.[i],
          birch: pollenResponse.hourly.birch_pollen?.[i],
          grass: pollenResponse.hourly.grass_pollen?.[i],
          ragweed: pollenResponse.hourly.ragweed_pollen?.[i],
          aqi: pollenResponse.hourly.us_aqi?.[i],
        }));
      }
    } catch (mappingError) {
      console.error('Error mapping pollen data:', mappingError);
      // Continue with empty pollenHours array
    }
    
    for (const h of pollenHours) {
      const dateKey = h.time.split('T')[0]; // YYYY-MM-DD
      
      // Process pollen data
      if (!pollenByDate[dateKey]) {
        pollenByDate[dateKey] = { grass: -Infinity, tree: -Infinity, weed: -Infinity };
      }
      
      // Calculate daily maxima for pollen
      if (h.grass != null) pollenByDate[dateKey].grass = Math.max(pollenByDate[dateKey].grass, Number(h.grass));
      
      const treeMax = Math.max(Number(h.alder || -Infinity), Number(h.birch || -Infinity));
      if (treeMax > -Infinity) pollenByDate[dateKey].tree = Math.max(pollenByDate[dateKey].tree, treeMax);
      
      if (h.ragweed != null) pollenByDate[dateKey].weed = Math.max(pollenByDate[dateKey].weed, Number(h.ragweed));
      
      // Process air quality data
      if (!airQualityByDate[dateKey]) {
        airQualityByDate[dateKey] = { overall: -Infinity };
      }
      
      if (h.aqi != null) airQualityByDate[dateKey].overall = Math.max(airQualityByDate[dateKey].overall, Number(h.aqi));
    }
    
    // Clean up -Infinity values
    Object.keys(pollenByDate).forEach(dateKey => {
      const p = pollenByDate[dateKey];
      if (!p) return;
      if (p.grass === -Infinity) p.grass = undefined;
      if (p.tree === -Infinity) p.tree = undefined; 
      if (p.weed === -Infinity) p.weed = undefined;
    });
    
    Object.keys(airQualityByDate).forEach(dateKey => {
      const aq = airQualityByDate[dateKey];
      if (!aq) return;
      if (aq.overall === -Infinity) aq.overall = undefined;
    });
    
    // Add pollen and air quality data to transformed response
    const enrichedData = {
      ...transformedData,
      pollenByDate, // Add pollen data indexed by date
      airQualityByDate, // Add air quality data indexed by date
      isEnvironmentalDataStale: new Date() > new Date('2025-08-24'), // Indicate if we're using stale data
      environmentalDataLastUpdated: new Date().toISOString(), // Add timestamp of when data was fetched
      environmentalDataUpdateFrequency: {
        aqi: 'Updated every 12-24 hours',
        pollen: 'Updated every few hours'
      }
    };
    
    // Cache the response for future requests
    CACHE[cacheKey] = {
      data: enrichedData,
      timestamp: now,
      expiresAt: now + CACHE_DURATION_MS
    };
    
    res.status(200).json(enrichedData);
    
    // Add debugging for environmental data
    console.log('API response contains environmental data:');
    console.log('- Has pollen data:', Object.keys(pollenByDate).length > 0);
    console.log('- Has air quality data:', Object.keys(airQualityByDate).length > 0);
    console.log('- Sample pollen data:', Object.keys(pollenByDate).length > 0 ? 
      JSON.stringify(pollenByDate[Object.keys(pollenByDate)[0]]) : 'None');
    console.log('- Sample air quality data:', Object.keys(airQualityByDate).length > 0 ? 
      JSON.stringify(airQualityByDate[Object.keys(airQualityByDate)[0]]) : 'None');
    console.log('- isEnvironmentalDataStale:', new Date() > new Date('2025-08-24'));
    console.log('- environmentalDataLastUpdated:', new Date().toISOString());
  } catch (error) {
    console.error('Weather with pollen API error:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Check if it's a network error
    if (error && typeof error === 'object' && 'cause' in error) {
      console.error('Error cause:', error.cause);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch weather and pollen data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
