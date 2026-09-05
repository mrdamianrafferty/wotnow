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
import { factsFor, nextYesFact, type CallFact } from './facts';
import { makeVerdict, type Verdict } from './verdict';

export interface CallOption {
  activityId: string;
  activityName?: string;
  score: number;
  band: CallBand;
  verdict: Verdict;
  facts: CallFact[];
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
  lang?: SupportedLanguageCode;
}

export function makeCall(input: MakeCallInput): Call {
  const { date, place, weather, suggestions, sports, seeded = [], names = {}, nextYes, dayIndex = 0, weekday = '', lang = 'en' } = input;

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

  const build = (s: Suggestion, isFirst: boolean): CallOption => {
    // Marginal means dull. On a severe day it is demoted, so the shrug and the
    // numbers under it never contradict each other — see `isSevere`.
    const scored = bandFor(s.score, s.vetoed, s.binding?.key);
    const band: CallBand = scored === 'marginal' && severe ? 'notToday' : scored;
    const activityName = names[s.activityId];
    // Omitted, not `undefined` — this object crosses getServerSideProps, where an
    // explicit undefined is a serialization error rather than an absent field.
    return {
      activityId: s.activityId,
      ...(activityName ? { activityName } : {}),
      score: s.score,
      band,
      verdict: makeVerdict({
        suggestion: s,
        activityName,
        weather,
        band,
        isFirst,
        nextYes,
        place,
        dayIndex,
        weekday,
      }),
      facts: factsFor(s, weather, lang),
    };
  };

  const good = ranked.filter((s) => isGood(bandFor(s.score, s.vetoed, s.binding?.key)));

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
