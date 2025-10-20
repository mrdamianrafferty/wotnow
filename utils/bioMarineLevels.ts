export type MarineBioIndicatorType =
  | 'chlorophyll'
  | 'oxygen'
  | 'nitrate'
  | 'phosphate'
  | 'salinity'
  | 'surfaceTemperature'
  | 'phytoplankton'
  | 'stealth'
  | 'targetDepth'
  | 'feedingPotential'
  | 'baitfishActivity';

export type MarineBioIndicatorLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

export interface MarineBioIndicatorState {
  type: MarineBioIndicatorType;
  level: MarineBioIndicatorLevel;
  value?: number | string | null;
  unit?: string;
  hint?: string | null;
}

export interface MarineBioIndicatorInputs {
  chlorophyll?: number | null;
  oxygen?: number | null;
  nitrate?: number | null;
  phosphate?: number | null;
  salinity?: number | null;
  surfaceTemperature?: number | null;
  phytoplankton?: number | null;
  stealth?: number | null;
  targetDepth?: number | null;
  feedingPotential?: number | null;
  baitfishActivity?: number | null;
  // Raw data for calculations
  mixedLayerDepth?: number | null;
  zooplankton?: number | null;
  primaryProduction?: number | null;
}

export const MARINE_BIO_INDICATOR_ORDER: MarineBioIndicatorType[] = [
  'stealth',
  'surfaceTemperature',
  'targetDepth',
  'oxygen',
  'feedingPotential',
  'salinity',
  'chlorophyll',
  'phytoplankton',
  'baitfishActivity',
  'nitrate',
  'phosphate',
];

export const MARINE_BIO_LEVEL_LABELS: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'Very Low',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  very_high: 'Very High',
};

// Custom labels for stealth indicator
export const STEALTH_LEVEL_LABELS: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'Loud and Proud',
  low: 'Loud and Proud',
  normal: 'Blend In',
  high: 'Ninja Mode',
  very_high: 'Ninja Mode',
};

const LEVEL_THRESHOLDS: Record<MarineBioIndicatorType, { very_low: number; low: number; normal: number; high: number }> = {
  chlorophyll: { very_low: 0.2, low: 0.5, normal: 2.0, high: 5.0 },
  oxygen: { very_low: 2, low: 4, normal: 7, high: 10 },
  nitrate: { very_low: 0.5, low: 2.0, normal: 8.0, high: 20 },
  phosphate: { very_low: 0.1, low: 0.3, normal: 1.0, high: 2.0 },
  stealth: { very_low: 20, low: 35, normal: 55, high: 75 }, // Light penetration index (0-100)
  salinity: { very_low: 10, low: 25, normal: 35, high: 37 },
  surfaceTemperature: { very_low: 5, low: 10, normal: 18, high: 24 },
  phytoplankton: { very_low: 0.1, low: 0.5, normal: 2.0, high: 5.0 },
  targetDepth: { very_low: 5, low: 10, normal: 20, high: 40 }, // Depth in meters
  feedingPotential: { very_low: 25, low: 40, normal: 60, high: 75 }, // Score 0-100
  baitfishActivity: { very_low: 0.5, low: 1.0, normal: 2.0, high: 3.5 }, // Zooplankton mmol/m³
};

const LEVEL_UNITS: Record<MarineBioIndicatorType, string> = {
  chlorophyll: 'mg/m³',
  oxygen: 'mg/L',
  nitrate: 'µmol/L',
  phosphate: 'µmol/L',
  stealth: '% light',
  salinity: 'PSU',
  surfaceTemperature: '°C',
  phytoplankton: 'mg/m³',
  targetDepth: 'm',
  feedingPotential: '/100',
  baitfishActivity: 'mmol/m³',
};

