import { fetchMarineWithCache } from './fetchStormglass';
import { fetchMetNoMarineSeries, fetchOpenMeteoMarineSeries } from '../lib/services/weatherService';

const MS_PER_HOUR = 60 * 60 * 1000;
const MAX_REQUESTED_HOURS = 7 * 24; // cap to 7 days of hourly data
const MS_TO_KTS = 1.94384;
const KTS_TO_MS = 1 / MS_TO_KTS;

export type MarineProviderHour = { time: string } & Record<string, unknown>;
export type MarineProvider = 'metno' | 'openmeteo' | 'stormglass' | 'none';

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function normaliseIso(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function assignMetric(target: MarineProviderHour, key: string, value: number | undefined) {
  if (value === undefined) return;
  const existing = target[key];
  const asRecord = (existing && typeof existing === 'object') ? { ...(existing as Record<string, unknown>) } : {};
  asRecord.noaa = value;
  target[key] = asRecord;
}

type MetNoSeries = Awaited<ReturnType<typeof fetchMetNoMarineSeries>>;

type MetNoHour = MetNoSeries extends { hours: Array<infer H> } ? H : never;

function convertMetNoSeries(series: MetNoSeries | null | undefined): MarineProviderHour[] {
  if (!series || !Array.isArray(series.hours) || series.hours.length === 0) return [];
  const hours: MarineProviderHour[] = [];
  for (const raw of series.hours as MetNoHour[]) {
    if (!raw || typeof raw !== 'object') continue;
    const iso = normaliseIso((raw as { timeISO?: string; time?: string }).timeISO ?? (raw as { time?: string }).time);
    if (!iso) continue;
    const hour: MarineProviderHour = { time: iso, timeISO: iso, provider: 'metno' };

    const waveHeight = toFiniteNumber((raw as { waveHeightM?: number }).waveHeightM);
    if (waveHeight !== undefined) {
      hour.waveM = waveHeight;
      hour.waveHeightM = waveHeight;
      assignMetric(hour, 'waveHeight', waveHeight);
    }

    const waveDir = toFiniteNumber((raw as { waveDirectionDeg?: number }).waveDirectionDeg);
    if (waveDir !== undefined) {
      hour.waveDirectionDeg = waveDir;
      assignMetric(hour, 'waveDirection', waveDir);
    }

    const seaTemp = toFiniteNumber((raw as { seaTemperatureC?: number }).seaTemperatureC);
    if (seaTemp !== undefined) {
      hour.waterTempC = seaTemp;
      assignMetric(hour, 'waterTemperature', seaTemp);
    }

    const currentSpeed = toFiniteNumber((raw as { currentSpeedMS?: number }).currentSpeedMS);
    if (currentSpeed !== undefined) {
      hour.currentSpeedMS = currentSpeed;
      assignMetric(hour, 'currentSpeed', currentSpeed);
    }

    const currentDir = toFiniteNumber((raw as { currentDirectionDeg?: number }).currentDirectionDeg);
    if (currentDir !== undefined) {
      hour.currentDirectionDeg = currentDir;
      assignMetric(hour, 'currentDirection', currentDir);
    }

    const windMs = toFiniteNumber((raw as { windSpeedMS?: number }).windSpeedMS);
    const windKts = toFiniteNumber((raw as { windSpeedKts?: number }).windSpeedKts);
    const resolvedWindMs = windMs ?? (windKts !== undefined ? windKts * KTS_TO_MS : undefined);
    const resolvedWindKts = windKts ?? (windMs !== undefined ? windMs * MS_TO_KTS : undefined);
    if (resolvedWindMs !== undefined) {
      hour.windSpeedMS = resolvedWindMs;
      assignMetric(hour, 'windSpeed', resolvedWindMs);
    }
    if (resolvedWindKts !== undefined) {
      hour.windSpeedKts = resolvedWindKts;
    }

    const windDir = toFiniteNumber((raw as { windDirectionDeg?: number }).windDirectionDeg);
    if (windDir !== undefined) {
      hour.windDirectionDeg = windDir;
      assignMetric(hour, 'windDirection', windDir);
    }

    hours.push(hour);
  }
  return hours;
}

type OpenMeteoSeries = Awaited<ReturnType<typeof fetchOpenMeteoMarineSeries>>;

type OpenMeteoHour = OpenMeteoSeries extends { hours: Array<infer H> } ? H : never;

function convertOpenMeteoSeries(series: OpenMeteoSeries | null | undefined): MarineProviderHour[] {
  if (!series || !Array.isArray(series.hours) || series.hours.length === 0) return [];
  const hours: MarineProviderHour[] = [];
  for (const raw of series.hours as OpenMeteoHour[]) {
    if (!raw || typeof raw !== 'object') continue;
    const iso = normaliseIso((raw as { timeISO?: string; time?: string }).timeISO ?? (raw as { time?: string }).time);
    if (!iso) continue;
    const hour: MarineProviderHour = { time: iso, timeISO: iso, provider: 'openmeteo' };

    const waveHeight = toFiniteNumber((raw as { waveHeightM?: number }).waveHeightM);
    if (waveHeight !== undefined) {
      hour.waveM = waveHeight;
      hour.waveHeightM = waveHeight;
      assignMetric(hour, 'waveHeight', waveHeight);
    }

    const waveDir = toFiniteNumber((raw as { waveDirectionDeg?: number }).waveDirectionDeg);
    if (waveDir !== undefined) {
      hour.waveDirectionDeg = waveDir;
      assignMetric(hour, 'waveDirection', waveDir);
    }

    const wavePeriod = toFiniteNumber((raw as { wavePeriodSeconds?: number }).wavePeriodSeconds);
    if (wavePeriod !== undefined) {
      hour.wavePeriodS = wavePeriod;
      assignMetric(hour, 'wavePeriod', wavePeriod);
    }

    const swellHeight = toFiniteNumber((raw as { swellHeightM?: number }).swellHeightM);
    if (swellHeight !== undefined) {
      hour.swellHeightM = swellHeight;
      assignMetric(hour, 'swellHeight', swellHeight);
    }

    const swellDir = toFiniteNumber((raw as { swellDirectionDeg?: number }).swellDirectionDeg);
    if (swellDir !== undefined) {
      hour.swellDirectionDeg = swellDir;
      assignMetric(hour, 'swellDirection', swellDir);
    }

    const swellPeriod = toFiniteNumber((raw as { swellPeriodS?: number }).swellPeriodS);
    if (swellPeriod !== undefined) {
      hour.swellPeriodS = swellPeriod;
      assignMetric(hour, 'swellPeriod', swellPeriod);
    }

    const seaLevel = toFiniteNumber((raw as { seaLevelMeters?: number }).seaLevelMeters);
    if (seaLevel !== undefined) {
      hour.seaLevelMeters = seaLevel;
      assignMetric(hour, 'seaLevel', seaLevel);
    }

    const seaTemp = toFiniteNumber((raw as { seaTemperatureC?: number }).seaTemperatureC);
    if (seaTemp !== undefined) {
      hour.waterTempC = seaTemp;
      assignMetric(hour, 'waterTemperature', seaTemp);
    }

    const currentSpeed = toFiniteNumber((raw as { currentSpeedMS?: number }).currentSpeedMS);
    if (currentSpeed !== undefined) {
      hour.currentSpeedMS = currentSpeed;
      assignMetric(hour, 'currentSpeed', currentSpeed);
    }

    const currentDir = toFiniteNumber((raw as { currentDirectionDeg?: number }).currentDirectionDeg);
    if (currentDir !== undefined) {
      hour.currentDirectionDeg = currentDir;
      assignMetric(hour, 'currentDirection', currentDir);
    }

    const windMs = toFiniteNumber((raw as { windSpeedMS?: number }).windSpeedMS);
    if (windMs !== undefined) {
      hour.windSpeedMS = windMs;
      assignMetric(hour, 'windSpeed', windMs);
      hour.windSpeedKts = windMs * MS_TO_KTS;
    }

    const windDir = toFiniteNumber((raw as { windDirectionDeg?: number }).windDirectionDeg);
    if (windDir !== undefined) {
      hour.windDirectionDeg = windDir;
      assignMetric(hour, 'windDirection', windDir);
    }

    hours.push(hour);
  }
  return hours;
}

function computeMaxHours(startISO: string, endISO: string): number {
  const start = Date.parse(startISO);
  const end = Date.parse(endISO);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 48;
  }
  const diffHours = Math.ceil((end - start) / MS_PER_HOUR);
  if (!Number.isFinite(diffHours) || diffHours <= 0) return 48;
  return Math.min(Math.max(diffHours, 24), MAX_REQUESTED_HOURS);
}

