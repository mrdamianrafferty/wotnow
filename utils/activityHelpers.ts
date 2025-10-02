import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWindMessage,
  getSnowDescription,
} from './weatherLabels';
import { activityTypes } from '../data/activityTypes';
import { getActivityMessage } from '../data/activityMessages';
import { classifyWindRelative, computeSimulatedOrientation } from '../utils/orientation';
import { assessPollenConditions, getPollenAdviceForActivity, getPollenTimingAdvice } from './pollenUtils';
import { getWindActivityRecommendation } from './windRecommendations';
import { assessSoilCondition, getMudMessage, isMudSensitive } from './soilMoistureUtils';
import { assessAirQualityConditions, buildAirQualityAdvice, shouldExcludeForAirQuality, AirQualityLevel, type AirQualitySummary } from './airQualityUtils';

export const MARINE_ACTIVITY_IDS = [
  'surfing',
  'sailing',
  'scuba_diving',
  'snorkeling',
  'sea_fishing_boat',
  'sea_fishing_shore',
  'windsurfing',
  'beach_volleyball',
  'jet_skiing',
  'sea_swimming',
  'kitesurfing',
  'sea_kayaking',
  'sup_sea',
];

// --- Shared types used throughout this helper ---
export type Reason = { key: string; value: unknown; label: string };

export interface DayLike {
  date?: string | number | Date;
  // temps & general
  temperature?: number | null; tempMax?: number | null; tempMin?: number | null;
  description?: string; rain?: number | null; precipitation?: number | null; clouds?: number | null;
  humidity?: number | null; visibility?: number | null; icon?: string | null;
  // wind (various shapes)
  windSpeed?: number | null; wind_speed?: number | null; wind_gust?: number | null; gustSpeed?: number | null;
  windDirection?: number | string | null; wind_direction?: number | string | null; wind_dir?: number | string | null;
  windDeg?: number | string | null; winddeg?: number | string | null; wind_deg?: number | string | null;
  windDirectionDeg?: number | string | null; wind_direction_deg?: number | string | null;
  wind_direction_degrees?: number | string | null; windDirectionDegrees?: number | string | null;
  hourly?: Array<Record<string, unknown>>;
  // marine
  waterTemperature?: number | null; waveHeight?: number | null; swellHeight?: number | null; swellPeriod?: number | null;
  // location/orientation
  beachOrientation?: number | null; beach_orientation?: number | null;
  lat?: number; lon?: number; latitude?: number; longitude?: number; coords?: { lat?: number; lon?: number };
  // environment extras
  pollen?: unknown; airQuality?: unknown;
  // snow (optional, used for generic outdoor reasoning)
  snowDepthCm?: number;            // cm
  snowfallRateMmH?: number;        // mm/h
  // ➕ soil moisture (0–1 or 0–100)
  soilMoisture?: number | null;
  // legacy/supporting fields
  temp?: number | null;
}

// Try to infer a beach orientation from cachedBeaches (nearest entry with an orientation)
const getOrientationFromCachedBeaches = (lat?: number | null, lon?: number | null): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    // If coords not provided, try to derive them from localStorage.
    let targetLat = typeof lat === 'number' ? lat : undefined;
    let targetLon = typeof lon === 'number' ? lon : undefined;
    if (targetLat == null || targetLon == null) {
      const fallback = getApproximateCoords();
      if (fallback) {
        targetLat = fallback.lat;
        targetLon = fallback.lon;
      }
    }
    if (targetLat == null || targetLon == null) return undefined;

    const raw = localStorage.getItem('cachedBeaches');
    if (!raw) return undefined;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return undefined;

    type CachedBeach = { orientation: number; lat?: number | null; lon?: number | null };
    let best: CachedBeach | null = null;
    let bestDist = Infinity;
    for (const b of list as CachedBeach[]) {
      if (typeof b?.orientation !== 'number') continue;
      const d = Math.hypot((b.lat ?? 0) - targetLat, (b.lon ?? 0) - targetLon);
      if (d < bestDist) { bestDist = d; best = b; }
    }
    // ~2km threshold in degrees (~0.02° ≈ 2.2 km at mid‑latitudes)
    if (best && bestDist < 0.02) return best.orientation;
  } catch {
    // ignore
  }
  return undefined;
};

// --- New helpers: try to recover approximate coords so we can still compute an orientation ---

type Coords = { lat: number; lon: number };

interface CoordLike {
  lat?: number;
  lon?: number;
  latitude?: number;
  longitude?: number;
  lng?: number;
  coords?: CoordLike;
  location?: CoordLike;
  center?: CoordLike;
}

function tryExtractCoords(obj: unknown): Coords | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  // common shapes
  const base = obj as CoordLike;
  const candidates: Array<CoordLike | undefined> = [
    base,
    base.coords,
    base.location,
    base.center,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const lat = typeof c.lat === 'number' ? c.lat : (typeof c.latitude === 'number' ? c.latitude : undefined);
    const lon = typeof c.lon === 'number' ? c.lon : (typeof c.lng === 'number' ? c.lng : (typeof c.longitude === 'number' ? c.longitude : undefined));
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
  }
  return undefined;
}

function getApproximateCoords(day?: unknown): Coords | undefined {
  // 1) try day object first
  const fromDay = tryExtractCoords(day);
  if (fromDay) return fromDay;

  if (typeof window === 'undefined') return undefined;

  // 2) try a few common localStorage keys
  const commonKeys = [
    'lastCoords',
    'lastLocation',
    'userLocation',
    'selectedPlace',
    'mapCenter',
    'place',
  ];
  for (const key of commonKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const coords = tryExtractCoords(parsed);
      if (coords) return coords;
    } catch { /* ignore parse errors */ }
  }

  // 3) fall back: scan every LS entry and return the first object that looks like coords
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        const coords = tryExtractCoords(parsed);
        if (coords) return coords;
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }

  return undefined;
}

