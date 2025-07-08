import { getActivitySuitability } from './activitySuitability';

function normaliseWeatherKeys(weather: Record<string, any>): Record<string, any> {
  console.debug("normaliseWeatherKeys received", weather);
  return {
    temperature: weather.temperature ?? weather.temp ?? weather.tempMax ?? null,
    precipitation: weather.precipitation ?? weather.rain ?? 0,
    windSpeed: weather.windSpeed ?? weather.wind_speed ?? 0,
    water_temp: weather.water_temp ?? null
  };
}
export function getSuggestionsByDay(
  activities: Activity[],
  forecast: ForecastEntry,
  userPreferences: { interests: string[] }
): { suggestions: Activity[]; message?: string } {
  console.log('forecast passed to getSuggestionsByDay', forecast);
  console.debug(
    "getSuggestionsByDay: activities type",
    typeof activities,
    Array.isArray(activities)
  );
  if (!Array.isArray(activities)) {
    console.error("getSuggestionsByDay: activities is not an array", activities);
    return { suggestions: [], message: undefined };
  }

  // Only keep activities matching user interests
  const selectedActivities = activities.filter(a =>
    userPreferences?.interests?.includes(a.id)
  );

  const suggestions: Activity[] = [];

  const isIndoor = (a: Activity) => a.secondaryCategory === 'Indoor';
  const isOutdoor = (a: Activity) => a.secondaryCategory === 'Outdoor';

  const weatherForDay = normaliseWeatherKeys(forecast);
  console.debug("Weather after normalisation", weatherForDay);

  const suitabilityMap = selectedActivities.map(activity => ({
    activity,
    suitability: getActivitySuitability(activity, weatherForDay)
  }));

  const perfect = suitabilityMap
    .filter(({ activity, suitability }) => isOutdoor(activity) && suitability === 'perfect')
    .map(({ activity }) => activity);

  const good = suitabilityMap
    .filter(({ activity, suitability }) => isOutdoor(activity) && suitability === 'good')
    .map(({ activity }) => activity);

  const indoorAlternatives = selectedActivities
    .filter(a => a.indoorAlternative && isOutdoor(a))
    .map(a => selectedActivities.find(x => x.id === a.indoorAlternative))
    .filter(Boolean) as Activity[];

  const indoor = selectedActivities.filter(isIndoor);

  const fillSuggestions = (source: Activity[]) => {
    for (const a of source) {
      if (suggestions.length >= 5) break;
      if (!suggestions.includes(a)) suggestions.push(a);
    }
  };

  fillSuggestions(perfect);
  fillSuggestions(good);
  fillSuggestions(indoorAlternatives);
  fillSuggestions(indoor);

  let message: string | undefined = undefined;
  if (suggestions.length < 5) {
    message = `The weather sucks. <a href="/interests">Add some indoor interests…</a>`;
  }

  console.debug("getSuggestionsByDay output", { suggestions, message });
  return { suggestions, message };
}
