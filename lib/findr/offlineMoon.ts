/**
 * Offline Moon Phase Calculator for Findr
 *
 * Calculates moon phases entirely client-side using the suncalc library.
 * Moon phases are deterministic - they can be calculated without any API calls.
 *
 * Features:
 * - Zero network dependency for core moon data
 * - Caches calculated values in localStorage for instant access
 * - Provides fishing-relevant moon information (phase, illumination, times)
 * - Works offline after initial page load
 *
 * Usage:
 * ```typescript
 * import { getOfflineMoonData, getMoonPhaseForDate } from '@/lib/findr/offlineMoon';
 *
 * // Get moon data for today
 * const moon = getOfflineMoonData(43.36, -5.86);
 *
 * // Get moon phase for a specific date
 * const phase = getMoonPhaseForDate(new Date('2025-01-15'));
 * ```
 */

import { getMoonTimes, getTimes, getMoonIllumination } from 'suncalc';

const STORAGE_KEY = 'findr_moon_cache';
const SYNODIC_MONTH_DAYS = 29.530588853; // Days in a lunar cycle

/**
 * Moon phase data structure
 */
export interface OfflineMoonData {
  date: string; // YYYY-MM-DD
  lat: number;
  lon: number;

  // Phase information
  phase: number; // 0-1 (0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter)
  phaseName: string; // Human-readable name
  phaseEmoji: string; // Moon emoji
  illumination: number; // 0-100%
  stage: 'waxing' | 'waning';
  ageDays: number; // Days since new moon

  // Rise/set times (ISO strings, may be undefined if moon doesn't rise/set that day)
  moonrise?: string;
  moonset?: string;
  sunrise?: string;
  sunset?: string;

  // Fishing-relevant data
  tideType: 'spring' | 'neap';
  daysUntilFullMoon: number;
  daysUntilNewMoon: number;

  // Transit times for solunar theory
  moonTransit?: string; // Moon overhead (upper culmination)
  moonUnderfoot?: string; // Moon underfoot (lower culmination)

  // Cache metadata
  calculatedAt: string;
}

/**
 * Get moon phase name from phase value (0-1)
 */
function getMoonPhaseName(phase: number): string {
  // Phase: 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
  if (phase < 0.03 || phase > 0.97) return 'new_moon';
  if (phase < 0.22) return 'waxing_crescent';
  if (phase < 0.28) return 'first_quarter';
  if (phase < 0.47) return 'waxing_gibbous';
  if (phase < 0.53) return 'full_moon';
  if (phase < 0.72) return 'waning_gibbous';
  if (phase < 0.78) return 'last_quarter';
  return 'waning_crescent';
}

/**
 * Get emoji for moon phase
 */
function getMoonPhaseEmoji(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return '🌑';
  if (phase < 0.22) return '🌒';
  if (phase < 0.28) return '🌓';
  if (phase < 0.47) return '🌔';
  if (phase < 0.53) return '🌕';
  if (phase < 0.72) return '🌖';
  if (phase < 0.78) return '🌗';
  return '🌘';
}

/**
 * Determine tide type based on moon phase
 * Spring tides: New and full moon (stronger tides)
 * Neap tides: Quarter moons (weaker tides)
 */
function getTideType(phaseName: string): 'spring' | 'neap' {
  return phaseName === 'new_moon' || phaseName === 'full_moon' ? 'spring' : 'neap';
}

/**
 * Calculate days until next full/new moon
 */
function calculateDaysUntilPhases(phase: number): { daysUntilFullMoon: number; daysUntilNewMoon: number } {
  const currentDay = phase * SYNODIC_MONTH_DAYS;
  const fullMoonDay = SYNODIC_MONTH_DAYS / 2; // Day ~14.76
  const newMoonDay = SYNODIC_MONTH_DAYS; // Day ~29.53

  let daysUntilFullMoon: number;
  let daysUntilNewMoon: number;

  if (currentDay < fullMoonDay) {
    daysUntilFullMoon = fullMoonDay - currentDay;
    daysUntilNewMoon = newMoonDay - currentDay;
  } else {
    daysUntilFullMoon = (SYNODIC_MONTH_DAYS - currentDay) + fullMoonDay;
    daysUntilNewMoon = newMoonDay - currentDay;
  }

  return {
    daysUntilFullMoon: Math.round(daysUntilFullMoon),
    daysUntilNewMoon: Math.round(daysUntilNewMoon)
  };
}

