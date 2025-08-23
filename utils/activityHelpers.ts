import {
  getBeaufortDescription,
  getRainfallDescription,
  getTemperatureDescription,
  getHumidityDescription,
  getWaveDescription,
  getWaterTemperatureDescription,
  getWindMessage,
  getVisibilityDescription,
} from './weatherLabels';
import { activityTypes } from '../data/activityTypes';
import { getActivityMessage } from '../data/activityMessages';
import { classifyWindRelative, computeSimulatedOrientation } from '../utils/orientation';
import { assessPollenConditions, getPollenAdviceForActivity, getPollenTimingAdvice } from './pollenUtils';

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

    let best: any = null;
    let bestDist = Infinity;
    for (const b of list) {
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

function tryExtractCoords(obj: any): Coords | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  // common shapes
  const candidates: any[] = [
    obj,
    obj.coords,
    obj.location,
    obj.center,
  ];
  for (const c of candidates) {
    const lat = typeof c?.lat === 'number' ? c.lat : (typeof c?.latitude === 'number' ? c.latitude : undefined);
    const lon = typeof c?.lon === 'number' ? c.lon : (typeof c?.lng === 'number' ? c.lng : (typeof c?.longitude === 'number' ? c.longitude : undefined));
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
  }
  return undefined;
}

