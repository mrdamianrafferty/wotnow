/**
 * A veto was not the only ceiling an activity had, and the other one was
 * invisible.
 *
 * `getSuggestionsByDay` disqualifies the good band when its worst criterion
 * drops below 0.35, and `evaluateConditionScore` decays an out-of-range value
 * as `0.5 * (1 - overflow/span)`. A good band written `temperature=12..20`
 * therefore dies at 22.4 °C, whatever the poor band says. For seventeen
 * activities that hidden ceiling, not the stated veto, was the binding one:
 *
 *     foraging        veto >30, died at 22.4    urban_exploring >35, at 30.7
 *     gaelic_football veto >28, died at 23.9    mushroom_huntin >25, at 21.0
 *
 * Measured on foraging: `good.mean` holds at 0.86-0.90 from 20 °C to 25 °C
 * while the score falls 78 -> 39 at 23 °C, purely on the floor, and the tile
 * reads "Not a day for foraging" on a 23 °C afternoon.
 *
 * The fix demotes rather than exempts, which is the correction rain and the
 * safety floor each got before it. The first attempt DID exempt, and was too
 * generous by exactly the width of the fair band — `beach` read PRIME at 14 °C,
 * where its own veto starts and its fair band explicitly covers 14..20. Both
 * halves of that are pinned below.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { statedVetoes, overflowDirection } from '../utils/activitySuitability';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

const BASE = {
  precipitation: 0, clouds: 50, windspeed: 6, humidity: 70,
  visibility: 20000, soilMoisture: 30, gust: 8.4,
} as const;

function suggestion(activityId: string, weather: Record<string, number>) {
  const now = new Date('2026-06-15T13:00:00');
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never,
    interests: [activityId],
    now,
    includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number; reasoning?: string }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!;
}

const scoreAt = (id: string, temperature: number, extra: Record<string, number> = {}) =>
  suggestion(id, { ...BASE, temperature, ...extra }).score;

describe('a shoulder the veto already prices does not read as "not today"', () => {
  it.each([
    // activity,        shoulder °C, its stated heat veto
    ['foraging', 26, 30],
    ['gaelic_football', 26, 28],
    ['urban_exploring', 32, 35],
    ['trail_running', 26, 26],
    /* Not mushroom_hunting, which reads 35 here for an unrelated and correct
       reason: the fixture date is in June, and it is out of season whatever the
       weather does. Seasonality is a separate axis and this is not its test. */
  ])('%s at %i°C sits below its own veto of >%i, so it is workable rather than out',
    (id, shoulder) => {
      const score = scoreAt(id as string, shoulder as number);
      expect(score).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
    });

  it('foraging at 23°C stops reading "Not a day for foraging"', () => {
    // The measured report: 78 at 22 °C, 39 at 23 °C, on one criterion's floor.
    const r = suggestion('foraging', { ...BASE, temperature: 23 });
    expect(r.score).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
    expect(r.reasoning).not.toMatch(/not a day for/i);
  });
});

describe('demoted, not promoted', () => {
  it.each([
    ['beach', 14, { clouds: 10 }],       // 14 is where its own veto starts
    ['stargazing', 10, { clouds: 50 }],  // 50% cloud is where its own veto starts
  ])('%s at its shoulder stays below the good band', (id, temperature, extra) => {
    const score = scoreAt(id as string, temperature as number, extra as Record<string, number>);
    // The first attempt read 78 and 74 here.
    expect(score).toBeLessThan(BAND_FLOOR.worthALook);
    expect(score).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });

  it('leaves a genuinely good day exactly where it was', () => {
    expect(scoreAt('beach', 26, { clouds: 10 })).toBeGreaterThanOrEqual(BAND_FLOOR.prime);
    expect(scoreAt('stargazing', 10, { clouds: 10 })).toBeGreaterThanOrEqual(BAND_FLOOR.prime);
    expect(scoreAt('foraging', 22)).toBeGreaterThanOrEqual(BAND_FLOOR.worthALook);
  });

  it('still vetoes past the veto', () => {
    // running vetoes above 25; the relaxation must not reach past a veto.
    expect(scoreAt('running', 26)).toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('a shortfall the veto does not guard stays binding', () => {
  it('does not make a flat calm windsurfable', () => {
    /*
     * The regression this rule is shaped to avoid, and the reason it reads a
     * DIRECTION rather than a set of keys. `windSpeed>15` prices a gale and
     * says nothing about a windless day, so a shortfall from below keeps the
     * floor. Measured at 2 m/s: 16 before and after.
     */
    expect(scoreAt('windsurfing_inland', 22, { windspeed: 2, gust: 2.8 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('a demotion always says why', () => {
  it.each([
    ['foraging', 26, /hot for it/i],
    ['beach', 14, /cold for it/i],
    ['geocaching', 2, /cold for it/i],
    ['stargazing', 10, /cloud/i],
  ])('%s at %i°C names the criterion that demoted it', (id, temperature, expected) => {
    /*
     * geocaching is the case that needed its own branch: its cold veto is at
     * −2, so at 2 °C nothing had fired for the nearest-poor guess to find, and
     * the tile read "Workable for geocaching. Light breeze, Force 2, 2 °C." — a
     * pleasant sentence under a demoted score.
     */
    const extra = id === 'stargazing' ? { clouds: 50 } : id === 'beach' ? { clouds: 10 } : {};
    const r = suggestion(id as string, { ...BASE, temperature: temperature as number, ...extra });
    expect(r.reasoning).toMatch(expected as RegExp);
  });
});

describe('the helpers the rule is built on', () => {
  it('reads vetoes per key and per direction', () => {
    const v = statedVetoes(['temperature<-3 or temperature>24', 'gust>20', 'precipitation>4']);
    expect(v.get('temperature')).toEqual({ low: true, high: true });
    // The asymmetry the whole rule turns on.
    expect(v.get('gust')).toEqual({ low: false, high: true });
  });

  it('declines to guess which way a value left a two-branch range', () => {
    // 16 is outside both branches of 6..12 or 20..30, but above neither and
    // below neither. Undefined means "still binding", which is the safe answer.
    expect(overflowDirection('temperature=6..12 or 20..30', 16)).toBeUndefined();
    expect(overflowDirection('temperature=6..12 or 20..30', 33)).toBe('high');
    expect(overflowDirection('temperature=6..12 or 20..30', 2)).toBe('low');
    expect(overflowDirection('temperature=12..20', 17)).toBeUndefined();
  });
});
