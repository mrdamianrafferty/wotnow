export default async function handler(req, res) {
  const { lat, lon } = req.query;
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  if (!lat || !lon || !apiKey) {
    return res.status(400).json({ error: "Missing parameters or API key" });
  }
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch OpenWeather data" });
  }
}