/**
 * One table, where six ad-hoc sets used to answer the same question.
 *
 *     SHORTFALL_NOT_HAZARD   activitySuitability   too little isn't dangerous
 *     NEVER_A_HAZARD         activitySuitability   penalises, never vetoes
 *     NOT_A_HAZARD_ON_LAND   activitySuitability   gust, conditional on water
 *     DECIDES_SAFETY         getSuggestionsByDay   stricter floor on water
 *     DANGEROUS_KEYS         bands                 which vetoes read "unsafe"
 *     PRICED_ELSEWHERE       getSuggestionsByDay   exempt from the band floor
 *
 * `gust` was in three of them with three different answers, none was
 * per-activity, and every new criterion — thunder, freezing rain — had to be
 * added to several by hand with nothing to say which.
 *
 * Five consolidated. The sixth did not, and that is a finding rather than an
 * omission: `PRICED_ELSEWHERE` asks "is this already charged elsewhere", which
 * is a fact about the scorer, not about the criterion. Deriving it from COMFORT
 * broke three tests in one run — a bog stopped disqualifying a picnic and
 * stargazing under 50% cloud stopped being demoted. Both are comfort criteria
 * and both SHOULD disqualify a band; they simply must not call the day
 * dangerous. Two different lines.
 */

import {
  roleFor, isHazard, isDangerous, ROLED_KEYS, type CriterionRole,
} from '../utils/criterionRoles';
import { allSports } from '../data/activities';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { bandFor, BAND_FLOOR } from '../lib/godaisy/call/bands';

describe('the table covers what the library actually uses', () => {
  it('states a role for every criterion key in every model', () => {
    /*
     * The default is VIABILITY, which vetoes without claiming danger — a safety
     * net, not a place to leave things. This is what stops a new key being
     * added to `data/activities` and silently inheriting it.
     */
    const used = new Set<string>();
    for (const a of allSports as Array<Record<string, string[] | undefined>>)
      for (const band of ['perfectConditions', 'goodConditions', 'fairConditions', 'poorConditions'])
        for (const c of (a[band] as string[] | undefined) ?? []) {
          const k = /^([a-zA-Z_]+)/.exec(c.trim())?.[1];
          if (k) used.add(k);
        }
    const missing = [...used].filter((k) => !ROLED_KEYS.includes(k));
    expect(missing).toEqual([]);
  });
});

describe('the two keys whose role depends on context', () => {
  it('gust: what capsizes a dinghy, what takes a tablecloth', () => {
    expect(roleFor('gust', { onWater: true })).toBe<CriterionRole>('safety');
    expect(roleFor('gust', { onWater: false })).toBe<CriterionRole>('comfort');
  });

  it('a shortfall is a disappointment, whatever the quantity', () => {
    // waveHeight is safety at 3 m and "nothing to surf" at 0.1 m.
    expect(roleFor('waveHeight', { firedLow: false })).toBe<CriterionRole>('safety');
    expect(roleFor('waveHeight', { firedLow: true })).toBe<CriterionRole>('comfort');
    expect(isHazard('windSpeed', { firedLow: true })).toBe(false);
    expect(isHazard('windSpeed', { firedLow: false })).toBe(true);
  });

  it('defaults to the stricter reading when the caller says nothing', () => {
    // onWater defaults true, firedLow false.
    expect(roleFor('gust')).toBe<CriterionRole>('safety');
    expect(isHazard('waveHeight')).toBe(true);
  });
});

describe('only safety earns the red band', () => {
  it.each(['waveHeight', 'waterTemperature', 'snowfallRateMmH', 'visibility',
           'thunderstormHours', 'freezingRainHours'])('%s is dangerous', (k) => {
    expect(isDangerous(k)).toBe(true);
  });

  it.each(['temperature', 'windSpeed', 'snowDepthCm', 'windDirection'])(
    '%s stops a day without calling it dangerous', (k) => {
      expect(isHazard(k)).toBe(true);
      expect(isDangerous(k)).toBe(false);
    });

  it.each(['soilMoisture', 'humidity', 'clouds', 'cloudCover', 'precipitation'])(
    '%s is comfort — it costs the day, it does not stop it', (k) => {
      expect(isHazard(k)).toBe(false);
      expect(isDangerous(k)).toBe(false);
    });

  it('does not put a red band on a gusty lawn', () => {
    expect(isDangerous('gust', { onWater: false })).toBe(false);
    expect(isDangerous('gust', { onWater: true })).toBe(true);
  });
});

describe('the set that did not consolidate still does its job', () => {
  const score = (id: string, over: Record<string, unknown>) => {
    const now = new Date('2026-07-12T14:00:00');
    const weather = { temperature: 20, precipitation: 0, precipitationHours: 0, clouds: 30,
      windspeed: 10, gustspeed: 15, humidity: 70, visibility: 25000, soilMoisture: 30, ...over };
    const byDay = getSuggestionsByDay({
      forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
      activities: allSports as never, interests: [id], now, includeAllActivities: true,
    }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
    return byDay[0].suggestions.find((s) => s.activityId === id)!.score;
  };

  it('a bog still disqualifies a picnic, though soil is comfort', () => {
    // Comfort means "cannot call the day dangerous", not "cannot disqualify".
    expect(score('picnicking', { soilMoisture: 55 })).toBeLessThan(BAND_FLOOR.marginal);
  });

  it('stargazing under heavy cloud is still demoted, though cloud is comfort', () => {
    expect(score('stargazing', { clouds: 50 })).toBeLessThan(BAND_FLOOR.worthALook);
  });
});

describe('what a reader is told is unchanged', () => {
  it('leaves the band alone on a wet picnic day', () => {
    /*
     * The consolidation moved 42,140 of 147,825 cells over a real year — all
     * upward, all within notToday. Exactly two changed band. Precipitation and
     * humidity stop being classed as hazards, so those days score through the
     * bands instead of landing on the veto floor, and end in the same place.
     */
    const now = new Date('2026-07-11T13:00:00');
    const weather = { temperature: 18, precipitation: 8, precipitationHours: 5, clouds: 95,
      windspeed: 12, gustspeed: 20, humidity: 88, visibility: 15000, soilMoisture: 40 };
    const byDay = getSuggestionsByDay({
      forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
      activities: allSports as never, interests: ['picnicking'], now, includeAllActivities: true,
    }) as Array<{ suggestions: Array<{ activityId: string; score: number; vetoed?: boolean;
                                      binding?: { key?: string }; reasoning?: string }> }>;
    const s = byDay[0].suggestions.find((x) => x.activityId === 'picnicking')!;
    expect(bandFor(s.score, s.vetoed, s.binding?.key)).toBe('notToday');
    expect(s.reasoning).toMatch(/rain/i);
  });
});
