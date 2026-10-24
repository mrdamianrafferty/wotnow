/**
 * Current soil temperature and moisture for a point, from the shared, cached
 * Open-Meteo weather fetch.
 *
 * The weather-task cron and `/api/grow/weather-tasks` each built their own raw
 * Open-Meteo soil request with no cache: one call per user per run. Going
 * through `fetchOpenMeteoWeather` instead shares one request per ~1 km per hour
 * with unified-weather, soil-profile and grow/weather (they all ask for the same
 * today..tomorrow window, see weatherService.ts).
 *
 * The hour is picked as the one nearest NOW. The old code indexed the series by
 * the server's hour, which is the UTC hour, into a series that is in local time.
 * met.no has no soil fields, so this stays on Open-Meteo.
 *
 * Returns null on failure so each caller keeps its own defaults.
 */
import { fetchOpenMeteoWeather } from '@/lib/services/weatherService';
import type { SoilConditions } from '@/lib/grow/weatherTaskEngine';

type SoilHourly = {
  utc_offset_seconds?: number;
  hourly?: {
    time?: string[];
    soil_temperature_0cm?: number[];
    soil_temperature_6cm?: number[];
    soil_temperature_18cm?: number[];
    soil_temperature_54cm?: number[];
    soil_moisture_0_to_1cm?: number[];
    soil_moisture_1_to_3cm?: number[];
    soil_moisture_3_to_9cm?: number[];
    soil_moisture_9_to_27cm?: number[];
  };
};

export async function fetchSoilNow(
  lat: number,
  lon: number,
  defaults: SoilConditions,
): Promise<SoilConditions | null> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10);
  let data: SoilHourly;
  try {
    data = (await fetchOpenMeteoWeather(lat, lon, today, tomorrow)) as SoilHourly;
  } catch {
    return null;
  }
  const H = data?.hourly;
  const times = H?.time ?? [];
  if (!H || !times.length) return null;

  const offset = typeof data.utc_offset_seconds === 'number' ? data.utc_offset_seconds : 0;
  let idx = 0;
  let best = Infinity;
  for (let i = 0; i < times.length; i++) {
    const ms = Date.parse(`${times[i]}Z`) - offset * 1000; // local wall-clock → UTC
    const d = Math.abs(ms - now.getTime());
    if (d < best) { best = d; idx = i; }
  }
  const pick = (arr: number[] | undefined): number | undefined => {
    const v = arr?.[idx];
    return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  };
  const pct = (arr: number[] | undefined, fallback: number): number => {
    const v = pick(arr);
    return v === undefined ? fallback : v * 100;
  };
  return {
    temp0cm: pick(H.soil_temperature_0cm) ?? defaults.temp0cm,
    temp6cm: pick(H.soil_temperature_6cm) ?? defaults.temp6cm,
    temp18cm: pick(H.soil_temperature_18cm) ?? defaults.temp18cm,
    temp54cm: pick(H.soil_temperature_54cm) ?? defaults.temp54cm,
    moisture0to1cm: pct(H.soil_moisture_0_to_1cm, defaults.moisture0to1cm),
    moisture1to3cm: pct(H.soil_moisture_1_to_3cm, defaults.moisture1to3cm),
    moisture3to9cm: pct(H.soil_moisture_3_to_9cm, defaults.moisture3to9cm),
    moisture9to27cm: pct(H.soil_moisture_9_to_27cm, defaults.moisture9to27cm),
  };
}
