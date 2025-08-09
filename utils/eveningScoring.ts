// src/utils/eveningScoring.ts

import { ActivityType } from '../data/activityTypes';

// Public return type for explainability in UI
export type EveningBonusResult = {
  multiplier: number; // final clamped multiplier (≤2.0)
  reasons: {
    light?: string;        // e.g., "-40% (20m to sunset; outdoor nudge)"
    indoorBase?: string;   // e.g., "+25%"
    specific?: string;     // e.g., "+30% (movie time window)"
    tags?: string;         // e.g., "+10% (2 tag matches)"
    weekendPub?: string;   // e.g., "+30% (Fri/Sat evening)"
    cap?: string;          // e.g., "capped at 2.0"
  };
};

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// Configuration knobs
const EVENING_HOUR = 18;              // switch to evening behavior at 18:00
const CIVIL_TWILIGHT_MIN = 30;        // minutes after sunset treated as usable light window[7][10][19]
const OUTDOOR_SUPPRESS_STRONG = 0.4;  // hard suppression after dark
const OUTDOOR_SUPPRESS_MED = 0.6;     // stronger nudge as sunset approaches
const OUTDOOR_SUPPRESS_SOFT = 0.85;   // mild nudge pre-sunset
const EVENING_OK_AFTER_DARK = 0.7;    // allowed outdoor after dark (evening_ok/summer_evening)
const INDOOR_BASE_BOOST = 1.25;       // base boost for indoor after evening switch
const MAX_MULT = 2.0;                 // cap

// Describe specific activity evening windows for reason text
function describeSpecific(id: string): string {
  const map: Record<string, string> = {
    watch_a_movie: 'movie time window',
    reading: 'late-evening reading window',
    yoga: 'early-evening calm',
    meditation: 'evening focus',
    cooking: 'dinner time',
    playing_cards: 'game night',
    crafts: 'hobby time',
    playing_records: 'music hour',
  };
  return map[id] || 'evening window';
}

function pctFromMultiplierChange(m: number, label?: string): string {
  const deltaPct = Math.round((m - 1) * 100);
  const sign = deltaPct >= 0 ? '+' : '';
  return `${sign}${deltaPct}%${label ? ` (${label})` : ''}`;
}

// Utility: compute “assumed” sunset for a given day
// For the next ~5 days, assume sunset stays near-constant; use provided day.sunsetTs when available.
// If missing, fall back to todaySunsetTs (same-time assumption), else undefined.
export function resolveSunsetForDay(
  daySunsetTs?: number | null,
  todaySunsetTs?: number | null
): number | undefined {
  if (typeof daySunsetTs === 'number') return daySunsetTs;
  if (typeof todaySunsetTs === 'number') return todaySunsetTs;
  return undefined;
}

// Light-aware outdoor multiplier with civil twilight
type EveningLightConfig = {
  hour: number;            // local hour for the specific day being scored
  nowTs: number;           // ms timestamp representing the scoring moment for that day
  sunsetTs?: number;       // ms timestamp (localized/normalized) for that day’s sunset
  month: number;           // 1..12
  tags: string[];
  isOutdoor: boolean;
};

