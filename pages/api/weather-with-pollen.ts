import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather } from '../../lib/openweather';

async function fetchOpenMeteoAirPollen(lat: number, lon: number) {
  const now = new Date();
  const start = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  
  // Calculate end date (5 days from now)
  const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split('T')[0]; // 5 days later
  
  console.log(`Fetching air quality data from ${start} to ${end}`);
  
  // Ensure end date is after start date
  if (new Date(end) <= new Date(start)) {
    console.error(`Invalid date range: start=${start}, end=${end}`);
    throw new Error(`Invalid date range: end date must be after start date`);
  }

  const hourlyVars = [
    'alder_pollen',
    'birch_pollen', 
    'grass_pollen',
    'ragweed_pollen',
    'olive_pollen',
    'us_aqi' // Add air quality index
  ];

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${lat}&longitude=${lon}&` +
    `hourly=${hourlyVars.join(',')}&` +
    `start_date=${start}&end_date=${end}&` +
    `timezone=auto`;

  console.log('Open-Meteo air quality URL:', url);

  try {
    const res = await fetch(url);
    console.log('Open-Meteo response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Open-Meteo error response:', errorText);
      console.error('Request details:', {
        url,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries([...res.headers.entries()])
      });
      throw new Error(`Open-Meteo air/pollen ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('Open-Meteo data received successfully');
    return data;
  } catch (error) {
    console.error('Error fetching Open-Meteo data:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon parameters" });
  }
  
  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    
    console.log(`Weather API called for lat: ${latitude}, lon: ${longitude}`);
    
    // Get OpenWeather data using new service module
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!apiKey) {
      console.error('Missing OpenWeather API key');
      throw new Error('Missing OpenWeather API key');
    }

    // Fetch weather and pollen data in parallel
    console.log('Fetching weather and pollen data in parallel...');
    const [weatherData, pollenResponse] = await Promise.all([
      getFullWeather({ lat: latitude, lon: longitude, apiKey })
        .catch(err => {
          console.error('Error fetching weather data:', err);
          throw new Error(`Weather data fetch error: ${err.message}`);
        }),
      fetchOpenMeteoAirPollen(latitude, longitude)
        .catch(err => {
          console.error('Error fetching pollen data:', err);
          // Continue with weather data even if pollen data fails
          return { hourly: { time: [] } };
        })
    ]);
    
    console.log('Successfully fetched weather data');
    console.log('Pollen data status:', pollenResponse?.hourly?.time ? 'Available' : 'Not available');
    
    const transformedData = weatherData;
    // Process pollen and air quality data by day
    const pollenByDate: Record<string, any> = {};
    const airQualityByDate: Record<string, any> = {};
    
    // Check if we have pollen data before processing
    if (pollenResponse?.hourly?.time && pollenResponse.hourly.time.length > 0) {
      console.log(`Processing ${pollenResponse.hourly.time.length} hourly pollen data points`);
      
      const pollenHours = (pollenResponse.hourly.time || []).map((t: string, i: number) => ({
        time: t,
        alder: pollenResponse.hourly.alder_pollen?.[i],
        birch: pollenResponse.hourly.birch_pollen?.[i],
        grass: pollenResponse.hourly.grass_pollen?.[i],
        ragweed: pollenResponse.hourly.ragweed_pollen?.[i],
        aqi: pollenResponse.hourly.us_aqi?.[i],
      }));
      
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
        if (p.grass === -Infinity) p.grass = undefined;
        if (p.tree === -Infinity) p.tree = undefined; 
        if (p.weed === -Infinity) p.weed = undefined;
      });
      
      Object.keys(airQualityByDate).forEach(dateKey => {
        const aq = airQualityByDate[dateKey];
        if (aq.overall === -Infinity) aq.overall = undefined;
      });
      
      console.log(`Processed pollen data for ${Object.keys(pollenByDate).length} days`);
    } else {
      console.log('No pollen data available, returning weather data only');
    }
    
    // Add pollen and air quality data to transformed response
    const enrichedData = {
      ...transformedData,
      pollenByDate, // Add pollen data indexed by date
      airQualityByDate, // Add air quality data indexed by date
    };
    res.status(200).json(enrichedData);
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
