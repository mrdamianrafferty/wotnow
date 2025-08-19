export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  if (!lat || !lon || !apiKey) {
    return res.status(400).json({ error: "Missing parameters or API key" });
  }
  try {
    const { getFullWeather } = require('../../lib/openweather');
    const weatherData = await getFullWeather({ lat, lon, apiKey });
    return res.status(200).json(weatherData);
  } catch (err) {
    console.error('OpenWeather API error:', err);
    return res.status(500).json({ error: `Failed to fetch OpenWeather data: ${err.message}` });
  }
}