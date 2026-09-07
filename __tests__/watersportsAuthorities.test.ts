/**
 * The watersports thresholds, held against what the governing bodies publish.
 *
 * These ladders were written from judgement, and three of them disagreed with
 * the authorities when somebody finally checked. This pins the numbers to their
 * sources so the next edit has to argue with the evidence rather than with a
 * previous guess. Every figure asserted below is quoted in the docblock at the
 * top of `data/activities/watersports.ts`, with its source.
 *
 *   RYA / RNLI            water below 15 °C is cold water — cold water shock
 *   British Triathlon     below 11 °C no competition swim takes place at all
 *   British Canoeing      inland winds above Beaufort force 4 are Advanced Water
 *   Met Office            inshore strong-wind warnings begin at force 6, 22 kn
 *
 * Beaufort, from British Canoeing's own table: F3 7-10 kn (4-5 m/s),
 * F4 11-16 kn (6-8 m/s), F5 17-21 kn (9-11 m/s), F6 22-27 kn (11-14 m/s).
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

const KMH_PER_MS = 3.6;
/** A steady day: the gust ladder must not be what carries these assertions. */
const STEADY = 1.15;

function verdict(activityId: string, over: Record<string, number>) {
  const now = new Date('2026-07-15T12:00:00');
  const weather = {
    temperature: 19, precipitation: 0, clouds: 30, humidity: 65,
    visibility: 25000, soilMoisture: 30, waterTemperature: 16, ...over,
  };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

const atWind = (id: string, ms: number) =>
  verdict(id, { windspeed: Math.round(ms * KMH_PER_MS), gustspeed: Math.round(ms * KMH_PER_MS * STEADY) });

const atWater = (id: string, waterTemperature: number) =>
  verdict(id, { windspeed: 9, gustspeed: 13, waterTemperature });

describe('swimming respects the cold-water line', () => {
  /*
   * The RYA and the RNLI both put it at 15 °C, and British Triathlon makes a
   * wetsuit mandatory below 14. sea_swimming's good band used to start at 14,
   * so 14 °C water read 78 — "good" — on a calm summer day.
   */
  it.each(['wild_swimming', 'sea_swimming'])(
    '%s does not call water below 15°C a good day', (id) => {
      for (const t of [12, 13, 14]) expect(atWater(id, t)).toBeLessThan(BAND_FLOOR.worthALook);
    });

  it.each(['wild_swimming', 'sea_swimming'])('%s is good again at 15°C and above', (id) => {
    expect(atWater(id, 15)).toBeGreaterThanOrEqual(BAND_FLOOR.worthALook);
    expect(atWater(id, 18)).toBeGreaterThanOrEqual(BAND_FLOOR.prime);
  });

  it('rules out water below British Triathlon’s 11°C floor', () => {
    // Below 11 no competition swim takes place at any distance, in wetsuits,
    // with safety cover. wild_swimming used to call 10 °C workable.
    for (const id of ['wild_swimming', 'sea_swimming']) {
      expect(atWater(id, 10)).toBeLessThan(BAND_FLOOR.marginal);
      expect(atWater(id, 8)).toBeLessThan(BAND_FLOOR.marginal);
    }
  });

  it('still allows the cold-but-swimmable band between 11 and 15', () => {
    // Not a veto — a wetsuit-and-know-what-you-are-doing day, and the prose
    // says so. Ruling it out entirely would be as wrong as calling it good.
    expect(atWater('wild_swimming', 12)).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });
});

describe('paddlesport respects British Canoeing’s force 4 boundary', () => {
  /*
   * "Advanced Water — Inland: Large areas of open water which exceed Moderate
   * Inland Water and/or have winds in excess of Beaufort force 4."
   * Kayaking used to veto only above 10 m/s (19 kn, most of the way through
   * F5) and read 46 — "workable" — at a steady force 5.
   */
  const F5 = 10;   // 19 kn, mid force 5
  const F4 = 7;    // 13 kn, mid force 4

  it.each(['kayaking', 'canoeing', 'stand_up_paddleboarding'])(
    '%s does not offer a steady force 5 as workable', (id) => {
      expect(atWind(id, F5)).toBeLessThan(BAND_FLOOR.marginal);
    });

  it('still allows force 4, which British Canoeing calls Moderate Water', () => {
    expect(atWind('kayaking', F4)).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });

  it('keeps the kayak/canoe difference in the gust ladder, not the mean', () => {
    /*
     * Both take their mean-wind boundary from the same governing body, so it
     * is the same number. A kayak sits low and an open canoe catches wind —
     * that difference is real and lives in the gusts.
     */
    const model = (id: string) =>
      (allSports as Array<{ id: string; poorConditions?: string[] }>).find((a) => a.id === id)!;
    const gustVeto = (id: string) =>
      Number(/gust>([\d.]+)/.exec((model(id).poorConditions ?? []).join(' '))![1]);
    const windVeto = (id: string) =>
      Number(/windSpeed>([\d.]+)/.exec((model(id).poorConditions ?? []).join(' '))![1]);

    expect(windVeto('kayaking')).toBe(windVeto('canoeing'));
    expect(gustVeto('kayaking')).toBeGreaterThan(gustVeto('canoeing'));
  });
});

describe('inland sailing stops where the Met Office starts warning', () => {
  it('allows force 5 and refuses force 6', () => {
    /*
     * Inshore waters forecasts carry strong-wind warnings at force 6 (22-27
     * kn), the UK equivalent of a small craft advisory. The veto is at
     * 10.8 m/s = 21 kn, the last knot of force 5.
     *
     * Note this one is NOT backed by the RYA, who publish no universal dinghy
     * wind limit — see the docblock. Do not re-cite them for it.
     */
    expect(atWind('sailing_inland', 9.5)).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);  // 18 kn, F5
    expect(atWind('sailing_inland', 12)).toBeLessThan(BAND_FLOOR.marginal);             // 23 kn, F6
  });
});
