function evaluateConditionScore(condition: string, weather: WeatherData): number {
  const parsed = parseConditionString(condition);
  if (!parsed) return 0;

  const weatherValue = weather[parsed.key];
  if (weatherValue === undefined || weatherValue === null) return 0.5; // Neutral for missing data

  if (parsed.operator === 'range') {
    const { min, max } = parsed;
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
    case '>': return weatherValue > parsed.value ? 1 : weatherValue / parsed.value;
    case '<': return weatherValue < parsed.value ? 1 : parsed.value / weatherValue;
    default: return evaluateCondition(condition, weather) ? 1 : 0;
  }
}
