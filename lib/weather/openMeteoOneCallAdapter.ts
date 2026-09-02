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
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability,precipitation,rain,snowfall,weather_code,wind_speed_10m,visibility,uv_index,soil_moisture_0_to_7cm',
    /**
     * `wind_speed_10m_mean`, `wind_gusts_10m_max` and `precipitation_hours` are
     * asked for because the activity models already reference all three and were
     * being scored without them.
     *
     * Every water-sports model in data/activities carries gust criteria
     * (`gust<16`, `gust=20..24`) and none of them had ever been evaluated: the
     * field simply was not in this list, and a missing key is dropped silently
     * rather than failing. On enclosed water the gust spread is what capsizes a
     * dinghy — measured at Rutland on 2026-09-04, a Force 4 mean carried Force 7
     * gusts — so it is the single most load-bearing number for the reservoir
     * activities and it was the one nobody had.
     *
     * The mean matters for a different reason: a day was being scored on
     * `wind_speed_10m_max`, its windiest moment, which is the right number for a
     * safety limit and the wrong one for "what is it like out there". Both are
     * carried now and the scorer uses each for its own job.
     *
     * `precipitation_hours` separates a 4 mm downpour from sixteen hours of
     * drizzle. Those are very different days for a campsite and a daily total
     * cannot tell them apart.
     */
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,rain_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max,wind_speed_10m_mean,wind_gusts_10m_max,wind_direction_10m_dominant,precipitation_hours',
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

  /**
   * The mean temperature over daylight hours, which is what OpenWeather's daily
   * `temp.day` means and what Open-Meteo does not publish.
   *
   * Worth computing rather than leaving absent, because the consumer falls back
   * to `temp.max` — so every day was being scored on its warmest moment while
   * simultaneously being scored on its windiest. Those two rarely happen
   * together, and pairing them flattered warm blustery days and punished cool
   * still ones. 09:00–18:00 is the window an activity is actually done in;
   * `timezone` is UTC in the request above, so the hourly stamps line up with
   * the date string without conversion.
   */
  function daytimeMeanOf(series: unknown, dateStr: string): number | undefined {
    const values = series as (number | null)[] | undefined;
    if (!Array.isArray(values)) return undefined;
    const kept: number[] = [];
    for (let h = 0; h < (hourly.time?.length ?? 0); h++) {
      const t = hourly.time[h] as string;
      if (!t.startsWith(dateStr)) continue;
      const hour = Number(t.slice(11, 13));
      const v = values[h];
      if (hour >= 9 && hour < 18 && typeof v === 'number') kept.push(v);
    }
    if (!kept.length) return undefined;
    return kept.reduce((a, b) => a + b, 0) / kept.length;
  }

  const daytimeMean = (dateStr: string) => daytimeMeanOf(hourly.temperature_2m, dateStr);

  /**
   * Daytime mean visibility, in metres.
   *
   * Open-Meteo publishes visibility hourly and not daily, and this adapter has
   * been fetching it for `current` since it was written — it simply never
   * reached the daily shape, so every model's visibility criteria were scored
   * neutral and it was the one thing named in every activity's
   * `neutralCriteria`. It is the variable that most often decides whether a day
   * outdoors is worth it: you cannot scan three thousand acres of reservoir
   * through murk, and it stops birding, photography and stargazing long before
   * wind does.
   *
   * The MEAN over the working hours, not the minimum. A single foggy hour at
   * dawn does not decide a day, and the criteria are written as bands across
   * one — `visibility>10`, `visibility=2..5` — which is a description of the
   * day rather than of its worst moment.
   */
  const daytimeVisibility = (dateStr: string) => daytimeMeanOf(hourly.visibility, dateStr);

  /**
   * Daytime mean soil moisture in the top 7 cm, as a PERCENTAGE.
   *
   * Open-Meteo publishes it hourly, in m³/m³ — volumetric water content, so
   * 0.35 rather than 35. The activity models are written in percent
   * (`soilMoisture=20..35` for firm turf, `<10` baked, `>60` waterlogged) and
   * the generic band scorer does no unit conversion at all, so handing it the
   * raw figure would compare 0.35 against a range of 20 to 35 and fire
   * `soilMoisture<10` as a hazard on every single day. Converted here, once, at
   * the edge.
   *
   * The top layer rather than 7-28 cm: the question these models ask is whether
   * the ground is soft underfoot, not what the roots are drinking. The two also
   * behave differently — measured at Rutland the surface ran 0.352 to 0.440
   * over three days while the layer below it moved 0.318 to 0.323, because rain
   * shows up at the top and is buffered below.
   */
  const daytimeSoilMoisture = (dateStr: string) => {
    const v = daytimeMeanOf(hourly.soil_moisture_0_to_7cm, dateStr);
    return typeof v === 'number' ? v * 100 : undefined;
  };

  /**
   * WHICH part of the day the rain falls in.
   *
   * The daily shape carries how MUCH and for how many hours, which makes two
   * very different days read identically. Measured at Rutland: 4 September
   * puts 91% of its 12 mm before noon and is dry from lunchtime, while 8
   * September smears 4 mm across sixteen hours. "Rain for N hours of it" was
   * the sentence for both.
   *
   * Six-hour windows, and a window has to hold 60% of the day's total to be
   * named. Below that the rain genuinely is spread, and saying "in the
   * afternoon" of a day that rains all day would be worse than the two numbers
   * it replaced — a reader who plans a morning around it gets wet.
   */
  const NAMEABLE_SHARE = 0.6;
  function rainWindowFor(dateStr: string): 'overnight' | 'morning' | 'afternoon' | 'evening' | 'spread' | undefined {
    const series = hourly.precipitation as (number | null)[] | undefined;
    if (!Array.isArray(series)) return undefined;
    const buckets = { overnight: 0, morning: 0, afternoon: 0, evening: 0 };
    let total = 0;
    for (let h = 0; h < (hourly.time?.length ?? 0); h++) {
      const t = hourly.time[h] as string;
      if (!t.startsWith(dateStr)) continue;
      const v = series[h];
      if (typeof v !== 'number' || v <= 0) continue;
      const hour = Number(t.slice(11, 13));
      total += v;
      if (hour < 6) buckets.overnight += v;
      else if (hour < 12) buckets.morning += v;
      else if (hour < 18) buckets.afternoon += v;
      else buckets.evening += v;
    }
    if (total <= 0) return undefined;
    const [name, amount] = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
    return amount / total >= NAMEABLE_SHARE
      ? (name as 'overnight' | 'morning' | 'afternoon' | 'evening')
      : 'spread';
  }

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
      temp: {
        day: daytimeMean(dateStr),
        min: daily.temperature_2m_min?.[i],
        max: daily.temperature_2m_max?.[i],
      },
      weather: [{ description: WMO_DESCRIPTIONS[daily.weather_code?.[i]] || 'Unknown', main }],
      rain_window: rainWindowFor(dateStr),
      wind_speed: daily.wind_speed_10m_max?.[i],
      /* Named as OpenWeather names it, so a consumer reading either source finds
         the gust in the same place. */
      wind_gust: daily.wind_gusts_10m_max?.[i],
      /* Not an OpenWeather field. Prefixed nowhere and simply absent when the
         backstop provider is used, which is the honest outcome — a consumer
         must handle a missing mean anyway. */
      wind_speed_mean: daily.wind_speed_10m_mean?.[i],
      /**
       * Degrees the wind blew FROM, dominant over the day.
       *
       * Requested because direction is the difference between two completely
       * different days at the same wind speed, and nothing inland carried it.
       * A westerly gale in October puts storm-driven seabirds onto an inland
       * reservoir and is the best birding of the year; the same speed from the
       * east is just a cold day with no birds in it.
       */
      wind_deg: daily.wind_direction_10m_dominant?.[i],
      pop: (daily.precipitation_probability_max?.[i] ?? 0) / 100,
      rain: daily.rain_sum?.[i],
      precipitation_hours: daily.precipitation_hours?.[i],
      /* Metres, matching `current.visibility` and what the scorer expects
         before it converts to kilometres. */
      visibility: daytimeVisibility(dateStr),
      /* Percent, not m³/m³ — see daytimeSoilMoisture. */
      soil_moisture: daytimeSoilMoisture(dateStr),
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
