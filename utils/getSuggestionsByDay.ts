import { getActivitySuitability } from './activitySuitability';
import { ActivityType } from '../data/activityTypes';

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
  // You can extend with explicit properties if desired
}

export interface ForecastDayInput {
  date: string;
  weather: WeatherData;
  marine?: MarineWeatherData[]; // Each day can include marine data array
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

// --- Main Function ---
/**
 * Suggests up to 10 activities per day:
 * 1) Outdoor with perfect conditions (land & marine aware)
 * 2) Outdoor with good/acceptable conditions
 * 3) Indoor alternatives
 * 4) Indoor, weather-irrelevant interests
 */
export function getSuggestionsByDay({
  forecast = [],
  interests = [],
  activities = [],
}: GetSuggestionsByDayParams): SuggestionsForDay[] {
  if (!Array.isArray(activities) || !Array.isArray(forecast)) return [];

  return forecast.map(day => {
    // --- Merge land and marine weather ---
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

    // -- Order suggestions: perfect, good/acceptable, indoor alt, then indoor --
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
    if (suggestions.length < 10) {
      for (const i of indoor) {
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
