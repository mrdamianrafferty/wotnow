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
export function evaluateConditionScore(condition: string, weather: Record<string, number | string | null | undefined>): number {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;

  const weatherValueRaw = weather[parsed.key];
  if (weatherValueRaw === undefined || weatherValueRaw === null) return 0.5; // Neutral for missing data

  const weatherValue = typeof weatherValueRaw === 'number' ? weatherValueRaw : Number(weatherValueRaw);
  if (Number.isNaN(weatherValue)) return 0.5;

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
    case '>': {
      const v = (parsed as { value: number }).value;
      return weatherValue > v ? 1 : (v === 0 ? 0 : weatherValue / v);
    }
    case '<': {
      const v = (parsed as { value: number }).value;
      return weatherValue < v ? 1 : (weatherValue === 0 ? 0 : v / weatherValue);
    }
    default: return 0; // Fallback for unsupported operators
  }
}
