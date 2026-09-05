/**
 * One day, one answer — and the alternates behind it.
 *
 * The call ranks across every sport a person has added; the three they seeded
 * only break ties. Anything landing in Prime or Worth a look joins the alternates
 * cycle, in rank order. Marginal and below never reach the call screen.
 *
 * @module lib/godaisy/call/makeCall
 */

import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';
import type { SupportedLanguageCode } from '@/lib/i18n/translate';
import { bandFor, isGood, isSevere, type CallBand } from './bands';
import { bestWindow, partBands, bestRun, type ForecastParts, type PartName } from './window';
import type { ActivityType } from '@/data/activities/types';
import { factsFor, nextYesFact, type CallFact } from './facts';
import { makeVerdict, type Verdict } from './verdict';

export interface CallOption {
  activityId: string;
  activityName?: string;
  score: number;
  band: CallBand;
  verdict: Verdict;
  facts: CallFact[];
  /**
   * What the scorer weighed, most limiting first — for the evidence drawer,
   * which orders its sections by it.
   *
   * Trimmed to the fields the drawer reads, and capped, because this crosses
   * getServerSideProps for every option on every one of seven days. The band
   * strings are not carried: "windSpeed=5..12" is the model's language, and the
   * drawer is written in the reader's.
   */
  weighed?: Array<{ key: string; score: number; value?: number }>;
  /**
   * How each part of the day scored — the drawer's bars.
   *
   * Three, not twenty-four: the same resolution decision the window is built on.
   * Absent where the source published no usable hourly series.
   */
  parts?: Array<{ name: PartName; band: CallBand }>;
}

export interface Call {
  /** UNIX seconds, as the forecast carries it. */
  date: number;
  place: string;
  /** The answer. Null only when the day has no scored activity at all. */
  call: CallOption | null;
  /**
   * Prime and Worth a look, in rank order, INCLUDING the call itself at [0].
   * Two or more means the alternates control renders; one means it does not.
   */
  alternates: CallOption[];
  /** True when nothing reached Worth a look — the no-day. */
  isNoDay: boolean;
}

