// src/utils/activitySuitability.ts

import { classifyWindRelative, onshoreComponentScore } from './orientation';
import { getSnowActivityRecommendation } from './snowRecommendations';
import type { SnowRecommendation } from './snowRecommendations';
import { getWindActivityRecommendation } from './windRecommendations';
import type { WindRecommendation } from './windRecommendations';
import { assessSoilCondition, isMudSensitive } from './soilMoistureUtils';

// --- Types ---
export interface WeatherData {
  // Land conditions
  temperature?: number;
  /** Alias of `temperature`. Both spellings appear across data/activities. */
  airTemperature?: number;
  /** Overnight minimum, for activities decided by the night rather than the day. */
  temperatureMin?: number;
  precipitation?: number;
  /** Hours of the period with measurable rain, where the source publishes it. */
  precipitationHours?: number;

  /** Mean wind over the period, m/s. What a day feels like. */
  windSpeed?: number;
  /** Peak sustained wind, m/s. What a safety limit is set against. */
  windSpeedMax?: number;
  /** Peak gust, m/s. Absent rather than inferred when unpublished. */
  gust?: number;
  clouds?: number;
  /** Alias of `clouds`. Both spellings appear across data/activities. */
  cloudCover?: number;
  humidity?: number;
  visibility?: number;
  // ➕ optional soil moisture (0–1 m3/m3 or 0–100 %)
  soilMoisture?: number;

  // Snow conditions (optional)
  snowDepthCm?: number;          // cm
  snowfallRateMmH?: number;      // mm/h

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
  /**
   * Every scored value is a NUMBER. Deliberately, and it is load-bearing.
   *
   * The band grammar compares `key` against a threshold, and two of the reads
   * below guard only against absent rather than against non-numeric. Rain
   * TIMING wanted to live here and does not: it is a word, it is never
   * compared against a threshold, and putting it behind this signature would
   * make it possible for a future band to try. It reaches the copy layer
   * through ReasonInput instead — see utils/activityReasons.
   */
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
  // Optional identity/metadata for snow-awareness
  id?: string;
  name?: string;
  category?: string;
  secondaryCategory?: string;
  tags?: string[];
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

      /**
       * A range anchored at zero is a ceiling, not a target.
       *
       * `precipitation=0..2` means "up to 2 mm is fine". Centre-weighting scored
       * it as though 1 mm were ideal and a dry day were a total miss — a
       * perfectly dry day scored ZERO on that criterion, which then dragged the
       * whole band's mean down. Measured: kayaking on a flat calm 16 °C morning
       * could not reach its own perfect band because it was not raining.
       *
       * The same reading is right for every zero-anchored quantity in the
       * library — rain, wave height, cloud, snow — where less is never worse.
       */
      if (min === 0) {
        if (value <= max) return 1;
        return Math.max(0, 1 - (value - max) / Math.max(max, 1));
      }

