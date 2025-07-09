import type { WeatherData } from './activitySuitability';

/**
 * Evaluates a single weather condition string against the provided weather data.
 * Supports operators: <, <=, >, >=, =, ==, !=, range (e.g., temperature=10..20)
 * Returns true if the condition is met, false otherwise.
 */
export function evaluateCondition(condition: string, weather: WeatherData): boolean {
  console.debug(`Evaluating single condition: "${condition}" against weather:`, weather);

  const weatherKeyMap: Record<string, string> = {
    temp: 'temperature',
    rain: 'precipitation',
    wind_speed: 'windSpeed',
  };

  const rangeMatch = condition.match(/^([a-zA-Z_]+)=(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const [, key, minStr, maxStr] = rangeMatch;
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    const mappedKey = weatherKeyMap[key] || key;
    const actual = typeof weather[mappedKey] === 'number' ? weather[mappedKey] as number : null;
    if (actual === null) return false;
    return actual >= min && actual <= max;
  }

  const match = condition.match(/^([a-zA-Z_]+)([<>=!]+)([0-9.]+)$/);
  if (!match) return false; // skip malformed

  const [, key, operator, valueStr] = match;
  const value = parseFloat(valueStr);
  const mappedKey = weatherKeyMap[key] || key;
  const actual = typeof weather[mappedKey] === 'number' ? weather[mappedKey] as number : null;
  if (actual === null) return false;

  switch (operator) {
    case '<':
      return actual < value;
    case '<=':
      return actual <= value;
    case '>':
      return actual > value;
    case '>=':
      return actual >= value;
    case '=':
    case '==':
      return actual === value;
    case '!=':
      return actual !== value;
    default:
      return false;
  }
}