const LEVEL_HINTS: Record<MarineBioIndicatorType, string> = {
  chlorophyll: 'Plankton productivity — higher draws baitfish.',
  oxygen: 'Fish stay active when oxygen holds in mid bands.',
  nitrate: 'Nutrient levels feed plankton chains.',
  phosphate: 'Extra nutrients can flip water quality.',
  stealth: 'Light penetration affects fish wariness.',
  salinity: 'Most marine fish crave ~35 PSU.',
  surfaceTemperature: 'Comfort zone for mixed fisheries is 10–18°C.',
  phytoplankton: 'Tracks biomass underpinning bait abundance.',
  targetDepth: 'Where we expect fish to hold or feed based on thermocline.',
  feedingPotential: 'Overall ecosystem health drives feeding activity.',
  baitfishActivity: 'Zooplankton abundance indicates baitfish food availability.',
};

function classifyValue(value: number | null | undefined, type: MarineBioIndicatorType): MarineBioIndicatorLevel | null {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return null;
  }
  const thresholds = LEVEL_THRESHOLDS[type];
  if (value < thresholds.very_low) return 'very_low';
  if (value < thresholds.low) return 'low';
  if (value < thresholds.normal) return 'normal';
  if (value < thresholds.high) return 'high';
  return 'very_high';
}

function toRounded(value: number | null | undefined, precision = 1): number | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/**
 * Normalize chlorophyll to 0-100 scale for feeding potential calculation
 * Oligotrophic: 0-0.5, Mesotrophic: 0.5-3, Eutrophic: 3-10+
 */
function normalizeChlorophyll(value: number): number {
  if (value <= 0.5) return value * 20; // 0-10
  if (value <= 3) return 10 + ((value - 0.5) / 2.5) * 50; // 10-60
  return Math.min(100, 60 + ((value - 3) / 7) * 40); // 60-100
}

/**
 * Normalize phytoplankton to 0-100 scale
 */
function normalizePhytoplankton(value: number): number {
  return Math.min(100, (value / 5) * 100);
}

/**
 * Normalize zooplankton to 0-100 scale
 */
function normalizeZooplankton(value: number): number {
  return Math.min(100, (value / 5) * 100);
}

/**
 * Normalize primary production to 0-100 scale
 * Low: <200, Medium: 200-800, High: 800-2000+
 */
function normalizePrimaryProduction(value: number): number {
  return Math.min(100, (value / 2000) * 100);
}

/**
 * Calculate target fishing depth from mixed layer depth, oxygen, and temperature
 * Returns depth in meters with confidence level
 * 
 * @param mixedLayerDepth - Mixed layer depth in meters (thermocline depth)
 * @param dissolvedOxygen - Dissolved oxygen in mg/L
 * @param surfaceTemp - Surface temperature in °C
 * @returns Target depth in meters, or null if insufficient data
 */
export function calculateTargetDepth(
  mixedLayerDepth?: number | null,
  dissolvedOxygen?: number | null,
  surfaceTemp?: number | null
): number | null {
  // We need at least mixed layer depth to calculate
  if (typeof mixedLayerDepth !== 'number' || !Number.isFinite(mixedLayerDepth)) {
    return null;
  }

  // Use MLD as base target depth
  let targetDepth = mixedLayerDepth;
  
  // Adjust based on oxygen levels (fish avoid low oxygen zones)
  if (typeof dissolvedOxygen === 'number' && Number.isFinite(dissolvedOxygen)) {
    if (dissolvedOxygen < 4) {
      // Low oxygen - fish may be shallower
      targetDepth = Math.max(5, mixedLayerDepth * 0.7);
    }
  }
  
  // Adjust based on temperature (fish seek comfort zones)
  if (typeof surfaceTemp === 'number' && Number.isFinite(surfaceTemp)) {
    if (surfaceTemp > 24) {
      // Warm surface - fish may go deeper
      targetDepth = mixedLayerDepth * 1.2;
    } else if (surfaceTemp < 10) {
      // Cold surface - fish may be shallower
      targetDepth = Math.max(5, mixedLayerDepth * 0.8);
    }
  }
  
  return Math.round(targetDepth);
}