// Simple outdoor/indoor check: weatherSensitive => outdoor; otherwise indoor
export function isOutdoor(activityId: string): boolean {
  const a = activityTypes.find((x) => x.id === activityId);
  if (!a) return true; // default to outdoor if unknown
  return !!a.weatherSensitive;
}

/**
 * Check if an activity is out of season based on current month
 * @param activityId - The activity ID to check
 * @param currentDate - Optional current date, defaults to now
 * @returns true if the activity has seasonal months defined and current month is not in that range
 */
export function isOutOfSeason(activityId: string, currentDate?: Date): boolean {
  const activity = activityTypes.find((x) => x.id === activityId);
  if (!activity || !activity.seasonalMonths || activity.seasonalMonths.length === 0) {
    return false; // Not seasonal or no seasonal data
  }
  
  const now = currentDate || new Date();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed, we want 1-12
  
  return !activity.seasonalMonths.includes(currentMonth);
}

function scoreLabel(score: number): 'perfect' | 'good' | 'fair' | 'okay' | 'indoor' {
  if (score >= 80) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 30) return 'okay';
  return 'indoor';
}

// Map UI labels to activityMessages categories
function toMessageCategory(label: string): 'perfect' | 'good' | 'fair' | 'poor' {
  switch (label) {
    case 'perfect': return 'perfect';
    case 'good': return 'good';
    case 'fair': return 'fair';
    case 'okay': return 'fair';   // treat “okay” as “fair”
    case 'indoor': return 'poor'; // treat indoor as “poor”
    default: return 'fair';
  }
}

/**
 * Convert a wind direction input (degrees, numeric string, or cardinal like 'NW')
 * to degrees in [0, 360).
 */
function cardinalToDegrees(card: unknown): number | undefined {
  if (card == null) return undefined;
  if (typeof card === 'number' && Number.isFinite(card)) return ((card % 360) + 360) % 360;
  if (typeof card === 'string') {
    const t = card.trim().toUpperCase();
    // If it's a numeric string, parse it
    const n = Number(t);
    if (!Number.isNaN(n)) return ((n % 360) + 360) % 360;

    // Map common cardinals (16-point compass) plus full words
    const map: Record<string, number> = {
      N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
      E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
      S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
      W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
      NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270
    };
    // Remove non-letters to be tolerant of 'N/W', 'NW ', etc.
    const key = t.replace(/[^A-Z]/g, '');
    if (map[key] !== undefined) return map[key];
  }
  return undefined;
}

/**
 * Best-effort extraction of wind direction in degrees from a day object.
 */
function extractWindDegrees(day: Partial<DayLike>): number | undefined {
  const candidates = [
    day?.wind_direction,
    day?.windDirection,
    day?.wind_dir,
    day?.windDeg,
    day?.winddeg,
    day?.wind_deg,
    day?.windDirectionDeg,
    day?.wind_direction_deg,
    day?.wind_direction_degrees,
    day?.windDirectionDegrees,
  ];
  for (const c of candidates) {
    const d = cardinalToDegrees(c as unknown);
    if (typeof d === 'number') return d;
  }
  // Sometimes nested
  const maybeNoon: unknown = (day as Record<string, unknown> | undefined)?.noon;
  if (maybeNoon && typeof maybeNoon === 'object' && 'wind_direction' in maybeNoon) {
    const d = cardinalToDegrees((maybeNoon as Record<string, unknown>).wind_direction);
    if (typeof d === 'number') return d;
  }
  return undefined;
}

type BuildPopupArgs = {
  activityId: string;
  day: DayLike;
  score: number;
  reasons?: Reason[]; // array
};

