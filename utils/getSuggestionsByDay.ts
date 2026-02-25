// src/utils/getSuggestionsByDay.ts

// Lightweight types used here
type SuitabilityLevel = 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
import type { ActivityType } from '../data/activities/types';
import type { SnowRecommendationLevel } from './snowRecommendations';

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
  // Snow inputs (optional)
  snowDepthCm?: number;               // cm
  snowfallRateMmH?: number;           // mm/h
  // ➕ Soil moisture (0–1 m3/m3 or 0–100 %)
  soilMoisture?: number;
}

export interface EveningBonusResult {
  multiplier: number;
  reasons?: Record<string, string>;
}

export interface Suggestion {
  activityId: string;
  score: number;
  evaluation: SuitabilityLevel;
  reasoning?: string;
  outOfSeason?: boolean;
  eveningReasons?: EveningBonusResult['reasons'];
  snow?: { level: SnowRecommendationLevel; message: string };
}

// Removed unused imports to satisfy linter
// import { selectHeroActivity } from './heroSelector';
import { calculateConditionMatchScore,
         calculatePoorConditionPenalty,
         applySnowRecommendationScoring,
         applyWindRecommendationScoring,
         adjustScoreForMud } from './activitySuitability';
import type { WeatherData as SuitabilityWeather, MinimalActivity } from './activitySuitability';
import { applyEveningBonus } from './eveningScoring';
import { getWindActivityRecommendation } from './windRecommendations';
import { assessSoilCondition, isMudSensitive, getMudMessage } from './soilMoistureUtils';
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

