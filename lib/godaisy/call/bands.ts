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

export function bandFor(score: number, vetoed?: boolean): CallBand {
  // A hazard that fired short-circuits the score. It is not a low number, it is
  // a different kind of answer — and the one case where red is allowed to mean
  // red, because if red means "bad tennis weather" it cannot also mean "do not
  // go in the water".
  if (vetoed) return 'unsafe';
  if (score >= BAND_FLOOR.prime) return 'prime';
  if (score >= BAND_FLOOR.worthALook) return 'worthALook';
  if (score >= BAND_FLOOR.marginal) return 'marginal';
  return 'notToday';
}

export function isGood(band: CallBand): boolean {
  return GOOD_BANDS.has(band);
}
