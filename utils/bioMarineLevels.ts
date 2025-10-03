/**
 * Marine Bio Indicator Levels and Utilities
 * 
 * This module provides types, constants, and functions for working with marine biological indicators
 * such as chlorophyll, dissolved oxygen, nutrients, salinity, and temperature.
 */

export type MarineBioIndicatorLevel = 'very_low' | 'low' | 'normal' | 'high' | 'very_high';

export type MarineBioIndicatorType = 
  | 'chlorophyll' 
  | 'oxygen' 
  | 'nitrate' 
  | 'phosphate' 
  | 'salinity' 
  | 'surfaceTemperature' 
  | 'phytoplankton';

export interface MarineBioIndicatorState {
  type: MarineBioIndicatorType;
  level: MarineBioIndicatorLevel;
  value: number | null;
  unit: string;
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

interface MarineBioData {
  chlorophyll?: number | null;      // mg/m³
  oxygen?: number | null;            // mg/L
  nitrate?: number | null;           // µmol/L
  phosphate?: number | null;         // µmol/L
  salinity?: number | null;          // PSU (practical salinity units)
  surfaceTemperature?: number | null; // °C
  phytoplankton?: number | null;     // carbon mg/m³ or similar
}

/**
 * Thresholds for marine bio indicators based on fishing literature and oceanography
 */
const THRESHOLDS = {
  chlorophyll: {
    very_low: [0, 0.5],       // mg/m³ - oligotrophic, clear water
    low: [0.5, 1.5],          // mg/m³ - low productivity
    normal: [1.5, 5],         // mg/m³ - moderate productivity
    high: [5, 15],            // mg/m³ - high productivity
    very_high: [15, Infinity], // mg/m³ - eutrophic/bloom
  },
  oxygen: {
    very_low: [0, 4],         // mg/L - hypoxic
    low: [4, 6],              // mg/L - stressed
    normal: [6, 8],           // mg/L - healthy
    high: [8, 10],            // mg/L - well-oxygenated
    very_high: [10, Infinity], // mg/L - supersaturated
  },
  nitrate: {
    very_low: [0, 0.5],       // µmol/L - depleted
    low: [0.5, 2],            // µmol/L - low
    normal: [2, 10],          // µmol/L - typical
    high: [10, 30],           // µmol/L - enriched
    very_high: [30, Infinity], // µmol/L - eutrophic
  },
  phosphate: {
    very_low: [0, 0.1],       // µmol/L - depleted
    low: [0.1, 0.5],          // µmol/L - low
    normal: [0.5, 2],         // µmol/L - typical
    high: [2, 5],             // µmol/L - enriched
    very_high: [5, Infinity],  // µmol/L - eutrophic
  },
  salinity: {
    very_low: [0, 15],        // PSU - brackish/estuarine
    low: [15, 30],            // PSU - low salinity
    normal: [30, 37],         // PSU - typical ocean
    high: [37, 40],           // PSU - high salinity
    very_high: [40, Infinity], // PSU - hypersaline
  },
  surfaceTemperature: {
    very_low: [-2, 5],        // °C - polar/cold
    low: [5, 12],             // °C - cold temperate
    normal: [12, 20],         // °C - temperate
    high: [20, 28],           // °C - warm temperate/subtropical
    very_high: [28, Infinity], // °C - tropical
  },
  phytoplankton: {
    very_low: [0, 10],        // carbon mg/m³ - oligotrophic
    low: [10, 50],            // carbon mg/m³ - low
    normal: [50, 150],        // carbon mg/m³ - moderate
    high: [150, 300],         // carbon mg/m³ - high
    very_high: [300, Infinity], // carbon mg/m³ - bloom
  },
} as const;

const UNITS: Record<MarineBioIndicatorType, string> = {
  chlorophyll: 'mg/m³',
  oxygen: 'mg/L',
  nitrate: 'µmol/L',
  phosphate: 'µmol/L',
  salinity: 'PSU',
  surfaceTemperature: '°C',
  phytoplankton: 'mg/m³',
};

/**
 * Classify a value into a bio indicator level based on thresholds
 */
function classifyLevel(
  type: MarineBioIndicatorType,
  value: number | null | undefined
): MarineBioIndicatorLevel {
  if (value == null || !Number.isFinite(value)) {
    return 'normal'; // default when no data
  }

  const thresholds = THRESHOLDS[type];
  
  if (value < thresholds.very_low[1]) return 'very_low';
  if (value < thresholds.low[1]) return 'low';
  if (value < thresholds.normal[1]) return 'normal';
  if (value < thresholds.high[1]) return 'high';
  return 'very_high';
}

/**
 * Build array of marine bio indicator states from raw data
 */
export function buildMarineBioIndicators(data: MarineBioData): MarineBioIndicatorState[] {
  const indicators: MarineBioIndicatorState[] = [];

  const entries: Array<[MarineBioIndicatorType, number | null | undefined]> = [
    ['chlorophyll', data.chlorophyll],
    ['oxygen', data.oxygen],
    ['nitrate', data.nitrate],
    ['phosphate', data.phosphate],
    ['salinity', data.salinity],
    ['surfaceTemperature', data.surfaceTemperature],
    ['phytoplankton', data.phytoplankton],
  ];

  for (const [type, value] of entries) {
    const normalizedValue = value != null && Number.isFinite(value) ? value : null;
    
    indicators.push({
      type,
      level: classifyLevel(type, normalizedValue),
      value: normalizedValue,
      unit: UNITS[type],
    });
  }

  return indicators;
}

/**
 * Get a human-readable description of a bio indicator level
 */
export function getBioIndicatorDescription(
  type: MarineBioIndicatorType,
  level: MarineBioIndicatorLevel
): string {
  const descriptions: Record<MarineBioIndicatorType, Record<MarineBioIndicatorLevel, string>> = {
    chlorophyll: {
      very_low: 'Water is clear with little plankton – baitfish and predators scarce.',
      low: 'Below-average plankton – some baitfish, but patchy predator activity.',
      normal: 'Healthy plankton levels – food chain active, fair chance of finding fish.',
      high: 'Strong plankton bloom – baitfish abundant, predators likely nearby.',
      very_high: 'Excess bloom may reduce clarity – predators may hunt deeper or elsewhere.',
    },
    oxygen: {
      very_low: 'Dangerously low oxygen – fish stressed or absent; avoid these waters.',
      low: 'Below comfort level – fish sluggish, bites unlikely.',
      normal: 'Good oxygen levels – fish active and feeding normally.',
      high: 'Excellent oxygenation – fish energetic and aggressive.',
      very_high: 'Supersaturated – unusual conditions, fish behavior unpredictable.',
    },
    nitrate: {
      very_low: 'Nutrient-poor – limited plankton, sparse food chain.',
      low: 'Low nutrients – some productivity, but fish may be scattered.',
      normal: 'Balanced nutrients – healthy ecosystem, good fishing potential.',
      high: 'Nutrient-rich – strong food chain, excellent fishing.',
      very_high: 'Over-enriched – may cause algal blooms, check water clarity.',
    },
    phosphate: {
      very_low: 'Phosphorus depleted – limited algae, sparse baitfish.',
      low: 'Low phosphate – modest productivity.',
      normal: 'Adequate phosphate – healthy ecosystem.',
      high: 'High phosphate – strong productivity, good fishing.',
      very_high: 'Excess phosphate – risk of harmful algae, check conditions.',
    },
    salinity: {
      very_low: 'Brackish water – freshwater species more likely.',
      low: 'Low salinity – mixed species, some estuarine fish.',
      normal: 'Normal ocean salinity – typical marine species.',
      high: 'High salinity – stable conditions, reef species possible.',
      very_high: 'Hypersaline – specialized species only.',
    },
    surfaceTemperature: {
      very_low: 'Cold water – polar species, slow metabolism.',
      low: 'Cool water – temperate species, moderate activity.',
      normal: 'Moderate temperature – good fishing for most species.',
      high: 'Warm water – active fish, tropical species present.',
      very_high: 'Very warm – fish may seek deeper cooler water.',
    },
    phytoplankton: {
      very_low: 'Little phytoplankton – clear water, sparse food chain.',
      low: 'Below-average plankton – limited baitfish.',
      normal: 'Healthy phytoplankton – good food chain.',
      high: 'Abundant phytoplankton – strong baitfish presence.',
      very_high: 'Dense bloom – may affect water clarity and oxygen.',
    },
  };

  return descriptions[type][level];
}
