import { activityTypes } from '../data/activityTypes';
import { getAssessmentEmoji } from '../data/emojiMap';
import { buildReasons, MARINE_ACTIVITY_IDS } from './activityHelpers';

import bgMap from '../data/bgMap';
import { getActivityMessage } from '../data/activityMessages';
import { computeSimulatedOrientation } from './orientation';
import type { PollenSummary } from './pollenUtils';
import type { AirQualitySummary } from './airQualityUtils';

// --- Types ---
interface Coords { lat: number; lon: number }

type MaybeNum = number | null | undefined;

interface DayLike {
  // identity
  date?: string | number | Date;
  // land weather
  temperature?: MaybeNum;
  temp?: MaybeNum;
  tempMin?: MaybeNum;
  temp_min?: MaybeNum;
  tempMax?: MaybeNum;
  temp_max?: MaybeNum;
  humidity?: MaybeNum;
  precipitation?: MaybeNum;
  rain?: MaybeNum;
  visibility?: MaybeNum;
  condition?: string | null;
  icon?: string | null;
  description?: string; // align with activityHelpers.DayLike (no null)
  wind_speed?: MaybeNum;
  windSpeed?: MaybeNum;
  wind_direction?: MaybeNum;
  windDir?: MaybeNum;
  windDirection?: MaybeNum;
  wind_gust?: MaybeNum;
  gust?: MaybeNum;

  // marine
  waterTemperature?: MaybeNum;
  water_temp?: MaybeNum;
  waveHeight?: MaybeNum;
  swellHeight?: MaybeNum;
  swellPeriod?: MaybeNum;
  swell_height?: MaybeNum;
  swell_period?: MaybeNum;
  swellDir?: MaybeNum;
  swell_direction?: MaybeNum;
  vis?: MaybeNum;

  // context
  beachOrientation?: number | null;
  coords?: { lat?: number; lon?: number }; // narrowed to match helper type
  center?: { lat?: number; lng?: number; lon?: number } | null;
  location?: { lat?: number; lng?: number; lon?: number } | null;

  // health
  pollen?: PollenSummary;
  airQuality?: AirQualitySummary;

  // generic coordinate hints
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
}

type Category = 'perfect' | 'good' | 'fair' | 'poor';

interface ActivityDayPayload {
  activityId: string;
  day: DayLike;
  score: number;
  reasons?: string[];
}

// Helper to safely treat unknown as record
const asRec = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : null;

// Convert various inputs to a finite number or undefined
const toNum = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

// --- Coordinate helpers: extract coords from day or common localStorage keys ---
const tryExtractCoords = (obj: unknown): Coords | null => {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;
  const coords: Array<{ lat: unknown; lon: unknown }> = [
    { lat: o['lat'], lon: o['lon'] },
    { lat: o['latitude'], lon: o['longitude'] },
    { lat: asRec(o['coords'])?.['lat'], lon: asRec(o['coords'])?.['lon'] },
    { lat: asRec(o['coords'])?.['latitude'], lon: asRec(o['coords'])?.['longitude'] },
    { lat: asRec(o['center'])?.['lat'], lon: asRec(o['center'])?.['lng'] ?? asRec(o['center'])?.['lon'] },
    { lat: asRec(o['location'])?.['lat'], lon: asRec(o['location'])?.['lng'] ?? asRec(o['location'])?.['lon'] },
  ];
  for (const c of coords) {
    if (
      typeof c?.lat === 'number' &&
      typeof c?.lon === 'number' &&
      !Number.isNaN(c.lat) &&
      !Number.isNaN(c.lon)
    ) {
      return { lat: c.lat, lon: c.lon };
    }
  }
  return null;
};

const getApproximateCoords = (day?: unknown): Coords | null => {
  // 1) Try the day object itself first
  const fromDay = tryExtractCoords(day);
  if (fromDay) return fromDay;

  // 2) Try common localStorage keys we already use elsewhere in the app
  if (typeof window !== 'undefined') {
    const keys = [
      'selectedPlace',
      'lastCoords',
      'userLocation',
      'mapCenter',
      'cachedCoords',
      'currentSearchLocation',
    ];
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        const c = tryExtractCoords(parsed);
        if (c) return c;
      } catch {
        // ignore malformed entries
      }
    }

    // 3) As a last resort, scan all LS entries for an object that looks like coords
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        const c = tryExtractCoords(parsed);
        if (c) return c;
      }
    } catch {
      // ignore
    }
  }
  return null;
};

