/**
 * The window — phase 1b.
 *
 * "Today is a good day to get the bike out" is a forecast. "…before eleven" is
 * advice, and the difference is the whole reason the redesign exists. Four of
 * the five push examples in the handoff are time-bounded.
 *
 * DAYPARTS, NOT HOURS. Full hourly is wrong on honesty rather than cost: 24
 * discrete scores invite the app to claim the wind turns at 10:00 when the
 * forecast cannot support that, which contradicts its own rule about never
 * putting a confident sentence over incomplete data. Dayparts are the
 * resolution the voice already speaks in, and the same six-hour boundaries the
 * rain window has always used.
 *
 * Nothing here re-implements scoring. The parts are handed to the SAME
 * `getSuggestionsByDay` the day goes through — a part is just a WeatherData,
 * and the scorer neither knows nor cares that three of them share a date. That
 * matters more than it sounds: 18 condition keys across 118 activities is not a
 * thing to have two of.
 *
 * @module lib/godaisy/call/window
 */

import { getSuggestionsByDay } from '@/utils/getSuggestionsByDay';
import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';
import type { ActivityType } from '@/data/activities/types';
import { bandFor, isGood, type CallBand } from './bands';

/** In the order the day happens. Overnight is never offered — see the adapter. */
export const PART_ORDER = ['morning', 'afternoon', 'evening'] as const;
export type PartName = (typeof PART_ORDER)[number];

export type ForecastParts = Partial<Record<PartName, WeatherData>>;

/**
 * A run of consecutive parts that hold up, and what ends it.
 *
 * `ends` names the criterion that fails in the part immediately after the run —
 * which is where "the wind gets up after that" comes from. It is absent when the
 * run reaches the end of the day, or when the next part fails on nothing
 * nameable.
 */
export interface CallWindow {
  parts: PartName[];
  /** The criterion key that closes the window, from the first part that fails. */
  ends?: string;
}

/**
 * Which parts of this day are good enough to do this activity in.
 *
 * One scorer call for all the parts, because `getSuggestionsByDay` maps over the
 * array it is given and a second call would double the work for nothing.
 */
function scoreParts(
  activityId: string,
  parts: ForecastParts,
  date: number,
  activities: ActivityType[],
  now: Date,
): Array<{ name: PartName; band: CallBand; key?: string }> {
  const present = PART_ORDER.filter((p): p is PartName => Boolean(parts[p]));
  if (!present.length) return [];

  const scored = getSuggestionsByDay({
    // Every entry carries the SAME date on purpose: season, day-of-week and the
    // context tags must be identical across parts, or a morning and an evening
    // of one day would be scored against different calendars.
    forecast: present.map((name) => ({ date, weather: parts[name] as WeatherData })),
    activities,
    interests: [activityId],
    now,
    includeAllActivities: true,
  }) as Array<{ suggestions: Suggestion[] }>;

  return present.map((name, i) => {
    const s = scored[i]?.suggestions.find((x) => x.activityId === activityId);
    if (!s) return { name, band: 'notToday' as CallBand };
    return { name, band: bandFor(s.score, s.vetoed, s.binding?.key), key: s.binding?.key };
  });
}

/**
 * The best run of parts, or undefined when there is no window worth naming.
 *
 * "Best" is the LONGEST run of good parts, and the earliest on a tie — because
 * a window is advice about when to go, and told two equally good ones a person
 * wants the one they can still act on.
 *
 * Returns undefined in three cases, all of which mean the call should simply say
 * less rather than guess:
 *
 *   - No parts (a partial first or last day, or a source with no hourly series).
 *   - No good part — the day is a no, and a no does not need a window.
 *   - EVERY part is good. A day that holds all day has no window, and "best all
 *     day" is noise. This is the common case on a good day, which is correct:
 *     the window earns its place by being a restriction.
 */
export function bestWindow(
  activityId: string,
  parts: ForecastParts | undefined,
  date: number,
  activities: ActivityType[],
  now: Date,
): CallWindow | undefined {
  if (!parts) return undefined;
  const scored = scoreParts(activityId, parts, date, activities, now);
  if (scored.length < 2) return undefined; // one part is a day, not a window

  const good = scored.map((s) => isGood(s.band));
  if (good.every(Boolean) || !good.some(Boolean)) return undefined;

  let best = { start: 0, len: 0 };
  for (let i = 0; i < good.length; i++) {
    if (!good[i]) continue;
    let j = i;
    while (j + 1 < good.length && good[j + 1]) j++;
    if (j - i + 1 > best.len) best = { start: i, len: j - i + 1 };
    i = j;
  }
  if (!best.len) return undefined;

  const after = scored[best.start + best.len];
  return {
    parts: scored.slice(best.start, best.start + best.len).map((s) => s.name),
    ...(after?.key ? { ends: after.key } : {}),
  };
}
