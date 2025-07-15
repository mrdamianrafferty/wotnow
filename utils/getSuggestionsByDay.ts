// utils/getSuggestionsByDay.ts

import {
  getActivitySuitability,
  safeEvaluate,
  extractWeatherKey,
} from './activitySuitability';

/**
 * Suggests up to 10 activities per day based on:
 * 1) Outdoor with perfect conditions
 * 2) Outdoor with good conditions
 * 3) Indoor alternatives
 * 4) Indoor weather-irrelevant interests
 */
export function getSuggestionsByDay({ forecast = [], interests = [], activities = [] }) {
  console.debug("getSuggestionsByDay called with:", { forecast, interests, activities });

  if (!Array.isArray(activities)) {
    console.error("🚨 activities is not an array:", activities);
    return [];
  }
  if (!Array.isArray(forecast)) {
    console.error("🚨 forecast is not an array:", forecast);
    return [];
  }

  return forecast.map(day => {
    const weather = day.weather || {};
    const currentMonth = new Date(day.date).getMonth() + 1;

    const selected = activities.filter(
      a =>
        interests.includes(a.id) &&
        (!a.seasonalMonths || a.seasonalMonths.includes(currentMonth))
    );

    const perfect: any[] = [];
    const good: any[] = [];
    const indoorAlternatives: string[] = [];
    const indoor: any[] = [];

    selected.forEach(activity => {
      const { id, weatherSensitive, poorConditions, indoorAlternative } = activity;

      const suitability = getActivitySuitability(activity, weather);

      if (suitability === "excluded") return;
      if (suitability === "perfect") {
        perfect.push({ activityId: id, evaluation: "perfect" });
      } else if (suitability === "good") {
        good.push({ activityId: id, evaluation: "good" });
      } else if (suitability === "acceptable") {
        good.push({ activityId: id, evaluation: "acceptable" });
      } else if (suitability === "indoor") {
        indoor.push({ activityId: id, evaluation: "indoor" });
      }

      if (weatherSensitive && indoorAlternative) {
        indoorAlternatives.push(indoorAlternative);
      }
    });

    const suggestions: any[] = [];
    const seen = new Set<string>();

    function add(list: any[]) {
      list.forEach(i => {
        if (!seen.has(i.activityId) && suggestions.length < 10) {
          seen.add(i.activityId);
          suggestions.push(i);
        }
      });
    }

    add(perfect);
    add(good);

    if (suggestions.length < 10 && indoorAlternatives.length > 0) {
      for (const alt of indoorAlternatives) {
        const altActivity = activities.find(a => a.id === alt || a.name === alt);
        if (altActivity && !seen.has(altActivity.id)) {
          suggestions.push({ activityId: altActivity.id, evaluation: "indoorAlternative" });
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

    return {
      date: day.date,
      suggestions,
    };
  });
}
