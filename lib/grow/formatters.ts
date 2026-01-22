/**
 * Display formatting utilities for plant species data.
 */

// USDA Hardiness Zone temperature ranges (°C)
export const ZONE_MIN_TEMPS: Record<number, number> = {
  1: -51,
  2: -46,
  3: -40,
  4: -34,
  5: -29,
  6: -23,
  7: -18,
  8: -12,
  9: -7,
  10: -1,
  11: 4,
  12: 10,
  13: 16,
};

/**
 * Format toxicity severity level for display.
 * Only shows warnings for moderate+ (≥2) per user preference.
 */
export function formatToxicitySeverity(level: number | null | undefined): {
  label: string;
  color: string;
  icon: string;
  bgClass: string;
  textClass: string;
  showWarning: boolean;
} {
  const safeLevel = level ?? 0;

  const levels = [
    { label: 'Safe', color: 'green', icon: '✓', bgClass: 'bg-success/10', textClass: 'text-success', showWarning: false },
    { label: 'Mild', color: 'yellow', icon: '~', bgClass: 'bg-warning/10', textClass: 'text-warning', showWarning: false },
    { label: 'Moderate', color: 'orange', icon: '⚠', bgClass: 'bg-warning/20', textClass: 'text-warning', showWarning: true },
    { label: 'Significant', color: 'red', icon: '⚠', bgClass: 'bg-error/10', textClass: 'text-error', showWarning: true },
    { label: 'Severe', color: 'red', icon: '⛔', bgClass: 'bg-error/20', textClass: 'text-error', showWarning: true },
    { label: 'Highly toxic', color: 'darkred', icon: '☠', bgClass: 'bg-error/30', textClass: 'text-error', showWarning: true },
  ];

  return levels[Math.min(safeLevel, levels.length - 1)];
}

/**
 * Check if plant should show safety warning (toxicity ≥ 2).
 */
export function shouldShowSafetyWarning(
  poisonousToHumans: number | null | undefined,
  poisonousToPets: number | null | undefined
): boolean {
  return (poisonousToHumans ?? 0) >= 2 || (poisonousToPets ?? 0) >= 2;
}

/**
 * Convert USDA hardiness zone to minimum temperature.
 */
export function zoneToMinTemp(zone: number): string {
  const temp = ZONE_MIN_TEMPS[zone];
  if (temp === undefined) return 'Unknown';
  return `${temp}°C`;
}

/**
 * Estimate USDA hardiness zone from latitude.
 * This is a rough approximation - actual zones depend on many factors.
 */
export function estimateHardinessZone(lat: number): number {
  // Simple latitude-based estimation for Northern Hemisphere
  // More accurate: use elevation + latitude + coastal proximity
  const absLat = Math.abs(lat);

  // Rough mapping: higher latitude = lower zone
  // Equator (~0°) = zone 13, Arctic circle (~66°) = zone 1
  const baseZone = Math.round(13 - (absLat - 25) / 5);

  // Clamp to valid range 1-13
  return Math.max(1, Math.min(13, baseZone));
}

/**
 * Check if plant is compatible with a hardiness zone.
 */
export function isZoneCompatible(
  userZone: number,
  plantMinZone: number | null | undefined,
  plantMaxZone: number | null | undefined
): { compatible: boolean; message: string } {
  if (plantMinZone === null || plantMinZone === undefined) {
    return { compatible: true, message: 'Zone compatibility unknown' };
  }

  const maxZone = plantMaxZone ?? 13;

  if (userZone >= plantMinZone && userZone <= maxZone) {
    return { compatible: true, message: `Compatible with your zone ${userZone}` };
  } else if (userZone < plantMinZone) {
    return { compatible: false, message: `Too cold for your zone ${userZone} (needs zone ${plantMinZone}+)` };
  } else {
    return { compatible: false, message: `May be too warm for zone ${userZone} (best in zones ${plantMinZone}-${maxZone})` };
  }
}

/**
 * Format plant dimensions from Perenual data.
 */
export interface Dimension {
  type: string;
  min_value: number;
  max_value: number;
  unit: string;
}

