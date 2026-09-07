/**
 * Which end of a limit fired, and therefore which sentence gets written.
 *
 * `scorePoorConditions` read the direction from the FIRST operator in the
 * condition string, with an anchored regex. Forty conditions in the library are
 * two-sided — `temperature<5 or temperature>32` and its relatives — and every
 * one of them reported `low` whichever end the value was actually past:
 *
 *     dog walking      at 32°C  ->  "Cold for it — 32 °C."
 *     football         at 35°C  ->  "Cold for it — 35 °C."
 *     golf             at 35°C  ->  "Cold for it — 35 °C."
 *     surfing, 3 m sea         ->  the not-enough-swell phrasing
 *
 * That sentence is the most-read thing the scorer produces — the reason under
 * the verdict, and the body of the daily push — so it was saying the opposite
 * of the truth on exactly the days somebody would go and check.
 *
 * The fix reads the value instead, but ONLY for two-sided conditions, and the
 * second half of that sentence is the part with a test. Applying it to
 * single-sided ones regressed wild swimming: `windSpeed>8` at 7.2 m/s has not
 * fired, and being below 8 is precisely why, so "value is under the number"
 * meant `low` and the tile read "Very little wind — Force 4" while approaching
 * its upper limit. A single-sided condition has one end it can ever mean.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';

const CLEAR = {
  precipitation: 0, clouds: 10, windspeed: 6, humidity: 50,
  visibility: 25000, soilMoisture: 30,
} as const;

function reasoning(activityId: string, weather: Record<string, unknown>): string {
  const now = new Date();
  now.setHours(13, 0, 0, 0);
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never,
    interests: [activityId],
    now,
    includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; reasoning?: string }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)?.reasoning ?? '';
}

describe('a two-sided limit names the end that actually fired', () => {
  it.each([
    ['dog_walking', 32], ['football_soccer', 35], ['golf', 35], ['tennis', 36],
  ])('says hot, not cold, for %s in a heatwave', (id, temperature) => {
    const r = reasoning(id, { ...CLEAR, temperature });
    expect(r).toMatch(/hot for it/i);
    expect(r).not.toMatch(/cold for it/i);
  });

  it.each([
    ['dog_walking', -8], ['football_soccer', -5], ['golf', -2],
  ])('still says cold for %s in a freeze', (id, temperature) => {
    const r = reasoning(id, { ...CLEAR, temperature });
    expect(r).toMatch(/cold for it/i);
    expect(r).not.toMatch(/hot for it/i);
  });
});

describe('a single-sided limit keeps reading its operator', () => {
  it('does not call an upper wind limit "very little wind"', () => {
    // The regression the first version of this fix caused. `windSpeed>8` at
    // 7.2 m/s has not fired; being under 8 is why.
    const r = reasoning('wild_swimming', {
      ...CLEAR, temperature: 17, windspeed: 26, waterTemperature: 16, clouds: 30,
    });
    expect(r).not.toMatch(/very little wind|not enough wind/i);
  });
});

describe('the shape is common enough to be worth a test', () => {
  it('finds the two-sided conditions this protects', () => {
    const twoSided = (allSports as Array<{ poorConditions?: string[] }>)
      .flatMap((a) => a.poorConditions ?? [])
      .filter((c) => /<=?/.test(c) && />=?/.test(c));
    // Forty at the time of writing. The assertion is that this is a shape the
    // library really uses, not that the count is frozen.
    expect(twoSided.length).toBeGreaterThan(20);
  });
});
