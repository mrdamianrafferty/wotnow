// src/utils/activitySuitability.ts

import { classifyWindRelative, onshoreComponentScore } from './orientation';

// --- Types ---
export interface WeatherData {
  // Land conditions
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  clouds?: number;
  humidity?: number;
  visibility?: number;

  // Marine conditions (optional if available)
  waterTemperature?: number;
  waveHeight?: number;
  swellHeight?: number;
  swellPeriod?: number;
  swellDirection?: number;
  windDirection?: number;

  // Contextual fields (non-weather but needed for evaluation)
  beachOrientation?: number; // seaward-facing beach bearing (0–359)

  // Fallback for any other numeric fields
  [key: string]: number | undefined | null;
}

// Minimal activity shape used by suitability helpers
export type MinimalActivity = {
  weatherSensitive?: boolean;
  usesWindRelative?: boolean;
  poorConditions?: string[];
  fairConditions?: string[];
  goodConditions?: string[];
  perfectConditions?: string[];
};

// --- Parsing & Evaluation Utilities ---

/**
 * Extracts the weather key name from a condition string
 * (e.g., "temperature>15" → "temperature")
 */
export function extractWeatherKey(condition: string): string {
  const rangeMatch = condition.match(/^([a-zA-Z_]+)=(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) return rangeMatch[1];
  const opMatch = condition.match(/^([a-zA-Z_]+)[<>=!]=?/);
  if (opMatch) return opMatch[1];
  return condition;
}

/**
 * Parses a condition string into key/operator/value
 */
export function parseConditionString(condition: string):
  | { key: string; operator: 'range'; min: number; max: number }
  | { key: string; operator: string; value: number }
  | null
{
  const rangeMatch = condition.match(/^([a-zA-Z_]+)=(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return {
      key: rangeMatch[1],
      operator: 'range',
      min: parseFloat(rangeMatch[2]),
      max: parseFloat(rangeMatch[3]),
    };
  }
  const opMatch = condition.match(/^([a-zA-Z_]+)([<>=!]=?|==)(-?\d+(?:\.\d+)?)/);
  if (opMatch) {
    return {
      key: opMatch[1],
      operator: opMatch[2],
      value: parseFloat(opMatch[3]),
    };
  }
  return null;
}

// --- Wind-relative token support ---
const WIND_REL_REGEX = /^windRelative=(onshore|offshore|cross-shore|side-onshore|side-offshore)$/;

/**
 * Returns 1 for a match, 0 for a non-match, 0.5 when data is missing,
 * or null when the token is not a windRelative token.
 */
function evaluateWindRelativeToken(token: string, weather: WeatherData): number | null {
  const m = token.match(WIND_REL_REGEX);
  if (!m) return null;
  const wanted = m[1] as 'onshore' | 'offshore' | 'cross-shore' | 'side-onshore' | 'side-offshore';
  const { windDirection, beachOrientation } = weather;
  if (typeof windDirection !== 'number' || typeof beachOrientation !== 'number') return 0.5;
  const actual = classifyWindRelative(beachOrientation, windDirection);
  return actual === wanted ? 1 : 0;
}

/**
 * Graduated scoring: returns a 0–1 score for how well a single condition is met.
 */
export function evaluateConditionScore(condition: string, weather: WeatherData): number {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;

  const value = weather[parsed.key];
  if (value === undefined || value === null) return 0.5; // neutral for missing data

  if (parsed.operator === 'range') {
    if ('min' in parsed && 'max' in parsed) {
      const { min, max } = parsed;
      const center = (min + max) / 2;
      const span = max - min;
      if (value >= min && value <= max) {
        return 1 - Math.abs(value - center) / (span / 2);
      }
      const overflow = value < min ? min - value : value - max;
      return Math.max(0, 1 - overflow / span);
    }
    return 0;
  }

  switch (parsed.operator) {
    case '>':
      return value > parsed.value ? 1 : Math.max(0, value / parsed.value);
    case '>=':
      return value >= parsed.value ? 1 : Math.max(0, value / parsed.value);
    case '<':
      return value < parsed.value ? 1 : Math.max(0, parsed.value / Math.max(value, 0.1));
    case '<=':
      return value <= parsed.value ? 1 : Math.max(0, parsed.value / Math.max(value, 0.1));
    case '=':
    case '==': {
      const tolerance = Math.max(parsed.value * 0.1, 1);
      return Math.max(0, 1 - Math.abs(value - parsed.value) / tolerance);
    }
    case '!=':
      return value !== parsed.value ? 1 : 0;
    default:
      return 0;
  }
}

// --- Compound conditions (AND / OR) ---
// Split helpers (support "and" / "&" and "or" / "|" / "||")
const AND_SPLIT_RE = /\s*&\s*|\s+\band\b\s+/i;
const OR_SPLIT_RE  = /\s+\bor\b\s+|\s*\|\|\s*|\s*\|\s*/i;

/**
 * If a token within an OR/AND group omits the key (e.g. "26..28"),
 * reuse the previous key and add the appropriate operator.
 */
function withImpliedKey(token: string, lastKey: string | undefined): string {
  const t = token.trim();
  if (!t) return t;
  // If it already starts with a letter (has its own key), leave it alone
  if (/^[a-zA-Z_]/.test(t)) return t;
  if (!lastKey) return t;

  // Add "=" for range like "26..28"
  if (/^\d/.test(t) && t.includes('..')) return `${lastKey}=${t}`;
  // If it starts with a comparator or "=", just prefix the key
  if (/^[<>=!]/.test(t) || t.startsWith('=')) return `${lastKey}${t}`;
  // For bare windRelative alternatives like "offshore"
  if (/^[a-z-]+$/i.test(t)) return `${lastKey}=${t}`;
  return `${lastKey}=${t}`;
}

/**
 * Evaluate a single atomic condition token into a score and whether it counts.
 * - windRelative tokens always "count" (missing data yields 0.5)
 * - numeric tokens only count if the referenced weather key exists
 */
function evalAtomicScore(token: string, weather: WeatherData): { score: number; counted: boolean } {
  const trimmed = token.trim();
  if (!trimmed) return { score: 0, counted: false };

  const windRelScore = evaluateWindRelativeToken(trimmed, weather);
  if (windRelScore !== null) {
    return { score: windRelScore, counted: true };
  }

  const parsed = parseConditionString(trimmed);
  if (!parsed) return { score: 0, counted: false };
  const key = parsed.key;
  const val = weather[key];
  if (val === undefined || val === null) return { score: 0, counted: false };
  return { score: evaluateConditionScore(trimmed, weather), counted: true };
}

/**
 * Evaluate an expression with optional OR and AND.
 * Precedence: OR splits first, then each branch is an AND of atoms.
 * Scoring: AND takes the min of its parts; OR takes the max of its branches.
 * Counting: the whole expression counts if any branch has at least one counted atom.
 */
function evalCompoundScore(expr: string, weather: WeatherData): { score: number; counted: boolean } {
  const orParts = expr.split(OR_SPLIT_RE).map(s => s.trim()).filter(Boolean);
  if (orParts.length <= 1) {
    // Single branch -> AND only
    let lastKey: string | undefined;
    const atoms = expr.split(AND_SPLIT_RE).map(s => s.trim()).filter(Boolean);
    const scores: number[] = [];
    for (const raw of atoms) {
      const token = withImpliedKey(raw, lastKey);
      const parsed = parseConditionString(token);
      if (parsed) lastKey = parsed.key;
      const { score, counted } = evalAtomicScore(token, weather);
      if (counted) scores.push(score);
    }
    if (!scores.length) return { score: 0, counted: false };
    return { score: Math.min(...scores), counted: true };
  }

  // OR of AND branches
  let anyCounted = false;
  let best = 0;
  for (const branch of orParts) {
    let lastKey: string | undefined;
    const atoms = branch.split(AND_SPLIT_RE).map(s => s.trim()).filter(Boolean);
    const scores: number[] = [];
    for (const raw of atoms) {
      const token = withImpliedKey(raw, lastKey);
      const parsed = parseConditionString(token);
      if (parsed) lastKey = parsed.key;
      const { score, counted } = evalAtomicScore(token, weather);
      if (counted) scores.push(score);
    }
    if (!scores.length) continue;
    anyCounted = true;
    const branchScore = Math.min(...scores);
    if (branchScore > best) best = branchScore;
  }
  return { score: best, counted: anyCounted };
}

export function calculateConditionMatchScore(
  conditions: string[],
  weather: WeatherData
): number {
  if (conditions.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const cond of conditions) {
    const { score, counted } = evalCompoundScore(cond, weather);
    if (!counted) continue;
    total += score;
    count++;
  }
  return count > 0 ? total / count : 0;
}

/**
 * Calculates a penalty (0–1) from poor conditions—higher when conditions are bad.
 */
export function calculatePoorConditionPenalty(
  conditions: string[],
  weather: WeatherData
): number {
  if (conditions.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const cond of conditions) {
    const { score, counted } = evalCompoundScore(cond, weather);
    if (!counted) continue;
    if (score > 0.7) {
      total += score;
      count++;
    }
  }
  return count > 0 ? Math.min(1, total / count) : 0;
}

// --- Legacy boolean evaluators (deprecated) ---

export function safeEvaluate(cond: string, weather: WeatherData): boolean {
  const { score, counted } = evalCompoundScore(cond, weather);
  if (!counted) return true; // preserve neutral pass on missing data
  return score > 0.5;
}

/**
 * Poor-condition evaluator: returns true only when the expression can be
 * evaluated (has at least one counted atom) AND its score exceeds 0.5.
 * Missing data should NOT trigger poor conditions.
 */
export function safeEvaluatePoor(cond: string, weather: WeatherData): boolean {
  const { score, counted } = evalCompoundScore(cond, weather);
  if (!counted) return false; // do not trigger on missing data
  return score > 0.5;
}

// Missing data no longer triggers poor conditions
export function hasPoorCondition(
  activity: { poorConditions?: string[] },
  weather: WeatherData
): boolean {
  return !!activity.poorConditions?.some(c => safeEvaluatePoor(c, weather));
}

export function hasPerfectConditions(
  activity: { perfectConditions?: string[] },
  weather: WeatherData
): boolean {
  return !!activity.perfectConditions?.length &&
    activity.perfectConditions.every(c => safeEvaluate(c, weather));
}

export function hasGoodConditions(
  activity: { goodConditions?: string[] },
  weather: WeatherData
): boolean {
  return !!activity.goodConditions?.length &&
    activity.goodConditions.every(c => safeEvaluate(c, weather));
}

// --- Primary categorical suitability function (legacy) ---

/**
 * Returns one of: excluded, perfect, good, fair, indoor.
 * Treats weatherSensitive=false as indoor.
 */
export function getActivitySuitability(
  activity: MinimalActivity,
  weather: WeatherData
): 'excluded' | 'perfect' | 'good' | 'fair' | 'indoor' {
  if (activity.weatherSensitive === false) {
    return 'indoor';
  }
  if (hasPoorCondition(activity, weather)) return 'excluded';
  if (hasPerfectConditions(activity, weather)) return 'perfect';
  if (hasGoodConditions(activity, weather)) return 'good';
  const noConds =
    (!activity.goodConditions?.length) &&
    (!activity.perfectConditions?.length);
  if (noConds) return 'fair';
  return 'excluded';
}

// --- Enhanced numeric scoring for hero box ---

/**
 * Computes a 0–100 score for an activity based on weather.
 */
export function calculateActivityScore(
  activity: MinimalActivity,
  weather: WeatherData
): number {
  if (activity.weatherSensitive === false) return 50;
  const pScore = calculateConditionMatchScore(activity.perfectConditions || [], weather);
  const gScore = calculateConditionMatchScore(activity.goodConditions || [], weather);
  const penalty = calculatePoorConditionPenalty(activity.poorConditions || [], weather);

  let base = 25;
  if (pScore >= 0.8) base = 80 + pScore * 20;
  else if (gScore >= 0.6) base = 60 + gScore * 20;
  else if (pScore >= 0.4 || gScore >= 0.4) base = 30 + Math.max(pScore, gScore) * 30;
  base = Math.max(0, base - penalty * 40);

  // Optional wind-relative nudge when available and opted-in by the activity
  if (activity?.usesWindRelative && typeof weather.beachOrientation === 'number' && typeof weather.windDirection === 'number') {
    base += onshoreComponentScore(weather.beachOrientation, weather.windDirection) * 15; // ±15 points
  }

  // Clamp and round
  base = Math.max(0, Math.min(100, base));
  return Math.round(base);
}

/**
 * Converts a numeric score back to a categorical level (for compatibility).
 */
export function categorizeByScore(
  score: number,
  isIndoor: boolean
): 'perfect' | 'good' | 'fair' | 'indoor' | 'excluded' {
  if (isIndoor) return 'indoor';
  if (score >= 80) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 30) return 'fair';
  return 'excluded';
}

/**
 * Provides a human-readable explanation for the score.
 */
export function generateScoreReasoning(
  activity: MinimalActivity,
  weather: WeatherData,
  isEvening: boolean,
  finalScore: number
): string {
  if (activity.weatherSensitive === false) {
    return `Indoor activity${isEvening ? ' (evening boost)' : ''}`;
  }
  const pScore = calculateConditionMatchScore(activity.perfectConditions || [], weather);
  const gScore = calculateConditionMatchScore(activity.goodConditions || [], weather);
  const penalty = calculatePoorConditionPenalty(activity.poorConditions || [], weather);

  const parts: string[] = [];
  if (pScore > 0.6) parts.push(`Perfect conditions: ${Math.round(pScore * 100)}%`);
  if (gScore > 0.6) parts.push(`Good conditions: ${Math.round(gScore * 100)}%`);
  if (penalty > 0.2) parts.push(`Poor conditions penalty: -${Math.round(penalty * 40)} pts`);
  if (isEvening) parts.push('Evening boost applied');

  if (activity?.usesWindRelative && typeof weather.beachOrientation === 'number' && typeof weather.windDirection === 'number') {
    try {
      const rel = classifyWindRelative(weather.beachOrientation, weather.windDirection);
      parts.push(`Wind is ${rel.replace('-', ' ')} vs beach`);
    } catch { /* ignore */ }
  }

  return parts.length ? parts.join(', ') : `Score: ${finalScore}/100`;
}
