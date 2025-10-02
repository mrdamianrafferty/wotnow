export type MarineBioIndicatorType =
  | 'chlorophyll'
  | 'oxygen'
  | 'nitrate'
  | 'phosphate'
  | 'salinity'
  | 'surfaceTemperature'
  | 'phytoplankton';

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
}

export const MARINE_BIO_INDICATOR_ORDER: MarineBioIndicatorType[] = [
  'chlorophyll',
  'oxygen',
  'nitrate',
  'phosphate',
  'salinity',
  'surfaceTemperature',
  'phytoplankton',
];

export const MARINE_BIO_LEVEL_LABELS: Record<MarineBioIndicatorLevel, string> = {
  very_low: 'Very Low',
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  very_high: 'Very High',
};

const LEVEL_THRESHOLDS: Record<MarineBioIndicatorType, { very_low: number; low: number; normal: number; high: number }> = {
  chlorophyll: { very_low: 0.2, low: 0.5, normal: 2.0, high: 5.0 },
  oxygen: { very_low: 2, low: 4, normal: 7, high: 10 },
  nitrate: { very_low: 0.5, low: 2.0, normal: 8.0, high: 20 },
  phosphate: { very_low: 0.1, low: 0.3, normal: 1.0, high: 2.0 },
  salinity: { very_low: 10, low: 25, normal: 35, high: 37 },
  surfaceTemperature: { very_low: 5, low: 10, normal: 18, high: 24 },
  phytoplankton: { very_low: 0.1, low: 0.5, normal: 2.0, high: 5.0 },
};

const LEVEL_UNITS: Record<MarineBioIndicatorType, string> = {
  chlorophyll: 'mg/m³',
  oxygen: 'mg/L',
  nitrate: 'µmol/L',
  phosphate: 'µmol/L',
  salinity: 'PSU',
  surfaceTemperature: '°C',
  phytoplankton: 'mg/m³',
};

const LEVEL_HINTS: Record<MarineBioIndicatorType, string> = {
  chlorophyll: 'Plankton productivity — higher draws baitfish.',
  oxygen: 'Fish stay active when oxygen holds in mid bands.',
  nitrate: 'Nutrient levels feed plankton chains.',
  phosphate: 'Extra nutrients can flip water quality.',
  salinity: 'Most marine fish crave ~35 PSU.',
  surfaceTemperature: 'Comfort zone for mixed fisheries is 10–18°C.',
  phytoplankton: 'Tracks biomass underpinning bait abundance.',
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
