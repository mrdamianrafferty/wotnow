/**
 * Every degree between an activity's two vetoes belongs to some rung.
 *
 * The four temperature rungs are plain strings in `data/activities/`. Nothing
 * typechecks them, nothing cross-checks them against each other, and two ways
 * of getting them wrong had both happened:
 *
 *   A BOUNDED RANGE IN THE POOR RUNG. `trail_running` carried
 *   'temperature=2..5 or 20..25' as BOTH its fair and its poor condition,
 *   byte-identical. A veto written as a bounded range only fires INSIDE the
 *   range, so trail running was "not today" at 22°C and fine again at 35°C, and
 *   "not today" at 3°C and fine again at −10°C. Exactly inverted.
 *
 *   A HOLE BETWEEN RUNGS. `outdoor_gym`'s fair rung ended at 32 and its veto
 *   began above 35, so 32–35°C matched nothing at all. Nine more had the same
 *   shape, one of them mid-scale: `outdoor_playground` covered 5–10 and 15–25
 *   and left 11–14°C — an ordinary spring afternoon — in no rung.
 *
 * Neither shows up as a crash, a type error or a failing build. They show up as
 * a wrong verdict on a day someone actually goes outside, which is why they
 * survived so long and why they get a test rather than a comment.
 *
 * NOT COVERED HERE: the good band also dies at `hi + 0.3 * span`, before its
 * stated veto, via the `worst(good) >= 0.35` floor in `getSuggestionsByDay`.
 * That is a scorer property, not a data one — see the docblock in
 * `data/activities/team.ts`.
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

/** The veto thresholds an activity states, if it states them. */
function vetoes(a: Rungs): { low?: number; high?: number } {
  const find = (re: RegExp) =>
    (a.poorConditions ?? []).map((c) => re.exec(c)?.[1]).find(Boolean);
  const low = find(/temperature\s*<=?\s*(-?[\d.]+)/);
  const high = find(/temperature\s*>=?\s*(-?[\d.]+)/);
  return { low: low === undefined ? undefined : +low, high: high === undefined ? undefined : +high };
}

/**
 * The best score any temperature criterion in one rung gives `t`.
 *
 * Read through `scoreConditions` rather than by parsing the strings again: it
 * is what the app uses, it handles the `A..B or C..D` shorthand, and a test
 * that reimplements the parser cannot catch a parser bug.
 *
 * 0.5 is the in-range floor. `evaluateConditionScore` maps inside a range to
 * 1..0.5 (1 at the centre) and outside it to 0.5..0, so "at least 0.5" is
 * exactly "this rung covers this value".
 */
function covers(conditions: string[] | undefined, t: number): boolean {
  const temps = (conditions ?? []).filter((c) => /temperature/.test(c));
  if (!temps.length) return false;
  const { criteria } = scoreConditions(temps, { temperature: t } as never);
  return criteria.some((c) => c.score >= 0.5);
}

describe('a temperature veto is one-sided', () => {
  it.each(outdoor.map((a) => [a.id, a] as const))(
    '%s does not write its veto as a bounded range',
    (_id, a) => {
      const bounded = (a.poorConditions ?? []).filter((c) =>
        /^\s*temperature=-?[\d.]+\.\.-?[\d.]+/.test(c),
      );
      // 'temperature<2 or temperature>28' is the correct shape and passes;
      // 'temperature=2..5 or 20..25' is the trail_running bug and does not.
      expect(bounded).toEqual([]);
    },
  );
});

describe('the rungs reach the vetoes without a gap', () => {
  const withBothVetoes = outdoor
    .map((a) => [a, vetoes(a)] as const)
    .filter(([, v]) => v.low !== undefined && v.high !== undefined);

  it('finds enough activities to be worth asserting', () => {
    // 62 at the time of writing. The point is that this is the normal shape.
    expect(withBothVetoes.length).toBeGreaterThan(40);
  });

  it.each(withBothVetoes.map(([a, v]) => [a.id, a, v] as const))(
    '%s leaves no degree outside every rung',
    (_id, a, v) => {
      const holes: number[] = [];
      for (let t = Math.ceil(v.low!); t <= Math.floor(v.high!); t++) {
        if (!covers(a.perfectConditions, t) && !covers(a.goodConditions, t)
            && !covers(a.fairConditions, t)) holes.push(t);
      }
      expect(holes).toEqual([]);
    },
  );
});
