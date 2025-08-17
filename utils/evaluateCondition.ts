import { parseConditionString } from './activitySuitability';

/**
 * Evaluates activity condition scoring based on weather data.
 * 
 * IMPORTANT: All wind speed values in WeatherData should be in m/s (meters per second).
 * Any wind speed thresholds or comparisons should use m/s values.
 * 
 * @param condition - The condition string to evaluate (e.g., "wind_speed<5")
 * @param weather - Weather data object with wind speeds in m/s
 * @returns Score between 0 and 1
 */
export function evaluateConditionScore(condition: string, weather: any): number {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;

  const weatherValue = weather[parsed.key];
  if (weatherValue === undefined || weatherValue === null) return 0.5; // Neutral for missing data

  if (parsed.operator === 'range') {
    const { min, max } = parsed as { key: string; operator: 'range'; min: number; max: number };
    const center = (min + max) / 2;
    const range = max - min;
    
    if (weatherValue >= min && weatherValue <= max) {
      // Score based on proximity to center (1.0 = perfect center)
      const distance = Math.abs(weatherValue - center);
      return 1 - (distance / (range / 2));
    }
    
    // Outside range - graduated penalty
    const overflow = weatherValue < min ? (min - weatherValue) : (weatherValue - max);
    return Math.max(0, 1 - (overflow / range));
  }

  // Handle comparison operators with graduated scoring
  switch (parsed.operator) {
    case '>': return weatherValue > (parsed as any).value ? 1 : weatherValue / (parsed as any).value;
    case '<': return weatherValue < (parsed as any).value ? 1 : (parsed as any).value / weatherValue;
    default: return 0; // Fallback for unsupported operators
  }
}