// Unified scoring function that returns both score and optional snow details
function calculateActivityScoreWithSnow(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEveningToday: boolean,
  contextTags: string[],
  opts: { nowTs: number; sunsetTs?: number | null; month?: number }
): { score: number; snow?: { level: SnowRecommendationLevel; message: string } } {
  console.log(`🎯 Scoring ${activity.id}...`);
  console.log(`🌦️ Raw weather input:`, JSON.stringify(weather, null, 2));
  
  // Indoor activities: always doable regardless of weather, boosted in evening
  if (!activity.weatherSensitive) {
    let score = 65;
    const hour = new Date(opts.nowTs).getHours();
    const eveningResult = applyEveningBonus(activity as unknown as ActivityType, hour, contextTags, opts);
    score *= eveningResult.multiplier;
    return { score: Math.min(95, Math.round(score)) };
  }

  // Normalize weather to the suitability engine WeatherData
  const w: SuitabilityWeather = {
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
    // Snow passthrough
    snowDepthCm: weather.snowDepthCm,
    snowfallRateMmH: weather.snowfallRateMmH,
    // ➕ soil moisture passthrough
    soilMoisture: weather.soilMoisture,
  };

  // Heuristic: most non-water outdoor activities should not be marked good/perfect in rain
  const isWaterActivity = (activity.category?.toLowerCase().includes('water') || activity.secondaryCategory?.toLowerCase().includes('water') || activity.tags?.includes('water')) ?? false;
  const rainMm = typeof w.precipitation === 'number' ? w.precipitation : 0;

  let score = 50; // Start with neutral score instead of 20
  let cl: 'poor' | 'fair' | 'good' | 'perfect' = 'fair';

  // Dangerous conditions — make hazard veto sticky
  let penalty = 0;
  if (activity.poorConditions?.length) {
    penalty = calculatePoorConditionPenalty(activity.poorConditions, w);
    if (penalty >= 0.7) {
      // Hard veto: cap and return early to avoid any later upgrades
      const hardCapped = Math.max(5, Math.min(40, 20 + Math.round(Math.random() * 10)));
      return { score: hardCapped };
    }
  }

  // Perfect
  if (activity.perfectConditions?.length) {
    const perfectScore = calculateConditionMatchScore(activity.perfectConditions, w);
    if (perfectScore > 0.8) {
      // Disallow perfect if notable rain for non-water activities or moderate risk present
      if (!isWaterActivity && rainMm > 0) {
        // skip perfect upgrade
      } else if (penalty < 0.3) {
        score = 90 + Math.random() * 8;
        cl = 'perfect';
        console.log(`🌟 ${activity.id} marked as perfect`);
      }
    }
  }
  // Good
  if (cl !== 'perfect' && activity.goodConditions?.length) {
    const goodScore = calculateConditionMatchScore(activity.goodConditions, w);
    if (goodScore > 0.5) {
      // Require essentially dry conditions for non-water activities
      const allowGood = isWaterActivity || rainMm <= 0.5;
      if (allowGood) {
        score = 68 + Math.random() * 15;
        cl = 'good';
        console.log(`✅ ${activity.id} marked as good`);
      }
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

  // Risk-aware finalization: subtract poor penalty and cap categories by risk
  if (!penalty && activity.poorConditions?.length) {
    penalty = calculatePoorConditionPenalty(activity.poorConditions, w);
  }

  // Subtract penalty (40pt full-scale impact)
  score = score - Math.round(penalty * 40);

  // Additional rain caps for non-water activities
  if (!isWaterActivity) {
    if (rainMm >= 3) score = Math.min(score, 40); // heavy rain -> poor
    else if (rainMm >= 1) score = Math.min(score, 59); // light-moderate rain -> at most fair
  }

  // ➕ Apply wind-aware adjustment
  const windAdjusted = applyWindRecommendationScoring(activity as MinimalActivity, w, score);
  score = windAdjusted.score;

  // ➕ Apply soil moisture adjustment for mud-sensitive activities
  const mudAdjusted = adjustScoreForMud(activity as MinimalActivity, w, score);
  score = mudAdjusted.score;

  // Apply snow-aware adjustment
  const snowAdjusted = applySnowRecommendationScoring(activity as MinimalActivity, w, score);
  score = snowAdjusted.score;

  // Risk caps to prevent high categories under risk
  if (penalty >= 0.5) score = Math.min(score, 59); // at most fair
  else if (penalty >= 0.3) score = Math.min(score, 89); // block perfect

  // Clamp and round
  score = Math.max(5, Math.min(95, score));
  return { score: Math.round(score), snow: snowAdjusted.snow ? { level: snowAdjusted.snow.level, message: snowAdjusted.snow.message } : undefined };
}

// Define these helper functions if they don't exist elsewhere
function getScoreEvaluation(score: number): SuitabilityLevel {
  return toLevel(score);
}

function getReasoningForScore(score: number, activity: ActivityType, weather: WeatherData): string {
  let base: string;
  if (score >= 90) base = `Perfect conditions for ${activity.name || activity.id}!`;
  else if (score >= 60) base = `Good weather for ${activity.name || activity.id}.`;
  else if (score >= 40) base = `Fair conditions for ${activity.name || activity.id}.`;
  else base = `Not ideal weather for ${activity.name || activity.id}, but still an option.`;

  // ➕ Wind context
  const windMs = typeof weather.windspeed === 'number' ? weather.windspeed / 3.6 : undefined;
  if (typeof windMs === 'number') {
    const rec = getWindActivityRecommendation(activity.id, windMs);
    if (['dangerous','unsafe','impractical','unplayable','difficult','uncomfortable','caution','min_wind_needed','optimal','beneficial'].includes(rec.level)) {
      base += ` ${rec.emoji ?? ''} ${rec.message}`.trim();
    }
  }

  // ➕ Humidity context for poor scores
  if (score < 40 && typeof weather.humidity === 'number' && weather.humidity >= 90) {
    base += ` High humidity (${Math.round(weather.humidity)}%) is making it feel oppressive.`;
  }

  // ➕ Soil/mud context
  if (typeof weather.soilMoisture === 'number' && isMudSensitive(activity.id)) {
    const soil = assessSoilCondition(weather.soilMoisture);
    const msg = getMudMessage(activity.id, soil);
    if (msg) base += ` — ${msg}`;
  }

  return base;
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

        const { score, snow } = calculateActivityScoreWithSnow(
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
            outOfSeason,
            snow: snow ? { level: snow.level, message: snow.message } : undefined,
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
