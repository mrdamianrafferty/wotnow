/**
 * Peak Window Calculator for Findr
 *
 * Calculates the best upcoming fishing windows based on:
 * - Tide state (slack water and tide turns are often best)
 * - Time of day (dawn/dusk golden hours)
 * - Top species confidence scores
 *
 * Returns hourly windows with combined scores, filtering out past times.
 */

import type { TideExtreme } from './conditionHelpers';
import type { CardData } from './mapPrediction';

export interface PeakWindow {
  hour: number;           // 0-23
  displayTime: string;    // "14:00" formatted
  score: number;          // Combined score 0-100
  reason: string;         // "Tide turn + golden hour"
  tideBonus: number;      // 0-30
  lightBonus: number;     // 0-20
  speciesScore: number;   // Average of top species
}

export interface DailySummary {
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
  overallScore: number;           // 0-100
  topSpecies: CardData[];         // Top 3 species for this location
  peakWindows: PeakWindow[];      // Upcoming peak windows (future only)
  nextPeakWindow: PeakWindow | null;
}

/**
 * Calculate tide bonus for a given hour
 * Best times are around tide turns (slack water transitions)
 */
function calculateTideBonus(
  hour: number,
  tideExtremes: TideExtreme[],
  currentDate: Date
): { bonus: number; reason: string } {
  if (!tideExtremes || tideExtremes.length === 0) {
    return { bonus: 15, reason: '' }; // Neutral if no tide data
  }

  const targetTime = new Date(currentDate);
  targetTime.setHours(hour, 30, 0, 0); // Middle of the hour

  // Find closest tide extreme
  let closestTide: TideExtreme | null = null;
  let closestDiffMinutes = Infinity;

  for (const tide of tideExtremes) {
    const tideTime = new Date(tide.time);
    const diffMinutes = Math.abs(tideTime.getTime() - targetTime.getTime()) / (1000 * 60);

    if (diffMinutes < closestDiffMinutes) {
      closestDiffMinutes = diffMinutes;
      closestTide = tide;
    }
  }

  if (!closestTide) {
    return { bonus: 15, reason: '' };
  }

  // Score based on proximity to tide turn
  // Best: within 1 hour of tide turn (slack water transition)
  // Good: within 2 hours
  // Moderate: within 3 hours
  if (closestDiffMinutes <= 60) {
    const tideType = closestTide.type === 'high' ? 'high tide' : 'low tide';
    return { bonus: 30, reason: `${tideType} turn` };
  } else if (closestDiffMinutes <= 120) {
    return { bonus: 22, reason: 'tide moving' };
  } else if (closestDiffMinutes <= 180) {
    return { bonus: 15, reason: '' };
  }

  return { bonus: 10, reason: '' };
}

/**
 * Calculate light bonus for a given hour
 * Dawn and dusk are prime feeding times for many species
 */
function calculateLightBonus(hour: number): { bonus: number; reason: string } {
  // Dawn: 5-7am (peak at 6)
  if (hour >= 5 && hour <= 7) {
    if (hour === 6) {
      return { bonus: 20, reason: 'dawn' };
    }
    return { bonus: 15, reason: 'early morning' };
  }

  // Dusk: 17-20 (peak at 18-19)
  if (hour >= 17 && hour <= 20) {
    if (hour === 18 || hour === 19) {
      return { bonus: 20, reason: 'dusk' };
    }
    return { bonus: 15, reason: 'evening' };
  }

  // Midday is generally slower
  if (hour >= 11 && hour <= 14) {
    return { bonus: 5, reason: '' };
  }

  // Morning and afternoon are decent
  return { bonus: 10, reason: '' };
}

/**
 * Calculate average confidence of top N species
 */
function calculateTopSpeciesScore(species: CardData[], topN: number = 5): number {
  if (!species || species.length === 0) {
    return 50; // Neutral if no data
  }

  const topSpecies = species
    .filter(s => s.confidence != null)
    .slice(0, topN);

  if (topSpecies.length === 0) {
    return 50;
  }

  const sum = topSpecies.reduce((acc, s) => acc + (s.confidence ?? 0), 0);
  return Math.round(sum / topSpecies.length);
}

/**
 * Get overall rating from score
 */
function getOverallRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 75) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 35) return 'fair';
  return 'poor';
}

/**
 * Format hour to display time
 */
function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

/**
 * Build reason string from components
 */
function buildReason(tideReason: string, lightReason: string): string {
  const parts = [tideReason, lightReason].filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} + ${parts[1]}`;
}

/**
 * Calculate daily summary with peak windows
 *
 * @param species - All species predictions for this location
 * @param tideExtremes - Tide extremes for today
 * @param currentTime - Current time (defaults to now)
 * @returns Daily summary with peak windows
 */
export function calculateDailySummary(
  species: CardData[],
  tideExtremes: TideExtreme[] | null,
  currentTime?: Date
): DailySummary {
  const now = currentTime || new Date();
  const currentHour = now.getHours();

  // Get top species (already sorted by confidence from API)
  const topSpecies = species
    .filter(s => s.confidence != null && s.confidence > 0)
    .slice(0, 5);

  // Calculate base species score
  const speciesScore = calculateTopSpeciesScore(topSpecies);

  // Calculate hourly windows for remaining hours today
  const windows: PeakWindow[] = [];

  for (let hour = currentHour; hour <= 23; hour++) {
    const { bonus: tideBonus, reason: tideReason } = calculateTideBonus(
      hour,
      tideExtremes || [],
      now
    );
    const { bonus: lightBonus, reason: lightReason } = calculateLightBonus(hour);

    // Combined score: species base (50%) + tide (30%) + light (20%)
    const combinedScore = Math.round(
      speciesScore * 0.5 +
      tideBonus * 1.0 +  // 0-30 scaled to contribution
      lightBonus * 1.0   // 0-20 scaled to contribution
    );

    const reason = buildReason(tideReason, lightReason);

    windows.push({
      hour,
      displayTime: formatHour(hour),
      score: Math.min(100, combinedScore),
      reason,
      tideBonus,
      lightBonus,
      speciesScore,
    });
  }

  // Sort by score descending
  const sortedWindows = [...windows].sort((a, b) => b.score - a.score);

  // Filter to only include windows with meaningful bonuses (score > average)
  const avgScore = windows.reduce((a, w) => a + w.score, 0) / windows.length;
  const peakWindows = sortedWindows
    .filter(w => w.score >= avgScore && w.reason)
    .slice(0, 3);

  // Find next peak window (first future window with a reason)
  const nextPeakWindow = windows.find(w => w.hour > currentHour && w.reason) || null;

  // Overall score is based on best available window
  const bestWindowScore = peakWindows.length > 0 ? peakWindows[0].score : speciesScore;
  const overallScore = Math.round((speciesScore + bestWindowScore) / 2);

  return {
    overallRating: getOverallRating(overallScore),
    overallScore,
    topSpecies,
    peakWindows,
    nextPeakWindow,
  };
}
