import { fetchMarineWithCache } from '../utils/fetchStormglass';

// When fetching land forecast, also fetch marine forecast for relevant locations/times
const marineData = await fetchMarineWithCache(lat, lon, startTime, endTime);
// Attach to your WeatherForecastDay before storing/displaying
setForecastByDay(forecast.map(f => ({
  ...f,
  marine: marineData.hours?.filter(h => h.time.startsWith(f.date)) || []
})));
