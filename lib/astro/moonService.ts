import { Temporal } from '@js-temporal/polyfill';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from '../supabase/serverClient';

export interface MoonSunData {
  latBucket: number;
  lonBucket: number;
  localDate: string;
  timezone: string;
  sunriseISO?: string;
  sunsetISO?: string;
  dayLengthMinutes?: number;
  moonriseISO?: string;
  moonsetISO?: string;
  moonPhaseName?: string;
  moonPhaseFraction?: number;
  moonIlluminationPct?: number;
  source: string;
  cachedAt: string;
  expiresAt: string;
}

interface MoonCacheRow {
  id: string;
  lat_bucket: number;
  lon_bucket: number;
  local_date: string;
  timezone: string;
  sunrise_iso: string | null;
  sunset_iso: string | null;
  day_length_minutes: number | null;
  moonrise_iso: string | null;
  moonset_iso: string | null;
  moon_phase_name: string | null;
  moon_phase_fraction: number | null;
  moon_illumination_pct: number | null;
  source: string | null;
  cached_at: string;
  expires_at: string;
  raw: Record<string, unknown> | null;
}

interface IpGeoAstronomyResponse {
  date?: string;
  timezone?: string;
  sunrise?: string;
  sunset?: string;
  day_length?: string;
  moonrise?: string;
  moonset?: string;
  moon_phase?: string;
  moon_illumination?: string | number;
  moonrise_next?: string;
  moonset_previous?: string;
  moon_age?: string | number;
  current_time?: string;
  [key: string]: unknown;
}

interface FetchParams {
  lat: number;
  lon: number;
  date?: string;
}

const DEFAULT_PROVIDER = 'ipgeolocation';
const COORD_PRECISION = 1; // 0.1° grid as per caching brief
const SYNODIC_MONTH_DAYS = 29.530588853;

let cacheDisabled = false;
let hasLoggedCacheDisable = false;

function isMissingCacheTable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code } = error as { code?: string };
  return code === 'PGRST205';
}

function logCacheDisabled(reason: string): void {
  if (!hasLoggedCacheDisable) {
    console.info(`[moon-cache] Disabled: ${reason}`);
    hasLoggedCacheDisable = true;
  }
}

function roundToGrid(value: number): number {
  return Number((Math.round(value * 10) / 10).toFixed(COORD_PRECISION));
}

function normalizeIllumination(raw?: string | number | null): number | undefined {
  if (raw == null) return undefined;
  const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
  if (Number.isNaN(value)) return undefined;
  if (value > 1.5) {
    return Math.max(0, Math.min(100, value));
  }
  return Math.max(0, Math.min(100, value * 100));
}

