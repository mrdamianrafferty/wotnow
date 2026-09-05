/**
 * The five bands The Call speaks in.
 *
 * The current app renders a 0–100 score as one of ten badge words — Perfect,
 * Excellent, Very Good, Decent, Fair, Tricky … — none of which tells you whether
 * to go. The redesign replaces all ten with five bands, and shows even those only
 * in the evidence drawer: beside a verdict they would contradict the sentence
 * that already said it.
 *
 * **The thresholds below are a first guess and are meant to be tuned by reading
 * output**, which is what `scripts/print-calls.ts` exists for. They start close to
 * the levels the existing scorer already uses (`getScoreEvaluation`: 90 perfect,
 * 60 good, 40 fair) so behaviour does not lurch, with `PRIME` pulled down from 90
 * because a verdict that fires twice a year is not a daily product.
 *
 * @module lib/godaisy/call/bands
 */

export type CallBand = 'prime' | 'worthALook' | 'marginal' | 'notToday' | 'unsafe';

/** Score floors, highest first. Tune by reading, not by argument. */
export const BAND_FLOOR = {
  prime: 78,
  worthALook: 60,
  marginal: 40,
} as const;

/** What each band is called, in English. Other locales are authored, not translated. */
export const BAND_LABEL: Record<CallBand, string> = {
  prime: 'Prime',
  worthALook: 'Worth a look',
  marginal: 'Marginal',
  notToday: 'Not today',
  unsafe: 'Unsafe',
};

/**
 * Which bands are good enough to be *the* call, and to enter the alternates
 * cycle. Marginal and below never appear on the call screen — they live behind
 * the menu dot, for someone who disagrees with the answer.
 */
export const GOOD_BANDS: ReadonlySet<CallBand> = new Set<CallBand>(['prime', 'worthALook']);

/**
 * The keys on which a fired hazard means DANGER rather than disappointment.
 *
 * `vetoed` only means "some poor condition matched", and most poor conditions
 * are about comfort: cycling vetoes above 3 mm of rain. Mapping every veto to
 * Unsafe put 12 of 84 days in the danger band and produced "Tuesday is one to
 * sit out. Conditions are past the safe limit for cycling." over 4.3 mm of rain
 * — which is exactly the failure the palette rule warns about: if red means bad
 * tennis weather it cannot also mean do not go in the water.
 *
 * The set is the one `getSuggestionsByDay` already uses for its safety floor,
 * plus wind and snowfall. Everything else that vetoes is Not today: the day is
 * off, and nobody is in danger.
 */
const DANGEROUS_KEYS: ReadonlySet<string> = new Set([
  'gust', 'windSpeed', 'waveHeight', 'waterTemperature', 'snowfallRateMmH', 'visibility',
]);

export function bandFor(score: number, vetoed?: boolean, hazardKey?: string): CallBand {
  // A hazard that fired short-circuits the score, but only a DANGEROUS one earns
  // the red band. The rest are simply a no.
  if (vetoed) return hazardKey && DANGEROUS_KEYS.has(hazardKey) ? 'unsafe' : 'notToday';
  if (score >= BAND_FLOOR.prime) return 'prime';
  if (score >= BAND_FLOOR.worthALook) return 'worthALook';
  if (score >= BAND_FLOOR.marginal) return 'marginal';
  return 'notToday';
}

export function isGood(band: CallBand): boolean {
  return GOOD_BANDS.has(band);
}

/**
 * Weather severe enough that "nothing special" would be a lie.
 *
 * The scorer put Croyde Bay at 41 — one point inside Marginal — on a day gusting
 * to 52 km/h with 5 mm of rain, and the marginal sentence read "Tuesday is
 * nothing special." It is not nothing special. It is horrible.
 *
 * Rather than re-tune a scorer that several other screens depend on, the band
 * takes a second opinion from the two numbers the reason is about to print.
 * They must agree: a verdict that shrugs above evidence that does not is worse
 * than either alone. 45 km/h sits a clear step above the 35 at which the reason
 * starts mentioning gusts at all; 4 mm is the point past which every outdoor
 * activity in the library has already vetoed.
 */
export function isSevere(rainMm?: number, gustKmh?: number): boolean {
  return (rainMm ?? 0) >= 4 || (gustKmh ?? 0) >= 45;
}
