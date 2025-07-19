import axios from 'axios';
import { WeatherForecastDay } from '../../types/weatherTypes';

const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5/forecast';

export async function fetchForecastForLocation(lat: number, lon: number): Promise<WeatherForecastDay[]> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

  if (!apiKey) throw new Error('Missing OpenWeather API Key');

  const response = await axios.get(OPENWEATHER_API, {
    params: {
      lat,
      lon,
      units: 'metric',
      appid: apiKey,
    },
  });

  const data = response.data;

  // Group data by day (like before)
  const groupedByDate: Record<string, { entries: any[]; totalRain: number }> = {};
  data.list.forEach((entry: any) => {
    const date = entry.dt_txt.split(' ')[0];
    if (!groupedByDate[date]) groupedByDate[date] = { entries: [], totalRain: 0 };
    groupedByDate[date].entries.push(entry);
    if (entry.rain?.['3h']) {
      groupedByDate[date].totalRain += entry.rain['3h'];
    }
  });

  const dailyForecast: WeatherForecastDay[] = Object.entries(groupedByDate)
    .slice(0, 5)
    .map(([date, { entries, totalRain }]) => {
      const noonEntry = entries.find((e) => e.dt_txt.includes('12:00:00')) || entries[0];
      const rainDetails = entries
        .filter((e) => e.rain?.['3h'] > 0)
        .map((e) => {
          const hour = new Date(e.dt_txt).getHours();
          return `${hour}:00 ${Math.round(e.rain['3h'])}mm`;
        });

      return {
        date,
        tempMax: Math.round(noonEntry.main.temp_max),
        tempMin: Math.round(noonEntry.main.temp_min),
        temperature: Math.round(noonEntry.main.temp),
        condition: noonEntry.weather[0].main,
        description: noonEntry.weather[0].description,
        icon: noonEntry.weather[0].icon,
        wind_speed: Math.round(noonEntry.wind.speed * 3.6),
        rain: Math.round(noonEntry.rain?.['3h'] ?? 0),
        snow: Math.round(noonEntry.snow?.['3h'] ?? 0),
        clouds: noonEntry.clouds?.all ?? 0,
        humidity: noonEntry.main.humidity,
        visibility: noonEntry.visibility ?? 10000,
        totalRain: Math.round(totalRain),
        rainDetails,
      };
    });

  return dailyForecast;
}
