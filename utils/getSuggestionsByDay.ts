import { getActivitySuitability } from './activitySuitability';
import { ActivityType } from '../data/activityTypes';
import { matchScore } from '../utils/matchScore';

// --- Types ---
export type SuitabilityLevel = 'perfect' | 'good' | 'acceptable' | 'indoor' | 'indoorAlternative';

export interface WeatherData {
  temperature?: number;
  precipitation?: number;
  windSpeed?: number;
  waterTemperature?: number; // Stormglass
  waveHeight?: number;       // Stormglass
  swellHeight?: number;
  swellPeriod?: number;
  clouds?: number;
  humidity?: number;
  visibility?: number;
  [key: string]: number | undefined | null;
}

export interface MarineWeatherData {
  [key: string]: number | undefined | null;
}

export interface ForecastDayInput {
  date: string;
  weather: WeatherData;
  marine?: MarineWeatherData[];
}

export interface Suggestion {
  activityId: string;
  evaluation: SuitabilityLevel;
  score?: number;
}

export interface SuggestionsForDay {
  date: string;
  suggestions: Suggestion[];
}

export interface GetSuggestionsByDayParams {
  forecast: ForecastDayInput[];
  interests: string[];
  activities: ActivityType[];
}

export function getSuggestionsByDay({
  forecast = [],
  interests = [],
  activities = [],
}: GetSuggestionsByDayParams): SuggestionsForDay[] {
  if (!Array.isArray(activities) || !Array.isArray(forecast)) return [];

  // --- Prepare context tags ONCE per call (can move this out if you already have it elsewhere) ---
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[now.getDay()];
  const hour = now.getHours();
  const contextTags = [
    currentDay,
    hour >= 18 ? 'evening' : hour >= 12 ? 'afternoon' : 'morning',
    'relaxation', 'family', 'cultural', 'leisure', 'home', 'social'
  ];

  return forecast.map(day => {
    // --- Merge weather data ---
    const marine = Array.isArray(day.marine) && day.marine.length > 0 ? day.marine[0] : {};
    const weather: WeatherData = { ...day.weather, ...marine };

    const currentMonth = new Date(day.date).getMonth() + 1;
    const selected = activities.filter(
      a => interests.includes(a.id) &&
           (!a.seasonalMonths || a.seasonalMonths.includes(currentMonth))
    );

    const perfect: Suggestion[] = [];
    const good: Suggestion[] = [];
    const indoorAlternatives: string[] = [];
    const indoor: Suggestion[] = [];

    // -- Evaluate activity suitability --
    for (const activity of selected) {
      const { id, weatherSensitive, indoorAlternative } = activity;
      const suitability = getActivitySuitability(activity, weather);

      if (suitability === 'excluded') continue;
      if (suitability === 'perfect') {
        perfect.push({ activityId: id, evaluation: 'perfect' });
      } else if (suitability === 'good') {
        good.push({ activityId: id, evaluation: 'good' });
      } else if (suitability === 'acceptable') {
        good.push({ activityId: id, evaluation: 'acceptable' });
      } else if (suitability === 'indoor') {
        indoor.push({ activityId: id, evaluation: 'indoor' });
      }

      if (weatherSensitive && indoorAlternative) indoorAlternatives.push(indoorAlternative);
    }

    // -- Order suggestions: perfect, good/acceptable, indoor alt, then sorted indoor --
    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();
    function add(list: Suggestion[]) {
      for (const i of list) {
        if (!seen.has(i.activityId) && suggestions.length < 10) {
          seen.add(i.activityId);
          suggestions.push(i);
        }
      }
    }
    add(perfect); add(good);

    // Add indoor alternatives (limit to 10)
    if (suggestions.length < 10 && indoorAlternatives.length > 0) {
      for (const alt of indoorAlternatives) {
        const altActivity = activities.find(a => a.id === alt || a.name === alt);
        if (altActivity && !seen.has(altActivity.id)) {
          suggestions.push({ activityId: altActivity.id, evaluation: 'indoorAlternative' });
          seen.add(altActivity.id);
          if (suggestions.length >= 10) break;
        }
      }
    }

    // Add sorted indoor activities by context-match
    if (suggestions.length < 10) {
      const sortedIndoor = indoor
        .map(i => ({
          ...i,
          score: matchScore((activities.find(a => a.id === i.activityId)?.tags) || [], contextTags)
        }))
        .sort((a, b) => b.score - a.score);

      for (const i of sortedIndoor) {
        if (!seen.has(i.activityId)) {
          suggestions.push(i);
          seen.add(i.activityId);
          if (suggestions.length >= 10) break;
        }
      }
    }

    return { date: day.date, suggestions };
  });
}