export interface MakeCallInput {
  date: number;
  place: string;
  weather: WeatherData;
  /** Already scored and sorted by `getSuggestionsByDay`. */
  suggestions: Suggestion[];
  /** The sports this person actually chose. Others are ignored. */
  sports: string[];
  /** The three they seeded. Used only to break ties. */
  seeded?: string[];
  /** Display names by activity id, for the sentence. */
  names?: Record<string, string>;
  /** The next day that is a yes, formatted ("Tuesday"). Drives the no-day. */
  nextYes?: string;
  /** Which day of the run this is. 0 = today. Steps the phrasing. */
  dayIndex?: number;
  /** The weekday this call is for, already localised ("Tuesday"). */
  weekday?: string;
  /**
   * The day cut into parts — phase 1b. Absent where the source published no
   * usable hourly series, in which case every call on this day is window-free
   * and simply says less.
   */
  parts?: ForecastParts;
  /** Needed to score the parts. The same list the day was scored against. */
  activities?: ActivityType[];
  /** Anchors season and context tags for the parts. Defaults to now. */
  now?: Date;
  lang?: SupportedLanguageCode;
}

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
function promote(
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

export function makeCall(input: MakeCallInput): Call {
  const {
    date, place, weather, suggestions, sports, seeded = [], names = {}, nextYes,
    dayIndex = 0, weekday = '', parts, activities = [], now = new Date(), lang = 'en',
  } = input;

  const mine = suggestions.filter((s) => sports.includes(s.activityId));

  // Rank across everything added; the seeded three only break ties. Sorting by
  // score alone would make the order arbitrary between equals, and "arbitrary"
  // shows up as the verdict changing between two refreshes of the same day.
  const ranked = [...mine].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aSeed = seeded.includes(a.activityId) ? 0 : 1;
    const bSeed = seeded.includes(b.activityId) ? 0 : 1;
    if (aSeed !== bSeed) return aSeed - bSeed;
    return a.activityId.localeCompare(b.activityId);
  });

  const severe = isSevere(weather.precipitation, weather.gustspeed ?? weather.windspeed);
  const dayGust = weather.gustspeed ?? weather.windspeedMax ?? weather.windspeed;

  /*
   * Scoring three parts means three more passes through the activity models,
   * and the answer is now needed twice for every activity — once to decide
   * whether the day is good, and again to build the option. Same inputs, same
   * answer, so it is computed once.
   */
  const barCache = new Map<string, ReturnType<typeof partBands>>();
  const barsFor = (activityId: string) => {
    const held = barCache.get(activityId);
    if (held) return held;
    const made = partBands(activityId, parts, date, activities, now);
    barCache.set(activityId, made);
    return made;
  };

  /**
   * The band this activity is actually called at, promotion included.
   *
   * `bandFor` alone answers for the DAY. A day promoted by its parts has to be
   * promoted here too, or it is rendered with the good-day sentence and then
   * filtered out of the good list — which put it back on the no-day path with a
   * verdict written for the opposite case.
   */
  const bandOf = (s: Suggestion): CallBand => {
    const scored = bandFor(s.score, s.vetoed, s.binding?.key);
    const dayBand: CallBand = scored === 'marginal' && severe ? 'notToday' : scored;
    return promote(dayBand, barsFor(s.activityId), parts, severe, dayGust)?.band ?? dayBand;
  };

  const build = (s: Suggestion, isFirst: boolean): CallOption => {
    // Marginal means dull. On a severe day it is demoted, so the shrug and the
    // numbers under it never contradict each other — see `isSevere`.
    const scored = bandFor(s.score, s.vetoed, s.binding?.key);
    const dayBand: CallBand = scored === 'marginal' && severe ? 'notToday' : scored;
    const activityName = names[s.activityId];

    /*
     * The bars are computed for EVERY band, and now decide the verdict too.
     *
     * They were the drawer's evidence; they turned out to be better evidence
     * than the day. See `promote` below.
     */
    const bars = barsFor(s.activityId);
    const lift = promote(dayBand, bars, parts, severe, dayGust);
    const band = lift?.band ?? dayBand;

    /*
     * The window is only asked for on a day that is a yes — which now includes
     * a day promoted into one. "Best in the morning" over "a write-off" was a
     * contradiction; over "a good day to get the bike out" it is the point.
     */
    const window = isGood(band)
      ? bestWindow(s.activityId, parts, date, activities, now)
      : undefined;

    const weighed = (s.criteria ?? [])
      .slice(0, 10)
      .map((c) => ({ key: c.key, score: c.score, ...(c.value === undefined ? {} : { value: c.value }) }));

    /*
     * A PROMOTED DAY IS DESCRIBED BY ITS RUN, NOT BY ITSELF.
     *
     * The day's own weather is what demoted it — 6.9 mm of rain — and reading
     * that out under "a good day to get the bike out" would be the same
     * contradiction from the other side. So the verdict and the three facts are
     * written from the run's weather, which is the weather of the hours the
     * sentence is actually about.
     */
    const runWeather = lift?.weather ?? weather;

    return {
      activityId: s.activityId,
      ...(activityName ? { activityName } : {}),
      score: lift?.score ?? s.score,
      band,
      ...(weighed.length ? { weighed } : {}),
      ...(bars.length ? { parts: bars } : {}),
      verdict: makeVerdict({
        suggestion: lift ? { ...s, score: lift.score, vetoed: false } : s,
        activityName,
        weather: runWeather,
        band,
        isFirst,
        nextYes,
        place,
        dayIndex,
        weekday,
        ...(lift ? { promoted: true } : {}),
        ...(window ? { window } : {}),
      }),
      facts: factsFor(lift ? { ...s, score: lift.score, vetoed: false } : s, runWeather, lang),
    };
  };

  const good = ranked.filter((s) => isGood(bandOf(s)));

  if (!good.length) {
    // Nothing worth putting on the call screen. The verdict is built from the
    // best of a bad set, because the reason should describe the day that
    // actually happened rather than an activity nobody asked about.
    const best = ranked[0];
    if (!best) return { date, place, call: null, alternates: [], isNoDay: true };
    const option = build(best, true);
    if (nextYes) option.facts = [...option.facts.slice(0, 2), nextYesFact(nextYes, lang)];
    /*
     * MARGINAL IS NOT A WRITE-OFF. "Friday is a write-off. 1.0 mm of rain."
     * scored 46 — a dull day, not a cancelled one, and calling it off sends
     * someone indoors who would have had a perfectly ordinary run. Only the two
     * bands that mean the day is genuinely off set `isNoDay`, which is what
     * darkens the screen and offers the indoor alternative.
     */
    return { date, place, call: option, alternates: [], isNoDay: option.band !== 'marginal' };
  }

  const alternates = good.map((s, i) => build(s, i === 0));
  return { date, place, call: alternates[0], alternates, isNoDay: false };
}
