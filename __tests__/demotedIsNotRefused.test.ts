/**
 * A day the band logic demoted is not also a day it refused.
 *
 * The demotion branch exists to say "rain, or a missed safety criterion, or a
 * shoulder the veto already prices, refused the good band — none of those
 * disqualifies it". It places the day at 40-59 on purpose. Everything after it
 * then charged the day AGAIN for the very thing that demoted it: the penalty
 * (up to 40 points, saturating on one fired condition), `rainWeight` (up to
 * 25), and the wind adjustment.
 *
 * Measured over a real year at five UK and Irish places:
 *
 *     the demoted branch chose the band on 25.7% of the year
 *     70% of those days finished UNDER 40 anyway
 *
 * Of the 1,646 that did: 41% taken under by the penalty, 33% by `rainWeight`,
 * 26% by the wind adjustment. The "charged three times for the same rain"
 * pattern this file already names, one layer further down.
 *
 * ─── Why the floor is narrow, and what the first attempt got wrong ───────
 *
 * Flooring every demoted day broke eight tests, and they were right: a bog at
 * 55% where the model vetoes above 50, a flat calm below a windsurfer's
 * minimum, a gust past its limit. Those are statements the ACTIVITY makes, and
 * they must still be able to take a day under 40.
 *
 * So the floor is only for days that have crossed nothing at all — no poor
 * condition fired, no rain cap applies, in season. Measured across 147,825
 * (day, activity) cells: 1,946 changed, every one notToday -> marginal, none
 * reaching above 40, none moving down.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

function score(activityId: string, over: Record<string, unknown>, month = 5) {
  const now = new Date(`2026-${String(month).padStart(2, '0')}-15T13:00:00Z`);
  const weather = {
    temperature: 14, precipitation: 0, precipitationHours: 0, clouds: 60,
    windspeed: 14, gustspeed: 22, humidity: 70, visibility: 20000, soilMoisture: 30, ...over,
  };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

/*
 * Real days out of the archive, not invented ones. Each of these was measured
 * moving from the teens or thirties to exactly 40, and the first fixtures
 * written for this test scored 86 — they were not demoted days at all, and the
 * assertion passed for the wrong reason.
 */
const EDINBURGH_SEP = { temperature: 14.3, precipitation: 2.2, precipitationHours: 6,
  windspeed: 18, gustspeed: 52, clouds: 97, humidity: 62, soilMoisture: 8 };
const EDINBURGH_FEB = { temperature: 9.7, precipitation: 2.4, precipitationHours: 7,
  windspeed: 21, gustspeed: 57, clouds: 100, humidity: 86, soilMoisture: 25 };
const EDINBURGH_APR = { temperature: 9.5, precipitation: 2.8, precipitationHours: 6,
  windspeed: 21, gustspeed: 58, clouds: 83, humidity: 70, soilMoisture: 21 };

describe('a demoted day lands where the band logic put it', () => {
  it.each([
    ['urban_exploring', EDINBURGH_FEB, 2, 32],
    ['hiking', EDINBURGH_SEP, 9, 32],
    ['dog_walking', EDINBURGH_SEP, 9, 30],
    ['golf', EDINBURGH_APR, 4, 30],
  ])('%s reaches the marginal floor on a real day it used to fail', (id, day, month, before) => {
    // A grey, breezy, drizzly Edinburgh day: outside the good band, inside
    // every limit the model states. It scored `before` and is now workable.
    expect(before).toBeLessThan(BAND_FLOOR.marginal);
    expect(score(id as string, day as Record<string, unknown>, month as number))
      .toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });

  it('does not lift anything into a recommendable band', () => {
    // The floor is a floor: across 147,825 cells no changed one reached 41.
    for (const [id, day, month] of [
      ['urban_exploring', EDINBURGH_FEB, 2], ['hiking', EDINBURGH_SEP, 9],
      ['dog_walking', EDINBURGH_SEP, 9], ['golf', EDINBURGH_APR, 4],
    ] as Array<[string, Record<string, unknown>, number]>) {
      expect(score(id, day, month)).toBeLessThan(BAND_FLOOR.worthALook);
    }
  });
});

describe('what still takes a day under 40', () => {
  it('a bog — the model states a limit and the day crossed it', () => {
    expect(score('picnicking', { soilMoisture: 55 })).toBeLessThan(BAND_FLOOR.marginal);
  });

  it('twelve hours of drizzle — a duration reading the demotion does not make', () => {
    expect(score('picnicking', { precipitation: 1, precipitationHours: 12 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });

  it('heavy rain, at the Met Office 4 mm/h boundary', () => {
    expect(score('hiking', { precipitation: 6, precipitationHours: 1 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });

  it('a flat calm, for something that needs wind', () => {
    expect(score('windsurfing_inland', { windspeed: 3, gustspeed: 5 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });

  it('out of season — February knows nothing about the demotion', () => {
    expect(score('cricket', { clouds: 85 }, 1)).toBeLessThan(BAND_FLOOR.marginal);
  });

  it('a hazard, which never reaches the floor at all', () => {
    // `hazards.length` returns at the veto floor, far above this code.
    expect(score('hiking', { thunderstormHours: 2 })).toBeLessThan(20);
  });
});
