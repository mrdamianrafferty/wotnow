import type { ActivityType } from '../data/activityTypes';

// Define WeatherData type for better type safety
export interface WeatherData {
  temperature?: number;
  windSpeed?: number;
  precipitation?: number;
  [key: string]: number | undefined;
}

const weatherKeyMap: Record<string, string> = { temp: 'temperature', rain: 'precipitation', wind_speed: 'windSpeed' };

// NOTE: To support indoor activities being 'good' when weather is poor for outdoors,
// add to activityTypes.ts for indoor activities:
// goodConditions: ['temperature<10', 'precipitation>=2', 'windSpeed>=20']
// (This file does not need changes for that logic.)

/**
 * Evaluates a list of conditions against the current weather data.
 * Supports operators: <, <=, >, >=, =, ==, !=, range (e.g., temperature=10-20)
 * Returns true if all conditions are met, false otherwise.
 */
export function evaluateConditions(
  weather: WeatherData,
  conditions: string[]
): boolean {
  console.debug("Weather data passed to evaluateConditions:", weather);
  for (const condition of conditions) {
    console.debug(`Evaluating condition: "${condition}" against weather:`, weather);

    const rangeMatch = condition.match(/^([a-zA-Z_]+)=([0-9.]+)-([0-9.]+)$/);
    if (rangeMatch) {
      const [, key, minStr, maxStr] = rangeMatch;
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      const mappedKey = weatherKeyMap[key] || key;
      const actual = typeof weather[mappedKey] === 'number' ? weather[mappedKey] as number
                    : typeof weather[key] === 'number' ? weather[key] as number
                    : null;
      if (actual === null) {
        // Suppressing water_temp checks until a proper water temperature source is integrated
        if (mappedKey === 'water_temp') {
          console.debug(`Skipping water_temp condition "${condition}" as no water temperature data is available yet.`);
          continue;
        }
        console.debug(`Weather key "${mappedKey}" missing, condition "${condition}" fails.`);
        return false; // previously: continue
      }
      console.debug(`Condition "${condition}": actual=${actual}, expected range=${min}-${max}`);
      if (actual < min || actual > max) return false;
      continue;
    }

    const match = condition.match(/^([a-zA-Z_]+)([<>=!]+)([0-9.]+)$/);
    if (!match) continue; // skip malformed

    const [, key, operator, valueStr] = match;
    const value = parseFloat(valueStr);
    const mappedKey = weatherKeyMap[key] || key;
    const actual = typeof weather[mappedKey] === 'number' ? weather[mappedKey] as number
                  : typeof weather[key] === 'number' ? weather[key] as number
                  : null;
    if (actual === null) {
      // Suppressing water_temp checks until a proper water temperature source is integrated
      if (mappedKey === 'water_temp') {
        console.debug(`Skipping water_temp condition "${condition}" as no water temperature data is available yet.`);
        continue;
      }
      console.debug(`Weather key "${mappedKey}" missing, condition "${condition}" fails.`);
      return false; // previously: continue
    }

    console.debug(`Condition "${condition}": actual=${actual}, operator=${operator}, expected=${value}`);

    switch (operator) {
      case '<':
        if (!(actual < value)) return false;
        break;
      case '<=':
        if (!(actual <= value)) return false;
        break;
      case '>':
        if (!(actual > value)) return false;
        break;
      case '>=':
        if (!(actual >= value)) return false;
        break;
      case '=':
      case '==':
        if (actual !== value) return false;
        break;
      case '!=':
        if (actual === value) return false;
        break;
      default:
        console.warn(`Unsupported operator: ${operator}`);
        return false;
    }
  }
  return true;
}

/**
 * Determines the suitability of an activity based on current weather conditions.
 * Returns one of 'perfect', 'good', 'poor', or 'unknown' based on matching conditions.
 */
export function getSuitability(
  activity: ActivityType,
  weather: WeatherData
): 'perfect' | 'good' | 'poor' | 'unknown' {
  console.debug(`Checking suitability for activity: ${activity.id} (${activity.name})`, {
    perfect: activity.perfectConditions,
    good: activity.goodConditions,
    poor: activity.poorConditions,
    weather
  });

  const currentMonth = new Date().getMonth() + 1; // getMonth() is 0-based
  if (activity.seasonalMonths?.length && !activity.seasonalMonths.includes(currentMonth)) {
    console.debug(`Activity ${activity.id} (${activity.name}) is out of season in month ${currentMonth}`);
    return 'poor';
  }

  if (activity.poorConditions?.length && evaluateConditions(weather, activity.poorConditions)) {
    return 'poor';
  }
  if (activity.perfectConditions?.length && evaluateConditions(weather, activity.perfectConditions)) {
    return 'perfect';
  }
  if (activity.goodConditions?.length && evaluateConditions(weather, activity.goodConditions)) {
    return 'good';
  }
  console.debug(`No conditions defined for activity: ${activity.id} (${activity.name}), returning 'unknown'.`, activity);
  return 'unknown';
}

export { getSuitability as getActivitySuitability };