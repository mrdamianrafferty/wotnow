import type { NextApiRequest, NextApiResponse } from 'next';

async function fetchOpenMeteoAirPollen(lat: number, lon: number) {
  const now = new Date();
  const start = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  const endDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const end = endDate.toISOString().split('T')[0]; // 5 days later

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

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo air/pollen ${res.status}`);
  return await res.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat/lon parameters" });
  }
  
  try {
    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lon as string);
    
    // Get OpenWeather data
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!apiKey) {
      throw new Error('Missing OpenWeather API key');
    }
    
    const owmUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
    const [owmResponse, pollenResponse] = await Promise.all([
      fetch(owmUrl),
      fetchOpenMeteoAirPollen(latitude, longitude)
    ]);
    
    if (!owmResponse.ok) {
      throw new Error('Failed to fetch OpenWeather data');
    }
    
    const owmData = await owmResponse.json();
    
    // Process pollen and air quality data by day
    const pollenByDate: Record<string, any> = {};
    const airQualityByDate: Record<string, any> = {};
    const pollenHours = (pollenResponse?.hourly?.time || []).map((t: string, i: number) => ({
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
    
    // Add pollen and air quality data to OpenWeather response
    const enrichedData = {
      ...owmData,
      pollenByDate, // Add pollen data indexed by date
      airQualityByDate // Add air quality data indexed by date
    };
    
    res.status(200).json(enrichedData);
  } catch (error) {
    console.error('Weather with pollen API error:', error);
    res.status(500).json({ error: 'Failed to fetch weather and pollen data' });
  }
}
