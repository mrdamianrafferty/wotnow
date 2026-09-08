/**
 * A fourth part of the day, and a rule that only shows it when it says
 * something.
 *
 * ─── Why `early` exists ──────────────────────────────────────────────────
 *
 * In hot countries people move physical activity to the early morning. The day
 * was cut into three six-hour parts, and a six-hour mean hides a three-hour
 * window. Measured in Seville, median temperature by hour, mid-June to
 * mid-August:
 *
 *      6h  7h  8h  9h 10h 11h 12h ... 20h 21h 22h 23h
 *      24  23  23  25  27  29  31 ...  35  32  30  29
 *
 * The 06-12 mean is 24.9 °C, teetering on running's 25 °C ceiling, so a Seville
 * summer read "not today" for a run on half the days — while four of those six
 * hours were under the ceiling. The window Sevillians actually use is 6 to 9,
 * and its mean is 23.3 °C.
 *
 * The evening is NOT the answer there: Seville's 20-23h median is 32 °C. The
 * usable window is the early morning only, which is how people live there.
 *
 * ─── Why the split is not gated on a threshold ───────────────────────────
 *
 * A fourth bar is only worth a reader's attention where it differs. Rather than
 * test a temperature spread, or a latitude, or a month, adjacent blocks that
 * land in the same band are MERGED. If early and morning agree, a reader sees
 * the three parts they always saw and nothing had to know where it was.
 *
 * Measured, and it adapts better than a rule would: Manchester in JULY collapses
 * to three blocks because early and morning agree, and Manchester in FEBRUARY
 * keeps all four because they genuinely do not (49 / 71 / 40 / 11).
 */

import { aggregateDayparts, bucketFor, PART_ORDER } from '@/lib/weather/dayparts';
import { distinctBlocks } from '@/lib/godaisy/call/window';
import type { CallBand } from '@/lib/godaisy/call/bands';

const bar = (name: string, band: CallBand, score: number) =>
  ({ name: name as never, band, score });

describe('the day is cut in four', () => {
  it('splits the morning at nine and leaves the other boundaries alone', () => {
    expect([6, 7, 8].map(bucketFor)).toEqual(['early', 'early', 'early']);
    expect([9, 10, 11].map(bucketFor)).toEqual(['morning', 'morning', 'morning']);
    expect([12, 17].map(bucketFor)).toEqual(['afternoon', 'afternoon']);
    expect([18, 23].map(bucketFor)).toEqual(['evening', 'evening']);
    expect([0, 5].map(bucketFor)).toEqual(['overnight', 'overnight']);
  });

  it('offers early to a call, and never offers overnight', () => {
    expect([...PART_ORDER]).toEqual(['early', 'morning', 'afternoon', 'evening']);
  });

  it('aggregates the early hours separately', () => {
    const time = Array.from({ length: 24 }, (_, h) => `2026-07-15T${String(h).padStart(2, '0')}:00`);
    // A Seville July profile: cool at six, 31 °C by noon.
    const t = [24, 24, 24, 24, 24, 24, 24, 23, 23, 25, 27, 29, 31, 33, 34, 36, 37, 37, 37, 36, 35, 32, 30, 29];
    const day = aggregateDayparts({ time, temperature_2m: t })['2026-07-15'];
    expect(day.early?.temperature).toBeCloseTo((24 + 23 + 23) / 3, 5);
    expect(day.morning?.temperature).toBeCloseTo((25 + 27 + 29) / 3, 5);
    // The old six-hour block averaged those together and landed at 25.2 —
    // above running's ceiling, hiding three usable hours.
    expect((day.early!.temperature! + day.morning!.temperature!) / 2).toBeGreaterThan(25);
    expect(day.early!.temperature!).toBeLessThan(25);
  });
});

describe('only the blocks that differ are shown', () => {
  it('merges adjacent blocks in the same band', () => {
    const out = distinctBlocks([
      bar('early', 'prime', 85), bar('morning', 'prime', 82),
      bar('afternoon', 'notToday', 14), bar('evening', 'notToday', 10),
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].spans).toEqual(['early', 'morning']);
    expect(out[1].spans).toEqual(['afternoon', 'evening']);
  });

  it('takes the weakest score of a merged block', () => {
    // A block is advice about a span of time and should be true of all of it —
    // the same rule `promote` follows for its run.
    const out = distinctBlocks([bar('early', 'prime', 85), bar('morning', 'prime', 82)]);
    expect(out[0].score).toBe(82);
  });

  it('keeps four blocks when four things are true', () => {
    // Manchester, 15 February: 49 / 71 / 40 / 11.
    const out = distinctBlocks([
      bar('early', 'marginal', 49), bar('morning', 'worthALook', 71),
      bar('afternoon', 'marginal', 40), bar('evening', 'notToday', 11),
    ]);
    expect(out).toHaveLength(4);
  });

  it('collapses a whole uniform day to one block', () => {
    const out = distinctBlocks([
      bar('early', 'prime', 88), bar('morning', 'prime', 85),
      bar('afternoon', 'prime', 86), bar('evening', 'prime', 84),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].spans).toEqual(['early', 'morning', 'afternoon', 'evening']);
  });

  it('merges by band and not by score', () => {
    /*
     * 71 and 76 are both "worth a look" and splitting them offers a reader a
     * distinction they cannot act on. 59 and 61 really are different advice.
     */
    expect(distinctBlocks([bar('early', 'worthALook', 76), bar('morning', 'worthALook', 71)])).toHaveLength(1);
    expect(distinctBlocks([bar('early', 'worthALook', 61), bar('morning', 'marginal', 59)])).toHaveLength(2);
  });

  it('does not reorder or drop anything', () => {
    const bars = [bar('early', 'prime', 85), bar('morning', 'notToday', 20), bar('afternoon', 'prime', 80)];
    const out = distinctBlocks(bars);
    expect(out.flatMap((b) => b.spans)).toEqual(['early', 'morning', 'afternoon']);
  });
});