function getApproximateCoords(day?: any): Coords | undefined {
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
function cardinalToDegrees(card: any): number | undefined {
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
function extractWindDegrees(day: any): number | undefined {
  const candidates = [
    day?.wind_direction,
    day?.windDirection,
    day?.wind_dir,
    day?.windDeg,
    day?.winddeg,
    (day as any)?.wind_deg,
    day?.windDirectionDeg,
    day?.wind_direction_deg,
    day?.wind_direction_degrees,
    day?.windDirectionDegrees,
  ];
  for (const c of candidates) {
    const d = cardinalToDegrees(c);
    if (typeof d === 'number') return d;
  }
  // Sometimes nested
  if (day?.noon?.wind_direction !== undefined) {
    const d = cardinalToDegrees(day.noon.wind_direction);
    if (typeof d === 'number') return d;
  }
  return undefined;
}

type BuildPopupArgs = {
  activityId: string;
  day: any;
  score: number;
  reasons?: { key: string; value: any; label: string }[]; // array
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
  let reasonObjects: { key: string; value: any; label: string }[] = [];
  
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
function getWindDirectionsForDay(day: any): number[] {
  const out: number[] = [];
  if (day?.hourly && Array.isArray(day.hourly)) {
    for (const hour of day.hourly) {
      const cand =
        hour?.wind_direction ??
        hour?.windDirection ??
        hour?.wind_dir ??
        hour?.windDeg ??
        hour?.winddeg ??
        (hour as any)?.wind_deg;
      const deg = cardinalToDegrees(cand);
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
function representativeWindDir(day: any): number | undefined {
  const explicit = extractWindDegrees(day);
  if (typeof explicit === 'number') return explicit;
  const list = getWindDirectionsForDay(day);
  return circularMeanDeg(list);
}

// Then fix your buildReasons function
// 1. First, modify buildReasons to return an array of strings instead of a combined string
export function buildReasons(day: any, activityId: string) {
  // Debug to see what's actually in the day object
  console.log('Day data in buildReasons:', day);
  
  const reasons: string[] = [];
  const isMarineActivity = MARINE_ACTIVITY_IDS.includes(activityId); // Define this

  // Normalize wind direction & beach orientation fields from various shapes
  const windDirDeg: number | undefined = extractWindDegrees(day);
  const repWindDeg: number | undefined = representativeWindDir(day);

  let beachOrientationVal: any =
    typeof day?.beachOrientation === 'number'
      ? day.beachOrientation
      : (typeof (day as any)?.beach_orientation === 'number'
          ? (day as any).beach_orientation
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
    console.log(`Day object keys:`, Object.keys(day).filter(k => k.toLowerCase().includes('wind')));
    
    // For marine activities, prefer windSpeed (marine data in m/s) over wind_speed (weather data)
    const effectiveWindSpeed = isMarineActivity && typeof day.windSpeed === 'number' 
      ? day.windSpeed 
      : day.wind_speed;
    
    console.log(`Using effective wind speed: ${effectiveWindSpeed} (marine: ${isMarineActivity})`);
    
    let windMessage = getWindMessage({
      windSpeed: effectiveWindSpeed,
      gustSpeed: day.wind_gust,
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
        if (note) {
          windMessage = `${windMessage} (${note})`;
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
      const beaufortDescription = getBeaufortDescription(day.wind_speed);
      if (beaufortDescription) {
        reasons.push(beaufortDescription);
      } else {
        // Ultimate fallback with raw wind speed
        reasons.push(`Wind speed: ${day.wind_speed} m/s`);
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
    const rainMsg = getRainfallDescription(day.rain);
    if (rainMsg) reasons.push(rainMsg);
  }
  
  if (day.temperature !== undefined) {
    const tempMsg = getTemperatureDescription(day.temperature);
    if (tempMsg) reasons.push(tempMsg);
  }
  
  if (day.humidity !== undefined) {
    const humidityMsg = getHumidityDescription(day.humidity);
    if (humidityMsg) reasons.push(humidityMsg);
  }

    // ➕ Add heat stress risk warning
  const heatRisk = getHeatStressRisk(day.temperature, day.humidity, activityId);
  if (heatRisk) reasons.push(heatRisk);
  
  if (day.visibility !== undefined) {
    reasons.push(`${day.visibility >= 8000 ? 'Excellent' : 'Reduced'} visibility${day.visibility >= 8000 ? '' : ''}`);
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
    const swellPeriod = day.swellPeriod ?? undefined;

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
        if (typeof waveHeight === 'number' && waveHeight > 2.5) {
          reasons.push('Large surf conditions - experienced surfers only');
        } else if (typeof waveHeight === 'number' && waveHeight < 0.3) {
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
        waveMsg = `Good sized waves at ${day.waveHeight.toFixed(1)}m`;
      } else {
        waveMsg = `Large waves at ${day.waveHeight.toFixed(1)}m - for experienced only`;
      }
      
      reasons.push(waveMsg);
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
  
  // Filter out empty strings, null, undefined
  const validReasons = reasons.filter(r => r && r.trim() !== '');
  console.log('Valid reasons after filtering:', validReasons);
  
  return validReasons.length > 0 ? validReasons : getDefaultReasonForActivity(activityId);
}

export function findHeroActivity(
  perfectList: any[],
  goodList: any[],
  usedHeroActivities: Set<string>,
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
  return "Extreme heat danger — stay indoors and postpone outdoor exercise.";
} else if (heatIndex >= 46) {
  return "Very high heat risk — seek shade often, sip water regularly, watch for dizziness or nausea.";
} else if (heatIndex >= 38) {
  return "Heat stress likely — slow the pace, rest frequently, and keep drinking water/electrolytes.";
} else if (heatIndex >= 32) {
  return "Warm and muggy — stay hydrated and avoid the midday sun.";
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
function addActivitySpecificReasons(day: any, activityId: string, reasons: string[]) {
  const temp = day.temperature;
  const windSpeed = day.wind_speed ?? day.windSpeed ?? 0;
  const rain = day.rain ?? day.precipitation ?? 0;
  const humidity = day.humidity;
  const clouds = day.clouds;

switch (activityId) {
  case 'basketball_outdoor':
    if (rain > 0) {
      reasons.push("Slippery court — no one wants a busted ankle. Game’s off.");
    } else if (windSpeed > 8) {
      reasons.push("Wind’s got your shot drifting like a bad pass.");
    } else if (temp && temp > 30) {
      reasons.push("Heat’s real out here — grab water and take a breather.");
    } else if (temp && temp < 5) {
      reasons.push("Too cold — ball feels like a rock and grip’s gone.");
    } else if (clouds < 20) {
      reasons.push("Clear skies — perfect run on the blacktop.");
    }
    break;

    case 'football_soccer':
      if (rain > 5) {
        reasons.push('Heavy rain makes pitch slippery and unsafe');
      } else if (rain > 0) {
        reasons.push('Light rain adds challenge but still playable');
      } else if (windSpeed > 10) {
        reasons.push('Strong wind affects passing and ball control');
      } else if (temp && temp > 32) {
        reasons.push('Very hot - increased risk of heat exhaustion');
      } else if (temp && temp < 0) {
        reasons.push('Freezing conditions may make pitch hard');
      } else {
        reasons.push('Good conditions for a proper match');
      }
      break;

    case 'tennis':
      if (rain > 0) {
        reasons.push('Rain makes courts slippery and dangerous');
      } else if (windSpeed > 6) {
        reasons.push('Wind will affect ball trajectory and serve');
      } else if (temp && temp > 35) {
        reasons.push('Very hot conditions - heat exhaustion risk');
      } else if (clouds > 80) {
        reasons.push('Overcast but good for avoiding sun glare');
      } else {
        reasons.push('Great conditions for tennis');
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
        reasons.push('Good conditions for a run');
      }
      break;

    case 'cycling':
    case 'road_cycling':
      if (rain > 2) {
        reasons.push('Wet roads increase crash risk significantly');
      } else if (windSpeed > 15) {
        reasons.push('Very strong wind makes cycling exhausting');
      } else if (windSpeed > 8) {
        reasons.push('Moderate wind will slow progress');
      } else if (temp && temp < 0) {
        reasons.push('Freezing conditions - risk of ice on roads');
      } else if (temp && temp > 35) {
        reasons.push('Very hot - increased dehydration risk');
      } else {
        reasons.push('Good cycling conditions');
      }
      break;

case 'golf':
  if (rain > 0) {
    reasons.push("Rain’s here — the only thing under par will be your mood.");
  } else if (windSpeed > 10) {
    reasons.push("Wind’s so strong it’ll slice your shots for you.");
  } else if (windSpeed > 5) {
    reasons.push("Bit breezy — time to blame the wind for your scorecard.");
  } else if (temp && temp < 5) {
    reasons.push("Cold day — balls won’t fly, but excuses will.");
  } else if (clouds < 30) {
    reasons.push("Sunny skies — perfect for spotting where your ball *didn’t* land.");
  } else {
    reasons.push("Looks like a fine day to ruin a good walk.");
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
      } else if (day.visibility && day.visibility < 1000) {
        reasons.push('Poor visibility makes navigation difficult');
      } else {
        reasons.push('Great day for exploring trails');
      }
      break;

case 'picnicking':
  if (rain > 0) {
    reasons.push("Raindrops on sandwiches? Best save the picnic for another day.");
  } else if (windSpeed > 8) {
    reasons.push("Windy weather — expect runaway napkins and tumbling cups.");
  } else if (temp && temp > 30) {
    reasons.push("Too hot for comfort — tricky to keep food (and people) fresh.");
  } else if (temp && temp < 10) {
    reasons.push("Too chilly for a blanket lunch outdoors — maybe indoors instead?");
  } else if (clouds >= 20 && clouds <= 70) {
    reasons.push("Lovely mix of sun and shade — ideal picnic skies.");
  } else {
    reasons.push("Perfect picnic weather — pack the basket and enjoy!");
  }
  break;

case 'beach':
  if (rain > 5) {
    reasons.push("Heavy rain means no sandcastles today.");
  } else if (rain > 2) {
    reasons.push("Showers might spoil the fun — not the best beach day.");
  } else if (rain > 0 && rain <= 2) {
    reasons.push("A few drops of rain — could be in and out of the water quickly!");
  } else if (windSpeed > 12) {
    reasons.push("Very windy — expect sand in sandwiches and hair!");
  } else if (windSpeed > 6) {
    reasons.push("A fresh breeze — good for kites, less so for umbrellas.");
  } else if (temp && temp > 35) {
    reasons.push("Scorching heat — pack shade, water, and lots of sunscreen.");
  } else if (temp && temp < 18) {
    reasons.push("A bit chilly for swimsuits — maybe a beach walk instead?");
  } else if (clouds < 50) {
    reasons.push("Sunny skies — perfect day for the family beach trip!");
  } else {
    reasons.push("Pleasant beach weather — enjoy the sand and sea.");
  }
  break;

case 'gardening':
case 'outdoor_gardening':
  if (rain > 5) {
    reasons.push("Heavy rain — the soil’s a swamp, best admired from the window with a cup of tea.");
  } else if (rain > 0 && rain <= 2) {
    reasons.push("A light shower — nature lending a hand with the watering can.");
  } else if (windSpeed > 10) {
    reasons.push("Too blustery — even the gnomes would topple over.");
  } else if (temp && temp > 30) {
    reasons.push("Scorching heat — weeds grow, but gardeners wilt.");
  } else if (temp && temp < 0) {
    reasons.push("Frozen ground — the earth sleeps, and so should your spade.");
  } else if (temp && temp >= 15 && temp <= 25) {
    reasons.push("Mild and gentle — perfect weather to lose track of time in the garden.");
  } else {
    reasons.push("Fair conditions — enough to keep hands busy and hearts content.");
  }
  break;

case 'photography':
  if (rain > 2) {
    reasons.push("Heavy rain — say goodbye to clear shots and probably your camera too.");
  } else if (clouds >= 70 && clouds <= 90) {
    reasons.push("Overcast skies — nature’s softbox, pity about the mood.");
  } else if (clouds < 30) {
    reasons.push("Clear skies — great landscapes, terrible shadows on faces.");
  } else if (windSpeed > 8) {
    reasons.push("Windy — perfect if you wanted a blurry impressionist phase.");
  } else if (day.visibility && day.visibility > 10000) {
    reasons.push("Crisp visibility — so you can really capture how empty the horizon feels.");
  } else {
    reasons.push("Not perfect, not terrible — in other words, real photography.");
  }
  break;

default:
  // Generic outdoor activity reasoning
  if (rain > 5) {
    reasons.push("Buckets of rain falling from the sky — maybe stay cosy inside?");
  } else if (windSpeed > 15) {
    reasons.push("Blustery enough to send your hat on holiday — tricky outdoors!");
  } else if (temp && temp > 35) {
    reasons.push("It’s scorching out there — take it slow and hydrate!");
  } else if (temp && temp < -5) {
    reasons.push("Colder than a penguin’s picnic — dress up or stay in!");
  } else {
    reasons.push("Get out there!");
  }
  break;
  }  // ➕ Add pollen-related reasons for outdoor activities
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
  
  // Activity-specific defaults
  const defaults: Record<string, string> = {
    // ── Action Sports ─────────────────────────────────────────
    mountain_biking: "Trails are rolling — mud optional, smiles mandatory.",
    road_cycling: "Roads are clear — watch potholes, not just your PB.",
    gravel_biking: "Crunchy lanes ahead — perfect for getting pleasantly lost.",
    rock_climbing: "Rock’s in nick — chalk up and mind the ankles.",
    indoor_climbing: "Holds are fresh — excuses less so.",
    skateboarding: "Park’s good to roll — gravity still undefeated.",
    rollerblading: "Smooth enough to glide (or wobble stylishly).",
    riding_motorbike: "Good riding weather — ride your plan, not your ego.",

    // ── Fitness & Wellness ───────────────────────────────────
    yoga: "Calm enough to stretch time as well as hamstrings.",
    outdoor_yoga: "Gentle breeze and quiet vibes — mats at the ready.",
    meditation: "Settle in — the world can wait five minutes.",
    outdoor_meditation: "Soft sounds, easy focus — breathe in the day.",
    pilates: "Core’s calling — posture today, smugness tomorrow.",
    martial_arts: "Sharp footwork weather — bow in, switch on.",
    tai_chi: "Slow flow approved — serenity with a side of balance.",
    running: "Good running weather — no medals for staying on the sofa.",
    trail_running: "Trails are friendly — shoes may disagree.",
    cycling: "Roads are clear — legs may lodge a complaint.",
    urban_exploring: "City’s open — pockets of wonder round every corner.",
    gym_workout: "Racks are free — today’s effort, tomorrow’s brag.",
    outdoor_gym: "Kit’s usable — fresh air beats air-con.",
    zumba: "Beat’s good, feet’s good — shake off the day.",
    boxing: "Good rounds ahead — footwork first, heroics later.",
    spinning: "Wheels up — sweat now, grin after.",

    // ── Outdoor Activities → Nature ──────────────────────────
    hiking: "Paths are open — go lose track of time out there.",
    birdwatching: "Quiet skies — patience rewarded with feathers.",
    photography: "Conditions are decent — beauty’s still in the eye of the beholder.",
    foraging: "Woods are whispering — basket optional, wonder guaranteed.",
    mushroom_hunting: "Forest’s in good voice — pick wisely, ID twice.",
    stargazing: "Skies cooperating — wish upon responsibly.",

    // ── Outdoor → Fishing (dad humour) ───────────────────────
    fly_fishing_freshwater: "River’s in mood — trout may or may not be.",
    coarse_fishing: "Still waters, still minds — bites negotiable.",
    sea_fishing_shore: "Shore’s workable — fish haven’t read your plans.",
    sea_fishing_boat: "Fair afloat — bring luck, and a spare sandwich.",
    ice_fishing: "Ice is agreeable — toes less so. Dress like you mean it.",

    // ── Outdoor → Recreation (family-friendly) ───────────────
    picnicking: "Perfect picnic weather — ants haven’t got the memo yet.",
    bbq: "Grill-friendly day — try not to set the sausages to ‘meteor’.",
    beach: "Beach is welcoming — sand will still get everywhere.",
    geocaching: "Signals good — treasure probably plastic, fun definitely real.",
    camping: "Tents at the ready — stars included, snoring optional.",
    outdoor_reading: "Pages won’t flap — plot might.",
    dog_walking: "Prime walkies — tail wags guaranteed.",
    outdoor_playground: "Slides and swings approved — giggles likely.",
    outdoor_chess: "Quiet board, sharp minds — try not to blunder in public.",
    outdoor_painting: "Light’s kind — capture the mess before it dries.",
    outdoor_music: "Good busking weather — applause not guaranteed.",

    // ── Winter Sports ────────────────────────────────────────
    skiing: "Slopes are open — gravity’s still the boss.",
    snowboarding: "Runs are ready — style optional, helmet not.",
    cross_country_skiing: "Tracks set — glide now, brag later.",
    ice_skating: "Ice is honest — elegance not guaranteed.",
    curling: "Stones will behave — teammates mightn’t.",
    ice_hockey: "Surface is playable — bruises with friends.",
    ice_hockey_indoor: "Rink’s ready — tape up and get stuck in.",

    // ── Creative & Arts ──────────────────────────────────────
    painting: "Brush day — the paint’s in a cooperative mood.",

    crafts: "Craft table’s calling — glue strings of joy await.",
    knitting: "Needles up — one row now, a jumper by Christmas (maybe).",
    diy: "Tools at peace — measure twice, mutter once.",
    playing_records: "Needle down — let the dust add ‘warmth’.",
    make_music: "Good vibes — noise complaints not currently forecast.",
    dance: "Floor’s friendly — rhythm may vary by participant.",
    reading: "Words behaving — lose an hour, gain a chapter.",

    // ── Indoor Recreation ────────────────────────────────────
    going_to_pub: "Pints pulling well — responsible cheer encouraged.",
    table_tennis: "Tables true — spin like you meant it.",
    playing_cards: "Deck’s honest — friends less so.",
    watch_a_movie: "Screen time justified — snacks strongly implied.",
    cafe: "Beans behaving — conversation optional but recommended.",
    cinema: "Projector purring — turn your phone to ‘forgotten’.",
    museum: "Quiet corners and good labels — curiosity welcome.",
    shopping: "Queues civilised — wallet less so.",
    gallery: "Walls have wonders — take your time.",
    bowling: "Lanes are true — bumpers strictly between friends.",
    squash: "Court’s crisp — apologies to the hamstrings.",
    badminton: "Feathers will fly — so should you.",
    tennis_indoor: "Even bounce, no breeze — your serve.",
    indoor_swimming: "Lanes civil — splash diplomacy advised.",

    // ── Water & Sea (if not elsewhere) ───────────────────────
    surfing: "Waves are rideable — wipeouts included free.",
    swimming_sea: "Sea’s swimmable — remember, it isn’t a bathtub.",
    swimming_pool: "Pool’s fine — lane hogs on best behaviour (we hope).",
    snorkelling: "Water’s clear enough — fish are probably judging.",
    scuba_diving: "Diveable today — adventure below, pressure above.",
    kayaking: "Waters friendly — stay curious, not cocky.",
    sailing: "Winds fair — good day to argue with ropes.",
    fishing: "Conditions are fine — fish still mightn’t care."
  };

  return [defaults[activityId] || `Conditions are suitable for ${activityName.toLowerCase()}`];
}