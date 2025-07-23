// src/utils/eveningScoring.ts
import { ActivityType } from '../data/activityTypes';

/**
 * Returns a multiplier for evening activities:
 * - Base indoor boost after 18:00
 * - Activity-specific evening bonuses at appropriate hours
 * - Context-tag matching bonus (weekday tags weighted heavily in matchScore)
 * - Extra weekend boost for “going_to_pub” on Friday/Saturday evenings
 * - Clamped so overall multiplier ≤ 2.0
 */
export function applyEveningBonus(
  activity: ActivityType,
  hour: number,
  contextTags: string[]
): number {
  let multiplier = 1.0;

  // 1. Base boost for all indoor activities after 18:00
  if (!activity.weatherSensitive && hour >= 18) {
    multiplier *= 1.25;
  }

  // 2. Activity-specific evening multipliers
  const eveningBonuses: Record<string, number> = {
    'going_to_pub': (hour >= 17 && hour <= 23) ? 1.0 : 1.0,        // base; real boost via weekday boost
    'watch_a_movie': (hour >= 19 && hour <= 23) ? 1.3 : 1.0,
    'reading':       (hour >= 20 && hour <= 23) ? 1.2 : 1.0,
    'yoga':          (hour >= 18 && hour <= 21) ? 1.3 : 1.0,
    'meditation':    (hour >= 19 && hour <= 22) ? 1.3 : 1.0,
    'cooking':       (hour >= 17 && hour <= 20) ? 1.2 : 1.0,
    'playing_cards': (hour >= 19 && hour <= 23) ? 1.3 : 1.0,
    'crafts':        (hour >= 19 && hour <= 22) ? 1.2 : 1.0,
    'playing_records': (hour >= 18 && hour <= 23) ? 1.2 : 1.0,
  };
  multiplier *= eveningBonuses[activity.id] || 1.0;

  // 3. Tag-match bonus (ensure matchScore weights weekdays heavily)
  const tagMatches = (activity.tags || []).filter(tag => contextTags.includes(tag)).length;
  multiplier *= 1.0 + Math.min(tagMatches * 0.1, 0.5);

  // 4. Extra weekend pub boost on Friday/Saturday evenings
  const today = contextTags[0]; // e.g. "Friday"
  if (
    activity.id === 'going_to_pub' &&
    (today === 'Friday' || today === 'Saturday') &&
    hour >= 17 && hour <= 23
  ) {
    multiplier *= 1.3;
  }

  // 5. Clamp multiplier to maximum of 2.0
  return Math.min(multiplier, 2.0);
}

/**
 * Builds evening-specific context tags based on hour and day.
 * Includes phases and day-specific preferences like 'pub', 'celebration', etc.
 */
export function generateEveningContext(hour: number, day: string): string[] {
  const baseContext = [day, 'evening', 'relaxation', 'family', 'cultural', 'leisure', 'home', 'social'];

  // Time-of-evening phases
  if (hour >= 17 && hour < 19) {
    baseContext.push('early_evening', 'social', 'dining', 'transition_time');
  } else if (hour >= 19 && hour < 21) {
    baseContext.push('prime_evening', 'entertainment', 'social_gathering', 'peak_activity');
  } else if (hour >= 21) {
    baseContext.push('late_evening', 'wind_down', 'quiet_activities', 'preparation');
  }

  // Day-specific evening tags
  const daySpecific: Record<string, string[]> = {
    'Friday':    ['going_out', 'social', 'celebration', 'pub'],
    'Saturday':  ['leisure', 'family_time', 'extended_activities'],
    'Sunday':    ['preparation', 'relaxation', 'early_rest'],
    'Monday':    ['recovery', 'light_activity', 'week_planning'],
    'Tuesday':   ['mid_week_social', 'hobby_time'],
    'Wednesday': ['mid_week_break', 'personal_time'],
    'Thursday':  ['anticipation', 'social_prep'],
  };

  if (daySpecific[day]) {
    baseContext.push(...daySpecific[day]);
  }

  return baseContext;
}
