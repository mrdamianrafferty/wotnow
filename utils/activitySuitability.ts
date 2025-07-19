// utils/activitySuitability.ts

export interface WeatherData {
  // Land conditions
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  clouds?: number;
  humidity?: number;
  visibility?: number;

  // Marine conditions (from Stormglass)
  waterTemperature?: number; // Celsius
  waveHeight?: number;       // Meters
  swellHeight?: number;      // Meters
  swellPeriod?: number;      // Seconds
  swellDirection?: number;   // Degrees
  windDirection?: number;    // Degrees

  // fallback
  [key: string]: number | undefined | null;
}


/**
 * Extracts the weather key name from a condition string.
 * (e.g., "temperature>15" -> "temperature")
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
export function parseConditionString(condition: string) {
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
 * Evaluates a parsed condition against weather
 */
export function evaluateCondition(condition: string, weather: WeatherData): boolean {
  const parsed = parseConditionString(condition);
  if (!parsed) return false;

  const weatherValue = weather[parsed.key];
  if (weatherValue === undefined || weatherValue === null) return false;

  if (parsed.operator === 'range') {
    return weatherValue >= parsed.min && weatherValue <= parsed.max;
  }

  switch (parsed.operator) {
    case '>':
      return weatherValue > parsed.value;
    case '>=':
      return weatherValue >= parsed.value;
    case '<':
      return weatherValue < parsed.value;
    case '<=':
      return weatherValue <= parsed.value;
    case '=':
    case '==':
      return weatherValue === parsed.value;
    case '!=':
      return weatherValue !== parsed.value;
    default:
      console.warn(`Unknown operator: ${parsed.operator}`);
      return false;
  }
}

/**
 * Gracefully evaluates a condition, skipping missing weather fields.
 */
export function safeEvaluate(condition: string, weather: WeatherData): boolean {
  const key = extractWeatherKey(condition);
  const value = weather[key];
  if (value === undefined || value === null) return true; // Treat missing fields as neutral
  return evaluateCondition(condition, weather);
}

/**
 * Returns true if any poor condition matches.
 */
export function hasPoorCondition(activity: { poorConditions?: string[] }, weather: WeatherData): boolean {
  return !!activity.poorConditions?.some(cond => safeEvaluate(cond, weather));
}

/**
 * Returns true if all perfect conditions with known weather keys match.
 */
export function hasPerfectConditions(activity: { perfectConditions?: string[] }, weather: WeatherData): boolean {
  return !!activity.perfectConditions?.length &&
    activity.perfectConditions.every(cond => safeEvaluate(cond, weather));
}

/**
 * Returns true if all good conditions with known weather keys match.
 */
export function hasGoodConditions(activity: { goodConditions?: string[] }, weather: WeatherData): boolean {
  return !!activity.goodConditions?.length &&
    activity.goodConditions.every(cond => safeEvaluate(cond, weather));
}

/**
 * Returns the suitability level of an activity for the given weather.
 */
export function getActivitySuitability(
  activity: any,
  weather: WeatherData
): "excluded" | "perfect" | "good" | "acceptable" | "indoor" {
  if (activity.weatherSensitive === false) return "indoor";
  if (hasPoorCondition(activity, weather)) return "excluded";
  if (hasPerfectConditions(activity, weather)) return "perfect";
  if (hasGoodConditions(activity, weather)) return "good";
  if (
    (!activity.goodConditions || activity.goodConditions.length === 0) &&
    (!activity.perfectConditions || activity.perfectConditions.length === 0)
  ) {
    return "acceptable";
  }
  return "excluded";
}