      /**
       * Inside the range always beats outside it.
       *
       * The old curve was `1 - |v-centre|/(span/2)`, which is 1 at the centre and
       * ZERO at both edges — so a temperature sitting exactly on the boundary of
       * an activity's perfect range scored the same as one nowhere near it. Only
       * the precise midpoint scored full marks, which made every band harder to
       * reach the wider it was written and biased the whole library downwards.
       *
       * In-range now spans 1 down to 0.5, out-of-range 0.5 down to 0. Same shape,
       * same centre preference, but the two cases can no longer collide.
       */
      const center = (min + max) / 2;
      const span = max - min;
      if (value >= min && value <= max) {
        return 1 - 0.5 * Math.abs(value - center) / (span / 2);
      }
      const overflow = value < min ? min - value : value - max;
      return Math.max(0, 0.5 * (1 - overflow / span));
    }
    return 0;
  }

  switch (parsed.operator) {
    case '>': {
      if (value > parsed.value) return 1;
      const deficit = parsed.value - value;
      const span = Math.max(Math.abs(parsed.value), 1);
      const normalized = Math.max(0, 1 - deficit / span);
      return normalized * 0.5;
    }
    case '>=': {
      if (value >= parsed.value) return 1;
      const deficit = parsed.value - value;
      const span = Math.max(Math.abs(parsed.value), 1);
      const normalized = Math.max(0, 1 - deficit / span);
      return normalized * 0.5;
    }
    case '<': {
      if (value < parsed.value) return 1;
      const overshoot = value - parsed.value;
      const span = Math.max(Math.abs(parsed.value), 1);
      const normalized = Math.max(0, 1 - overshoot / span);
      return normalized * 0.5;
    }
    case '<=': {
      if (value <= parsed.value) return 1;
      const overshoot = value - parsed.value;
      const span = Math.max(Math.abs(parsed.value), 1);
      const normalized = Math.max(0, 1 - overshoot / span);
      return normalized * 0.5;
    }
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

  /**
   * OR of AND branches.
   *
   * `defaultKey` is seeded from the FIRST branch and carried into every
   * subsequent one, which is the whole point of the shorthand and was the one
   * place it did not work. `lastKey` used to be declared inside this loop, so it
   * reset to undefined on each branch — meaning the second half of
   * `windSpeed=1.5..2.5 or 8..10.8` had no key to inherit, failed to parse, and
   * was dropped. The expression then degenerated to its first branch alone.
   *
   * Every criterion in the library written as `key=A..B or C..D` was affected:
   * a value in the second range scored ZERO, exactly as though it had matched
   * nothing. Measured before the fix, inland windsurfing at Force 5 could not
   * match the fair band that had been written for it. Forms where both branches
   * name their key (`temperature<5 or temperature>28`) were always fine, which
   * is why this survived.
   */
  const defaultKey = parseConditionString(
    orParts[0].split(AND_SPLIT_RE)[0].trim(),
  )?.key;

  let anyCounted = false;
  let best = 0;
  for (const branch of orParts) {
    let lastKey: string | undefined = defaultKey;
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

/**
 * One condition string, scored, with enough context to write a sentence about.
 *
 * The per-criterion score was always computed and always thrown away — the band
 * average was the only thing that survived, so the engine knew a Tuesday scored
 * 62 because the gust was marginal and could only tell the reader "Good weather
 * for Go Kayaking". Keeping the parts is what lets the copy name a reason.
 */
export interface CriterionScore {
  /**
   * This criterion is the reason for the score, by construction — not merely the
   * weakest of several that all passed.
   *
   * The copy layer normally quotes a limiting clause only when the binding
   * criterion scores below a threshold, which stops a good day's softest link
   * being read out as a complaint. That test is right for criteria the bands
   * produced and wrong for one the scorer INJECTED to name a cause it already
   * knows: rain that demoted a band scored 0.75 as a criterion and was dropped
   * as "not limiting", leaving a 49 explained by a pleasant breeze.
   */
  decisive?: boolean;
  /** The band string as written in data/activities. */
  condition: string;
  /** The weather key it tests — `windSpeed`, `temperature`, `gust`. */
  key: string;
  /** 0–1, how well this single criterion was met. */
  score: number;
  /** What the weather actually was, where a single key could be resolved. */
  value?: number;
  /**
   * Which way this criterion is failing, when the caller knows better than the
   * numbers do.
   *
   * A POOR condition written `windSpeed>8` fires from above, so a day sitting
   * just below it is approaching "too much wind" — but read off the numbers
   * alone, 7.2 is simply lower than 8 and looks like a shortfall. That produced
   * "Very little wind — Force 4" on a swimming tile, from a condition that means
   * the exact opposite. The operator settles it and nothing else can.
   */
  direction?: 'low' | 'high';
}

/**
 * Score a band and keep the workings.
 *
 * Criteria that could not be evaluated — a key the forecast does not carry — are
 * omitted rather than scored, which is the existing behaviour and the reason a
 * missing gust must stay missing rather than being filled in.
 */
export function scoreConditions(
  conditions: string[],
  weather: WeatherData
): { mean: number; criteria: CriterionScore[] } {
  const criteria: CriterionScore[] = [];
  let total = 0;
  for (const cond of conditions) {
    const { score, counted } = evalCompoundScore(cond, weather);
    if (!counted) continue;
    const key = extractWeatherKey(cond.split(OR_SPLIT_RE)[0].split(AND_SPLIT_RE)[0].trim());
    const raw = weather[key];
    criteria.push({
      condition: cond,
      key,
      score,
      value: typeof raw === 'number' ? raw : undefined,
    });
    total += score;
  }
  return { mean: criteria.length ? total / criteria.length : 0, criteria };
}

export function calculateConditionMatchScore(
  conditions: string[],
  weather: WeatherData
): number {
  if (conditions.length === 0) return 0;
  return scoreConditions(conditions, weather).mean;
}

/**
 * Calculates a penalty (0–1) from poor conditions—higher when conditions are bad.
 */
/**
 * The poor-condition penalty, plus which conditions actually fired.
 *
 * Only conditions scoring above 0.7 count, and the penalty is their mean — so a
 * single triggered hazard gives a penalty near 1 rather than being diluted by
 * the nine that did not fire. That is deliberate and correct for a safety
 * signal; the reason it is worth stating is that it makes `triggered` the most
 * useful thing on this object. When a day is vetoed, the one condition in that
 * list IS the answer to "why", and it is the sentence the reader wants.
 */
/**
 * Quantities where having too LITTLE is a disappointment, not a danger.
 *
 * A poor condition reads as a hazard by default, which is right for almost all
 * of them — but `windSpeed<1.5` on a dinghy, or `waveHeight<0.25` on a surfboard,
 * says "there is nothing to work with", not "you may not come back". Before this
 * distinction existed, a flat calm on a sailing tile produced the sentence "Not
 * safe for sailing today", which is both false and the kind of false that
 * teaches a reader to ignore the real warnings.
 */
const SHORTFALL_NOT_HAZARD = new Set([
  'windSpeed', 'gust', 'waveHeight', 'swellHeight', 'swellPeriod', 'snowDepthCm',
]);

/**
 * Quantities where NO value is dangerous, in either direction.
 *
 * Ground condition is the whole set. Dry ground is the best a walker can hope
 * for — several models carried `soilMoisture<10` as a poor condition, inherited
 * from an agricultural reading where dry soil is a real problem, and left as a
 * hazard it vetoed a perfect summer day. And a waterlogged path is unpleasant,
 * not unsafe: at the wettest hour of the measured year it dropped hiking from
 * 81 to 14 on a two-point change, which is a cliff where the ground itself has
 * a gradient.
 *
 * These still count towards the penalty, so a bog still costs a day most of its
 * score. They simply cannot short-circuit the scoring the way a gale can.
 */
const NEVER_A_HAZARD = new Set(['soilMoisture']);

/** True when a triggered condition fired because the value was BELOW its range. */
function firedLow(condition: string, value: number | undefined): boolean {
  if (typeof value !== 'number') return false;
  const nums = (condition.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return nums.length > 0 && value < Math.min(...nums);
}

export function scorePoorConditions(
  conditions: string[],
  weather: WeatherData
): { penalty: number; triggered: CriterionScore[]; hazards: CriterionScore[]; all: CriterionScore[] } {
  const triggered: CriterionScore[] = [];
  const hazards: CriterionScore[] = [];
  const all: CriterionScore[] = [];
  let total = 0;
  for (const cond of conditions) {
    const { score, counted } = evalCompoundScore(cond, weather);
    if (!counted) continue;
    const key = extractWeatherKey(cond.split(OR_SPLIT_RE)[0].split(AND_SPLIT_RE)[0].trim());
    const raw = weather[key];
    const value = typeof raw === 'number' ? raw : undefined;
    /* `>` fires from above and `<` from below. A range in a poor band is
       ambiguous and is left for the numbers to decide. */
    const op = /^[a-zA-Z_]+\s*(>=?|<=?)/.exec(cond.trim())?.[1];
    const entry: CriterionScore = {
      condition: cond, key, score, value,
      direction: op?.startsWith('>') ? 'high' : op?.startsWith('<') ? 'low' : undefined,
    };
    all.push(entry);
    if (score <= 0.7) continue;
    triggered.push(entry);
    const harmless = NEVER_A_HAZARD.has(key)
      || (SHORTFALL_NOT_HAZARD.has(key) && firedLow(cond, value));
    if (!harmless) hazards.push(entry);
    total += score;
  }
  return {
    penalty: triggered.length ? Math.min(1, total / triggered.length) : 0,
    triggered,
    hazards,
    /**
     * Every poor condition that could be evaluated, fired or not, with how close
     * it came. The one nearest to firing is the best answer to "why is this day
     * not better", and it is a far more reliable source for that than the
     * matched band: a poor condition always points the bad way, whereas a fair
     * band lists MARGINAL ranges, so being below one is a good thing that reads
     * as a failure. That mistake produced "Very little wind — Force 4" on a
     * swimming tile, off a fair band whose wind range the day was comfortably
     * under.
     */
    all,
  };
}

export function calculatePoorConditionPenalty(
  conditions: string[],
  weather: WeatherData
): number {
  if (conditions.length === 0) return 0;
  return scorePoorConditions(conditions, weather).penalty;
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

// --- Snow-aware scoring helper ---

function isSnowSport(activity: MinimalActivity): boolean {
  const id = activity.id;
  const cat = (activity.category || activity.secondaryCategory || '').toString().toLowerCase();
  const tags = (activity.tags || []) as string[];
  const idSet = new Set(['skiing','snowboarding','cross_country_skiing','ice_fishing']);
  if (id && idSet.has(id)) return true;
  if (cat.includes('snow')) return true;
  if (tags.some(t => /snow|ski/i.test(t))) return true;
  return false;
}

function coerceSnowDepth(weather: WeatherData): number {
  const w = weather as unknown as Record<string, unknown>;
  const candidates = [
    weather.snowDepthCm,
    w['snow_depth_cm'],
    w['snowDepth'],
    w['snow'],
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c)) return c;
  }
  return 0;
}

function coerceSnowfallRate(weather: WeatherData): number {
  const w = weather as unknown as Record<string, unknown>;
  const candidates = [
    weather.snowfallRateMmH,
    w['snowfallRate'],
    w['snowfall'],
  ];
  for (const c of candidates) {
    if (typeof c === 'number' && !Number.isNaN(c)) return c;
  }
  return 0;
}

export function applySnowRecommendationScoring(
  activity: MinimalActivity,
  weather: WeatherData,
  currentScore: number
): { score: number; snow?: SnowRecommendation } {
  const id = activity.id;
  if (!id) return { score: currentScore };

  const snowDepth = coerceSnowDepth(weather);
  const snowfallRate = coerceSnowfallRate(weather);
  if (!snowDepth && !snowfallRate) return { score: currentScore };

  const rec = getSnowActivityRecommendation(id, snowDepth, snowfallRate);

  let score = currentScore;
  const snowSport = isSnowSport(activity);

  switch (rec.level) {
    // Severe negatives: hard cap and strong reduction
    case 'snowfall_unsafe':
    case 'dangerous':
    case 'unsafe':
    case 'impossible':
    case 'unplayable':
    case 'too_deep':
      score = Math.min(score, snowSport ? 35 : 25);
      score = Math.max(5, score - (snowSport ? 20 : 30));
      break;

    // Moderate negatives: cap to fair and reduce a bit
    case 'difficult':
    case 'impractical':
      score = Math.min(score, 59);
      score = Math.max(5, score - 15);
      break;

    case 'uncomfortable':
    case 'caution':
    case 'snowfall_caution':
      score = Math.min(score, 68);
      score = Math.max(5, score - 8);
      break;

    // Gear requirement: never better than fair unless already very high
    case 'requires_winter_gear':
      score = Math.min(score, 59);
      break;

    // Positive cases
    case 'insufficient':
      if (snowSport) {
        // Not enough snow for snow sport
        score = Math.min(score, 40);
      }
      break;
    case 'adequate':
      if (snowSport) {
        score = Math.max(score, 65);
      }
      break;
    case 'optimal':
      if (snowSport) {
        score = Math.max(score, 85);
      }
      break;
    case 'excellent':
      if (snowSport) {
        score = Math.max(score, 92);
      }
      break;
    case 'beneficial':
      // Small boost for activities where snow can help (e.g., photography)
      score = Math.min(95, score + 5);
      break;

    case 'safe':
    case 'irrelevant':
    default:
      // No change
      break;
  }

  // Final clamp
  score = Math.max(5, Math.min(95, Math.round(score)));
  return { score, snow: rec };
}

// --- ➕ Wind-aware scoring helper ---
export function applyWindRecommendationScoring(
  activity: MinimalActivity,
  weather: WeatherData,
  currentScore: number
): { score: number; wind?: WindRecommendation } {
  const id = activity.id;
  const wind = typeof weather.windSpeed === 'number' ? weather.windSpeed : undefined;
  if (!id || typeof wind !== 'number') return { score: currentScore };

  const rec = getWindActivityRecommendation(id, wind);
  let score = currentScore;

  switch (rec.level) {
    // Severe negatives
    case 'dangerous':
    case 'unsafe':
    case 'impossible':
    case 'unplayable': {
      // Strong cap and reduction
      score = Math.min(score, 35);
      score = Math.max(5, score - 25);
      break;
    }
    // Moderate negatives — the bottom of Fair.
    case 'impractical':
    case 'unpleasant':
    case 'difficult': {
      score = Math.min(score, 46);
      break;
    }
    /**
     * Caution caps at Fair, not at Good.
     *
     * It used to cap at 68, which is inside the "Good" band — so the badge said
     * Good while the sentence beside it said "Use Caution", on the same day, off
     * the same number. That contradiction was live: inland sailing at Force 6
     * measured 62 and read "Good weather for Go Sailing (Inland). Use Caution".
     *
     * It also gives the ladder its middle rung. A day that needs caution is a
     * day for people who know what they are doing — Force 5 on a reservoir for a
     * dinghy or a board — and "Fair" is exactly what that should read as.
     */
    case 'uncomfortable':
    case 'caution': {
      /* Cap only. The old form capped AND subtracted, which double-counted: a
         day already inside the Fair band was pushed out of it by a rule whose
         whole purpose was to hold it there. */
      score = Math.min(score, 59);
      break;
    }
    // Wind-required sports not meeting min wind
    case 'min_wind_needed': {
      score = Math.min(score, 55);
      score = Math.max(5, score - 10);
      break;
    }
    // Positives
    case 'beneficial': {
      score = Math.min(95, score + 5);
      break;
    }
    /**
     * A bonus, not a floor.
     *
     * This was `Math.max(score, 82)`, which let a table that knows exactly ONE
     * variable overwrite a verdict the bands reached from all of them. The wind
     * being in an activity's sweet spot cannot make a day good on its own, and
     * saying so out-argued every other criterion in the model.
     *
     * Found through `birdwatching_passage`, where it is most visible: a Force 7
     * from the EAST scored identically to one from the west, because the bands
     * correctly rejected the easterly on direction and this floor put it
     * straight back to 82. But it was never specific to that — a sailing day
     * with perfect wind and a 4 °C afternoon was floored the same way.
     *
     * A bonus still says what it knows, and the bands keep the last word.
     */
    case 'optimal':
    case 'excellent': {
      score = Math.min(95, score + 8);
      break;
    }
    case 'irrelevant':
    case 'safe':
    case 'unknown':
    default:
      break;
  }

  score = Math.max(5, Math.min(95, Math.round(score)));
  return { score, wind: rec };
}

// --- ➕ Soil moisture penalty helper ---
export function adjustScoreForMud(
  activity: MinimalActivity,
  weather: WeatherData,
  currentScore: number
): { score: number; soil?: ReturnType<typeof assessSoilCondition> } {
  const id = activity.id || '';
  const sm = weather.soilMoisture;
  if (!isMudSensitive(id) || typeof sm !== 'number') return { score: currentScore };

  const soil = assessSoilCondition(sm);
  let score = currentScore;

  switch (soil.impact) {
    case 'severe': // sodden
      score = Math.max(5, currentScore - 25);
      score = Math.min(score, 55);
      break;
    case 'warning': // muddy
      score = Math.max(5, currentScore - 15);
      score = Math.min(score, 65);
      break;
    case 'caution': // damp
      score = Math.max(5, currentScore - 5);
      break;
    case 'positive': // optimal
      score = Math.min(95, currentScore + 2);
      break;
    case 'neutral':
    default:
      break;
  }

  return { score: Math.round(score), soil };
}
