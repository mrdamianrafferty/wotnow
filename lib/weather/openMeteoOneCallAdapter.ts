/**
 * Fetches current + hourly + daily weather from Open-Meteo (free, no key) and
 * adapts it into the same shape OpenWeather One Call 3.0 returns, so callers
 * that already consume OpenWeather's shape (current/hourly/daily transforms)
 * work unchanged regardless of which source supplied the data.
 *
 * Used as the free-first primary by pages/api/grow/weather.ts and
 * lib/seo/getActivityScore.ts, with OpenWeather kept as a fallback only.
 */
import { WMO_DESCRIPTIONS } from '../grow/dailyForecast';

/* eslint-disable @typescript-eslint/no-explicit-any */

// WMO weather code -> OpenWeather-style "main" category, so downstream
// condition-mapping code keeps working unchanged for both sources.
function wmoToMain(code: number | undefined): string {
  if (code == null) return 'Clear';
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2 || code === 3) return 'Clouds';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  return 'Clear';
}

const SYNODIC_MONTH_DAYS = 29.530588853;
// Known new moon reference: 2000-01-06 18:14 UTC
const REFERENCE_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14);

// Local moon-phase calculation (0 = new, 0.5 = full), matching OpenWeather's
// moon_phase convention.
function computeMoonPhase(dateMs: number): number {
  const daysSinceReference = (dateMs - REFERENCE_NEW_MOON_MS) / (24 * 60 * 60 * 1000);
  const phase = (daysSinceReference % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
  return phase < 0 ? phase + 1 : phase;
}

export async function fetchOpenMeteoAsOneCallShape(lat: number, lon: number): Promise<any | null> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,snowfall,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max',
    timezone: 'UTC',
    wind_speed_unit: 'ms',
    forecast_days: '7',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo forecast failed: ${res.status}`);
  const data = await res.json();

  const current = data.current;
  const hourly = data.hourly;
  const daily = data.daily;
  if (!current || !hourly || !daily?.time?.length) return null;

  // Find the hourly index closest to "now" (UTC) to source dew_point/uvi/visibility,
  // which Open-Meteo only exposes on the hourly series, not `current`.
  const nowMs = Date.now();
  let hourIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < (hourly.time?.length ?? 0); i++) {
    const diff = Math.abs(Date.parse(`${hourly.time[i]}Z`) - nowMs);
    if (diff < bestDiff) { bestDiff = diff; hourIdx = i; }
  }

  const currentMain = wmoToMain(current.weather_code);
  const sunriseMs = Date.parse(`${daily.sunrise?.[0]}Z`);
  const sunsetMs = Date.parse(`${daily.sunset?.[0]}Z`);

  const owCurrent = {
    temp: current.temperature_2m,
    feels_like: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    wind_speed: current.wind_speed_10m,
    wind_deg: current.wind_direction_10m,
    weather: [{ description: WMO_DESCRIPTIONS[current.weather_code] || 'Unknown', main: currentMain }],
    uvi: hourly.uv_index?.[hourIdx],
    visibility: hourly.visibility?.[hourIdx],
    pressure: current.pressure_msl,
    dew_point: hourly.dew_point_2m?.[hourIdx],
    sunrise: Number.isFinite(sunriseMs) ? sunriseMs / 1000 : undefined,
    sunset: Number.isFinite(sunsetMs) ? sunsetMs / 1000 : undefined,
    rain: typeof current.rain === 'number' ? { '1h': current.rain } : undefined,
    snow: typeof current.snowfall === 'number' ? { '1h': current.snowfall * 10 } : undefined,
  };

  const owDaily = (daily.time as string[]).map((dateStr: string, i: number) => {
    const dt = Date.UTC(
      Number(dateStr.slice(0, 4)),
      Number(dateStr.slice(5, 7)) - 1,
      Number(dateStr.slice(8, 10)),
      12
    );
    const main = wmoToMain(daily.weather_code?.[i]);
    return {
      dt: dt / 1000,
      temp: { min: daily.temperature_2m_min?.[i], max: daily.temperature_2m_max?.[i] },
      weather: [{ description: WMO_DESCRIPTIONS[daily.weather_code?.[i]] || 'Unknown', main }],
      wind_speed: daily.wind_speed_10m_max?.[i],
      pop: (daily.precipitation_probability_max?.[i] ?? 0) / 100,
      rain: daily.rain_sum?.[i],
      snow: typeof daily.snowfall_sum?.[i] === 'number' ? daily.snowfall_sum[i] * 10 : undefined,
      moon_phase: computeMoonPhase(dt),
    };
  });

  const owHourly = (hourly.time as string[])
    .map((timeStr: string, i: number) => ({ ms: Date.parse(`${timeStr}Z`), i }))
    .filter(({ ms }) => ms >= nowMs - 60 * 60 * 1000)
    .slice(0, 24)
    .map(({ i }) => ({
      dt: Date.parse(`${hourly.time[i]}Z`) / 1000,
      temp: hourly.temperature_2m?.[i],
      pop: (hourly.precipitation_probability?.[i] ?? 0) / 100,
      weather: [{ main: wmoToMain(hourly.weather_code?.[i]) }],
      wind_speed: hourly.wind_speed_10m?.[i],
      humidity: hourly.relative_humidity_2m?.[i],
      rain: typeof hourly.rain?.[i] === 'number' ? { '1h': hourly.rain[i] } : undefined,
      snow: typeof hourly.snowfall?.[i] === 'number' ? { '1h': hourly.snowfall[i] * 10 } : undefined,
    }));

  return {
    source: 'openmeteo',
    current: owCurrent,
    daily: owDaily,
    hourly: owHourly,
    alerts: [], // Open-Meteo has no global alerts equivalent; OpenWeather fallback still supplies these when used.
  };
}
