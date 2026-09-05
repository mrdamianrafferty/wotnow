/**
 * Cutting the hourly series into parts.
 *
 * The two things this has to get right are both silent when wrong: the
 * boundaries (shared with the rain window, so the voice stays consistent) and
 * the wind unit (Open-Meteo answers in whatever the request asked for, and 8 m/s
 * read as 8 km/h is a stiff breeze reported as a calm morning).
 */

import { aggregateDayparts, bucketFor, PART_ORDER } from '@/lib/weather/dayparts';

/** 24 hours of one day, with a per-hour value for each field. */
const series = (fields: Record<string, number[]>) => ({
  time: Array.from({ length: 24 }, (_, h) => `2026-09-07T${String(h).padStart(2, '0')}:00`),
  ...fields,
});

const flat = (v: number) => Array.from({ length: 24 }, () => v);

describe('daypart bucketing', () => {
  it('uses the same boundaries the rain window has always used', () => {
    expect([0, 5].map(bucketFor)).toEqual(['overnight', 'overnight']);
    expect([6, 11].map(bucketFor)).toEqual(['morning', 'morning']);
    expect([12, 17].map(bucketFor)).toEqual(['afternoon', 'afternoon']);
    expect([18, 23].map(bucketFor)).toEqual(['evening', 'evening']);
  });

  it('never offers overnight as a part a call can name', () => {
    expect([...PART_ORDER]).toEqual(['morning', 'afternoon', 'evening']);
  });

  it('groups a full day into four buckets of six hours', () => {
    const out = aggregateDayparts(series({ temperature_2m: flat(10) }), { windUnit: 'kmh' });
    const day = out['2026-09-07'];
    expect(Object.keys(day).sort()).toEqual(['afternoon', 'evening', 'morning', 'overnight']);
    expect(day.morning?.hours).toBe(6);
  });

  /*
   * The request in getActivityScore.ts asks for m/s; the one in print-calls.ts
   * asks for km/h. Normalising here, at the edge, is what stops every consumer
   * having to know which request produced its input.
   */
  it('normalises wind to km/h whatever unit it arrived in', () => {
    const ms = aggregateDayparts(series({ wind_speed_10m: flat(10), wind_gusts_10m: flat(20) }), { windUnit: 'ms' });
    const kmh = aggregateDayparts(series({ wind_speed_10m: flat(36), wind_gusts_10m: flat(72) }), { windUnit: 'kmh' });
    expect(ms['2026-09-07'].morning?.windspeed).toBeCloseTo(36, 5);
    expect(ms['2026-09-07'].morning?.gustspeed).toBeCloseTo(72, 5);
    expect(kmh['2026-09-07'].morning?.windspeed).toBeCloseTo(36, 5);
  });

  it('sums rain over the part and counts only the wet hours', () => {
    // Morning is 06:00-11:00 — three wet hours totalling 3 mm.
    const precip = flat(0);
    precip[6] = 1; precip[7] = 2; precip[8] = 0; precip[9] = 0; precip[10] = 0; precip[11] = 0;
    const out = aggregateDayparts(series({ precipitation: precip, temperature_2m: flat(10) }), { windUnit: 'kmh' });
    expect(out['2026-09-07'].morning?.precipitation).toBeCloseTo(3, 5);
    expect(out['2026-09-07'].morning?.precipitationHours).toBe(2);
    expect(out['2026-09-07'].afternoon?.precipitation).toBe(0);
  });

  /*
   * Averaging 350° and 10° gives 180° — the opposite wind. Direction decides
   * whether an October westerly puts storm-driven seabirds on a reservoir or
   * whether it is just a cold day, so getting it backwards is not a rounding.
   */
  it('takes wind direction at the windiest hour, never a mean', () => {
    const wind = flat(5); wind[8] = 40;
    const deg = flat(350); deg[8] = 180;
    const out = aggregateDayparts(series({ wind_speed_10m: wind, wind_direction_10m: deg }), { windUnit: 'kmh' });
    expect(out['2026-09-07'].morning?.windDirection).toBe(180);
  });

  it('reports how many samples a part had, so a thin one can be dropped', () => {
    const time = ['2026-09-07T06:00', '2026-09-07T07:00', '2026-09-07T13:00'];
    const out = aggregateDayparts({ time, temperature_2m: [10, 11, 15] }, { windUnit: 'kmh' });
    expect(out['2026-09-07'].morning?.hours).toBe(2);
    expect(out['2026-09-07'].afternoon?.hours).toBe(1);
  });

  it('survives an absent or empty series rather than inventing a day', () => {
    expect(aggregateDayparts(undefined)).toEqual({});
    expect(aggregateDayparts({ time: [] })).toEqual({});
  });

  /*
   * A field the source did not publish must stay absent: the scoring models read
   * an absent criterion as NEUTRAL, so a fabricated value is worse than none.
   */
  it('leaves unpublished fields absent rather than defaulting them', () => {
    const out = aggregateDayparts(series({ temperature_2m: flat(10) }), { windUnit: 'kmh' });
    const m = out['2026-09-07'].morning;
    expect(m?.temperature).toBe(10);
    expect(m?.gustspeed).toBeUndefined();
    expect(m?.visibility).toBeUndefined();
  });
});
