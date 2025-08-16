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

export const MARINE_ACTIVITY_IDS = [
  'surfing',
  'sailing',
  'sea_kayaking',

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
    let windMessage = getWindMessage({
      windSpeed: day.wind_speed,
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

    // Activity-specific rules
    switch (activityId) {
      case 'sea_swimming':
      case 'sup_sea':
      case 'sea_kayaking': {
        // Offshore can carry paddlers/swimmers out to sea
        if (windRelative === 'offshore' && typeof windSpeed === 'number' && windSpeed > 6) {
          reasons.push('Offshore wind can carry you out—unsafe unless in a sheltered bay or with safety cover');
        }
        // Strong lateral drift
        if (windRelative === 'cross-shore' && typeof windSpeed === 'number' && windSpeed > 8) {
          reasons.push('Strong lateral drift from cross‑shore wind—plan an upwind return or avoid open crossings');
        }
        // Dumping shorebreak hazard
        if (typeof waveHeight === 'number' && waveHeight > 1.2 && (windRelative === 'onshore' || windRelative === 'side-onshore')) {
          reasons.push('Dumping shorebreak makes entry/exit hazardous');
        }
        break;
      }
      case 'surfing': {
        if (typeof waveHeight === 'number' && waveHeight > 2.5) {
          reasons.push('Very large surf—advanced surfers only');
        }
        if (windRelative === 'onshore' && typeof windSpeed === 'number' && windSpeed > 10) {
          reasons.push('Strong onshore wind—messy, fatiguing surf');
        }
        if (windRelative === 'onshore' && typeof swellPeriod === 'number' && swellPeriod < 8) {
          reasons.push('Onshore + short period—choppy, disorganised waves');
        }
        if (windRelative === 'onshore' && typeof waveHeight === 'number' && waveHeight < 0.4) {
          reasons.push('Onshore breeze with tiny swell—barely surfable');
        }
        break;
      }
    }

    // Generic severe warnings for all marine activities
    if (typeof windSpeed === 'number' && windSpeed > 20) {
      reasons.push('Very strong wind—unsafe for casual sea activities');
    }
    if (typeof gustSpeed === 'number' && gustSpeed > 18) {
      reasons.push('Strong gusts—control will be difficult');
    }
    const precip = day.precipitation ?? day.rain;
    if (typeof precip === 'number' && precip > 10) {
      reasons.push('Heavy rain—reduced visibility and water quality');
    }
    if (typeof day.visibility === 'number' && day.visibility < 2000) {
      reasons.push('Poor visibility—hard to spot hazards and other water users');
    }

    // Sea-swimming specific wetsuit guidance
    if (activityId === 'sea_swimming' && typeof day.waterTemperature === 'number') {
      if (day.waterTemperature < 12) {
        reasons.push('Cold shock risk—wear a proper wetsuit, neoprene cap/boots/gloves');
      } else if (day.waterTemperature < 16) {
        reasons.push('Chilly water—wetsuit recommended, limit time and warm up after');
      }
    }
    
    // Water temperature
    if (day.waterTemperature !== undefined && day.waterTemperature !== null) {
      let waterTempMsg;
      
      if (day.waterTemperature < 10) {
        waterTempMsg = "Water is bloody cold - wetsuit required";
      } else if (day.waterTemperature < 16) {
        waterTempMsg = "Cold water - full wetsuit recommended";
      } else if (day.waterTemperature < 21) {
        waterTempMsg = "Cool water - light wetsuit may be comfortable";
      } else if (day.waterTemperature < 26) {
        waterTempMsg = "Pleasant water temperature";
      } else {
        waterTempMsg = "Warm water - perfect for swimming";
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
  
  // Filter out empty strings, null, undefined
  const validReasons = reasons.filter(r => r && r.trim() !== '');
  console.log('Valid reasons after filtering:', validReasons);
  
  return validReasons.length > 0 ? validReasons : ['Weather conditions look OK for this.'];
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

  const heatIndex = tempC + (0.33 * humidity) - 0.7;

  if (heatIndex >= 60) {
    return '☠️ Extreme danger: heat stroke possible – avoid strenuous activity';
  } else if (heatIndex >= 50) {
    return 'Risk of heat exhaustion or heat stroke, be sensible';
  } else if (heatIndex >= 42) {
    return 'Caution, take frequent breaks and hydrate';

  }

  return null;
}