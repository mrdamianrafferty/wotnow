// src/utils/getSuggestionsByDay.ts

// Lightweight types used here
type SuitabilityLevel = 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
import type { ActivityType } from '../data/activityTypes';

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

// Removed unused imports to satisfy linter
// import { selectHeroActivity } from './heroSelector';
import { calculateConditionMatchScore,
         calculatePoorConditionPenalty } from './activitySuitability';
import { applyEveningBonus } from './eveningScoring';
// import { activityTypes } from '../data/activityTypes';
// import { getActivityMessage } from '../data/activityMessages';

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
  console.log(`🎯 Scoring ${activity.id}...`);
  console.log(`🌦️ Raw weather input:`, JSON.stringify(weather, null, 2));
  
  // Indoor activities: low daytime, boosted in evening
  if (!activity.weatherSensitive) {
    let score = 45;
    const hour = new Date(opts.nowTs).getHours();
    const eveningResult = applyEveningBonus(activity as unknown as ActivityType, hour, contextTags, opts);
    score *= eveningResult.multiplier;
    return Math.min(95, Math.round(score));
  }

  // Normalize weather
  const w = {
    temperature: weather.temperature,
    precipitation: weather.precipitation,
    windSpeed: weather.windspeed ? weather.windspeed / 3.6 : 0, // Convert km/h back to m/s for activity conditions
    clouds: weather.clouds,
    humidity: weather.humidity,
    visibility: (weather.visibility ?? 10000) / 1000,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    swellHeight: weather.swellHeight,
    swellPeriod: weather.swellPeriod,
  };

  console.log(`🌤️ ${activity.id} normalized weather:`, JSON.stringify(w, null, 2));

  let score = 50; // Start with neutral score instead of 20
  let cl = 'fair';

  // Dangerous conditions
  if (activity.poorConditions?.length) {
    const penalty = calculatePoorConditionPenalty(activity.poorConditions, w);
    console.log(`💀 ${activity.id} poor condition penalty: ${penalty.toFixed(3)}`);
    if (penalty > 0.7) {
      score = 8 + Math.random() * 12;
      cl = 'poor';
      console.log(`❌ ${activity.id} marked as poor due to dangerous conditions`);
    }
  }

  // Perfect
  if (activity.perfectConditions?.length) {
    const perfectScore = calculateConditionMatchScore(activity.perfectConditions, w);
    console.log(`✨ ${activity.id} perfect match score: ${perfectScore.toFixed(3)}`);
    if (perfectScore > 0.8) {
      score = 90 + Math.random() * 8;
      cl = 'perfect';
      console.log(`🌟 ${activity.id} marked as perfect`);
    }
  }
  // Good
  if (cl !== 'perfect' && activity.goodConditions?.length) {
    const goodScore = calculateConditionMatchScore(activity.goodConditions, w);
    console.log(`👍 ${activity.id} good match score: ${goodScore.toFixed(3)}`);
    if (goodScore > 0.5) {
      score = 68 + Math.random() * 15;
      cl = 'good';
      console.log(`✅ ${activity.id} marked as good`);
    }
  }
  // Fair
  if (cl !== 'perfect' && cl !== 'good' && activity.fairConditions?.length) {
    const fairScore = calculateConditionMatchScore(activity.fairConditions, w);
    console.log(`👌 ${activity.id} fair match score: ${fairScore.toFixed(3)}`);
    if (fairScore > 0.3) {
      score = 45 + Math.random() * 15;
      cl = 'fair';
      console.log(`🆗 ${activity.id} marked as fair`);
    }
  }
  // If no poor conditions triggered but no specific good conditions met, give moderate score
  if (cl === 'fair' && score === 50) {
    score = 40 + Math.random() * 20; // 40-60 range for neutral conditions
    console.log(`📝 ${activity.id} using neutral conditions score: ${score}`);
  }

  // Evening adjustments for outdoor
  if (isEveningToday) {
    const hour = new Date(opts.nowTs).getHours();
    const eveningRes = applyEveningBonus(activity as unknown as ActivityType, hour, contextTags, opts);
    score *= eveningRes.multiplier;
  }

  score = Math.max(5, Math.min(95, score));
  return Math.round(score);
}

// Define these helper functions if they don't exist elsewhere
function getScoreEvaluation(score: number): SuitabilityLevel {
  return toLevel(score);
}

function getReasoningForScore(score: number, activity: ActivityType, _weather: WeatherData): string {
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
  isEveningToday = false
}: {
  forecast: Array<{ date: number; weather: WeatherData }>;
  activities: ActivityType[];
  interests: string[];
  now: Date;
  includeAllActivities?: boolean;
  isEveningToday?: boolean;
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

  return forecast.map((day: { date: number; weather: WeatherData }) => {
    console.log('🌤️ Processing day:', day.date);
    
    const mapped = activities
      .map((activity: ActivityType) => {
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
          (day.weather.precipitation ?? 0) < 5, // isWeatherGood
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
      });
      const suggestions: Suggestion[] = (mapped.filter(Boolean) as unknown) as Suggestion[];
    suggestions.sort((a, b) => b.score - a.score);
      
    console.log(`✅ Finished day with ${suggestions.length} activities`);
    return {
      date: day.date,
      suggestions
    };
  });
}