function parseDayLength(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const hhmmss = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmmss) {
    const hours = Number.parseInt(hhmmss[1] ?? '0', 10);
    const minutes = Number.parseInt(hhmmss[2] ?? '0', 10);
    const seconds = Number.parseInt(hhmmss[3] ?? '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }
  const tokens = trimmed.match(/(?:(\d{1,2})\s*h(?:ours?)?)?(?:\s*(\d{1,2})\s*m(?:in(?:utes?)?)?)?/i);
  if (tokens) {
    const hours = Number.parseInt(tokens[1] ?? '0', 10);
    const minutes = Number.parseInt(tokens[2] ?? '0', 10);
    if (!Number.isNaN(hours) || !Number.isNaN(minutes)) {
      return (Number.isNaN(hours) ? 0 : hours) * 60 + (Number.isNaN(minutes) ? 0 : minutes);
    }
  }
  return undefined;
}

function parseMoonFraction(ageRaw?: string | number | null, illuminationPct?: number): number | undefined {
  const age = typeof ageRaw === 'number' ? ageRaw : Number.parseFloat(String(ageRaw ?? ''));
  if (!Number.isNaN(age) && age >= 0) {
    const frac = (age % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS;
    return Number.isFinite(frac) ? Number(frac.toFixed(4)) : undefined;
  }
  if (typeof illuminationPct === 'number') {
    const normalized = illuminationPct / 100;
    if (normalized <= 0.01) return 0;
    if (normalized >= 0.99) return 0.5;
    return Number(normalized.toFixed(4));
  }
  return undefined;
}

function toZonedInstantISO(localDate: string, time: string | undefined, timeZone: string): string | undefined {
  if (!time) return undefined;
  const trimmed = time.trim();
  if (!trimmed || trimmed === '--:--') return undefined;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?$/i);
  if (!match) {
    return undefined;
  }
  let hour = Number.parseInt(match[1] ?? '0', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  const second = Number.parseInt(match[3] ?? '0', 10) || 0;
  const suffix = match[4]?.toLowerCase();
  if (suffix) {
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
  }
  try {
    const parts = localDate.split('-').map((segment) => Number.parseInt(segment, 10));
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return undefined;
    }
    const [year, month, day] = parts;
    const zoned = Temporal.ZonedDateTime.from({
      timeZone,
      year,
      month,
      day,
      hour,
      minute,
      second,
    });
    return zoned.toInstant().toString();
  } catch {
    return undefined;
  }
}

async function readFromCache(
  client: SupabaseClient,
  latBucket: number,
  lonBucket: number,
  localDate?: string
): Promise<MoonCacheRow | null> {
  if (cacheDisabled) {
    return null;
  }

  let query = client
    .from('moon_cache')
    .select('*')
    .eq('lat_bucket', latBucket)
    .eq('lon_bucket', lonBucket);

  if (localDate) {
    query = query.eq('local_date', localDate);
  }

  const { data, error } = await query
    .order('local_date', { ascending: false })
    .order('cached_at', { ascending: false })
    .limit(1)
    .maybeSingle<MoonCacheRow>();

  if (error) {
    if (isMissingCacheTable(error)) {
      cacheDisabled = true;
      logCacheDisabled("Supabase table 'moon_cache' not found; skipping moon cache");
      return null;
    }

    console.warn('[moon-cache] Failed to read cache', error);
    return null;
  }
  if (!data) {
    return null;
  }
  const expiresAt = Date.parse(data.expires_at);
  if (!Number.isNaN(expiresAt) && expiresAt > Date.now()) {
    return data;
  }
  return null;
}

async function writeCache(
  client: SupabaseClient,
  latBucket: number,
  lonBucket: number,
  localDate: string,
  payload: MoonSunData,
  raw: Record<string, unknown> | null
): Promise<void> {
  if (cacheDisabled) {
    return;
  }

  const { error } = await client.from('moon_cache').upsert(
    {
      lat_bucket: latBucket,
      lon_bucket: lonBucket,
      local_date: localDate,
      timezone: payload.timezone,
      sunrise_iso: payload.sunriseISO ?? null,
      sunset_iso: payload.sunsetISO ?? null,
      day_length_minutes: payload.dayLengthMinutes ?? null,
      moonrise_iso: payload.moonriseISO ?? null,
      moonset_iso: payload.moonsetISO ?? null,
      moon_phase_name: payload.moonPhaseName ?? null,
      moon_phase_fraction: payload.moonPhaseFraction ?? null,
      moon_illumination_pct: payload.moonIlluminationPct ?? null,
      source: payload.source,
      cached_at: payload.cachedAt,
      expires_at: payload.expiresAt,
      raw,
    },
    { onConflict: 'lat_bucket,lon_bucket,local_date' }
  );

  if (error) {
    if (isMissingCacheTable(error)) {
      cacheDisabled = true;
      logCacheDisabled("Supabase table 'moon_cache' not found; disabling moon cache writes");
      return;
    }

    console.warn('[moon-cache] Failed to persist cache', error);
  }
}

function mapRowToPayload(row: MoonCacheRow): MoonSunData {
  return {
    latBucket: row.lat_bucket,
    lonBucket: row.lon_bucket,
    localDate: row.local_date,
    timezone: row.timezone,
    sunriseISO: row.sunrise_iso ?? undefined,
    sunsetISO: row.sunset_iso ?? undefined,
    dayLengthMinutes: row.day_length_minutes ?? undefined,
    moonriseISO: row.moonrise_iso ?? undefined,
    moonsetISO: row.moonset_iso ?? undefined,
    moonPhaseName: row.moon_phase_name ?? undefined,
    moonPhaseFraction: row.moon_phase_fraction ?? undefined,
    moonIlluminationPct: row.moon_illumination_pct ?? undefined,
    source: row.source ?? DEFAULT_PROVIDER,
    cachedAt: row.cached_at,
    expiresAt: row.expires_at,
  };
}

function computeExpiryIso(localDate: string, timeZone: string): string {
  try {
    const date = Temporal.PlainDate.from(localDate);
    const nextDay = date.add({ days: 1 });
    const nextMidnight = Temporal.ZonedDateTime.from(`${nextDay.toString()}T00:00:00[${timeZone}]`);
    return nextMidnight.toInstant().toString();
  } catch {
    const tomorrow = Temporal.Now.instant().add({ hours: 24 });
    return tomorrow.toString();
  }
}

async function requestAstronomyData({ lat, lon, date }: FetchParams): Promise<IpGeoAstronomyResponse> {
  const apiKey = process.env.MOON_API_KEY || process.env.IPGEOLOCATION_API_KEY;
  const apiUrl = process.env.MOON_API_URL || 'https://api.ipgeolocation.io/astronomy';

  if (!apiKey) {
    throw new Error('Moon data API key missing: set MOON_API_KEY or IPGEOLOCATION_API_KEY.');
  }

  const params = new URLSearchParams({
    apiKey,
    lat: String(lat),
    long: String(lon),
  });
  if (date) {
    params.set('date', date);
  }

  const url = `${apiUrl}?${params.toString()}`;
  const response = await fetch(url, { method: 'GET' });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Moon data API error (${response.status}): ${text}`);
  }

  return (await response.json()) as IpGeoAstronomyResponse;
}

function buildPayload(
  data: IpGeoAstronomyResponse,
  latBucket: number,
  lonBucket: number
): MoonSunData {
  const localDate = data.date ?? Temporal.Now.instant().toZonedDateTimeISO('UTC').toPlainDate().toString();
  const timezone = data.timezone ?? 'UTC';
  const illuminationPct = normalizeIllumination(data.moon_illumination);
  const moonPhaseFraction = parseMoonFraction(data.moon_age, illuminationPct);
  const sunriseISO = toZonedInstantISO(localDate, data.sunrise as string | undefined, timezone);
  const sunsetISO = toZonedInstantISO(localDate, data.sunset as string | undefined, timezone);
  const moonriseISO = toZonedInstantISO(localDate, data.moonrise as string | undefined, timezone) ??
    toZonedInstantISO(localDate, (data as Record<string, unknown>)['moonrise_next'] as string | undefined, timezone);
  const moonsetISO = toZonedInstantISO(localDate, data.moonset as string | undefined, timezone) ??
    toZonedInstantISO(localDate, (data as Record<string, unknown>)['moonset_previous'] as string | undefined, timezone);

  return {
    latBucket,
    lonBucket,
    localDate,
    timezone,
    sunriseISO,
    sunsetISO,
    dayLengthMinutes: parseDayLength(data.day_length as string | undefined),
    moonriseISO,
    moonsetISO,
    moonPhaseName: data.moon_phase as string | undefined,
    moonPhaseFraction,
    moonIlluminationPct: illuminationPct,
    source: DEFAULT_PROVIDER,
    cachedAt: Temporal.Now.instant().toString(),
    expiresAt: computeExpiryIso(localDate, timezone),
  };
}

export async function getMoonSunData(params: FetchParams): Promise<MoonSunData> {
  const supabase = getSupabaseServerClient();
  const latBucket = roundToGrid(params.lat);
  const lonBucket = roundToGrid(params.lon);

  const previewDate = params.date ?? Temporal.Now.instant().toZonedDateTimeISO('UTC').toPlainDate().toString();
  let cachedRow = await readFromCache(supabase, latBucket, lonBucket, params.date);
  if (!cachedRow) {
    cachedRow = await readFromCache(supabase, latBucket, lonBucket);
  }
  if (cachedRow) {
    return mapRowToPayload(cachedRow);
  }

  const live = await requestAstronomyData(params);
  const localDate = live.date ?? previewDate;
  const payload = buildPayload(live, latBucket, lonBucket);
  await writeCache(supabase, latBucket, lonBucket, localDate, payload, live as Record<string, unknown> | null);
  return payload;
}