/**
 * Calculate moon transit times (solunar theory)
 * Transit is approximately the midpoint between moonrise and moonset
 */
function calculateTransitTimes(moonriseDate?: Date, moonsetDate?: Date): { transit?: string; underfoot?: string } {
  if (!moonriseDate && !moonsetDate) {
    return {};
  }

  let transitTime: Date | undefined;

  if (moonriseDate && moonsetDate) {
    // Normal case: calculate midpoint
    let riseMs = moonriseDate.getTime();
    let setMs = moonsetDate.getTime();

    // Handle case where moonset is before moonrise (crosses midnight)
    if (setMs < riseMs) {
      setMs += 24 * 60 * 60 * 1000;
    }

    transitTime = new Date((riseMs + setMs) / 2);
  } else if (moonriseDate) {
    // Estimate transit ~6 hours after moonrise
    transitTime = new Date(moonriseDate.getTime() + 6 * 60 * 60 * 1000);
  } else if (moonsetDate) {
    // Estimate transit ~6 hours before moonset
    transitTime = new Date(moonsetDate.getTime() - 6 * 60 * 60 * 1000);
  }

  if (!transitTime) return {};

  // Underfoot is approximately 12 hours from transit
  const underfootTime = new Date(transitTime.getTime() + 12 * 60 * 60 * 1000);

  return {
    transit: transitTime.toISOString(),
    underfoot: underfootTime.toISOString()
  };
}

/**
 * Format date as HH:MM string
 */
function formatTime(date?: Date): string | undefined {
  if (!date || isNaN(date.getTime())) return undefined;
  return date.toISOString().substring(11, 16);
}

/**
 * Get cache key for a date/location
 */
function getCacheKey(lat: number, lon: number, date: string): string {
  // Round coordinates to 1 decimal place for caching (good enough for moon data)
  const latRounded = Math.round(lat * 10) / 10;
  const lonRounded = Math.round(lon * 10) / 10;
  return `${date}_${latRounded}_${lonRounded}`;
}

/**
 * Get moon data from localStorage cache
 */
function getFromCache(lat: number, lon: number, date: string): OfflineMoonData | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const cache = JSON.parse(cached) as Record<string, OfflineMoonData>;
    const key = getCacheKey(lat, lon, date);

    return cache[key] || null;
  } catch {
    return null;
  }
}

/**
 * Save moon data to localStorage cache
 */
function saveToCache(data: OfflineMoonData): void {
  if (typeof window === 'undefined') return;

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    const cache = cached ? JSON.parse(cached) as Record<string, OfflineMoonData> : {};

    const key = getCacheKey(data.lat, data.lon, data.date);
    cache[key] = data;

    // Keep only last 14 days of cache to avoid storage bloat
    const keys = Object.keys(cache);
    if (keys.length > 14) {
      const sortedKeys = keys.sort();
      const keysToRemove = sortedKeys.slice(0, keys.length - 14);
      keysToRemove.forEach(k => delete cache[k]);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('[offlineMoon] Failed to cache moon data:', e);
  }
}

/**
 * Calculate moon data for a specific date and location
 * Uses suncalc library - works entirely offline
 */
