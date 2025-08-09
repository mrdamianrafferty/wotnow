// Updated scoring function using your existing evening logic
function calculateActivityScore(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEveningToday: boolean,
  contextTags: string[],
  opts?: {
    nowTs?: number;
    sunsetTs?: number | null;
    month?: number;
  }
): number {
  console.log(`🎯 Scoring ${activity.id}:`, { weather, contextTags, isEveningToday });
  
  const hour = new Date(opts?.nowTs || Date.now()).getHours();
  
  // INDOOR ACTIVITIES: Use evening bonus system for context-based scoring
  if (!activity.weatherSensitive) {
    let baseScore = 45; // Lower daytime base - not hero material unless evening
    
    // Apply your sophisticated evening bonus system
    const eveningResult = applyEveningBonus(activity, hour, contextTags, opts);
    baseScore *= eveningResult.multiplier;
    
    // Log the evening reasons for transparency
    if (Object.keys(eveningResult.reasons).length > 0) {
      console.log(`🌙 Evening bonuses for ${activity.id}:`, eveningResult.reasons);
    }
    
    const finalScore = Math.min(95, Math.round(baseScore));
    const heroEligible = finalScore >= 70; // Heroes need 70+ after evening multipliers
    
    console.log(`🏠 ${activity.id} scored ${finalScore} (indoor, hero-eligible: ${heroEligible})`);
    return finalScore;
  }

  // OUTDOOR ACTIVITIES: Weather-dependent + evening considerations
  const normalizedWeather: WeatherData = {
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    windSpeed: weather.windspeed,
    clouds: weather.clouds,
    humidity: weather.humidity,
    visibility: (weather.visibility || 10000) / 1000,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    swellHeight: weather.swellHeight,
    swellPeriod: weather.swellPeriod,
  };

  let score = 20; // Base outdoor score
  let conditionLevel = 'poor';
  let dangerWarning = '';

  // Use your existing condition evaluation
  if (activity.poorConditions && activity.poorConditions.length > 0) {
    const poorPenalty = calculatePoorConditionPenalty(activity.poorConditions, normalizedWeather);
    if (poorPenalty > 0.7) {
      score = 8 + Math.random() * 12;
      conditionLevel = 'dangerous';
      dangerWarning = '⚠️ Potentially dangerous conditions';
    }
  }

  if (conditionLevel !== 'dangerous' && activity.perfectConditions && activity.perfectConditions.length > 0) {
    const perfectMatch = calculateConditionMatchScore(activity.perfectConditions, normalizedWeather);
    if (perfectMatch > 0.85) {
      score = 87 + perfectMatch * 8;
      conditionLevel = 'perfect';
    }
  }

  if (conditionLevel === 'poor' && activity.goodConditions && activity.goodConditions.length > 0) {
    const goodMatch = calculateConditionMatchScore(activity.goodConditions, normalizedWeather);
    if (goodMatch > 0.6) {
      score = 68 + goodMatch * 15;
      conditionLevel = 'good';
    }
  }

  if (conditionLevel === 'poor' && activity.fairConditions && activity.fairConditions.length > 0) {
    const fairMatch = calculateConditionMatchScore(activity.fairConditions, normalizedWeather);
    if (fairMatch > 0.5) {
      score = 45 + fairMatch * 15;
      conditionLevel = 'fair';
    }
  }

  // Apply evening considerations for outdoor activities too
  if (isEveningToday) {
    const eveningResult = applyEveningBonus(activity, hour, contextTags, opts);
    score *= eveningResult.multiplier;
    
    if (Object.keys(eveningResult.reasons).length > 0) {
      console.log(`🌙 Evening adjustments for outdoor ${activity.id}:`, eveningResult.reasons);
    }
  }

  const finalScore = Math.round(Math.min(95, Math.max(5, score)));
  console.log(`🌤️ ${activity.id} scored ${finalScore} (${conditionLevel}) ${dangerWarning}`);
  
  return finalScore;
}