/**
 * Calculate feeding potential index from food chain indicators
 * Combines chlorophyll, phytoplankton, zooplankton, and primary production
 * 
 * @param chlorophyll - Chlorophyll in mg/m³ (40% weight)
 * @param phytoplankton - Phytoplankton in mmol/m³ (20% weight)
 * @param zooplankton - Zooplankton in mmol/m³ (20% weight)
 * @param primaryProduction - Primary production in mg C/m³/day (20% weight)
 * @returns Feeding potential score 0-100, or null if insufficient data
 */
export function calculateFeedingPotential(
  chlorophyll?: number | null,
  phytoplankton?: number | null,
  zooplankton?: number | null,
  primaryProduction?: number | null
): number | null {
  // We need at least 2 indicators to calculate
  let availableCount = 0;
  let totalScore = 0;
  
  if (typeof chlorophyll === 'number' && Number.isFinite(chlorophyll)) {
    totalScore += normalizeChlorophyll(chlorophyll) * 0.4;
    availableCount += 0.4;
  }
  
  if (typeof phytoplankton === 'number' && Number.isFinite(phytoplankton)) {
    totalScore += normalizePhytoplankton(phytoplankton) * 0.2;
    availableCount += 0.2;
  }
  
  if (typeof zooplankton === 'number' && Number.isFinite(zooplankton)) {
    totalScore += normalizeZooplankton(zooplankton) * 0.2;
    availableCount += 0.2;
  }
  
  if (typeof primaryProduction === 'number' && Number.isFinite(primaryProduction)) {
    totalScore += normalizePrimaryProduction(primaryProduction) * 0.2;
    availableCount += 0.2;
  }
  
  // Need at least 40% of the data (2 indicators)
  if (availableCount < 0.4) {
    return null;
  }
  
  // Normalize to full scale based on available data
  const feedingPotential = (totalScore / availableCount) * 100;
  
  return Math.round(Math.min(100, Math.max(0, feedingPotential)));
}

/**
 * Calculate baitfish activity from zooplankton levels
 * High zooplankton = active baitfish = predators nearby
 * 
 * @param zooplankton - Zooplankton in mmol/m³
 * @returns Zooplankton value (for classification), or null if no data
 */
export function calculateBaitfishActivity(
  zooplankton?: number | null
): number | null {
  if (typeof zooplankton !== 'number' || !Number.isFinite(zooplankton)) {
    return null;
  }
  
  return zooplankton;
}

export function buildMarineBioIndicators(raw?: MarineBioIndicatorInputs | null): MarineBioIndicatorState[] {
  if (!raw) return [];

  const entries: MarineBioIndicatorState[] = [];

  MARINE_BIO_INDICATOR_ORDER.forEach((type) => {
    const rawValue = raw[type];
    const level = classifyValue(rawValue ?? null, type);
    if (!level) return;

    entries.push({
      type,
      level,
      value: toRounded(rawValue ?? null),
      unit: LEVEL_UNITS[type],
      hint: LEVEL_HINTS[type],
    });
  });

  return entries;
}

export function describeMarineBioDominant(levels: MarineBioIndicatorState[]) {
  if (!levels.length) return null;
  const weighted = levels.map((entry) => ({
    type: entry.type,
    weight: ['very_high', 'high'].includes(entry.level) ? 2 : entry.level === 'normal' ? 1 : 0,
  }));
  const winner = weighted.sort((a, b) => b.weight - a.weight)[0];
  if (!winner || winner.weight === 0) return null;
  switch (winner.type) {
    case 'chlorophyll':
      return 'Plankton bloom likely drawing baitfish.';
    case 'oxygen':
      return 'Oxygen-rich waters keep predators cruising.';
    case 'nitrate':
    case 'phosphate':
      return 'Nutrient surge fuelling bait schools.';
    case 'salinity':
      return 'Salinity shift – adjust target species.';
    case 'surfaceTemperature':
      return 'Surface warmth guiding feeding windows.';
    case 'phytoplankton':
      return 'Plankton biomass surging – expect bait activity.';
    default:
      return null;
  }
}