export function computeEveningLightMultiplier({
  hour,
  nowTs,
  sunsetTs,
  month,
  tags,
  isOutdoor,
}: EveningLightConfig): { mult: number; reason?: string } {
  if (!isOutdoor) return { mult: 1.0 };
  if (hour < EVENING_HOUR) return { mult: 1.0 };

  const hasEveningOk = tags.includes('evening_ok') || tags.includes('evening');
  const hasFloodlit = tags.includes('floodlit');
  const hasSummerEvening = tags.includes('summer_evening');
  const isSummer = month >= 5 && month <= 9;

  // If sunset is unknown, be conservative: allow floodlit fully, evening_ok in summer partial, else strong suppression
  if (sunsetTs == null) {
    if (hasFloodlit) return { mult: 1.0, reason: '+0% (floodlit)' };
    if (hasEveningOk && isSummer) return { mult: EVENING_OK_AFTER_DARK, reason: '-30% (evening ok, summer)' };
    return { mult: OUTDOOR_SUPPRESS_STRONG, reason: '-60% (evening outdoor suppression)' };
  }

  const civilTwilightEnd = sunsetTs + CIVIL_TWILIGHT_MIN * 60_000;
  const minutesToSunset = Math.round((sunsetTs - nowTs) / 60000);

  // Evening before sunset
  if (minutesToSunset > 0) {
    if (minutesToSunset >= 60) {
      if (hasFloodlit) return { mult: 1.0, reason: '+0% (floodlit)' };
      if (hasEveningOk || (hasSummerEvening && isSummer)) {
        return { mult: 1.0, reason: '+0% (evening allowed before sunset)' };
      }
      return { mult: OUTDOOR_SUPPRESS_SOFT, reason: '-15% (>60m to sunset; outdoor evening nudge)' };
    } else {
      if (hasFloodlit) return { mult: 1.0, reason: '+0% (floodlit)' };
      if (hasEveningOk || (hasSummerEvening && isSummer)) {
        return { mult: OUTDOOR_SUPPRESS_SOFT, reason: `-15% (${minutesToSunset}m to sunset; evening allowed)` };
      }
      return { mult: OUTDOOR_SUPPRESS_MED, reason: `-40% (${minutesToSunset}m to sunset; outdoor nudge)` };
    }
  }

  // After sunset: still within civil twilight or after
  const afterSunset = nowTs >= sunsetTs;
  if (afterSunset) {
    // Inside civil twilight buffer
    if (nowTs <= civilTwilightEnd) {
      const minutesPast = Math.max(0, Math.round((nowTs - sunsetTs) / 60000));
      if (hasFloodlit) return { mult: 1.0, reason: '+0% (floodlit; civil twilight)' };
      if (hasEveningOk || (hasSummerEvening && isSummer)) {
        return { mult: OUTDOOR_SUPPRESS_SOFT, reason: `-15% (${minutesPast}m after sunset; evening allowed)` };
      }
      return { mult: OUTDOOR_SUPPRESS_MED, reason: `-40% (${minutesPast}m after sunset; outdoor nudge)` };
    }
    // Fully after civil twilight
    if (hasFloodlit) return { mult: 1.0, reason: '+0% (floodlit after twilight)' };
    if (hasEveningOk || (hasSummerEvening && isSummer)) {
      return { mult: EVENING_OK_AFTER_DARK, reason: '-30% (evening allowed after twilight)' };
    }
    return { mult: OUTDOOR_SUPPRESS_STRONG, reason: '-60% (outdoor suppressed after twilight)' };
  }

  // Fallback
  return { mult: 1.0 };
}

/**
 * Combined evening multiplier with explainability.
 * Order of composition:
 *  1) Light-aware outdoor suppression (sunset + civil twilight)
 *  2) Base indoor boost after evening switch
 *  3) Activity-specific evening bonuses (mostly indoor or explicitly allowed outdoor)
 *  4) Tag-match bonus (weekday/social). We gate this to avoid boosting outdoor at night unless allowed.
 *  5) Weekend pub special
 *  6) Clamp to ≤2.0 with cap reason if applied
 *
 * Parameters:
 *  - activity: ActivityType
 *  - hour: local hour for the day being scored (use now.getHours() for “today”)
 *  - contextTags: ensure day-of-week is first (e.g., ['Friday', 'evening', 'social', ...])
 *  - opts.nowTs: ms timestamp for the scoring moment for that day.
 *  - opts.sunsetTs: normalized local sunset timestamp (ms) for that day. If missing, resolveSunsetForDay can reuse today’s.
 *  - opts.month: 1..12 for that day.
 */