export function calculateMoonData(lat: number, lon: number, date: Date = new Date()): OfflineMoonData {
  // Get moon illumination (phase, fraction, angle)
  const moonIllum = getMoonIllumination(date);

  // Get moon rise/set times
  const moonTimes = getMoonTimes(date, lat, lon);

  // Get sun rise/set times
  const sunTimes = getTimes(date, lat, lon);

  // Calculate phase information
  const phase = moonIllum.phase;
  const phaseName = getMoonPhaseName(phase);
  const illumination = Math.round(moonIllum.fraction * 100);
  const stage: 'waxing' | 'waning' = phase < 0.5 ? 'waxing' : 'waning';
  const ageDays = Math.round(phase * SYNODIC_MONTH_DAYS * 10) / 10;

  // Calculate days until phases
  const { daysUntilFullMoon, daysUntilNewMoon } = calculateDaysUntilPhases(phase);

  // Calculate transit times
  const { transit, underfoot } = calculateTransitTimes(moonTimes.rise, moonTimes.set);

  // Format date string
  const dateStr = date.toISOString().split('T')[0];

  const moonData: OfflineMoonData = {
    date: dateStr,
    lat,
    lon,
    phase,
    phaseName,
    phaseEmoji: getMoonPhaseEmoji(phase),
    illumination,
    stage,
    ageDays,
    moonrise: moonTimes.rise ? moonTimes.rise.toISOString() : undefined,
    moonset: moonTimes.set ? moonTimes.set.toISOString() : undefined,
    sunrise: sunTimes.sunrise && !isNaN(sunTimes.sunrise.getTime()) ? sunTimes.sunrise.toISOString() : undefined,
    sunset: sunTimes.sunset && !isNaN(sunTimes.sunset.getTime()) ? sunTimes.sunset.toISOString() : undefined,
    tideType: getTideType(phaseName),
    daysUntilFullMoon,
    daysUntilNewMoon,
    moonTransit: transit,
    moonUnderfoot: underfoot,
    calculatedAt: new Date().toISOString(),
  };

  return moonData;
}

/**
 * Get moon data with caching
 * This is the main entry point for offline moon data
 */
export function getOfflineMoonData(lat: number, lon: number, date: Date = new Date()): OfflineMoonData {
  const dateStr = date.toISOString().split('T')[0];

  // Try cache first
  const cached = getFromCache(lat, lon, dateStr);
  if (cached) {
    return cached;
  }

  // Calculate fresh data
  const moonData = calculateMoonData(lat, lon, date);

  // Save to cache
  saveToCache(moonData);

  return moonData;
}

/**
 * Get moon phase for a specific date (simplified version without location-specific times)
 */
export function getMoonPhaseForDate(date: Date = new Date()): {
  phase: number;
  phaseName: string;
  phaseEmoji: string;
  illumination: number;
  tideType: 'spring' | 'neap';
} {
  const moonIllum = getMoonIllumination(date);
  const phase = moonIllum.phase;
  const phaseName = getMoonPhaseName(phase);

  return {
    phase,
    phaseName,
    phaseEmoji: getMoonPhaseEmoji(phase),
    illumination: Math.round(moonIllum.fraction * 100),
    tideType: getTideType(phaseName),
  };
}

/**
 * Pre-cache moon data for the next 7 days
 * Call this when the app loads to ensure offline availability
 */
export function preCacheMoonData(lat: number, lon: number, days: number = 7): void {
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // This will calculate and cache the data
    getOfflineMoonData(lat, lon, date);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[offlineMoon] Pre-cached ${days} days of moon data for ${lat}, ${lon}`);
  }
}

/**
 * Get formatted moon times for display
 */
export function getFormattedMoonTimes(moonData: OfflineMoonData): {
  moonrise: string;
  moonset: string;
  sunrise: string;
  sunset: string;
  moonTransit: string;
} {
  const formatIso = (iso?: string): string => {
    if (!iso) return '—';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  return {
    moonrise: formatIso(moonData.moonrise),
    moonset: formatIso(moonData.moonset),
    sunrise: formatIso(moonData.sunrise),
    sunset: formatIso(moonData.sunset),
    moonTransit: formatIso(moonData.moonTransit),
  };
}

/**
 * Check if we have cached moon data for a date/location
 */
export function hasCachedMoonData(lat: number, lon: number, date: Date = new Date()): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return getFromCache(lat, lon, dateStr) !== null;
}

/**
 * Clear all cached moon data
 */
export function clearMoonCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export default {
  getOfflineMoonData,
  calculateMoonData,
  getMoonPhaseForDate,
  preCacheMoonData,
  getFormattedMoonTimes,
  hasCachedMoonData,
  clearMoonCache,
};