/**
 * Calculate solar elevation angle in degrees
 * @param lat - Latitude in degrees
 * @param lon - Longitude in degrees
 * @param date - Date to calculate for (defaults to now)
 * @returns Solar elevation angle in degrees (-90 to +90, negative = below horizon)
 */
function calculateSolarElevation(lat: number, lon: number, date: Date = new Date()): number {
  // Julian day calculation
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;
  
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  jd = jd + (hour - 12) / 24;
  
  // Days since J2000.0
  const n = jd - 2451545.0;
  
  // Mean longitude of sun
  const L = (280.460 + 0.9856474 * n) % 360;
  
  // Mean anomaly
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  
  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  
  // Obliquity of ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * Math.PI / 180;
  
  // Declination
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  
  // Hour angle (local solar time)
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const lst = (gmst + lon / 15) % 24;
  const hourAngle = (lst - 12) * 15 * Math.PI / 180;
  
  // Solar elevation
  const latRad = lat * Math.PI / 180;
  const elevation = Math.asin(Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(hourAngle));
  
  return elevation * 180 / Math.PI;
}

/**
 * Calculate stealth/light penetration index from time of day, cloud cover, and water clarity
 * @param lat - Latitude (for calculating sun position)
 * @param lon - Longitude (for calculating sun position)
 * @param cloudCover - Cloud cover percentage (0-100), optional
 * @param waterClarityIndex - Water clarity index (0-100), where higher = clearer water
 * @param currentTime - Current time (defaults to now)
 * @returns Light penetration index (0-100), where higher = more light = fish more wary
 */
export function calculateStealthIndex(
  lat?: number | null,
  lon?: number | null,
  cloudCover?: number | null,
  waterClarityIndex?: number | null,
  currentTime: Date = new Date()
): number | null {
  // We need at least lat/lon to calculate sun position
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  if (typeof lon !== 'number' || !Number.isFinite(lon)) return null;

  // Clamp values to valid ranges
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  
  // Calculate solar elevation (-90 to +90 degrees)
  const solarElevation = calculateSolarElevation(lat, lon, currentTime);
  
  // Convert solar elevation to base light level (0-1)
  // Sun below horizon (< 0°) = night (0), sun at zenith (90°) = maximum (1)
  // Add twilight effect: -12° to 0° = civil twilight (gradual increase)
  let baseLightLevel: number;
  if (solarElevation < -12) {
    baseLightLevel = 0; // Night
  } else if (solarElevation < 0) {
    baseLightLevel = (solarElevation + 12) / 12 * 0.2; // Twilight (0 to 0.2)
  } else {
    baseLightLevel = 0.2 + (Math.min(solarElevation, 90) / 90) * 0.8; // Day (0.2 to 1.0)
  }
  
  // Apply cloud cover modifier (reduces light penetration)
  let cloudModifier = 1.0;
  if (typeof cloudCover === 'number' && Number.isFinite(cloudCover)) {
    const cloudFrac = clamp(cloudCover, 0, 100) / 100;
    // Heavy clouds can reduce light by up to 70%
    cloudModifier = 1.0 - (cloudFrac * 0.7);
  }
  
  // Apply water clarity modifier (clearer water = more light penetration)
  let clarityModifier = 1.0;
  if (typeof waterClarityIndex === 'number' && Number.isFinite(waterClarityIndex)) {
    // waterClarityIndex: 0 = very murky, 100 = crystal clear
    // Clear water increases light penetration by up to 20%
    const clarityNormalized = clamp(waterClarityIndex, 0, 100) / 100;
    clarityModifier = 0.9 + (clarityNormalized * 0.3); // Range: 0.9 to 1.2
  }
  
  // Calculate final light index (0-100)
  const lightIndex = clamp(baseLightLevel * cloudModifier * clarityModifier * 100, 0, 100);
  
  return Math.round(lightIndex);
}

