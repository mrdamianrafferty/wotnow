// Utility to determine suitability of activities based on forecast conditions

import { Activity } from "../types/Activity";
import { ForecastEntry } from "../types/Forecast";

export function getActivitySuitability(activity: Activity, forecast: ForecastEntry): "perfect" | "good" | "none" {
  // Example logic: if temperature is within activity's preferred range and weather is suitable
  const temp = forecast.temperature;
  const weather = forecast.weatherCondition;

  if (activity.preferredTemperatureRange) {
    const [minTemp, maxTemp] = activity.preferredTemperatureRange;
    if (temp < minTemp || temp > maxTemp) {
      return "none";
    }
  }

  if (activity.unsuitableWeatherConditions && activity.unsuitableWeatherConditions.includes(weather)) {
    return "none";
  }

  if (activity.optimalWeatherConditions && activity.optimalWeatherConditions.includes(weather)) {
    return "perfect";
  }

  return "good";
}

export function getSuggestionsByDay(
  activities: Activity[],
  forecast: ForecastEntry
): { perfect: Activity[]; good: Activity[] } {
  console.debug(
    "getSuggestionsByDay: activities type",
    typeof activities,
    Array.isArray(activities)
  );
  if (!Array.isArray(activities)) {
    console.error("getSuggestionsByDay: activities is not an array", activities);
    return { perfect: [], good: [] };
  }

  const result = { perfect: [], good: [] } as { perfect: Activity[]; good: Activity[] };

  activities.forEach((activity) => {
    const suitability = getActivitySuitability(activity, forecast);
    if (suitability === "perfect") {
      result.perfect.push(activity);
    } else if (suitability === "good") {
      result.good.push(activity);
    }
  });

  console.debug("getSuggestionsByDay output", result);
  return result;
}
