import { activityTypes } from '../data/activityTypes';
import { getAssessmentEmoji } from '../data/emojiMap';
import { buildReasons } from './activityHelpers'; // Adjust the path if needed

import SwellArrow from '../components/SwellArrow';
import bgMap from '../data/bgMap';
import { getActivityMessage } from '../data/activityMessages';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import { computeSimulatedOrientation } from '../utils/orientation';
import '../styles/Popup.css';

// --- Coordinate helpers: extract coords from day or common localStorage keys ---
const tryExtractCoords = (obj: any): { lat: number; lon: number } | null => {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [
    { lat: (obj as any).lat, lon: (obj as any).lon },
    { lat: (obj as any).latitude, lon: (obj as any).longitude },
    { lat: (obj as any).coords?.lat, lon: (obj as any).coords?.lon },
    { lat: (obj as any).coords?.latitude, lon: (obj as any).coords?.longitude },
    { lat: (obj as any).center?.lat, lon: (obj as any).center?.lng ?? (obj as any).center?.lon },
    { lat: (obj as any).location?.lat, lon: (obj as any).location?.lng ?? (obj as any).location?.lon },
  ];
  for (const c of candidates) {
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

const getApproximateCoords = (day?: any): { lat: number; lon: number } | null => {
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
        const parsed = JSON.parse(raw);
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
        const parsed = JSON.parse(raw);
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
    const list = JSON.parse(raw);
    if (!Array.isArray(list) || typeof lat !== 'number' || typeof lon !== 'number') return undefined;

    let best: any = null;
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

type Category = 'perfect' | 'good' | 'fair' | 'poor';

interface ActivityDayPayload {
  activityId: string;
  day: any; // Should be typed if possible
  score: number;
  reasons?: any[];
}

// --- Weather normalization copied from weatherService.ts ---
// TODO: Unify this logic into a shared utility for all weather normalization
function normalizeWeatherFields(weather: any, fallbackWeather?: any, marineWeather?: any, isMarine?: boolean) {
  function pickField(fieldPaths: string[][], sources: any[]) {
    for (let i = 0; i < fieldPaths.length; i++) {
      const value = fieldPaths[i].reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), sources[i]);
      if (value !== undefined && value !== null) return value;
    }
    return null;
  }
  const sources = isMarine
    ? [marineWeather, weather, fallbackWeather]
    : [weather, fallbackWeather, marineWeather];
  
  if (isMarine) {
    console.log('🔍 NORMALIZATION DEBUG - Sources:', {
      marineWeather: marineWeather ? Object.keys(marineWeather) : 'undefined',
      weather: weather ? Object.keys(weather) : 'undefined', 
      fallbackWeather: fallbackWeather ? Object.keys(fallbackWeather) : 'undefined'
    });
  }
  
  return {
    temperature: pickField([
      ['temperature'],
      ['temp'],
      ['temperature']
    ], sources),
    precipitation: pickField([
      ['precipitation'],
      ['rain'],
      ['precipitation']
    ], sources),
    windSpeed: pickField([
      ['windSpeed'],
      ['windspeed'],
      ['wind_speed']
    ], sources),
    clouds: pickField([
      ['clouds'],
      ['cloudcover'],
      ['cloudCover']
    ], sources),
    humidity: pickField([
      ['humidity'],
      ['humidity'],
      ['humidity']
    ], sources),
    visibility: pickField([
      ['visibility'],
      ['visibility'],
      ['visibility']
    ], sources),
    waterTemperature: pickField([
      ['waterTemperature'],
      ['waterTemp'],
      ['waterTemperature']
    ], sources),
    waveHeight: pickField([
      ['waveHeight'],
      ['wave_height'],
      ['waveHeight']
    ], sources),
    swellHeight: pickField([
      ['swellHeight'],
      ['swell_height'],
      ['swellHeight']
    ], sources),
    swellPeriod: pickField([
      ['swellPeriod'],
      ['swell_period'],
      ['swellPeriod']
    ], sources),
    sunsetTs: pickField([
      ['sunsetTs'],
      ['sunset'],
      ['sunsetTs']
    ], sources),
    uvi: pickField([
      ['uvi'],
      ['uvIndex'],
      ['uvi']
    ], sources),
  };
}

export function buildPopupActivityPayload({
  activityId,
  day,
  score,
  reasons: passedReasons,
}: ActivityDayPayload) {
  console.log('🔥 POPUP PAYLOAD DEBUG START:', { activityId, score });
  console.log('🔥 POPUP PAYLOAD - Raw day object:', JSON.stringify(day, null, 2));
  
  const activity = activityTypes.find((a) => a.id === activityId);
  const title = activity?.name ?? activityId.replace(/_/g, ' ');
  const description = activity?.description ?? '';
  const background = bgMap[activityId] || '/zumba.png';
  const category: Category =
    score >= 80 ? 'perfect'
    : score >= 60 ? 'good'
    : score >= 40 ? 'fair'
    : 'poor';
  const categoryEmoji = getAssessmentEmoji ? getAssessmentEmoji(category) : '';
  const isMarine = MARINE_ACTIVITY_IDS.includes(activityId);
  
  console.log('🔥 POPUP PAYLOAD - Is Marine?', isMarine);
  console.log('🔥 POPUP PAYLOAD - Day marine fields:', {
    waveHeight: day?.waveHeight,
    swellHeight: day?.swellHeight,
    waterTemperature: day?.waterTemperature,
    windSpeed: day?.windSpeed,
    windDir: day?.windDir,
    windDirection: day?.windDirection
  });

  // Use normalization logic - for marine activities, the day object already has marine fields
  // from getPopupDay, so we can pass it as the primary source
  const normalized = normalizeWeatherFields(day, undefined, undefined, isMarine);
  
  console.log('🔥 POPUP PAYLOAD - Normalized result:', normalized);

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
    effectiveBeachOrientation = computeSimulatedOrientation(lat, lon);
  }

  // Weather summary used by Popup
  const weatherData = {
    temperature: normalized.temperature,
    tempMax: day?.tempMax ?? day?.temp_max ?? null,
    tempMin: day?.tempMin ?? day?.temp_min ?? null,
    humidity: normalized.humidity,
    windSpeed: normalized.windSpeed,
    windDir: day?.wind_direction ?? null,
    gust: day?.wind_gust ?? null,
    precipitation: normalized.precipitation,
    visibility: normalized.visibility,
    condition: day?.condition ?? null,
    icon: day?.icon ?? null,
    description: day?.description ?? null,
    uvi: normalized.uvi,
  };

  // Marine summary used by Popup (safe optional fields)
  const marineData = isMarine ? {
    waveHeight: normalized.waveHeight,
    waterTemperature: normalized.waterTemperature,
    swellHeight: normalized.swellHeight,
    swellPeriod: normalized.swellPeriod,
    windSpeed: normalized.windSpeed,
    gust: day?.gust ?? day?.gustSpeed ?? day?.wind_gust ?? null, // Fixed field name
    windDir: day?.windDir ?? day?.windDirection ?? day?.wind_direction ?? null, // Fixed field name
    swellDir: day?.swellDir ?? day?.swellDirection ?? day?.swell_direction ?? null, // Added missing field
    vis: day?.vis ?? day?.visibility ?? null, // Added missing field
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
  } : undefined;

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine = {
    ...day,
    waterTemperature: normalized.waterTemperature,
    waveHeight: normalized.waveHeight,
    swellHeight: normalized.swellHeight,
    swellPeriod: normalized.swellPeriod,
    windSpeed: normalized.windSpeed,
    wind_speed: normalized.windSpeed,
    windDir: day?.windDir ?? day?.windDirection ?? day?.wind_direction ?? null,
    wind_direction: day?.wind_direction ?? day?.windDir ?? null,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
  };

  const dayForReasons = {
    ...day,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
  };
  const reasonsInput = isMarine
    ? { ...dayWithMarine, beachOrientation: dayForReasons.beachOrientation }
    : dayForReasons;
  const reasons = passedReasons || buildReasons(reasonsInput, activityId);

  // Create reason objects from strings
  const reasonsObjects = Array.isArray(reasons) 
    ? reasons.map(reason => ({
        key: reason.toLowerCase().replace(/\s+/g, '_'),
        value: true,
        label: reason
      }))
    : [];

  const message = getActivityMessage
    ? getActivityMessage(activityId, category, reasonsObjects)
    : '';

  if (isMarine) {
    console.log('Marine activity:', activityId, {
      waveHeight: normalized.waveHeight,
      swellHeight: normalized.swellHeight,
      swellPeriod: normalized.swellPeriod,
      waterTemperature: normalized.waterTemperature,
      windSpeed: normalized.windSpeed,
      windDirection: day?.windDirection,
    });
  }

  console.log('marineData:', marineData);
  console.log('Parsed day object:', day);

  return {
    activityId,
    title,
    description,
    background,
    category,
    categoryEmoji,
    reasons,
    marineData,
    weatherData,
    score,
    message,
    dayTimestamp: day.date,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
    pollen: day.pollen,
    airQuality: day.airQuality,
  };
}
