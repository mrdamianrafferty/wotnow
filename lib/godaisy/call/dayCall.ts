/**
 * One activity on one day: the score and the band it is called at — shared.
 *
 * The app (`makeCall`) and the web (`getActivityScoreForLocation`, which also
 * feeds the activity-conditions API) each turned a raw `Suggestion` into a
 * final answer, and they had drifted. The web applied the promotion but not
 * the gust ceiling or the severe-day demotion, and it took the promoted
 * SCORE while keeping the day-level EVALUATION. Archery at Llys-y-frân on
 * 14 November 2026 went out as 73 and "poor" in the same object, and a
 * consumer had to show the day as unscored rather than guess which half to
 * believe.
 *
 * Every rule that moves a day's score or band after the scorer is applied
 * here, in one order, so the two surfaces cannot disagree:
 *
 *   1. **Gust ceiling.** A gust near the activity's own limit caps it below
 *      Prime (`gustCeiling`).
 *   2. **Day band.** `bandFor`, with the veto deciding Unsafe vs Not today.
 *   3. **Severe demotion.** Marginal on a severe day is Not today (`isSevere`).
 *      The score is pulled under the Marginal floor with it, so a reader
 *      who maps the number to a band gets the same band.
 *   4. **Promotion.** A day whose parts hold up is not a write-off (`promote`).
 *
 * Afterwards `band` and `score` agree: `bandFor(score) === band` in every case
 * except Unsafe, which a score cannot express and which is always carried as
 * the band itself.
 *
 * @module lib/godaisy/call/dayCall
 */

import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';
import type { ActivityType } from '@/data/activities/types';
import { BAND_FLOOR, bandFor, isGood, isSevere, type CallBand } from './bands';
import { promote } from './promote';
import { gustCeiling } from './rank';
import {
  bestWindow, partBands, type CallWindow, type Coords, type ForecastParts, type PartName,
} from './window';

export type PartBar = { name: PartName; band: CallBand; score: number };

export interface DayCallInput {
  suggestion: Pick<Suggestion, 'activityId' | 'score' | 'vetoed' | 'binding'>;
  /** The whole day's weather. */
  weather: WeatherData;
  parts?: ForecastParts;
  /** The day being called, unix seconds. */
  date: number;
  activities: ActivityType[];
  now: Date;
  coords?: Coords;
  /** Bars already scored for this activity, so a caller asking twice scores once. */
  bars?: PartBar[];
}

export interface DayCall {
  score: number;
  band: CallBand;
  /** The day was called off by its own totals and lifted by its parts. */
  promoted: boolean;
  /** The gust ceiling capped the score. */
  gusty: boolean;
  /** The weather the band is about: the winning part's on a promoted day, else the day's. */
  runWeather: WeatherData;
  /** When to go, on a good day that does not hold all day. */
  window?: CallWindow;
  bars: PartBar[];
}

export function dayCall(input: DayCallInput): DayCall {
  const { suggestion: s, weather, parts, date, activities, now, coords } = input;
  const activity = activities.find((a) => a.id === s.activityId);

  // 1. Gust ceiling
  const ceiling = gustCeiling(activity, weather.gustspeed);
  const gusty = ceiling !== undefined && s.score > ceiling;
  let score = gusty ? (ceiling as number) : s.score;

  // 2–3. Day band, with the severe demotion
  const severe = isSevere(weather.precipitation, weather.gustspeed ?? weather.windspeed);
  const scored = bandFor(score, s.vetoed, s.binding?.key);
  const demoted = scored === 'marginal' && severe;
  const dayBand: CallBand = demoted ? 'notToday' : scored;
  if (demoted) score = Math.min(score, BAND_FLOOR.marginal - 1);

  // 4. Promotion
  const bars = input.bars ?? partBands(s.activityId, parts, date, activities, now, coords);
  const dayGust = weather.gustspeed ?? weather.windspeedMax ?? weather.windspeed;
  const lift = promote(dayBand, bars, parts, severe, dayGust);
  const band = lift?.band ?? dayBand;

  const window = isGood(band)
    ? bestWindow(s.activityId, parts, date, activities, now, coords)
    : undefined;

  return {
    score: lift?.score ?? score,
    band,
    promoted: Boolean(lift),
    gusty,
    runWeather: lift?.weather ?? weather,
    ...(window ? { window } : {}),
    bars,
  };
}