export function formatDimensions(dims: Dimension[] | null | undefined): {
  height: string | null;
  spread: string | null;
} {
  if (!dims || !Array.isArray(dims) || dims.length === 0) {
    return { height: null, spread: null };
  }

  const height = dims.find(d => d.type?.toLowerCase() === 'height');
  const spread = dims.find(d => d.type?.toLowerCase() === 'spread' || d.type?.toLowerCase() === 'width');

  const formatDim = (dim: Dimension | undefined): string | null => {
    if (!dim) return null;
    const { min_value, max_value, unit } = dim;
    if (min_value === max_value) {
      return `${min_value} ${unit}`;
    }
    return `${min_value}-${max_value} ${unit}`;
  };

  return {
    height: formatDim(height),
    spread: formatDim(spread),
  };
}

/**
 * Format growth rate for display.
 */
export function formatGrowthRate(rate: string | null | undefined): {
  label: string;
  icon: string;
  description: string;
} | null {
  if (!rate) return null;

  const rates: Record<string, { label: string; icon: string; description: string }> = {
    'high': { label: 'Fast', icon: '🚀', description: 'Grows quickly, needs regular attention' },
    'medium': { label: 'Moderate', icon: '🌱', description: 'Steady growth rate' },
    'low': { label: 'Slow', icon: '🐢', description: 'Takes time to establish' },
  };

  return rates[rate.toLowerCase()] || null;
}

/**
 * Format care level for display.
 */
export function formatCareLevel(level: string | null | undefined): {
  label: string;
  icon: string;
  description: string;
  color: string;
} | null {
  if (!level) return null;

  const levels: Record<string, { label: string; icon: string; description: string; color: string }> = {
    'low': { label: 'Easy', icon: '😊', description: 'Great for beginners', color: 'text-success' },
    'medium': { label: 'Moderate', icon: '👍', description: 'Some experience helpful', color: 'text-warning' },
    'high': { label: 'Demanding', icon: '🎯', description: 'Needs regular care', color: 'text-error' },
  };

  return levels[level.toLowerCase()] || null;
}

/**
 * Format maintenance level for display.
 */
export function formatMaintenance(level: string | null | undefined): {
  label: string;
  description: string;
} | null {
  if (!level) return null;

  const levels: Record<string, { label: string; description: string }> = {
    'low': { label: 'Low maintenance', description: 'Minimal pruning and care needed' },
    'medium': { label: 'Moderate maintenance', description: 'Regular pruning and feeding' },
    'high': { label: 'High maintenance', description: 'Frequent attention required' },
  };

  return levels[level.toLowerCase()] || null;
}

/**
 * Format watering requirements for display.
 */
export function formatWatering(
  watering: string | null | undefined,
  benchmark: { value?: string | null; unit?: string } | null | undefined
): {
  frequency: string;
  schedule: string | null;
  icon: string;
} | null {
  if (!watering) return null;

  const frequencies: Record<string, { frequency: string; icon: string }> = {
    'frequent': { frequency: 'Frequent watering', icon: '💧💧💧' },
    'average': { frequency: 'Average watering', icon: '💧💧' },
    'minimum': { frequency: 'Minimal watering', icon: '💧' },
    'none': { frequency: 'Drought tolerant', icon: '🏜️' },
  };

  const freq = frequencies[watering.toLowerCase()] || { frequency: watering, icon: '💧' };

  let schedule: string | null = null;
  if (benchmark?.value && benchmark?.unit) {
    schedule = `Every ${benchmark.value} ${benchmark.unit}`;
  }

  return {
    ...freq,
    schedule,
  };
}

/**
 * Format propagation methods for display.
 */
