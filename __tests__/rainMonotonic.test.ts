/**
 * A day cannot get better by raining for longer, and a picnic reads the ground.
 *
 * ─── The trough at two hours ─────────────────────────────────────────────
 *
 * `wetness` combined two limbs with `Math.max`: an intensity term `rainRate/4`
 * and a duration term. For a FIXED total those run in opposite directions —
 * spread the same rain over more hours and the rate falls while the duration
 * rises — so the max of a falling and a rising line had a trough where they
 * crossed, at about two hours. Measured on picnicking, 1 mm total:
 *
 *     1 h   43        4 h   43
 *     2 h   68  <--   6 h   41
 *     3 h   44       12 h   34
 *
 * Twenty-five points and a band change for one hour's difference, and a day
 * that improved by raining longer. Across a 169,920-cell sweep the library had
 * 5,053 pairs where more hours of the same rain scored better; it now has 94,
 * all of them at 6 mm and all at the 1 h -> 2 h step, which is the Met Office
 * 4 mm/h heavy-rain cap correctly ceasing to apply. That cap is deliberate and
 * this test does not ask for it to go.
 *
 * The intensity limb was the one to remove because it was already priced
 * elsewhere — `rainRateMmH >= 4` caps the score at 39 further down, as a hard
 * cap rather than a contribution.
 *
 * ─── The ground under a picnic ───────────────────────────────────────────
 *
 * `picnicking` reads `soilMoisture` and vetoes a waterlogged field, as hiking,
 * camping and football do. `outdoor_meditation` did not, so on a dry sunny day
 * after heavy rain it read 95 — prime — on ground picnicking scored 16 for.
 * You sit on the grass to meditate; the ground is a criterion.
 *
 * Yoga, a barbecue and an outdoor gig deliberately still do NOT read it. You
 * are standing, or shod, or on a mat, and damp grass does not reach you. That
 * is a judgement, it is the product owner's, and it is recorded here so it is
 * not "fixed" later by someone tidying for consistency.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

function score(activityId: string, over: Record<string, unknown>) {
  const now = new Date('2026-07-12T14:00:00');
  const weather = { temperature: 20, precipitation: 0, precipitationHours: 0, clouds: 40,
    windspeed: 10, gustspeed: 15, humidity: 70, visibility: 25000, soilMoisture: 30, ...over };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

describe('the same rain, spread thinner, never scores better', () => {
  const HOURS = [1, 2, 3, 4, 6, 8, 12];

  it.each(['picnicking', 'outdoor_music', 'hiking', 'dog_walking', 'urban_exploring'])(
    '%s is non-increasing as 1 mm is spread over more hours', (id) => {
      const scores = HOURS.map((h) => score(id, { precipitation: 1, precipitationHours: h }));
      for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    });

  it('no longer puts a 25-point spike at two hours', () => {
    // The measured symptom: 43, 68, 44 for one, two and three hours.
    const at = (h: number) => score('picnicking', { precipitation: 1, precipitationHours: h });
    expect(at(2)).toBeLessThanOrEqual(at(1));
    expect(at(3)).toBeLessThanOrEqual(at(2));
  });

  it('still ends a day with heavy rain in it', () => {
    // 6 mm in an hour is 6 mm/h, past the Met Office's 4 mm/h heavy boundary,
    // and the hard cap that catches it is the reason the intensity limb could
    // be removed from `wetness` at all.
    expect(score('hiking', { precipitation: 6, precipitationHours: 1 })).toBeLessThan(BAND_FLOOR.marginal);
  });

  it('still reads twelve hours of drizzle as a wet day', () => {
    expect(score('picnicking', { precipitation: 1, precipitationHours: 12 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('sitting on the ground is a criterion; standing on it is not', () => {
  const WATERLOGGED = { soilMoisture: 55 };

  it.each(['picnicking', 'outdoor_meditation'])(
    '%s declines a dry sunny day on a waterlogged field', (id) => {
      expect(score(id, WATERLOGGED)).toBeLessThan(BAND_FLOOR.marginal);
      // ...and is still happy on the same day with the ground dry.
      expect(score(id, { soilMoisture: 30 })).toBeGreaterThanOrEqual(BAND_FLOOR.prime);
    });

  it.each(['outdoor_yoga', 'bbq', 'outdoor_music'])(
    '%s deliberately ignores the ground — a mat, shoes, standing up', (id) => {
      /*
       * Not an oversight. Recorded so a later consistency pass does not
       * "fix" it: these were considered and left alone.
       */
      expect(score(id, WATERLOGGED)).toBeGreaterThanOrEqual(BAND_FLOOR.worthALook);
    });
});
