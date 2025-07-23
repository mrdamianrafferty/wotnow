import { WeatherData } from './weatherTypes';
import { ActivityType } from '../data/activityTypes';
import { evaluateConditionScore, parseConditionString } from './activitySuitability';

export function calculateActivityScore(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEvening: boolean
): number {
  if (!activity.weatherSensitive) {
    // Penalize indoor activities if weather is good and NOT evening
    if (isWeatherGood && !isEvening) {
      return 20; // Lower base score for indoor activities
    }
    return 50; // Normal base score for indoor activities
  }

  // Calculate condition match scores (0-1 range)
  const perfectScore = calculateConditionMatchScore(activity.perfectConditions || [], weather);
  const goodScore = calculateConditionMatchScore(activity.goodConditions || [], weather);
  const poorPenalty = calculatePoorConditionPenalty(activity.poorConditions || [], weather);

  let baseScore = 25; // Minimum for viable activities

  if (perfectScore >= 0.8) {
    baseScore = 80 + (perfectScore * 20); // 80-100 range
  } else if (goodScore >= 0.6) {
    baseScore = 60 + (goodScore * 20); // 60-80 range  
  } else if (perfectScore >= 0.4 || goodScore >= 0.4) {
    baseScore = 30 + Math.max(perfectScore, goodScore) * 30; // 30-60 range
  }

  // Apply poor condition penalties
  baseScore = Math.max(0, baseScore - (poorPenalty * 40));
  return Math.round(baseScore);
}

function calculateConditionMatchScore(conditions: string[], weather: WeatherData): number {
  if (conditions.length === 0) return 0;
  
  let totalScore = 0;
  let evaluatedConditions = 0;
  
  for (const condition of conditions) {
    const score = evaluateConditionScore(condition, weather);
    if (score >= 0) {
      totalScore += score;
      evaluatedConditions++;
    }
  }
  
  return evaluatedConditions > 0 ? totalScore / evaluatedConditions : 0;
}

function calculatePoorConditionPenalty(conditions: string[], weather: WeatherData): number {
  if (conditions.length === 0) return 0;
  
  let penalties = 0;
  for (const condition of conditions) {
    if (evaluateConditionScore(condition, weather) > 0.7) {
      penalties += 1;
    }
  }
  
  return Math.min(1, penalties / conditions.length);
}