export function formatPropagation(methods: string[] | null | undefined): {
  method: string;
  difficulty: 'easy' | 'moderate' | 'advanced';
  icon: string;
}[] {
  if (!methods || methods.length === 0) return [];

  const methodInfo: Record<string, { difficulty: 'easy' | 'moderate' | 'advanced'; icon: string }> = {
    'seed': { difficulty: 'easy', icon: '🌰' },
    'seed propagation': { difficulty: 'easy', icon: '🌰' },
    'cutting': { difficulty: 'moderate', icon: '✂️' },
    'division': { difficulty: 'easy', icon: '🔪' },
    'layering': { difficulty: 'moderate', icon: '🌿' },
    'layering propagation': { difficulty: 'moderate', icon: '🌿' },
    'air layering propagation': { difficulty: 'advanced', icon: '🌬️' },
    'grafting': { difficulty: 'advanced', icon: '🔗' },
    'grafting propagation': { difficulty: 'advanced', icon: '🔗' },
    'tissue culture': { difficulty: 'advanced', icon: '🧪' },
    'stem propagation': { difficulty: 'moderate', icon: '🌱' },
    'hardwood cuttings': { difficulty: 'moderate', icon: '🪵' },
  };

  return methods.map(method => {
    const info = methodInfo[method.toLowerCase()] || { difficulty: 'moderate' as const, icon: '🌱' };
    return {
      method: method.charAt(0).toUpperCase() + method.slice(1).replace(' propagation', ''),
      ...info,
    };
  });
}

/**
 * Format wildlife attraction for display.
 */
export function formatAttracts(attracts: string[] | null | undefined): {
  name: string;
  icon: string;
}[] {
  if (!attracts || attracts.length === 0) return [];

  const icons: Record<string, string> = {
    'bees': '🐝',
    'butterflies': '🦋',
    'birds': '🐦',
    'hummingbirds': '🐦',
    'moths': '🦋',
    'pollinators': '🐝',
    'beneficial insects': '🐞',
    'ladybugs': '🐞',
  };

  return attracts.map(item => ({
    name: item.charAt(0).toUpperCase() + item.slice(1),
    icon: icons[item.toLowerCase()] || '🦋',
  }));
}

/**
 * Format flowering/fruiting season for display.
 */
export function formatSeason(season: string | null | undefined): string | null {
  if (!season) return null;
  // Capitalize first letter
  return season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
}

/**
 * Format colors array for display.
 */
export function formatColors(colors: string[] | null | undefined): string | null {
  if (!colors || colors.length === 0) return null;
  return colors
    .map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    .join(', ');
}

/**
 * Get localized name if available.
 */
export function getLocalizedName(
  plant: {
    name_fr?: string | null;
    name_es?: string | null;
    name_de?: string | null;
    name_it?: string | null;
    name_pt?: string | null;
    name_nl?: string | null;
    name_pl?: string | null;
  },
  lang: string
): string | null {
  const langMap: Record<string, keyof typeof plant> = {
    fr: 'name_fr',
    es: 'name_es',
    de: 'name_de',
    it: 'name_it',
    pt: 'name_pt',
    nl: 'name_nl',
    pl: 'name_pl',
  };

  const key = langMap[lang.toLowerCase()];
  return key ? (plant[key] as string | null) : null;
}

/**
 * Get all available localized names.
 */
export function getAllLocalizedNames(plant: {
  name_fr?: string | null;
  name_es?: string | null;
  name_de?: string | null;
  name_it?: string | null;
  name_pt?: string | null;
  name_nl?: string | null;
  name_pl?: string | null;
}): { lang: string; name: string; flag: string }[] {
  const langs = [
    { key: 'name_fr', lang: 'French', flag: '🇫🇷' },
    { key: 'name_es', lang: 'Spanish', flag: '🇪🇸' },
    { key: 'name_de', lang: 'German', flag: '🇩🇪' },
    { key: 'name_it', lang: 'Italian', flag: '🇮🇹' },
    { key: 'name_pt', lang: 'Portuguese', flag: '🇵🇹' },
    { key: 'name_nl', lang: 'Dutch', flag: '🇳🇱' },
    { key: 'name_pl', lang: 'Polish', flag: '🇵🇱' },
  ] as const;

  return langs
    .filter(l => plant[l.key as keyof typeof plant])
    .map(l => ({
      lang: l.lang,
      name: plant[l.key as keyof typeof plant] as string,
      flag: l.flag,
    }));
}