export function applyEveningBonus(
  activity: ActivityType,
  hour: number,
  contextTags: string[],
  opts?: {
    nowTs?: number;
    sunsetTs?: number | null;
    month?: number; // 1..12
  }
): EveningBonusResult {
  const reasons: EveningBonusResult['reasons'] = {};
  let mult = 1.0;

  const isOutdoor = !!activity.weatherSensitive;
  const isEvening = hour >= EVENING_HOUR;

  const nowTs = opts?.nowTs ?? Date.now();
  const sunsetTs = opts?.sunsetTs ?? null;
  const month = opts?.month ?? (new Date(nowTs).getMonth() + 1);

  // 1) Light-aware outdoor suppression first
  if (isEvening && isOutdoor) {
    const light = computeEveningLightMultiplier({
      hour,
      nowTs,
      sunsetTs: sunsetTs ?? undefined,
      month,
      tags: activity.tags || [],
      isOutdoor,
    });
    mult *= light.mult;
    if (light.reason) reasons.light = pctFromMultiplierChange(light.mult, light.reason);
  }

  // 2) Base indoor boost
  if (!isOutdoor && isEvening) {
    mult *= INDOOR_BASE_BOOST;
    reasons.indoorBase = pctFromMultiplierChange(INDOOR_BASE_BOOST);
  }

  // 3) Specific evening windows (apply for indoor or explicitly allowed outdoor)
  const tags = activity.tags || [];
  const hasEveningOk = tags.includes('evening_ok') || tags.includes('evening');
  const hasFloodlit = tags.includes('floodlit');
  const allowStrongSpecific = !isOutdoor || hasFloodlit || hasEveningOk;

  const eveningBonuses: Record<string, number> = {
    going_to_pub: (hour >= 17 && hour <= 23) ? 1.0 : 1.0, // neutral; special below
    watch_a_movie: (hour >= 19 && hour <= 23) ? 1.3 : 1.0,
    reading: (hour >= 20 && hour <= 23) ? 1.2 : 1.0,
    yoga: (hour >= 18 && hour <= 21) ? 1.3 : 1.0,
    meditation: (hour >= 19 && hour <= 22) ? 1.3 : 1.0,
    cooking: (hour >= 17 && hour <= 20) ? 1.2 : 1.0,
    playing_cards: (hour >= 19 && hour <= 23) ? 1.3 : 1.0,
    crafts: (hour >= 19 && hour <= 22) ? 1.2 : 1.0,
    playing_records: (hour >= 18 && hour <= 23) ? 1.2 : 1.0,
  };

  if (isEvening && allowStrongSpecific) {
    const specific = eveningBonuses[activity.id] || 1.0;
    if (specific !== 1.0) {
      mult *= specific;
      reasons.specific = pctFromMultiplierChange(specific, describeSpecific(activity.id));
    }
  }

  // 4) Tag-match bonus (weekday/social): avoid boosting outdoor at night unless allowed
  const tagMatches = tags.filter(t => contextTags.includes(t)).length;
  const tagBonus = 1.0 + Math.min(tagMatches * 0.1, 0.5); // up to +50%
  const allowTagBonusForOutdoorNight = !isOutdoor || !isEvening || hasFloodlit || hasEveningOk;

  if (tagMatches > 0 && allowTagBonusForOutdoorNight) {
    mult *= tagBonus;
    reasons.tags = `+${Math.round((tagBonus - 1) * 100)}% (${tagMatches} tag match${tagMatches > 1 ? 'es' : ''})`;
  }

  // 5) Weekend pub special
  const dayName = contextTags[0]; // convention: first tag is weekday name
  if (
    activity.id === 'going_to_pub' &&
    isEvening &&
    (dayName === 'Friday' || dayName === 'Saturday') &&
    hour >= 17 && hour <= 23
  ) {
    mult *= 1.3;
    reasons.weekendPub = '+30% (Fri/Sat evening)';
  }

  // 6) Clamp
  const clamped = clamp(mult, 0, MAX_MULT);
  if (clamped !== mult) reasons.cap = `capped at ${MAX_MULT}`;

  return {
    multiplier: clamped,
    reasons,
  };
}
