/**
 * A forecast that carries no wind is not a forecast of dead calm.
 *
 * `windSpeed: windMeanMs ?? 0` in the scorer, and `windspeed: meanKmh ?? maxKmh
 * ?? 0` upstream of it, turned a missing payload into a measured 0 km/h. The
 * evaluator counts a number and skips an absence, so that zero was not a
 * neutral default — it was the one claim least true of the sports that need
 * wind, and it sank every one of them on a day that was otherwise fine.
 */

import { getSuggestionsByDay, type WeatherData } from '@/utils/getSuggestionsByDay';
import { allSports } from '@/data/activities';

const BASE: WeatherData = {
  temperature: 16, temperatureMax: 18, temperatureMin: 11,
  precipitation: 0, clouds: 40, humidity: 70,
};

const scores = (weather: WeatherData): Map<string, number> => {
  const [day] = getSuggestionsByDay({
    forecast: [{ date: Math.floor(Date.parse('2026-09-15T09:00:00Z') / 1000), weather }],
    activities: allSports as never,
    interests: [],
    now: new Date('2026-09-15T09:00:00Z'),
    includeAllActivities: true,
  });
  return new Map((day.suggestions ?? []).map((s) => [s.activityId, s.score]));
};

describe('wind that the forecast never carried', () => {
  /*
   * The sports pinned here are the ones the old default hurt most: each needs
   * wind, each scored in the teens or twenties against a fabricated calm, and
   * each is fine on this day once the criterion is simply not counted.
   */
  it.each(['sailing_inland', 'windsurfing_inland', 'sailing', 'windsurfing', 'kitesurfing'])(
    'does not sink %s by calling a missing wind a dead calm',
    (id) => {
      const absent = scores(BASE).get(id);
      const calm = scores({ ...BASE, windspeed: 0 }).get(id);
      expect(typeof absent).toBe('number');
      expect(typeof calm).toBe('number');
      // A measured calm is genuinely bad for these; an absence must not be.
      expect(calm as number).toBeLessThan(50);
      expect(absent as number).toBeGreaterThan(60);
    },
  );

  it('still scores a measured calm as a measured calm', () => {
    // The fix must not make 0 km/h mean "unknown" — a real dead calm is data.
    expect(scores({ ...BASE, windspeed: 0 }).get('sailing') as number).toBeLessThan(50);
  });

  it('leaves a day with real wind untouched', () => {
    const windy = scores({ ...BASE, windspeed: 22, windspeedMax: 30 });
    expect(windy.get('sailing') as number).toBeGreaterThan(60);
  });
});
