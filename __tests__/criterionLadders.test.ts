/**
 * The gap test, generalised past temperature — and the register it retires.
 *
 * `temperatureLadders.test.ts` asserts that every degree between an activity's
 * two vetoes belongs to some rung. It is the right rule and it was written for
 * the wrong reason: temperature is simply where the holes were first noticed.
 * The same fault can sit on any quantity, and did — `foraging` stated
 * visibility in all four of its rungs and left 2-3 km in none of them, so a
 * murky-but-legal afternoon was marked down by every rung at once while a
 * 1.9 km day was cleanly vetoed and a 3.1 km day was fair.
 *
 * That hole survived a PR whose whole subject was holes, and a register listing
 * sixteen more, because both were reading temperature. The register is now
 * gone; this is what replaces it.
 *
 * ─── What counts as a hole ───────────────────────────────────────────────
 *
 * Only where the criterion is FULLY LADDERED: perfect, good and fair each say
 * something about the key. That is the author declaring an intent to cover the
 * scale, and a gap in it is unambiguously a mistake.
 *
 * A rung that omits the key is deliberate silence, not a gap, and the
 * distinction is load-bearing rather than a convenience. Four criteria in the
 * library are shaped that way and all four are right:
 *
 *   skiing / snowboarding   snowDepthCm   good is 30..200, the veto is <20
 *   cross_country_skiing    snowDepthCm   good is 15..120, the veto is <10
 *   rock_climbing           precipitation good is 0, the veto is >2
 *   outdoor_gym             precipitation good is 0, the veto is >5
 *
 * Take 25 cm of snow. Good states a depth and scores it low — correctly, that
 * is thin cover. Fair states none, so nothing drags fair down, and the day
 * lands in fair, which is exactly where a thin-but-skiable day belongs. Requiring
 * fair to name a depth there would mean inventing a threshold to satisfy a test.
 * The silence is doing the work.
 *
 * ─── Why sampling rather than interval arithmetic ────────────────────────
 *
 * Coverage is read through `scoreConditions`, the same path the app uses, so a
 * parser bug cannot hide behind a test that reimplements the parser. 200
 * samples across the stated range is far finer than any threshold in the data,
 * where the tightest gap in the library's history was a whole unit wide.
 */

import { scoreConditions } from '../utils/activitySuitability';
import { allSports } from '../data/activities';

type Rungs = {
  id: string;
  weatherSensitive?: boolean;
  perfectConditions?: string[];
  goodConditions?: string[];
  fairConditions?: string[];
  poorConditions?: string[];
};

const outdoor = (allSports as Rungs[]).filter((a) => a.weatherSensitive !== false);

/** The key a condition string is about, e.g. `visibility=3..5` -> `visibility`. */
const KEY = /^([a-zA-Z][a-zA-Z0-9]*)\s*(?:=|<=?|>=?)/;
const NUMBER = /-?\d+(?:\.\d+)?/g;

const forKey = (conds: string[] | undefined, key: string) =>
  (conds ?? []).filter((c) => KEY.exec(c.trim())?.[1] === key);

const states = (conds: string[] | undefined, key: string) => forKey(conds, key).length > 0;

/**
 * Does this rung have something to say about this value?
 *
 * 0.5 is the in-range floor: `evaluateConditionScore` maps inside a range to
 * 1..0.5 and outside it to 0.5..0, so "at least 0.5" is exactly "covered".
 */
function covers(conds: string[] | undefined, key: string, v: number): boolean {
  const c = forKey(conds, key);
  if (!c.length) return false;
  return scoreConditions(c, { [key]: v } as never).criteria.some((x) => x.score >= 0.5);
}

/** Every key any rung mentions. */
function keysOf(a: Rungs): string[] {
  const keys = new Set<string>();
  for (const rung of [a.perfectConditions, a.goodConditions, a.fairConditions, a.poorConditions]) {
    for (const c of rung ?? []) {
      const m = KEY.exec(c.trim());
      if (m) keys.add(m[1]);
    }
  }
  return [...keys];
}

/** The keys this activity ladders all the way up: perfect, good AND fair. */
function fullyLaddered(a: Rungs): string[] {
  return keysOf(a).filter(
    (k) =>
      k !== 'temperature' // asserted, more strictly, by temperatureLadders
      && states(a.perfectConditions, k)
      && states(a.goodConditions, k)
      && states(a.fairConditions, k),
  );
}

function holesIn(a: Rungs, key: string): number[] {
  const nums: number[] = [];
  for (const rung of [a.perfectConditions, a.goodConditions, a.fairConditions, a.poorConditions]) {
    for (const c of forKey(rung, key)) nums.push(...(c.match(NUMBER) ?? []).map(Number));
  }
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  if (!(hi > lo)) return [];

  const step = (hi - lo) / 200;
  const holes: number[] = [];
  for (let v = lo + step / 2; v < hi; v += step) {
    const x = Math.round(v * 10000) / 10000;
    const covered =
      covers(a.perfectConditions, key, x)
      || covers(a.goodConditions, key, x)
      || covers(a.fairConditions, key, x)
      || covers(a.poorConditions, key, x); // a veto firing is an answer too
    if (!covered) holes.push(x);
  }
  return holes;
}

describe('a fully-laddered criterion leaves no value outside every rung', () => {
  const cases = outdoor.flatMap((a) => fullyLaddered(a).map((k) => [a.id, k, a] as const));

  it('finds enough laddered criteria to be worth asserting', () => {
    // The rule has to be biting on real data, or it passes by describing nothing.
    expect(cases.length).toBeGreaterThan(100);
  });

  it('covers keys other than temperature', () => {
    const keys = new Set(cases.map(([, k]) => k));
    expect(keys.size).toBeGreaterThan(3);
    expect(keys.has('temperature')).toBe(false);
  });

  it.each(cases)('%s: %s', (_id, key, a) => {
    const holes = holesIn(a, key);
    // Reported as the span rather than 200 numbers, so a failure is readable.
    const span = holes.length ? `${holes[0]}..${holes[holes.length - 1]}` : '';
    expect(span).toBe('');
  });
});