export function buildPopupActivityPayload({ activityId, day, score, reasons }: BuildPopupArgs) {
  const category = isOutdoor(activityId) ? 'outdoor' : 'indoor';

  // Determine an effective beach orientation for downstream messaging/scoring
  const lat = day?.lat ?? day?.latitude ?? day?.coords?.lat ?? null;
  const lon = day?.lon ?? day?.longitude ?? day?.coords?.lon ?? null;

  let effectiveBeachOrientation: number | undefined =
    typeof day?.beachOrientation === 'number' ? day.beachOrientation : undefined;

  if (effectiveBeachOrientation == null) {
    const cached = getOrientationFromCachedBeaches(lat, lon);
    if (typeof cached === 'number') effectiveBeachOrientation = cached;
  }

  // Final fallback: if still missing, try to infer from any stored coords
  if (effectiveBeachOrientation == null) {
    const approx = getApproximateCoords(day);
    if (approx) {
      const cached = getOrientationFromCachedBeaches(approx.lat, approx.lon);
      effectiveBeachOrientation =
        typeof cached === 'number' ? cached : computeSimulatedOrientation(approx.lat, approx.lon);
    }
  }

  if (effectiveBeachOrientation == null && typeof lat === 'number' && typeof lon === 'number') {
    // Fallback to simulated orientation so wind-relative messaging still works
    effectiveBeachOrientation = computeSimulatedOrientation(lat, lon);
  }

  // Copy day with orientation so buildReasons can use it
  const dayWithOrientation =
    typeof effectiveBeachOrientation === 'number'
      ? { ...day, beachOrientation: effectiveBeachOrientation }
      : day;

  // Weather summary used by Popup
  const weatherData = {
    date: dayWithOrientation?.date,
    temperature: dayWithOrientation?.temperature ?? dayWithOrientation?.temp ?? null,
    tempMax: dayWithOrientation?.tempMax ?? null,
    tempMin: dayWithOrientation?.tempMin ?? null,
    description: dayWithOrientation?.description ?? '',
    rain: dayWithOrientation?.rain ?? null,
    windSpeed: dayWithOrientation?.windSpeed ?? dayWithOrientation?.wind_speed ?? null,
    clouds: dayWithOrientation?.clouds ?? null,
    humidity: dayWithOrientation?.humidity ?? null,
    visibility: dayWithOrientation?.visibility ?? null,
    icon: dayWithOrientation?.icon ?? null,
  };

  // Marine summary used by Popup (safe optional fields)
  const marineData = {
    waveHeight: dayWithOrientation?.waveHeight ?? null,
    waterTemperature: dayWithOrientation?.waterTemperature ?? null,
    swellHeight: dayWithOrientation?.swellHeight ?? null,
    swellPeriod: dayWithOrientation?.swellPeriod ?? null,
    windSpeed: dayWithOrientation?.windSpeed ?? null,
    gustSpeed: dayWithOrientation?.gustSpeed ?? null,
    windDirection: dayWithOrientation?.windDirection ?? null,
    beachOrientation: dayWithOrientation?.beachOrientation ?? null,
  };

  const uiLabel = scoreLabel(score);
  const msgCategory = toMessageCategory(uiLabel);
  
  // Create reason objects from string reasons
  let reasonObjects: Reason[] = [];
  
  // Get reasons from buildReasons if not provided
  const reasonsArray = reasons || buildReasons(dayWithOrientation, activityId);
  
  // Convert strings to objects - Add defensive coding
  if (Array.isArray(reasonsArray)) {
    reasonObjects = reasonsArray
      .filter(reason => reason !== null && reason !== undefined)
      .map(reason => ({
        key: typeof reason === 'string' ? reason.toLowerCase().replace(/\s+/g, '_') : 'unknown',
        value: true,
        label: String(reason) // Ensure it's a string
      }));
  }

  const message = getActivityMessage
    ? getActivityMessage(activityId, msgCategory, reasonObjects)
    : '';

  return {
    activityId,
    category,
    message,
    marineData,
    weatherData,
    score,
  };
}

// Add this function to get wind directions for the day
function getWindDirectionsForDay(day: Partial<DayLike>): number[] {
  const out: number[] = [];
  if (day?.hourly && Array.isArray(day.hourly)) {
    for (const hour of day.hourly) {
      const h = hour as Record<string, unknown>;
      const cand =
        h?.wind_direction ??
        h?.windDirection ??
        h?.wind_dir ??
        h?.windDeg ??
        h?.winddeg ??
        h?.wind_deg;
      const deg = cardinalToDegrees(cand as unknown);
      if (typeof deg === 'number') out.push(deg);
    }
  }

  // Fallback to single value if no hourly list is available
  if (out.length === 0) {
    const single = extractWindDegrees(day);
    if (typeof single === 'number') return [single];
  }
  return out;
}

// Compute a circular mean of degree values (handles 0/360 wrap)
function circularMeanDeg(values: number[]): number | undefined {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  let x = 0;
  let y = 0;
  for (const deg of values) {
    const r = (deg * Math.PI) / 180;
    x += Math.cos(r);
    y += Math.sin(r);
  }
  if (x === 0 && y === 0) return values[0];
  const rad = Math.atan2(y, x);
  const meanDeg = ((rad * 180) / Math.PI + 360) % 360;
  return meanDeg;
}

// Pick a representative wind direction for the day: explicit value if present,
// otherwise a circular mean of hourly values
function representativeWindDir(day: Partial<DayLike>): number | undefined {
  const explicit = extractWindDegrees(day);
  if (typeof explicit === 'number') return explicit;
  const list = getWindDirectionsForDay(day);
  return circularMeanDeg(list);
}

