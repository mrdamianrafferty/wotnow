

import type { ActivityType } from '../data/activityTypes';

export function evaluateConditions(
  weather: Record<string, number>,
  conditions: string[]
): boolean {
  for (const condition of conditions) {
    const match = condition.match(/^([a-zA-Z_]+)([<>=]+)([0-9.]+)$/);
    if (!match) continue; // skip malformed
    const [, key, operator, valueStr] = match;
    const value = parseFloat(valueStr);
    const actual = weather[key];
    if (actual === undefined) return false;

    switch (operator) {
      case '<':
      case '<=':
        if (!(actual <= value)) return false;
        break;
      case '>':
      case '>=':
        if (!(actual >= value)) return false;
        break;
      case '=':
      case '==':
        if (actual !== value) return false;
        break;
      default:
        return false;
    }
  }
  return true;
}

export function getSuitability(
  activity: ActivityType,
  weather: Record<string, number>
): 'perfect' | 'good' | 'poor' | 'unknown' {
  if (evaluateConditions(weather, activity.perfectConditions)) return 'perfect';
  if (evaluateConditions(weather, activity.goodConditions)) return 'good';
  if (evaluateConditions(weather, activity.poorConditions)) return 'poor';
  return 'unknown';
}