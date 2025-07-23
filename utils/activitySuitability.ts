// src/utils/activitySuitability.ts

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

  // Fallback for any other numeric fields
  [key: string]: number | undefined | null;
}

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

/**
 * Graduated scoring: returns a 0–1 score for how well a single condition is met.
 */
export function evaluateConditionScore(condition: string, weather: WeatherData): number {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;

  const value = weather[parsed.key];
  if (value === undefined || value === null) return 0.5; // neutral for missing data

  if (parsed.operator === 'range') {
    const { min, max } = parsed;
    const center = (min + max) / 2;
    const span = max - min;
    if (value >= min && value <= max) {
      return 1 - Math.abs(value - center) / (span / 2);
    }
    const overflow = value < min ? min - value : value - max;
    return Math.max(0, 1 - overflow / span);
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

/**
 * Aggregates multiple condition scores into a single 0–1 match score.
 */
export function calculateConditionMatchScore(
  conditions: string[],
  weather: WeatherData
): number {
  if (conditions.length === 0) return 0;
  let total = 0;
  let count = 0;
  for (const cond of conditions) {
    const key = extractWeatherKey(cond);
    if (weather[key] === undefined || weather[key] === null) continue;
    total += evaluateConditionScore(cond, weather);
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
    const key = extractWeatherKey(cond);
    if (weather[key] === undefined || weather[key] === null) continue;
    const score = evaluateConditionScore(cond, weather);
    if (score > 0.7) total += score;
    count++;
  }
  return count > 0 ? Math.min(1, total / count) : 0;
}

// --- Legacy boolean evaluators (deprecated) ---

export function safeEvaluate(cond: string, weather: WeatherData): boolean {
  const key = extractWeatherKey(cond);
  const val = weather[key];
  if (val === undefined || val === null) return true;
  return evaluateConditionScore(cond, weather) > 0.5;
}

export function hasPoorCondition(
  activity: { poorConditions?: string[] },
  weather: WeatherData
): boolean {
  return !!activity.poorConditions?.some(c => safeEvaluate(c, weather));
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
 * Returns one of: excluded, perfect, good, acceptable, indoor.
 * Treats weatherSensitive=false as indoor.
 */
export function getActivitySuitability(
  activity: any,
  weather: WeatherData
): 'excluded' | 'perfect' | 'good' | 'acceptable' | 'indoor' {
  if (activity.weatherSensitive === false) {
    return 'indoor';
  }
  if (hasPoorCondition(activity, weather)) return 'excluded';
  if (hasPerfectConditions(activity, weather)) return 'perfect';
  if (hasGoodConditions(activity, weather)) return 'good';
  const noConds =
    (!activity.goodConditions?.length) &&
    (!activity.perfectConditions?.length);
  if (noConds) return 'acceptable';
  return 'excluded';
}

// --- Enhanced numeric scoring for hero box ---

/**
 * Computes a 0–100 score for an activity based on weather.
 */
export function calculateActivityScore(
  activity: any,
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
  return Math.round(base);
}

/**
 * Converts a numeric score back to a categorical level (for compatibility).
 */
export function categorizeByScore(
  score: number,
  isIndoor: boolean
): 'perfect' | 'good' | 'acceptable' | 'indoor' | 'excluded' {
  if (isIndoor) return 'indoor';
  if (score >= 80) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 30) return 'acceptable';
  return 'excluded';
}

/**
 * Provides a human-readable explanation for the score.
 */
export function generateScoreReasoning(
  activity: any,
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
  return parts.length ? parts.join(', ') : `Score: ${finalScore}/100`;
}