// Try to infer a beach orientation from cachedBeaches (nearest entry with an orientation)
const getOrientationFromCachedBeaches = (lat?: number | null, lon?: number | null): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    // Fallback to any coords we can infer if none were passed
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      const approx = getApproximateCoords();
      lat = approx?.lat ?? null;
      lon = approx?.lon ?? null;
    }

    const raw = localStorage.getItem('cachedBeaches');
    if (!raw) return undefined;
    const list = JSON.parse(raw) as Array<{ lat?: number; lon?: number; orientation?: number }>;
    if (!Array.isArray(list) || typeof lat !== 'number' || typeof lon !== 'number') return undefined;

    let best: { lat?: number; lon?: number; orientation?: number } | null = null;
    let bestDist = Infinity;
    for (const b of list) {
      if (typeof b?.orientation !== 'number') continue;
      const d = Math.hypot((b.lat ?? 0) - lat, (b.lon ?? 0) - lon);
      if (d < bestDist) { bestDist = d; best = b; }
    }
    // ~2km threshold in degrees (~0.02° ≈ 2.2 km at mid‑latitudes)
    if (best && bestDist < 0.02) return best.orientation;
  } catch {
    // ignore
  }
  return undefined;
};

export function buildPopupActivityPayload({
  activityId,
  day,
  score,
  reasons: passedReasons,
}: ActivityDayPayload) {
  const activity = activityTypes.find((a) => a.id === activityId);
  const title = activity?.name ?? activityId.replace(/_/g, ' ');
  const description = activity?.description ?? '';
  const background = (bgMap as Record<string, string>)[activityId] || '/zumba.png';
  const category: Category =
    score >= 80 ? 'perfect'
    : score >= 60 ? 'good'
    : score >= 40 ? 'fair'
    : 'poor';
  const categoryEmoji = getAssessmentEmoji ? getAssessmentEmoji(category) : '';
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);

  const hasMarineData = Boolean(
    day.waveHeight || day.windSpeed || day.waterTemperature || day.swellHeight || day.swellPeriod
  );

  // Determine an effective beach orientation for downstream messaging/scoring
  const approx = getApproximateCoords(day);
  const lat = approx?.lat ?? null;
  const lon = approx?.lon ?? null;

  let effectiveBeachOrientation: number | undefined =
    typeof day?.beachOrientation === 'number' ? day.beachOrientation : undefined;

  if (effectiveBeachOrientation == null) {
    const cached = getOrientationFromCachedBeaches(lat, lon);
    if (typeof cached === 'number') effectiveBeachOrientation = cached;
  }

  if (effectiveBeachOrientation == null && typeof lat === 'number' && typeof lon === 'number') {
    // Fallback to simulated orientation so wind-relative messaging still works
    effectiveBeachOrientation = computeSimulatedOrientation(lat, lon);
  }

  // Create weather and marine data objects with safe number coercion (no nulls)
  type MarineDataOut = {
    waveHeight?: number;
    waterTemperature?: number;
    swellHeight?: number;
    swellPeriod?: number;
    windSpeed?: number; // m/s
    windDir?: number;
    gust?: number;
    vis?: number;
    swellDir?: number;
    beachOrientation?: number;
  };
  const marineData: MarineDataOut | undefined = hasMarineData ? {
    waveHeight: toNum(day?.waveHeight ?? (day as Record<string, unknown>)?.['wave_height']),
    waterTemperature: toNum(day?.waterTemperature ?? (day as Record<string, unknown>)?.['water_temp']),
    swellHeight: toNum(day?.swellHeight ?? (day as Record<string, unknown>)?.['swell_height']),
    swellPeriod: toNum(day?.swellPeriod ?? (day as Record<string, unknown>)?.['swell_period']),
    windSpeed: toNum(day?.windSpeed ?? (day as Record<string, unknown>)?.['wind_speed']),
    windDir: toNum(day?.windDir ?? day?.windDirection ?? (day as Record<string, unknown>)?.['wind_direction']),
    gust: toNum(day?.gust ?? (day as Record<string, unknown>)?.['wind_gust']),
    vis: toNum(day?.vis),
    swellDir: toNum(day?.swellDir ?? (day as Record<string, unknown>)?.['swell_direction']),
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : undefined,
  } : undefined;

  const weatherData = {
    temperature: toNum(day?.temperature ?? day?.temp),
    tempMin: toNum(day?.tempMin ?? day?.temp_min),
    tempMax: toNum(day?.tempMax ?? day?.temp_max),
    humidity: toNum(day?.humidity),
    windSpeed: toNum((day as Record<string, unknown>)?.['wind_speed'] ?? day?.windSpeed), // m/s
    windDir: toNum((day as Record<string, unknown>)?.['wind_direction'] ?? day?.wind_direction ?? day?.windDir),
    gust: toNum((day as Record<string, unknown>)?.['wind_gust'] ?? day?.gust),
    precipitation: toNum(day?.precipitation ?? day?.rain),
    visibility: toNum(day?.visibility),
    condition: day?.condition ?? undefined,
    icon: day?.icon ?? undefined,
    description: day?.description ?? undefined,
  };

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine: DayLike = {
    ...day,
    waterTemperature: (marineData as Record<string, unknown> | undefined)?.['waterTemperature'] as MaybeNum,
    waveHeight: (marineData as Record<string, unknown> | undefined)?.['waveHeight'] as MaybeNum,
    swellHeight: (marineData as Record<string, unknown> | undefined)?.['swellHeight'] as MaybeNum,
    swellPeriod: (marineData as Record<string, unknown> | undefined)?.['swellPeriod'] as MaybeNum,
    // Keep both naming schemes so downstream helpers (marine vs land) can read either
    windSpeed: (marineData as Record<string, unknown> | undefined)?.['windSpeed'] as MaybeNum ?? day?.windSpeed ?? null,
    wind_speed: (day as Record<string, unknown>)?.['wind_speed'] as MaybeNum ?? null,
    windDir: (marineData as Record<string, unknown> | undefined)?.['windDir'] as MaybeNum ?? day?.windDir ?? (day as Record<string, unknown>)?.['wind_direction'] as MaybeNum ?? null,
    wind_direction: (day as Record<string, unknown>)?.['wind_direction'] as MaybeNum ?? (marineData as Record<string, unknown> | undefined)?.['windDir'] as MaybeNum ?? null,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : (day?.beachOrientation ?? null),
  };

  const reasonsInput: DayLike = isMarine
    ? { ...dayWithMarine, beachOrientation: dayWithMarine.beachOrientation }
    : { ...day, beachOrientation: dayWithMarine.beachOrientation };

  const reasons = passedReasons || buildReasons(reasonsInput, activityId);

  // Create reason objects from strings
  const reasonsObjects = Array.isArray(reasons) 
    ? reasons.map((reason) => ({
        key: String(reason).toLowerCase().replace(/\s+/g, '_'),
        value: true,
        label: reason
      }))
    : [];

  const message = getActivityMessage
    ? getActivityMessage(activityId, category, reasonsObjects)
    : '';

  // Normalize a numeric day timestamp in seconds if possible
  let dayTimestamp: number | undefined;
  if (typeof day?.date === 'number') {
    dayTimestamp = day.date;
  } else if (typeof day?.date === 'string') {
    const d = new Date(day.date);
    if (!Number.isNaN(d.getTime())) dayTimestamp = Math.floor(d.getTime() / 1000);
  } else if (day?.date instanceof Date) {
    const t = day.date.getTime();
    if (Number.isFinite(t)) dayTimestamp = Math.floor(t / 1000);
  }

  // In the return statement at the bottom of the function
  return {
    activityId,
    title,
    description,
    background,
    category,
    categoryEmoji,
    reasons,
    marineData: isMarine ? (marineData ? marineData : undefined) : undefined,
    weatherData: weatherData,
    score,
    message,
    dayTimestamp,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
    pollen: typeof day.pollen === 'object' ? day.pollen : undefined,
    airQuality: typeof day.airQuality === 'object' ? day.airQuality : undefined,
  };
}
