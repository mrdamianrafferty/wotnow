/**
 * Which of the good options leads — a tie-breaker with opinions.
 *
 * `makeCall` used to rank by score alone. Five weeks of real output showed what
 * that does: a lenient activity (photography will take 95% cloud and 8 mm of
 * rain) sat in the Prime band most days, so it was the answer on 17 of 32 days
 * and the surf, the kayak and the rods the person had also picked never got a
 * look in — whatever the sea was doing.
 *
 * Two rules, both applied ONLY to options that have already cleared the good
 * bands. They reorder the good; they can never make a bad day good, and the
 * score, the band and the sentence are untouched. The evidence drawer and the
 * verdict keep describing the real conditions.
 *
 *   1. Weekends favour the bigger outing. A Saturday has the hours for a surf, a
 *      paddle or a day on the river; a Tuesday evening does not.
 *   2. Near-ties take turns. Options within `NEAR_TIE` points of the leader are
 *      treated as equals and the lead rotates between them from one day to the
 *      next, so "equally good" stops meaning "whichever sorts first".
 *
 * **Deterministic, with no memory.** The rotation is seeded by the calendar day
 * alone, never by what was sent yesterday. The push, the call screen and the
 * share card each build the call independently and must agree — a notification
 * that disagreed with the screen it opens would be worse than none — and a rule
 * that needed history could only ever be applied by the one of them that had it.
 *
 * The weights are a first guess, tuned by reading output
 * (`scripts/print-calls.ts`). The bonus is smaller than the gap between Prime
 * and Worth a look and the tie window is narrow, so a clearly better option
 * still wins.
 *
 * @module lib/godaisy/call/rank
 */

import type { ActivityType } from '@/data/activities/types';

/** Points added to an adventurous option's rank on a Saturday or Sunday. */
export const WEEKEND_ADVENTURE_BONUS = 12;

/** Options this close to the leader (after the bonus) are equals and take turns. */
export const NEAR_TIE = 8;

/**
 * Things that need more than an hour and a bit of planning, which the library's
 * own `adventure` tag covers unevenly (it is on 12 of 118 activities and not on
 * hiking or fishing). Named here rather than retagging the library, whose tags
 * other screens read.
 */
const ALSO_ADVENTUROUS = new Set([
  'hiking', 'fly_fishing_freshwater', 'sea_fishing_shore', 'sea_fishing_boat',
]);

/** The outings worth saving for a weekend. Indoor and sit-down activities are not. */
export function isAdventurous(activity: ActivityType | undefined): boolean {
  if (!activity || !activity.weatherSensitive) return false;
  if (ALSO_ADVENTUROUS.has(activity.id)) return true;
  if (activity.tags.includes('adventure')) return true;
  return activity.category === 'Active Sports' || activity.category === 'Winter Sports';
}

/**
 * Saturday or Sunday, read in UTC.
 *
 * The forecast's `date` is the calendar day's own timestamp (the same one the
 * dayparts are keyed on by its UTC date), so its UTC weekday is the day's
 * weekday wherever the reader is.
 */
export function isWeekend(unixSeconds: number): boolean {
  const day = new Date(unixSeconds * 1000).getUTCDay();
  return day === 0 || day === 6;
}

/**
 * The most a day can score when it is gusting close to the activity's own limit.
 *
 * The scorer treats a gust as a comfort matter on land — "on a lawn it is what
 * takes the tablecloth" — and so it should: golf and picnics were losing 25
 * points apiece on an ordinary breezy afternoon. The cost is that gardening was
 * Prime, and sent as the answer, on days "gusting to 44 km/h", because that gust
 * took 6 points off 94.
 *
 * Prime is the claim that nothing is in the way. So where an activity's OWN
 * ladder names a gust that vetoes it (`gust>13` for gardening), a gust within a
 * quarter of that figure is in the way, and the day cannot be Prime. It stays a
 * yes — Worth a look, with the gust in the sentence — rather than a no, because
 * the activity's ladder has not vetoed it.
 *
 * Read from the activity rather than set per sport, so every land activity gets
 * the same rule at its own limit. Water sports are left to their own safety
 * handling, and an activity with no gust ladder is never capped.
 */
export const GUSTY_FRACTION = 0.75;
const PRIME_CEILING = 77; // one under BAND_FLOOR.prime; bands.ts imports nothing from here

export function gustCeiling(activity: ActivityType | undefined, gustKmh: number | undefined): number | undefined {
  if (!activity || gustKmh === undefined || !activity.weatherSensitive) return undefined;
  if (activity.secondaryCategory === 'Water Sports' || activity.tags.includes('water')) return undefined;
  for (const cond of activity.poorConditions ?? []) {
    const m = /^gust\s*>\s*([\d.]+)$/.exec(cond.trim());
    if (m) {
      const vetoMs = Number(m[1]);
      return gustKmh / 3.6 >= vetoMs * GUSTY_FRACTION ? PRIME_CEILING : undefined;
    }
  }
  return undefined;
}

/** The number options are sorted on. Not shown to anyone. */
export function rankScore(score: number, activity: ActivityType | undefined, weekend: boolean): number {
  return score + (weekend && isAdventurous(activity) ? WEEKEND_ADVENTURE_BONUS : 0);
}

/** One calendar day, as a whole number. The same for every surface that asks. */
export function daySeed(unixSeconds: number): number {
  return Math.floor(unixSeconds / 86_400);
}

/**
 * Rotate the leading near-tie so a different member leads each day.
 *
 * `items` must already be sorted best-first. Only the run at the front that is
 * within `NEAR_TIE` of the leader AND shares its `group` is rotated — the
 * indoor options wait behind the outdoor ones (see makeCall), and a rotation
 * that pulled a café past a walk would undo that.
 */
export function rotateLeaders<T>(
  items: readonly T[],
  rank: (item: T) => number,
  group: (item: T) => unknown,
  seed: number,
): T[] {
  if (items.length < 2) return [...items];
  const top = rank(items[0]);
  const g = group(items[0]);
  let n = 1;
  while (n < items.length && group(items[n]) === g && top - rank(items[n]) <= NEAR_TIE) n++;
  if (n < 2) return [...items];
  const k = ((seed % n) + n) % n;
  const leaders = items.slice(0, n);
  return [...leaders.slice(k), ...leaders.slice(0, k), ...items.slice(n)];
}
