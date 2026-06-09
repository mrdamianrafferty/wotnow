/**
 * Shared daily-forecast provider for Grow Daisy gardening signals.
 *
 * Free-first policy: Open-Meteo (free, unlimited) is the PRIMARY source. OpenWeather
 * One Call 3.0 is only used as a backstop when Open-Meteo fails. This keeps One Call 3.0
 * usage within quota while preserving the simple `WeatherForecast[]` contract that the
 * local-signal engine consumes.
 *
 * Used by:
 *  - pages/api/grow/signals/index.ts (per-request)
 *  - pages/api/cron/grow/local-signal-alerts.ts (cron)
 */
import {
  fetchOpenMeteoDailyForecastRaw,
  getFullWeather,
} from '@/lib/services/weatherService';
import type { WeatherForecast } from '@/lib/grow/weatherTaskEngine';

/* eslint-disable @typescript-eslint/no-explicit-any */

// WMO weather interpretation codes -> human description.
// https://open-meteo.com/en/docs (WMO Weather interpretation codes)
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

const num = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/** Derive a per-day mean relative humidity (%) from Open-Meteo's hourly series. */
function meanHumidityByDate(raw: any): Map<string, number> {
  const times: string[] = raw?.hourly?.time ?? [];
  const hums: number[] = raw?.hourly?.relative_humidity_2m ?? [];
  const acc = new Map<string, { sum: number; n: number }>();
  for (let i = 0; i < times.length; i++) {
    const date = times[i]?.split('T')[0];
    const h = hums[i];
    if (!date || typeof h !== 'number' || !Number.isFinite(h)) continue;
    const entry = acc.get(date) ?? { sum: 0, n: 0 };
    entry.sum += h;
    entry.n += 1;
    acc.set(date, entry);
  }
  const out = new Map<string, number>();
  for (const [date, { sum, n }] of acc) {
    out.set(date, n ? Math.round(sum / n) : 50);
  }
  return out;
}

/** Map raw Open-Meteo daily JSON to the WeatherForecast[] contract. */
export function mapOpenMeteoDaily(raw: any): WeatherForecast[] {
  const daily = raw?.daily;
  const dates: string[] = daily?.time ?? [];
  if (!dates.length) return [];
  const humidityByDate = meanHumidityByDate(raw);

  return dates.map((date, i) => ({
    date,
    tempMin: num(daily.temperature_2m_min?.[i]),
    tempMax: num(daily.temperature_2m_max?.[i]),
    humidity: humidityByDate.get(date) ?? 50,
    precipitation: num(daily.precipitation_sum?.[i]),
    // Open-Meteo already returns probability as a 0-100 percentage.
    precipProbability: num(daily.precipitation_probability_max?.[i]),
    // Requested with wind_speed_unit=kmh, so these are already km/h.
    windSpeed: num(daily.windspeed_10m_max?.[i]),
    windGust: num(daily.windgusts_10m_max?.[i] ?? daily.windspeed_10m_max?.[i]),
    uvIndex: num(daily.uv_index_max?.[i]),
    description: WMO_DESCRIPTIONS[daily.weathercode?.[i] as number] ?? 'Unknown',
  }));
}

/** Map an OpenWeather One Call 3.0 (getFullWeather) payload to WeatherForecast[]. */
function mapOneCallDaily(weatherData: any): WeatherForecast[] {
  const daily = (weatherData?.daily ?? []) as any[];
  return daily.slice(0, 7).map((d) => {
    const temp = d.temp ?? {};
    const weather = d.weather?.[0];
    return {
      date: new Date(num(d.dt) * 1000).toISOString().split('T')[0],
      tempMin: num(temp.min),
      tempMax: num(temp.max),
      humidity: num(d.humidity) || 50,
      precipitation: num(d.rain) + num(d.snow),
      precipProbability: num(d.pop) * 100, // 0-1 -> percentage
      windSpeed: num(d.wind_speed) * 3.6, // m/s -> km/h
      windGust: (num(d.wind_gust) || num(d.wind_speed)) * 3.6,
      uvIndex: num(d.uvi),
      description: weather?.description || weather?.main || 'Unknown',
    };
  });
}

/**
 * Get a daily forecast as WeatherForecast[], preferring the free Open-Meteo source and
 * falling back to OpenWeather One Call 3.0 (which itself falls back to 2.5) only on
 * failure. Returns [] if every source fails.
 */
export async function getDailyForecast({
  lat,
  lon,
  apiKey,
  days = 7,
}: {
  lat: number;
  lon: number;
  apiKey?: string;
  days?: number;
}): Promise<WeatherForecast[]> {
  // PRIMARY: Open-Meteo (free, unlimited)
  try {
    const raw = await fetchOpenMeteoDailyForecastRaw(lat, lon, days);
    const mapped = mapOpenMeteoDaily(raw);
    if (mapped.length) return mapped;
  } catch (err) {
    console.warn(
      '[getDailyForecast] Open-Meteo failed, falling back to OpenWeather:',
      (err as Error)?.message ?? err
    );
  }

  // BACKSTOP: OpenWeather One Call 3.0 -> 2.5
  if (apiKey) {
    try {
      const weatherData = await getFullWeather({
        lat,
        lon,
        apiKey,
        options: { units: 'metric' },
      });
      const mapped = mapOneCallDaily(weatherData);
      if (mapped.length) return mapped;
    } catch (err) {
      console.warn(
        '[getDailyForecast] OpenWeather backstop failed:',
        (err as Error)?.message ?? err
      );
    }
  }

  return [];
}
