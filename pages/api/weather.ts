import { NextApiRequest, NextApiResponse } from 'next';
const { getWeatherData } = require('../../lib/services/weatherService');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    
    const latitude = parseFloat(Array.isArray(lat) ? lat[0] : lat);
    const longitude = parseFloat(Array.isArray(lon) ? lon[0] : lon);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    
    const weatherData = await getWeatherData(latitude, longitude);
    return res.status(200).json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return res.status(500).json({ error: 'Failed to fetch weather data' });
  }
}