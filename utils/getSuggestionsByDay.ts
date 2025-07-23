//----------------------------------------------
//  src/utils/getSuggestionsByDay.ts
//----------------------------------------------
import { getActivitySuitability } from './activitySuitability';
import { calculateActivityScore } from './activityScoring';
import { applyEveningBonus } from './eveningScoring';
import { selectHeroActivity } from './heroSelector';
import { matchScore } from './matchScore';
import { applyWeekdayBoost } from './weekdayScoring';
import { ActivityType } from '../data/activityTypes';

// ─── Types ────────────────────────────────────
export type SuitabilityLevel =
  | 'perfect'
  | 'good'
  | 'acceptable'
  | 'indoor'
  | 'indoorAlternative';

export interface WeatherData {
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  waterTemperature?: number;
  waveHeight?: number;
  swellHeight?: number;
  swellPeriod?: number;
  clouds?: number;
  humidity?: number;
  visibility?: number;
  [key: string]: number | undefined | null;
}

export interface ForecastDayInput {
  date: string;
  weather: WeatherData;
  marine?: Record<string, number>[];
}

export interface Suggestion {
  activityId: string;
  evaluation: SuitabilityLevel;
  score: number;
}

export interface SuggestionsForDay {
  date: string;
  suggestions: Suggestion[];
  heroActivity: Suggestion | null;
}

export interface GetSuggestionsByDayParams {
  forecast: ForecastDayInput[];
  interests: string[];
  activities: ActivityType[];
  now?: Date;  // Optional: override for tests or SSR
}

// ─── Main function ───────────────────────────
export function getSuggestionsByDay({
  forecast = [],
  interests = [],
  activities = [],
  now = new Date()
}: GetSuggestionsByDayParams): SuggestionsForDay[] {
  if (!Array.isArray(activities) || !Array.isArray(forecast)) return [];

  const daysOfWeek = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const todayName  = daysOfWeek[now.getDay()];
  const currentHour = now.getHours();
  const isTodayEvening = currentHour >= 18;

  // Build context tags for "today" only
  const todayTimeTag = isTodayEvening
    ? 'evening'
    : (currentHour >= 12 ? 'afternoon' : 'morning');
  const todayContextTags = [
    todayName,
    todayTimeTag,
    'relaxation','family','cultural','leisure','home','social'
  ];

  return forecast.map((day, idx) => {
    const month = new Date(day.date).getMonth() + 1;
    const currentDayName = daysOfWeek[new Date(day.date).getDay()];

    // Only include activities in season
    let inSeasonActivities = activities.filter(activity => {
      if (!activity.seasonalMonths || activity.seasonalMonths.length === 0) return true;
      return activity.seasonalMonths.includes(month);
    });

    // Determine if this is today
    const isToday = new Date(day.date).toDateString() === now.toDateString();
    const isEvening = isToday && now.getHours() >= 18;

    // After 6pm, only show indoor or 'evening'-tagged activities
    if (isEvening) {
      inSeasonActivities = inSeasonActivities.filter(activity =>
        !activity.weatherSensitive ||
        (activity.tags && activity.tags.includes('evening'))
      );
    }

    // Determine if weather is "good" for any outdoor activity
    const outdoorScores = activities
      .filter(a => a.weatherSensitive)
      .map(a => calculateActivityScore(a, day.weather, false, false));
    const isWeatherGood = outdoorScores.some(score => score >= 60);

    const suggestions = inSeasonActivities.map(activity => {
      let score = calculateActivityScore(
        activity,
        day.weather,
        isWeatherGood,
        isEvening
      );

      // Boost if the activity's tags include the current day
      if (activity.tags && activity.tags.includes(currentDayName)) {
        score = Math.round(score * 1.1);
      }

      if (isEvening) {
        score = Math.round(score * applyEveningBonus(activity, now.getHours(), todayContextTags));
      }

      return {
        activityId: activity.id,
        score,
        evaluation: activity.weatherSensitive
          ? (
              score >= 80 ? 'perfect'
            : score >= 60 ? 'good'
            : score >= 30 ? 'acceptable'
            : 'acceptable'
          ) as SuitabilityLevel
          : (activity.indoorAlternative ? 'indoorAlternative' : 'indoor') as SuitabilityLevel,
        weatherSensitive: activity.weatherSensitive,
      };
    });

    // Always show top 10 by score, regardless of type
    const top10 = suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      date: day.date,
      suggestions: top10.map(({ weatherSensitive, ...rest }) => rest),
      heroActivity: selectHeroActivity(top10, isEvening)
    };
    }); // <-- This closes the forecast.map
} // <-- This closes the getSuggestionsByDay function