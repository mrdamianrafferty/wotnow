/**
 * On the water a gust is what capsizes you; on a lawn it is what takes the
 * tablecloth.
 *
 * That sentence was already in `getSuggestionsByDay`, above `safetyBlocksGood`,
 * recording that applying the gust rule to everything "took golf, cricket,
 * picnicking, outdoor yoga and painting down 25 points apiece on an ordinary
 * breezy afternoon — the same over-reach as treating a bog as a hazard". It was
 * fixed for the BAND GATE and not for the veto, so a gust could still
 * short-circuit a land activity to the hazard floor — and because `gust` is in
 * `DANGEROUS_KEYS`, that floor reads as UNSAFE.
 *
 * ─── What that looked like on the median day of the British year ─────────
 *
 * Measured over a real year at five UK and Irish places: the daily MAXIMUM gust
 * has a median of 12.3 m/s and runs about three times the daily mean wind, so
 * an ordinary Force 3 afternoon carries a 12 m/s gust somewhere in it. On
 * exactly that day — dry, 20 °C, Force 3 — this was the verdict:
 *
 *     picnicking     unsafe
 *     bbq            unsafe
 *     outdoor_yoga   unsafe
 *
 * The red band, the one that exists to say a day is dangerous, on the median
 * day of the year, for a picnic. A warning shown that often is a warning
 * nobody reads, which is the same argument `SHORTFALL_NOT_HAZARD` already
 * makes about "Not safe for sailing today" on a flat calm.
 *
 * A gust on land is now a penalty and not a hazard: the day still scores badly,
 * it simply stops being called dangerous. On water nothing changes.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { bandFor } from '../lib/godaisy/call/bands';
import { scorePoorConditions } from '../utils/activitySuitability';

/** Dry, 20 °C, Force 3 mean, 12.2 m/s gust — the median British day. */
const MEDIAN_DAY = {
  temperature: 20, precipitation: 0, precipitationHours: 0, clouds: 30,
  windspeed: 15, gustspeed: 44, humidity: 60, visibility: 25000, soilMoisture: 30,
};

function verdict(activityId: string, over: Record<string, number> = {}) {
  const now = new Date('2026-07-11T13:00:00');
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: { ...MEDIAN_DAY, ...over } as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number; vetoed?: boolean; binding?: { key?: string } }> }>;
  const s = byDay[0].suggestions.find((x) => x.activityId === activityId)!;
  return { ...s, band: bandFor(s.score, s.vetoed, s.binding?.key) };
}

describe('a gust does not make a picnic dangerous', () => {
  it.each(['picnicking', 'bbq', 'outdoor_yoga', 'outdoor_music', 'photography'])(
    '%s is not called unsafe on the median British day', (id) => {
      const v = verdict(id);
      expect(v.band).not.toBe('unsafe');
      expect(v.vetoed).toBeFalsy();
    });

  it('still scores the day badly — this removes a warning, not a wind', () => {
    // 16, not 60. The gust is charged by the penalty exactly as before; what
    // changed is that it no longer short-circuits to the hazard floor.
    expect(verdict('picnicking').score).toBeLessThan(40);
  });
});

describe('on the water it is unchanged', () => {
  it.each(['kayaking', 'canoeing', 'wild_swimming', 'sailing_inland', 'stand_up_paddleboarding'])(
    '%s still treats a gust as the hazard it is', (id) => {
      const v = verdict(id, { gustspeed: 80 });
      expect(v.vetoed).toBe(true);
      expect(v.binding?.key).toBe('gust');
    });

  it('is the same line the rest of the scorer already draws', () => {
    /*
     * `isWaterActivity` — category, secondary category or a 'water' tag. Not a
     * second list to keep in step with the first.
     */
    const poor = ['gust>10'];
    const w = { gust: 20 } as never;
    expect(scorePoorConditions(poor, w, { onWater: true }).hazards).toHaveLength(1);
    expect(scorePoorConditions(poor, w, { onWater: false }).hazards).toHaveLength(0);
  });

  it('defaults to the stricter behaviour when the caller says nothing', () => {
    // A caller that has not thought about it gets a hazard, not a silently
    // relaxed day.
    expect(scorePoorConditions(['gust>10'], { gust: 20 } as never).hazards).toHaveLength(1);
  });
});

describe('the other harmless conditions are untouched', () => {
  it('a bog still costs a day most of its score', () => {
    /*
     * The penalty saturating on one fired condition is what makes
     * `NEVER_A_HAZARD` work at all — a waterlogged field has to cost 40 points
     * without vetoing. An attempt to dilute the penalty by the size of the
     * model broke exactly this, in six tests, which is why it was reverted and
     * why the fix here is about hazard CLASSIFICATION rather than about the
     * penalty.
     */
    expect(verdict('picnicking', { gustspeed: 10, soilMoisture: 55 }).score).toBeLessThan(40);
  });
});