// Then fix your buildReasons function
// 1. First, modify buildReasons to return an array of strings instead of a combined string
export function buildReasons(day: DayLike, activityId: string) {
  // Debug to see what's actually in the day object
  console.log('Day data in buildReasons:', day);
  
  const reasons: string[] = [];
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId); // Define this

  // Normalize wind direction & beach orientation fields from various shapes
  const windDirDeg: number | undefined = extractWindDegrees(day);
  const repWindDeg: number | undefined = representativeWindDir(day);

  let beachOrientationVal: number | undefined =
    typeof day?.beachOrientation === 'number'
      ? day.beachOrientation
      : (typeof day?.beach_orientation === 'number'
          ? day.beach_orientation
          : undefined);

  // Fallback: try to recover from cached beaches or simulated orientation using approximate coords
  if (beachOrientationVal == null) {
    const approx = getApproximateCoords(day);
    if (approx) {
      const cached = getOrientationFromCachedBeaches(approx.lat, approx.lon);
      beachOrientationVal =
        typeof cached === 'number' ? cached : computeSimulatedOrientation(approx.lat, approx.lon);
    }
  }
  
  // Add standard weather reasons with better null handling
  if (day.wind_speed !== undefined) {
    console.log(`Trying to get wind message for speed: ${day.wind_speed}`);
    console.log(`Also available - windSpeed: ${day.windSpeed}`);
    console.log(`Day object keys:`, Object.keys(day as Record<string, unknown>).filter(k => k.toLowerCase().includes('wind')));
    
    // For marine activities, prefer windSpeed (marine data in m/s) over wind_speed (weather data)
    const effectiveWindSpeed = isMarineActivity && typeof day.windSpeed === 'number' 
      ? day.windSpeed 
      : day.wind_speed ?? null;
    
    console.log(`Using effective wind speed: ${effectiveWindSpeed} (marine: ${isMarineActivity})`);
    
    let windMessage = getWindMessage({
      windSpeed: effectiveWindSpeed ?? undefined,
      gustSpeed: day.wind_gust ?? undefined,
      windDirection: repWindDeg,
      windDirectionsToday: getWindDirectionsForDay(day),
      beachOrientation: beachOrientationVal,
      context: isMarineActivity ? 'marine' : 'land',
    });
    // If this is a marine activity and we have both a representative wind direction and a beach orientation,
    // append an orientation note to the wind message: (offshore), (onshore), or (cross-shore).
    if (isMarineActivity && typeof repWindDeg === 'number' && typeof beachOrientationVal === 'number') {
      try {
        const rel = classifyWindRelative(beachOrientationVal, repWindDeg);
        const relToNote: Record<string, 'offshore' | 'onshore' | 'cross-shore'> = {
          'onshore': 'onshore',
          'side-onshore': 'onshore',
          'cross-shore': 'cross-shore',
          'side-offshore': 'offshore',
          'offshore': 'offshore',
        };
        const note = relToNote[rel];
        if (note && windMessage) {
          const orientationRegex = /\((onshore|offshore|cross-shore)\)$/i;
          const existing = windMessage.match(orientationRegex);
          if (existing) {
            const current = existing[1].toLowerCase();
            if (current !== note) {
              windMessage = windMessage.replace(orientationRegex, `(${note})`);
            }
          } else {
            windMessage = `${windMessage} (${note})`;
          }
          console.log('➕ Appended orientation note to wind message:', { repWindDeg, beachOrientation: beachOrientationVal, rel, note });
        } else {
          console.log('ℹ️ No orientation note (unmapped rel):', { repWindDeg, beachOrientation: beachOrientationVal, rel });
        }
      } catch (e) {
        console.warn('Orientation suffix failed:', e);
      }
    } else {
      console.log('ℹ️ Orientation note skipped (missing data):', { isMarineActivity, repWindDeg, beachOrientationVal });
    }
    console.log(`Wind message result: ${windMessage}`);
    
    if (windMessage) { // Changed from windMsg to windMessage
      reasons.push(windMessage);
    } else {
      // Fallback to beaufort description if available
      let beaufortDescription: string | undefined;
      if (typeof day.wind_speed === 'number') {
        beaufortDescription = getBeaufortDescription(day.wind_speed);
      } else if (typeof day.windSpeed === 'number') {
        beaufortDescription = getBeaufortDescription(day.windSpeed);
      }
      if (beaufortDescription) {
        reasons.push(beaufortDescription);
      } else {
        // Ultimate fallback with raw wind speed, if any
        const raw = typeof day.wind_speed === 'number' ? day.wind_speed : (typeof day.windSpeed === 'number' ? day.windSpeed : null);
        reasons.push(raw != null ? `Wind speed: ${raw} m/s` : 'Wind details unavailable');
      }
    }

    // ➕ High-severity wind recommendation (activity-specific)
    if (typeof effectiveWindSpeed === 'number') {
      try {
        const rec = getWindActivityRecommendation(activityId, effectiveWindSpeed);
        const highSeverity = new Set(['dangerous','unsafe','unplayable','impossible','impractical','difficult']);
        if (highSeverity.has(rec.level)) {
          reasons.push(`${rec.emoji ?? ''} ${rec.message}`.trim());
        }
      } catch (e) {
        console.warn('Wind recommendation lookup failed:', e);
      }
    }
  }

  // Wind relative to beach orientation (only for marine activities when provided)
  if (
    MARINE_ACTIVITY_IDS.includes(activityId) &&
    typeof windDirDeg === 'number' &&
    typeof beachOrientationVal === 'number'
  ) {
    try {
      const rel = classifyWindRelative(beachOrientationVal, windDirDeg);
      const relLabelMap: Record<string, string> = {
  'onshore':      'Onshore wind today—it stirs up the sea, making all waves feel a bit bouncy and unpredictable.',
  'side-onshore': 'Side-onshore wind adds a playful wobble and sideways motion to any waves rolling in.',
  'cross-shore':  'Cross-shore wind gives the water a sideways rush—waves might race or drift along the beach.',
  'side-offshore':'Side-offshore wind smooths things out, tilting waves at an angle for a neat, groomed look.',
  'offshore':     'Offshore wind is the wave artist! No matter the size, waves stand up tall and tidy before breaking.',
      };
      // Suppressed verbose wind reason to avoid duplication with wind blurb orientation.
      console.debug('📝 Suppressed long wind reason:', relLabelMap[rel] || `Wind is ${rel} vs beach`);
    } catch (e) {
      console.warn('Relative wind classification failed:', e);
    }
  }
  
  if (day.rain !== undefined) {
    const rainMsg = getRainfallDescription(day.rain ?? 0);
    if (rainMsg) reasons.push(rainMsg);
  }
  
  if (day.temperature !== undefined) {
    const tempMsg = getTemperatureDescription(day.temperature ?? 0);
    if (tempMsg) reasons.push(tempMsg);
  }
  
  if (day.humidity !== undefined) {
    const humidityMsg = getHumidityDescription(day.humidity ?? 0);
    if (humidityMsg) reasons.push(humidityMsg);
  }

    // ➕ Add heat stress risk warning
  const heatRisk = getHeatStressRisk(day.temperature ?? null, day.humidity ?? null, activityId);
  if (heatRisk) reasons.push(heatRisk);
  
  if (day.visibility !== undefined) {
    reasons.push(`${(day.visibility ?? 0) >= 8000 ? 'Excellent' : 'Reduced'} visibility`);
  }
  
  // Add marine-specific reasons for marine activities
  if (MARINE_ACTIVITY_IDS.includes(activityId)) {
    console.log('Processing marine activity:', activityId);
    console.log('Marine data available:', {
      waterTemp: day.waterTemperature,
      waveHeight: day.waveHeight,
      swellPeriod: day.swellPeriod
    });

    // Contextual safety/hard-warning reasons for marine activities
    const windSpeed = day.wind_speed ?? day.windSpeed ?? undefined;
    const gustSpeed = day.wind_gust ?? day.gustSpeed ?? undefined;
    const waveHeight = day.waveHeight ?? undefined;
    // removed unused const swellPeriod

    let windRelative: string | undefined;
    try {
      if (typeof repWindDeg === 'number' && typeof beachOrientationVal === 'number') {
        windRelative = classifyWindRelative(beachOrientationVal, repWindDeg);
      }
    } catch { /* ignore */ }

    // Activity-specific rules with practical advice
    switch (activityId) {
      case 'sea_swimming':
      case 'sup_sea':
      case 'sea_kayaking': {
        // Offshore can carry paddlers/swimmers out to sea
        if (windRelative === 'offshore' && typeof windSpeed === 'number' && windSpeed > 6) {
          reasons.push('Strong offshore wind - stay close to shore or choose sheltered location');
        }
        // Strong lateral drift
        if (windRelative === 'cross-shore' && typeof windSpeed === 'number' && windSpeed > 8) {
          reasons.push('Strong cross-shore wind will push you sideways - plan accordingly');
        }
        // Dumping shorebreak hazard
        if (typeof waveHeight === 'number' && waveHeight > 1.2 && (windRelative === 'onshore' || windRelative === 'side-onshore')) {
          reasons.push('Large waves + onshore wind creates dangerous shore break');
        }
        break;
      }
      case 'surfing': {
        if (typeof day.waveHeight === 'number' && day.waveHeight > 2.5) {
          reasons.push('Large surf conditions - experienced surfers only');
        } else if (typeof day.waveHeight === 'number' && day.waveHeight < 0.3) {
          reasons.push('Very small waves - may not be worth the paddle out');
        }
        // Wind quality for surfing
        if (windRelative === 'offshore' && typeof windSpeed === 'number' && windSpeed >= 3 && windSpeed <= 8) {
          reasons.push('Offshore wind creating clean wave conditions');
        } else if (windRelative === 'onshore' && typeof windSpeed === 'number' && windSpeed > 10) {
          reasons.push('Strong onshore wind making waves messy and difficult');
        }
        break;
      }
    }

    // Practical safety warnings for all marine activities
    if (typeof windSpeed === 'number' && windSpeed > 15) {
      reasons.push('Very strong wind conditions - dangerous for most water activities');
    } else if (typeof windSpeed === 'number' && windSpeed > 12) {
      reasons.push('Strong wind - only for experienced water users');
    }
    
    if (typeof gustSpeed === 'number' && gustSpeed > 15) {
      reasons.push('Strong wind gusts make boat/board control difficult');
    }
    
    const precip = day.precipitation ?? day.rain;
    if (typeof precip === 'number' && precip > 5) {
      reasons.push('Heavy rain reduces visibility and comfort on water');
    }
    
    if (typeof day.visibility === 'number' && day.visibility < 2000) {
      reasons.push('Poor visibility - difficult to spot other boats and hazards');
    }

    // Sea-swimming specific safety advice
    if (activityId === 'sea_swimming' && typeof day.waterTemperature === 'number') {
      if (day.waterTemperature < 10) {
        reasons.push('Very cold water - wetsuit, boots, gloves essential - cold shock risk');
      } else if (day.waterTemperature < 15) {
        reasons.push('Cold water - wetsuit recommended, limit swim time');
      } else if (day.waterTemperature >= 18) {
        reasons.push('Comfortable water temperature for swimming');
      }
    }
    
    // Water temperature for all marine activities
    if (day.waterTemperature !== undefined && day.waterTemperature !== null) {
      let waterTempMsg;
      
      if (day.waterTemperature < 8) {
        waterTempMsg = "Extremely cold water - serious hypothermia risk";
      } else if (day.waterTemperature < 12) {
        waterTempMsg = "Very cold water - full wetsuit essential";
      } else if (day.waterTemperature < 16) {
        waterTempMsg = "Cold water - wetsuit recommended";
      } else if (day.waterTemperature < 20) {
        waterTempMsg = "Cool but manageable water temperature";
      } else if (day.waterTemperature < 24) {
        waterTempMsg = "Pleasant water temperature";
      } else {
        waterTempMsg = "Warm, comfortable water";
      }
      
      console.log('Adding water temp reason:', waterTempMsg);
      reasons.push(waterTempMsg);
    }
    
    // Wave height
    if (day.waveHeight !== undefined && day.waveHeight !== null) {
      let waveMsg;
      
      if (day.waveHeight < 0.3) {
        waveMsg = "Minimal waves";
      } else if (day.waveHeight < 0.8) {
        waveMsg = `Small waves around ${day.waveHeight.toFixed(1)}m`;
      } else if (day.waveHeight < 1.5) {
        waveMsg = `Decent waves at ${day.waveHeight.toFixed(1)}m`;
      } else if (day.waveHeight < 2.5) {
        // Threshold adjusted: classify 1.5m+ as 'Large waves'
        waveMsg = `Large waves at ${day.waveHeight.toFixed(1)}m`;
      } else {
        waveMsg = `Large waves at ${day.waveHeight.toFixed(1)}m - for experienced only`;
      }
      
      reasons.push(waveMsg);

      // Add an explicit rough seas warning for very large waves across all marine activities
      if (day.waveHeight >= 2.5) {
        reasons.push('Rough seas — dangerous for small craft and swimmers');
      }
    }
    
    // Swell period
    if (day.swellPeriod !== undefined && day.swellPeriod !== null) {
      let swellMsg;
      
      if (day.swellPeriod < 6) {
        swellMsg = "Short chop, less power";
      } else if (day.swellPeriod < 10) {
        swellMsg = `Medium period swell at ${day.swellPeriod.toFixed(0)}s`;
      } else {
        swellMsg = `Long period swell at ${day.swellPeriod.toFixed(0)}s - good power`;
      }
      
      reasons.push(swellMsg);
    }
  }
  
  // Add activity-specific reasons based on conditions
  addActivitySpecificReasons(day, activityId, reasons);

  // ➕ Soil moisture / mud sensitivity
  if (typeof day.soilMoisture === 'number' && isMudSensitive(activityId)) {
    try {
      const soil = assessSoilCondition(day.soilMoisture);
      const mudMsg = getMudMessage(activityId, soil);
      if (mudMsg) reasons.push(mudMsg);
    } catch (e) {
      console.warn('Soil moisture processing failed:', e);
    }
  }
  
  // ➕ Air quality context for outdoor activities
  try {
    const isOutdoors = isOutdoor(activityId);
    const hasAQ = day && typeof (day as Record<string, unknown>)?.airQuality === 'object';
    if (isOutdoors && hasAQ) {
      const aqSummary = (day as Record<string, unknown>).airQuality as AirQualitySummary;
      const assessment = assessAirQualityConditions(aqSummary);
      // Respect exclusion helper (indoor/irrelevant)
      if (!shouldExcludeForAirQuality(assessment, activityId)) {
        if (assessment.overall >= AirQualityLevel.MODERATE) {
          if (assessment.overall === AirQualityLevel.MODERATE) {
            reasons.push('Air quality is moderate — sensitive people may want to limit strenuous outdoor activity');
          } else {
            const advice = buildAirQualityAdvice(assessment);
            if (Array.isArray(advice) && advice.length) reasons.push(...advice);
            // Add the most relevant pollutant/overall warning as an extra hint
            if (assessment.warnings && assessment.warnings.length) {
              reasons.push(assessment.warnings[0]);
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Air quality reasoning failed:', e);
  }
  
  // Filter out empty strings, null, undefined
  const validReasons = reasons.filter(r => r && r.trim() !== '');
  console.log('Valid reasons after filtering:', validReasons);
  
  return validReasons.length > 0 ? validReasons : getDefaultReasonForActivity(activityId);
}

// Track hero activities already used for selection
const usedHeroActivities = new Set<string>();

export function findHeroActivity(
  perfectList: Array<{ activityId: string }> ,
  goodList: Array<{ activityId: string }> ,
  allowRepeats: boolean = false
) {
  // Try unused perfect activities first
  const perfectCandidate = Array.isArray(perfectList) && perfectList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (perfectCandidate) {
    usedHeroActivities.add(perfectCandidate.activityId);
    return perfectCandidate;
  }

  // Try unused good activities next
  const goodCandidate = Array.isArray(goodList) && goodList.find(
    (a) => !usedHeroActivities.has(a.activityId)
  );
  if (goodCandidate) {
    usedHeroActivities.add(goodCandidate.activityId);
    return goodCandidate;
  }

  // If repeats are allowed, pick the top of the list
  if (allowRepeats) {
    return (Array.isArray(perfectList) && perfectList[0]) || (Array.isArray(goodList) && goodList[0]) || null;
  }

  // Nothing found
    return null;
  }

/**
 * Evaluate heat stress risk based on temperature and humidity.
 * Returns a warning level string or null if conditions are safe.
 */
export function getHeatStressRisk(
  tempC: number | undefined | null,
  humidity: number | undefined | null,
  activityId?: string
): string | null {
  if (typeof tempC !== 'number' || typeof humidity !== 'number') return null;

const heatSensitiveActivities = new Set([
  // Team field sports
  'football_soccer',
  'rugby',
  'basketball_outdoor',
  'cricket',
  'american_football',
  'hurling_camogie',
  'gaelic_football',
  'hockey',
  'netball',
  'baseball',

  // Individual court sports (outdoor)
  'tennis',
  'padel',
  'pickleball',

  // Strenuous outdoor exercise
  'running',
  'trail_running',
  'cycling',
  'mountain_biking',
  'road_cycling',
  'ultimate_frisbee',

  // Other outdoor active recreation
  'outdoor_gym',
  'rollerblading',
  'skateboarding'
]);

  if (activityId && !heatSensitiveActivities.has(activityId)) return null;

  // Improved heat index calculation (closer to actual heat index formula)
  const heatIndex = tempC + (0.33 * (humidity / 100 * 6.105 * Math.exp(17.27 * tempC / (237.7 + tempC)))) - 0.7;

  if (heatIndex >= 54) {
    return '☠️ Extreme heat danger - avoid all strenuous outdoor activity';
  } else if (heatIndex >= 46) {
    return '🔥 High heat risk - take frequent breaks, stay hydrated, watch for heat exhaustion signs';
  } else if (heatIndex >= 38) {
    return '⚠️ Moderate heat stress - take regular breaks and drink plenty of water';
  } else if (heatIndex >= 32) {
    return 'Warm conditions - stay hydrated and avoid peak sun hours';
  }

  return null;
}

/*
 * Wind Speed Reference (m/s to knots):
 * 5 m/s  ≈ 9.7 knots  - Fresh breeze
 * 8 m/s  ≈ 15.6 knots - Moderate breeze
 * 10 m/s ≈ 19.4 knots - Strong breeze
 * 15 m/s ≈ 29.2 knots - Near gale
 * 20 m/s ≈ 38.9 knots - Gale
 */

/**
 * Add activity-specific reasoning based on weather conditions
 */
function addActivitySpecificReasons(day: DayLike, activityId: string, reasons: string[]) {
  const temp = day.temperature ?? null;
  const windSpeed = (day.wind_speed ?? day.windSpeed) ?? 0;
  const rain = (day.rain ?? day.precipitation) ?? 0;
  const humidity = day.humidity ?? null;
  const clouds = day.clouds ?? null;

  switch (activityId) {
case 'basketball_outdoor':
  if (rain > 0) {
    reasons.push("🌧️ Rain on the blacktop — game’s called till it dries up");
  } else if (windSpeed > 8) {
    reasons.push("💨 Wind’s got the ball drifting — outside shots get tricky");
  } else if (temp && temp > 30) {
    reasons.push("🥵 Court’s hot — hydrate or you’ll be cooked out here");
  } else if (temp && temp < 10) {
    reasons.push("🧥 Too cold for smooth handles — stiff fingers, brick city");
  } else if (clouds !== null && clouds >= 20 && clouds <= 70) {
    reasons.push("⛅ Chill vibe — shade on deck, game goes on");
  } else {
    reasons.push("🏀");
  }
  break;

case 'football_soccer':
  if (rain > 5) {
    reasons.push("🌧️ Chucking it down — pitch like a mud bath, studs only");
  } else if (rain > 0) {
    reasons.push("☔ Bit of drizzle — slippery ball, watch those dodgy tackles");
  } else if (windSpeed > 10) {
    reasons.push("💨 Windy — long balls could end up in Row Z");
  } else if (temp && temp > 32) {
    reasons.push("🥵 Scorching — water breaks every five minutes please");
  } else if (temp && temp < 0) {
    reasons.push("❄️ Frozen pitch — ball will sting like a cannon shot");
  } else {
    reasons.push('');
  }
  break;

    case 'tennis':
      if (rain > 0) {
        reasons.push('Rain makes courts slippery and dangerous');
      } else if (windSpeed > 6) {
        reasons.push('Wind will affect ball trajectory and serve');
      } else if (temp && temp > 35) {
        reasons.push('Very hot conditions - heat exhaustion risk');
      } else if (typeof clouds === 'number' && clouds > 80) {
        reasons.push('Overcast but good for avoiding sun glare');
      } else {
        reasons.push('');
      }
      break;

    case 'running':
      if (temp && temp > 28 && humidity && humidity > 70) {
        reasons.push('Hot and humid - high risk of overheating');
      } else if (temp && temp < -5) {
        reasons.push('Very cold - risk of slipping on ice');
      } else if (rain > 10) {
        reasons.push('Heavy rain makes running unpleasant and risky');
      } else if (windSpeed > 12) {
        reasons.push('Strong headwind will make running much harder');
      } else if (temp && temp >= 15 && temp <= 20) {
        reasons.push('Perfect running temperature');
      } else {
        reasons.push('');
      }
      break;

    case 'cycling':
    case 'road_cycling':
      if (rain > 2) {
        reasons.push('Wet roads increase crash risk significantly');
      } else if (rain > 1) {
        reasons.push('Roads are damp; braking distance increases — ride cautiously');
      } else if (windSpeed > 15) {
        reasons.push('Very strong wind makes cycling exhausting');
      } else if (windSpeed > 8) {
        reasons.push('Moderate wind will slow progress');
      } else if (temp && temp < 0) {
        reasons.push('Freezing conditions - risk of ice on roads');
      } else if (temp && temp > 35) {
        reasons.push('Very hot - increased dehydration risk');
      } else {
        reasons.push('');
      }
      break;

    case 'golf':
      if (rain > 0) {
        reasons.push('Rain affects ball flight and green conditions');
      } else if (windSpeed > 10) {
        reasons.push('Strong wind will significantly affect ball flight');
      } else if (windSpeed > 5) {
        reasons.push('Select your clubs carefully to take windy conditions into account');
      } else if (temp && temp < 5) {
        reasons.push('Cold affects ball compression and distance');
      } else if (typeof clouds === 'number' && clouds < 30) {
        reasons.push('Clear skies ideal for reading greens');
      } else {
        reasons.push('');
      }
      break;

    case 'hiking':
      if (rain > 5) {
        reasons.push('Heavy rain makes trails muddy and slippery');
      } else if (windSpeed > 15) {
        reasons.push('Very strong wind makes hiking difficult');
      } else if (temp && temp < -5) {
        reasons.push('Very cold - hypothermia risk on longer hikes');
      } else if (temp && temp > 30) {
        reasons.push('Hot conditions - carry extra water');
      } else if (typeof day.visibility === 'number' && day.visibility < 1000) {
        reasons.push('Poor visibility makes navigation difficult');
      } else {
        reasons.push('');
      }
      break;

case 'picnicking':
  if (rain > 0) {
    reasons.push("🌧️ Rain showers — tricky to keep the sandwiches dry");
  } else if (windSpeed > 8) {
    reasons.push("💨 Gusty winds — napkins on the run, hold your plates!");
  } else if (temp && temp > 30) {
    reasons.push("🥵 Hot weather — shade up and keep food cool");
  } else if (temp && temp < 10) {
    reasons.push("🧣 A bit chilly — better for a flask than a picnic spread");
  } else if (clouds !== null && clouds >= 20 && clouds <= 70) {
    reasons.push("⛅ Pleasant mix of sun and cloud — comfy for a picnic");
  } else {
    reasons.push('');
  }
  break;

case 'beach':
  if (rain > 5) {
    reasons.push("🌧️ Heavy rain — not a day for sandcastles");
  } else if (rain > 2) {
    reasons.push("🌦️ Showery skies — beach fun will be on and off");
  } else if (rain > 0 && rain <= 2) {
    reasons.push("🌂 A few drops — might pause the sandcastle building");
  } else if (windSpeed > 12) {
    reasons.push("💨 Super windy — expect sand in your sandwiches");
  } else if (windSpeed > 6) {
    reasons.push("🍃 Breezy beach — kites will love it");
  } else if (temp && temp > 35) {
    reasons.push("🥵 Scorching — hats, shade, and ice creams essential");
  } else if (temp && temp < 18) {
    reasons.push("🧥 Chilly for swimsuits — paddling may be enough");
  } else if (typeof clouds === 'number' && clouds < 50) {
    reasons.push("☀️ Sunny skies — perfect for a family beach day");
  } else {
    reasons.push('');
  }
  break;

    case 'gardening':
    case 'outdoor_gardening':
      if (rain > 5) {
        reasons.push('Heavy rain makes soil too muddy to work');
      } else if (rain > 0 && rain <= 2) {
        reasons.push('Light rain is actually good for watering');
      } else if (windSpeed > 10) {
        reasons.push('Strong wind makes it hard to work with plants');
      } else if (temp && temp > 30) {
        reasons.push('Very hot - risk of heat exhaustion outdoors');
      } else if (temp && temp < 0) {
        reasons.push('Freezing - soil too hard to work with');
      } else if (temp && temp >= 15 && temp <= 25) {
        reasons.push('Perfect temperature for gardening');
      } else {
        reasons.push('');
      }
      break;

    case 'photography':
      if (rain > 2) {
        reasons.push('Heavy rain damages equipment and limits shots');
      } else if (typeof clouds === 'number' && clouds >= 70 && clouds <= 90) {
        reasons.push('Overcast provides perfect diffused lighting');
      } else if (typeof clouds === 'number' && clouds < 30) {
        reasons.push('Clear skies great for landscape shots');
      } else if (windSpeed > 8) {
        reasons.push('Wind makes it hard to keep camera steady');
      } else if (typeof day.visibility === 'number' && day.visibility > 10000) {
        reasons.push('Excellent visibility for distant subjects');
      } else {
        reasons.push('Whatver the weather, grab your camera');
      }
      break;

default:
  // Generic outdoor activity reasoning (Go Daisy style 🌼)
  if (rain > 5) {
    reasons.push("🌧️ Bucketing down — most outdoor plans will be a wash-out");
  } else if (windSpeed > 15) {
    reasons.push("💨 Very blustery — tough going outdoors today");
  } else if (temp && temp > 35) {
    reasons.push("🥵 Scorching heat — take it easy, shade and water essential");
  } else if (temp && temp < -5) {
    reasons.push("🥶 Bitterly cold — layers and short stints outside only");
  } else {
    reasons.push('');
  }

      // Add snow awareness for outdoor activities when data is available (exclude marine/watersports)
      if (
        isOutdoor(activityId) && !MARINE_ACTIVITY_IDS.includes(activityId) && (
          (typeof day.snowDepthCm === 'number' && day.snowDepthCm > 0) ||
          (typeof day.snowfallRateMmH === 'number' && day.snowfallRateMmH > 0)
        )
      ) {
        const sd = typeof day.snowDepthCm === 'number' ? day.snowDepthCm : 0;
        const sr = typeof day.snowfallRateMmH === 'number' ? day.snowfallRateMmH : 0;
        const desc = getSnowDescription(sd, sr);
        reasons.push(`${desc} — keep warm and take care on icy surfaces`);
      }
  }

  // ➕ Add pollen-related reasons for outdoor activities (after switch(activityId))
  if (isOutdoor(activityId) && day.pollen) {
    try {
      console.log('🌸 Processing pollen for activity:', activityId, 'Pollen data:', day.pollen);
      const pollenAssessment = assessPollenConditions(day.pollen);
      console.log('🌸 Pollen assessment:', pollenAssessment);
      
      // Only add warnings if overall pollen level is moderate or higher
      if (pollenAssessment.overall >= 2) { // PollenLevel.MODERATE = 2
        const pollenAdvice = getPollenAdviceForActivity(activityId, pollenAssessment);
        console.log('🌸 Pollen advice:', pollenAdvice);

        if (pollenAdvice) {
          reasons.push(pollenAdvice);
        }

        // Add general pollen warnings for high levels only
        if (pollenAssessment.overall >= 3) { // PollenLevel.HIGH = 3
          const timingAdvice = getPollenTimingAdvice(pollenAssessment.overall);
          if (timingAdvice) {
            reasons.push(timingAdvice);
          }
        }
      } else {
        console.log('🌸 Pollen levels too low for warnings, skipping');
      }
    } catch (e) {
      console.warn('Pollen assessment error:', e);
    }
  }
}

/**
 * Get a default reason when no specific weather conditions apply
 */
function getDefaultReasonForActivity(activityId: string): string[] {
  const activity = activityTypes.find(a => a.id === activityId);
  const activityName = activity?.name || activityId.replace(/_/g, ' ');
  
// Activity-specific defaults (neutral Go Daisy style 🌼)
const defaults: Record<string, string> = {
  basketball_outdoor: "🏀 Courts are playable — fine for a game",
  football_soccer:   "⚽ Pitch is usable — good enough for a match",
  tennis:            "🎾 Courts are serviceable — playable conditions",
  running:           "👟 Conditions are steady — suitable for a run",
  cycling:           "🚴 Roads are passable — okay for cycling",
  golf:              "⛳ Course is open — playable today",
  hiking:            "🥾 Trails are accessible — fair for a walk",
  picnicking:        "🧺 Decent day for an outdoor bite",
  beach:             "🏖️ Beach is fine — not perfect, not poor",
  gardening:         "🌱 Conditions are workable — garden tasks possible",
  photography:       "📸 Lighting is adequate — fine for a few shots",
};

  return [defaults[activityId] || `Conditions are suitable for ${activityName.toLowerCase()}`];
}