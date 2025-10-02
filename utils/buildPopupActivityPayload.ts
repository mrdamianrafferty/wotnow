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

  current?: MaybeNum;
  currentSpeed?: MaybeNum;
  current_speed?: MaybeNum;
  currentSpeedMS?: MaybeNum;
  currentDir?: MaybeNum;
  current_direction?: MaybeNum;

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

  // Consider presence of ANY marine-relevant metric, including 0 values, as data available
  const dayRec = (day ?? {}) as Record<string, unknown>;
  const hasMarineData = isMarine && !!day && (
    typeof dayRec['waveHeight'] === 'number' ||
    typeof dayRec['waterTemperature'] === 'number' ||
    typeof dayRec['swellHeight'] === 'number' ||
    typeof dayRec['swellPeriod'] === 'number' ||
    typeof dayRec['windSpeed'] === 'number' ||
    typeof dayRec['wind_speed'] === 'number' ||
    typeof dayRec['gust'] === 'number' ||
    typeof dayRec['wind_gust'] === 'number' ||
    typeof dayRec['vis'] === 'number' ||
    typeof dayRec['swellDir'] === 'number' ||
    typeof dayRec['swell_direction'] === 'number' ||
    typeof dayRec['windDir'] === 'number' ||
    typeof dayRec['wind_direction'] === 'number' ||
    typeof dayRec['current'] === 'number' ||
    typeof dayRec['currentSpeed'] === 'number' ||
    typeof dayRec['current_speed'] === 'number' ||
    typeof dayRec['currentSpeedMS'] === 'number'
  );

  // Determine an effective beach orientation for downstream messaging/scoring
  const approx = getApproximateCoords(day);
  const lat = approx?.lat ?? null;
  const lon = approx?.lon ?? null;

  let effectiveBeachOrientation: number | undefined =
    typeof (day as DayLike | undefined)?.beachOrientation === 'number'
      ? (day as DayLike).beachOrientation as number
      : undefined;

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
    currentSpeed?: number;
    currentDir?: number;
  };
  const marineData: MarineDataOut | undefined = hasMarineData ? {
    waveHeight: toNum(dayRec['waveHeight'] ?? dayRec['wave_height']),
    waterTemperature: toNum(dayRec['waterTemperature'] ?? dayRec['water_temp']),
    swellHeight: toNum(dayRec['swellHeight'] ?? dayRec['swell_height']),
    swellPeriod: toNum(dayRec['swellPeriod'] ?? dayRec['swell_period']),
    windSpeed: toNum(dayRec['windSpeed'] ?? dayRec['wind_speed']),
    windDir: toNum(dayRec['windDir'] ?? dayRec['windDirection'] ?? dayRec['wind_direction']),
    gust: toNum(dayRec['gust'] ?? dayRec['wind_gust']),
    vis: toNum(dayRec['vis']),
    swellDir: toNum(dayRec['swellDir'] ?? dayRec['swell_direction']),
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : undefined,
    currentSpeed: toNum(dayRec['currentSpeed'] ?? dayRec['current'] ?? dayRec['current_speed'] ?? dayRec['currentSpeedMS']),
    currentDir: toNum(dayRec['currentDir'] ?? dayRec['currentDirection'] ?? dayRec['current_direction']),
  } : undefined;

  const weatherData = {
    temperature: toNum((day as DayLike | undefined)?.temperature ?? dayRec['temp']),
    tempMin: toNum(dayRec['tempMin'] ?? dayRec['temp_min']),
    tempMax: toNum(dayRec['tempMax'] ?? dayRec['temp_max']),
    humidity: toNum(dayRec['humidity']),
    windSpeed: toNum(dayRec['wind_speed'] ?? dayRec['windSpeed']), // m/s
    windDir: toNum(dayRec['wind_direction'] ?? dayRec['wind_direction'] ?? dayRec['windDir']),
    gust: toNum(dayRec['wind_gust'] ?? dayRec['gust']),
    precipitation: toNum(dayRec['precipitation'] ?? dayRec['rain']),
    visibility: toNum(dayRec['visibility']),
    condition: (day as DayLike | undefined)?.condition ?? undefined,
    icon: (day as DayLike | undefined)?.icon ?? undefined,
    description: (day as DayLike | undefined)?.description ?? undefined,
    // Snow-aware fields (optional)
    snowDepthCm: toNum(dayRec['snowDepthCm']),
    snowfallRateMmH: toNum(dayRec['snowfallRateMmH']),
  };

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine: DayLike = {
    ...(day as DayLike),
    waterTemperature: (marineData as Record<string, unknown> | undefined)?.['waterTemperature'] as MaybeNum,
    waveHeight: (marineData as Record<string, unknown> | undefined)?.['waveHeight'] as MaybeNum,
    swellHeight: (marineData as Record<string, unknown> | undefined)?.['swellHeight'] as MaybeNum,
    swellPeriod: (marineData as Record<string, unknown> | undefined)?.['swellPeriod'] as MaybeNum,
    current: (marineData as Record<string, unknown> | undefined)?.['currentSpeed'] as MaybeNum ?? dayRec['current'] as MaybeNum ?? null,
    currentSpeed: (marineData as Record<string, unknown> | undefined)?.['currentSpeed'] as MaybeNum ?? null,
    // Keep both naming schemes so downstream helpers (marine vs land) can read either
    windSpeed: (marineData as Record<string, unknown> | undefined)?.['windSpeed'] as MaybeNum ?? (day as DayLike)?.windSpeed ?? null,
    wind_speed: dayRec['wind_speed'] as MaybeNum ?? null,
    windDir: (marineData as Record<string, unknown> | undefined)?.['windDir'] as MaybeNum ?? (day as DayLike)?.windDir ?? (dayRec['wind_direction'] as MaybeNum) ?? null,
    wind_direction: (dayRec['wind_direction'] as MaybeNum) ?? (marineData as Record<string, unknown> | undefined)?.['windDir'] as MaybeNum ?? null,
    currentDir: (marineData as Record<string, unknown> | undefined)?.['currentDir'] as MaybeNum ?? dayRec['currentDir'] as MaybeNum ?? null,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : (day as DayLike)?.beachOrientation ?? null,
  };

  const reasonsInput: DayLike = isMarine
    ? { ...dayWithMarine, beachOrientation: dayWithMarine.beachOrientation }
    : { ...(day as DayLike), beachOrientation: dayWithMarine.beachOrientation };

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
  if (typeof (day as DayLike | undefined)?.date === 'number') {
    dayTimestamp = (day as DayLike).date as number;
  } else if (typeof (day as DayLike | undefined)?.date === 'string') {
    const d = new Date((day as DayLike).date as string);
    if (!Number.isNaN(d.getTime())) dayTimestamp = Math.floor(d.getTime() / 1000);
  } else if ((day as DayLike | undefined)?.date instanceof Date) {
    const t = ((day as DayLike).date as Date).getTime();
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
    pollen: typeof (day as DayLike).pollen === 'object' ? (day as DayLike).pollen : undefined,
    airQuality: typeof (day as DayLike).airQuality === 'object' ? (day as DayLike).airQuality : undefined,
  };
}
