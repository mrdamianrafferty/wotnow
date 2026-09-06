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
import { bestWindow, partBands, type ForecastParts, type PartName } from './window';
import { promote } from './promote';
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

/**
 * Was this always going to read the same in every part?
 *
 * `scoreParts` now holds a non-weather-sensitive activity's band uniform
 * across morning/afternoon/evening on purpose — see the comment there. Three
 * identical pills and an "it holds all day" note are not evidence for
 * reading; they are the shape of a question that was never asked. The
 * bars still exist (`promote` needs them), they are just not shown.
 */
function isIndoor(activityId: string, activities: ActivityType[]): boolean {
  return activities.find((a) => a.id === activityId)?.weatherSensitive === false;
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
  /**
   * Where this is, so the parts can be told whether the sun is up.
   * Absent means no daylight damping — see `daylight` in `window.ts`.
   */
  coords?: { lat: number; lon: number };
  lang?: SupportedLanguageCode;
}

export function makeCall(input: MakeCallInput): Call {
  const {
    date, place, weather, suggestions, sports, seeded = [], names = {}, nextYes,
    dayIndex = 0, weekday = '', parts, activities = [], now = new Date(), lang = 'en', coords,
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
    const made = partBands(activityId, parts, date, activities, now, coords);
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
      ? bestWindow(s.activityId, parts, date, activities, now, coords)
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
      ...(bars.length && !isIndoor(s.activityId, activities) ? { parts: bars } : {}),
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

  /*
   * AN INDOOR ACTIVITY CANNOT WIN A GOOD DAY.
   *
   * Indoor activities are scored by their own branch in `scoreActivity`: they
   * open at 65, climb toward 80 in heavy rain and fall to 55 on a bright, still
   * day. That is the right *shape* and the wrong *scale* — the "gorgeous day"
   * penalty needs literally zero precipitation, so a dry 18° afternoon with
   * 0.1 mm on the radar left the café sitting at 65 and beating a walk. The
   * first thing the screen said was "a day for a café", outdoors, in September,
   * in the sun.
   *
   * Rather than retune a scorer that four other screens depend on, the call
   * states the rule it actually wants: while anything outdoors is good, that is
   * the answer, and the indoor options wait in the alternates. When nothing
   * outdoors is good the indoor ones rise on their own — which is the write-off
   * behaviour the separate indoor prompt was built to fake, now falling out of
   * the ranking instead of being bolted onto it.
   */
  const indoor = new Set(
    activities.filter((a) => a.weatherSensitive === false).map((a) => a.id),
  );
  const good = ranked.filter((s) => isGood(bandOf(s)));
  if (good.some((s) => !indoor.has(s.activityId))) {
    // Stable: `ranked` is already the score order, and this only lifts the
    // outdoor block above the indoor one without disturbing either.
    good.sort((a, b) => Number(indoor.has(a.activityId)) - Number(indoor.has(b.activityId)));
  }

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
