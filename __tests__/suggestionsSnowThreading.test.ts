import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';

describe('Snow fields are threaded into suggestion results', () => {
  const now = new Date('2025-01-15T12:00:00Z');
  const baseWeather = {
    temperature: -2,
    precipitation: 0,
    windspeed: 10, // km/h
    clouds: 20,
    humidity: 70,
    visibility: 8000,
    snowDepthCm: 40,
    snowfallRateMmH: 0,
  };

  test('suggestions include snow advisory for snow sports', () => {
    const forecast = [{ date: now.getTime(), weather: baseWeather }];
    const activities = activityTypes.filter(a => ['skiing', 'running'].includes(a.id));

    const result = getSuggestionsByDay({ forecast, activities, interests: [], now, includeAllActivities: true });
    const day = result[0];
    const skiing = day.suggestions.find(s => s.activityId === 'skiing');
    const running = day.suggestions.find(s => s.activityId === 'running');

    expect(skiing).toBeDefined();
    expect(skiing?.snow).toBeDefined();
    expect(['optimal','excellent','adequate','snowfall_caution']).toContain(skiing?.snow?.level);

    expect(running).toBeDefined();
    // running may or may not have snow advisory depending on thresholds; ensure present or undefined
    if (running?.snow) {
      expect(['caution','difficult','unsafe','snowfall_caution','safe','beneficial','impractical','uncomfortable','too_deep']).toContain(running.snow.level);
    }
  });
});