export async function fetchMarineHoursWithFallback(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string
): Promise<{ hours: MarineProviderHour[]; provider: MarineProvider }> {
  const maxHours = computeMaxHours(startISO, endISO);

  try {
    const met = await fetchMetNoMarineSeries(lat, lon, startISO, endISO, { maxHours });
    const converted = convertMetNoSeries(met);
    if (converted.length) {
      return { hours: converted, provider: 'metno' };
    }
    if (met) {
      console.info('[marineProviders] MET Norway marine response had no usable hours for window');
    }
  } catch (err) {
    console.warn('[marineProviders] MET Norway marine fetch failed', err);
  }

  try {
    const open = await fetchOpenMeteoMarineSeries(lat, lon, startISO, endISO, { maxHours });
    const converted = convertOpenMeteoSeries(open);
    if (converted.length) {
      return { hours: converted, provider: 'openmeteo' };
    }
    if (open) {
      console.info('[marineProviders] Open-Meteo marine response had no usable hours for window');
    }
  } catch (err) {
    console.warn('[marineProviders] Open-Meteo marine fetch failed', err);
  }

  try {
    const stormglass = await fetchMarineWithCache(lat, lon, startISO, endISO);
    const rawHours = Array.isArray(stormglass?.hours) ? (stormglass.hours as MarineProviderHour[]) : [];
    if (rawHours.length) {
      return { hours: rawHours, provider: 'stormglass' };
    }
    console.warn('[marineProviders] Stormglass marine response empty for requested window');
  } catch (err) {
    console.error('[marineProviders] Stormglass marine fetch failed', err);
  }

  return { hours: [], provider: 'none' };
}
