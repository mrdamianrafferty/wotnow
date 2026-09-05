/**
 * A day with a good run in it is not a write-off — shared.
 *
 * Extracted from `makeCall` when the spot pages needed it too. They were saying
 * "Not today, 14/100" for cycling at Newquay on the same Monday the app was
 * calling "a cycling day, best before six" — the same place, the same activity,
 * the same day, two answers, one of them on an indexed page a stranger arrives
 * at. A rule this consequential cannot have two implementations, and it very
 * nearly got one.
 *
 * @module lib/godaisy/call/promote
 */

import type { WeatherData } from '@/utils/getSuggestionsByDay';
import { isGood, type CallBand } from './bands';
import { bestRun, type ForecastParts, type PartName } from './window';

/**
 * A DAY WITH A GOOD RUN IN IT IS NOT A WRITE-OFF.
 *
 * Found by building the evidence drawer, which put the day's verdict next to
 * its parts and made them argue in public: Newquay on 7 September read "a
 * write-off for cycling" above bars scoring prime, prime, notToday. The day
 * totals 6.9 mm of rain against cycling's 3 mm veto — and nearly all of it
 * falls after six. There is a dry morning and a dry afternoon in there, and the
 * app was telling someone to stay in.
 *
 * The daily aggregate was never the better number. It was the only number,
 * until phase 1b cut the day into parts that carry their own rain, their own
 * wind and their own gusts. A total is not a forecast for any hour of the day
 * it covers.
 *
 * Three limits, because this promotes a NO into a YES and that is the direction
 * in which being wrong costs someone a wasted journey:
 *
 *   1. **Only a contiguous run counts.** A good morning and a good evening
 *      either side of a foul afternoon is not a day out, it is two.
 *   2. **Never past the run's own band.** The promotion takes the weakest band
 *      in the run, so a prime morning beside a merely-decent afternoon is
 *      offered as decent.
 *   3. **Never out of `unsafe`, and never past an unsafe part.** The first
 *      version only checked the PARTS, and promoted the Lake District on a day
 *      gusting to 77 km/h — "one to sit out" became "a good day to be out on
 *      the bike" on the strength of one tolerable afternoon. A daily gust that
 *      is past the safe limit is a safety call, and a calm-looking part is not
 *      a rebuttal: the gust that puts a branch through your wheel does not
 *      check the clock, and a six-hour bucket's own maximum can easily miss it.
 *      Comfort is negotiable by the hour; danger is not.
 */
export function promote(
  dayBand: CallBand,
  bars: ReadonlyArray<{ name: PartName; band: CallBand; score: number }>,
  parts: ForecastParts | undefined,
  severe: boolean,
  dayGust: number | undefined,
): { band: CallBand; score: number; weather: WeatherData } | null {
  if (isGood(dayBand)) return null;
  if (dayBand === 'unsafe') return null;
  if (!parts || bars.length < 2) return null;
  if (bars.some((b) => b.band === 'unsafe')) return null;
  /*
   * And a floor on the DAY's own gust, independent of how anything was scored.
   *
   * The two checks above both read a band, and a band is the scorer's opinion
   * about one activity — miss the veto and the safety case evaporates. This
   * reads the weather. In real data the day's gust is the maximum of the parts'
   * gusts, so a dangerous day should already have a dangerous part; this is the
   * belt to that pair of braces, and it costs nothing. 60 km/h is a gale, and
   * no six hours of calm inside one makes the day safe to promote.
   */
  if ((dayGust ?? 0) >= 60) return null;

  const run = bestRun(bars);
  if (!run) return null;

  /*
   * ON A SEVERE DAY, ONE GOOD PART IS NOT ENOUGH.
   *
   * The first version promoted on any good run, and the Lake District came out
   * as "a good day for a long walk" on a day carrying 12.3 mm of rain — bars
   * notToday, notToday, worthALook. One tolerable evening at the end of a
   * soaking is not a day out; it is a gap. A run of two parts, or an ordinary
   * bad day, is a different thing and still promotes: `ppn` under 6 mm is a
   * genuine dry morning and afternoon.
   */
  if (run.length < 2 && severe) return null;

  const inRun = bars.slice(run.start, run.start + run.length);
  const weakest = inRun.reduce((a, b) => (RANK[b.band] < RANK[a.band] ? b : a));

  /*
   * The numbers come from the WEAKEST part of the run, not a fresh aggregate
   * over it.
   *
   * That part is the one that set the band, so the sentence and the three facts
   * describe the hours the verdict is actually about — the same rule `binding`
   * already follows everywhere else. Combining two parts into a new average
   * would mean inventing a figure that no part of the day ever recorded, in
   * order to describe a day the app is in the middle of re-describing. Under a
   * two-part window this understates the run's total rain, which is the honest
   * direction to be wrong in: it never overstates how good the run was.
   */
  const weather = parts[weakest.name];
  if (!weather) return null;

  return { band: weakest.band, score: weakest.score, weather };
}

/** Good-to-bad, so "the weakest band in the run" has a meaning. */
const RANK: Record<CallBand, number> = {
  prime: 4, worthALook: 3, marginal: 2, notToday: 1, unsafe: 0,
};
