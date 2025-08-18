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

export function buildPopupActivityPayload({
  activityId,
  day,
  score,
  reasons: passedReasons,
}: ActivityDayPayload) {
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

  const hasMarineData = day.waveHeight || day.windSpeed || day.waterTemperature || day.swellHeight || day.swellPeriod;

  const hasRealMarineData =
    (typeof day.waveHeight === 'number' && !isNaN(day.waveHeight)) ||
    (typeof day.swellHeight === 'number' && !isNaN(day.swellHeight));

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

  // Create weather and marine data objects now that orientation is available
  const marineData = hasMarineData ? {
    waveHeight: day?.waveHeight ?? day?.wave_height ?? null,
    waterTemperature: day?.waterTemperature ?? day?.water_temp ?? null,
    swellHeight: day?.swellHeight ?? day?.swell_height ?? null,
    swellPeriod: day?.swellPeriod ?? day?.swell_period ?? null,
    windSpeed: day?.windSpeed ?? day?.wind_speed ?? null, // ALL WIND SPEEDS IN M/S - Stormglass/OpenWeather both provide m/s
    windDir: day?.windDir ?? day?.windDirection ?? day?.wind_direction ?? null, // coalesce any available direction
    gust: day?.gust ?? null, // Stormglass if available
    vis: day?.vis ?? null, // Stormglass if available
    swellDir: day?.swellDir ?? day?.swell_direction ?? null,
    temperature: day?.temperature ?? day?.temp ?? null,
    tempMin: day?.tempMin ?? day?.temp_min ?? null,
    tempMax: day?.tempMax ?? day?.temp_max ?? null,
    humidity: day?.humidity ?? null,
    precipitation: day?.precipitation ?? day?.rain ?? null,
    visibility: day?.visibility ?? null,
    condition: day?.condition ?? null,
    icon: day?.icon ?? null,
    description: day?.description ?? null,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : (day?.beachOrientation ?? null),
  } : {};

  const weatherData = {
    temperature: day?.temperature ?? day?.temp ?? null,
    tempMin: day?.tempMin ?? day?.temp_min ?? null,
    tempMax: day?.tempMax ?? day?.temp_max ?? null,
    humidity: day?.humidity ?? null,
    windSpeed: day?.wind_speed ?? null, // ALL WIND SPEEDS IN M/S - OpenWeather provides m/s
    windDir: day?.wind_direction ?? null, // OpenWeather only
    gust: day?.wind_gust ?? null,
    precipitation: day?.precipitation ?? day?.rain ?? null,
    visibility: day?.visibility ?? null,
    condition: day?.condition ?? null,
    icon: day?.icon ?? null,
    description: day?.description ?? null,
  };

  // Merge the marine data into the day object for buildReasons
  const dayWithMarine = {
    ...day,
    waterTemperature: marineData.waterTemperature,
    waveHeight: marineData.waveHeight,
    swellHeight: marineData.swellHeight,
    swellPeriod: marineData.swellPeriod,
    // Keep both naming schemes so downstream helpers (marine vs land) can read either
    windSpeed: marineData.windSpeed ?? day?.windSpeed ?? null,
    wind_speed: day?.wind_speed ?? null,
    windDir: marineData.windDir ?? day?.windDir ?? day?.wind_direction ?? null,
    wind_direction: day?.wind_direction ?? marineData.windDir ?? null,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : (day?.beachOrientation ?? null),
  };

  const dayForReasons = {
    ...day,
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : (day?.beachOrientation ?? null),
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
      waveHeight: day.waveHeight,
      swellHeight: day.swellHeight,
      swellPeriod: day.swellPeriod,
      waterTemperature: day.waterTemperature,
      windSpeed: day.windSpeed,
      windDirection: day.windDirection,
    });
  }

  console.log('marineData:', marineData);
  console.log('Parsed day object:', day);

  // Optionally, add render helpers if you use them
  // const renderMarineData = () => ...;
  // const renderFooter = () => ...;

  // In the return statement at the bottom of the function
  return {
    activityId,
    title,
    description,
    background,
    category,
    categoryEmoji,
    reasons,
    marineData: isMarine ? marineData : undefined,
    weatherData: weatherData,
    score,
    message,
    dayTimestamp: day.date, // Add this line to include the timestamp directly
    beachOrientation: typeof effectiveBeachOrientation === 'number' ? effectiveBeachOrientation : null,
    pollen: day.pollen, // Include pollen data from day
    airQuality: day.airQuality, // Include air quality data from day
    // renderMarineData,
    // renderFooter,
  };
}
