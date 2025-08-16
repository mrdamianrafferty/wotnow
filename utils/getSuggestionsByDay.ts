// src/utils/getSuggestionsByDay.ts

// Lightweight types used here
type SuitabilityLevel = 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';

export interface ActivityType {
  id: string;
  name?: string;
  activity?: string;
  tags?: string[];
  weatherSensitive?: boolean;         // true => outdoor
  indoorAlternative?: boolean;
  seasonalMonths?: number[];
}

export interface WeatherData {
  temperature?: number;
  precipitation?: number;             // mm
  windspeed?: number;                 // km/h
  clouds?: number;                    // %
  humidity?: number;                  // %
  visibility?: number;                // m
  waterTemperature?: number;          // °
  waveHeight?: number;                // m
  swellHeight?: number;               // m
  swellPeriod?: number;               // s
  sunsetTs?: number | null;
}

export interface EveningBonusResult {
  multiplier: number;
  reasons?: Record<string, string>;
}

export interface Suggestion {
  activityId: string;
  score: number;
  evaluation: SuitabilityLevel;
  eveningReasons?: EveningBonusResult['reasons'];
}

import { selectHeroActivity } from './heroSelector';
import { calculateConditionMatchScore,
         calculatePoorConditionPenalty } from './activitySuitability';
import { applyEveningBonus } from './eveningScoring';
import { activityTypes } from '../data/activityTypes';
import { getActivityMessage } from '../data/activityMessages';

// Minimum score threshold for activity suggestions (unless includeAllActivities is true)
const MINIMUM_ACCEPTABLE_SCORE = 40; // Matches your 'fair' threshold in toLevel()

// Simple context tags helper used by scoring/bonuses
function buildContextTagsForDay(dayName: string, hour: number, isToday: boolean): string[] {
  const dn = dayName.toLowerCase();
  const tags = new Set<string>([dn]);
  if (dn === 'saturday' || dn === 'sunday') tags.add('weekend');
  else tags.add('weekday');

  if (hour >= 17) tags.add('evening');
  else if (hour >= 12) tags.add('afternoon');
  else tags.add('morning');

  if (isToday) tags.add('today');
  return Array.from(tags);
}

// Map numeric score to suitability label (for outdoor)
function toLevel(score: number): SuitabilityLevel | 'poor' {
  if (score >= 90) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

// Unified scoring function
function calculateActivityScore(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEveningToday: boolean,
  contextTags: string[],
  opts: { nowTs: number; sunsetTs?: number | null; month?: number }
): number {
  // Indoor activities: low daytime, boosted in evening
  if (!activity.weatherSensitive) {
    let score = 45;
    const hour = new Date(opts.nowTs).getHours();
    const eveningResult = applyEveningBonus(activity, hour, contextTags, opts);
    score *= eveningResult.multiplier;
    return Math.min(95, Math.round(score));
  }

  // Normalize weather
  const w = {
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    windSpeed: weather.windspeed,
    clouds: weather.clouds,
    humidity: weather.humidity,
    visibility: (weather.visibility ?? 10000) / 1000,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    swellHeight: weather.swellHeight,
    swellPeriod: weather.swellPeriod,
  };

  let score = 20;
  let cl = 'poor';

  // Dangerous conditions
  if (activity.poorConditions?.length) {
    const penalty = calculatePoorConditionPenalty(activity.poorConditions, w);
    if (penalty > 0.7) {
      score = 8 + Math.random() * 12;
      cl = 'poor';
    }
  }

  // Perfect
  if (activity.perfectConditions?.length && calculateConditionMatchScore(activity.perfectConditions, w) > 0.85) {
    score = 90 + Math.random() * 8;
    cl = 'perfect';
  }
  // Good
  else if (activity.goodConditions?.length && calculateConditionMatchScore(activity.goodConditions, w) > 0.6) {
    score = 68 + Math.random() * 15;
    cl = 'good';
  }
  // Fair
  else if (activity.fairConditions?.length && calculateConditionMatchScore(activity.fairConditions, w) > 0.5) {
    score = 45 + Math.random() * 15;
    cl = 'fair';
  }

  // Evening adjustments for outdoor
  if (isEveningToday) {
    const hour = new Date(opts.nowTs).getHours();
    const eveningRes = applyEveningBonus(activity, hour, contextTags, opts);
    score *= eveningRes.multiplier;
  }

  score = Math.max(5, Math.min(95, score));
  return Math.round(score);
}

// Define these helper functions if they don't exist elsewhere
function getScoreEvaluation(score: number): SuitabilityLevel {
  return toLevel(score);
}

function getReasoningForScore(score: number, activity: ActivityType, weather: WeatherData): string {
  if (score >= 90) return `Perfect conditions for ${activity.name || activity.id}!`;
  if (score >= 60) return `Good weather for ${activity.name || activity.id}.`;
  if (score >= 40) return `Fair conditions for ${activity.name || activity.id}.`;
  return `Not ideal weather for ${activity.name || activity.id}, but still an option.`;
}

// Main function
export function getSuggestionsByDay({ 
  forecast, 
  activities, 
  interests,
  now,
  includeAllActivities = false,
  isEveningToday = false // Add this parameter with default value
}) {
  // Add debugging logs
  console.log('📊 getSuggestionsByDay INPUTS:', { 
    forecastLength: forecast.length,
    activitiesCount: activities.length,
    interestsCount: interests.length,
    now: now.toISOString(),
    includeAllActivities,
    isEveningToday
  });

  return forecast.map(day => {
    console.log('🌤️ Processing day:', day.date);
    
    const suggestions = activities
      .map(activity => {
        // Add important debugging log before scoring
        console.log(`⚙️ Scoring activity: ${activity.id} with weather:`, day.weather);
        
        // Flag if out of season
        const currentMonth = new Date(now).getMonth() + 1;
        const outOfSeason = activity.seasonalMonths && !activity.seasonalMonths.includes(currentMonth);
        if (outOfSeason) {
          console.log(`🍂 Activity ${activity.id} is out of season`);
        }

        // Calculate score for activity - use dynamic context tags
        const currentDate = new Date(now);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[currentDate.getDay()];
        const month = currentDate.getMonth(); // 0-11 for Jan-Dec

        const contextTags = buildContextTagsForDay(
          currentDayName, 
          currentDate.getHours(),
          true // Is today
        );

        // Add season tags
        if (month >= 2 && month <= 4) contextTags.push('spring');
        if (month >= 5 && month <= 7) contextTags.push('summer');
        if (month >= 8 && month <= 10) contextTags.push('autumn');
        if (month >= 11 || month <= 1) contextTags.push('winter');

        console.log(`🏷️ Using context tags:`, contextTags);

        const score = calculateActivityScore(
          activity, 
          day.weather,
          day.weather.precipitation < 5, // isWeatherGood
          isEveningToday,
          contextTags,
          { nowTs: now.getTime() }
        );
        
        console.log(`📈 ${activity.id} scored: ${score}`);
        
        // When includeAllActivities is true, include ALL activities regardless of score
        if (includeAllActivities || score >= MINIMUM_ACCEPTABLE_SCORE) {
          return {
            activityId: activity.id,
            score,
            evaluation: getScoreEvaluation(score),
            reasoning: getReasoningForScore(score, activity, day.weather),
            outOfSeason
          };
        }
        return null;
      })
      .filter(Boolean) // Remove null items
      .sort((a, b) => b.score - a.score); // Sort by score
      
    console.log(`✅ Finished day with ${suggestions.length} activities`);
    return {
      date: day.date,
      suggestions
    };
  });
}
