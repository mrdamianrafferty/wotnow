

export function evaluateCondition(condition: any, weather: any): boolean {
  const { key, operator, value } = condition;
  const weatherValue = weather[key];

  if (weatherValue === undefined) return false;

  switch (operator) {
    case '>':
      return weatherValue > value;
    case '>=':
      return weatherValue >= value;
    case '<':
      return weatherValue < value;
    case '<=':
      return weatherValue <= value;
    case '===':
      return weatherValue === value;
    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}