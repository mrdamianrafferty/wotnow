/**
 * The band and the sentence under it have to agree.
 *
 * Both bugs these tests pin were found by reading `scripts/print-calls.ts`
 * output, not by reasoning about thresholds — which is why the file exists.
 */

import { bandFor, isGood, isSevere, BAND_FLOOR } from '@/lib/godaisy/call/bands';

describe('call bands', () => {
  it('places a plain score in the band its floor names', () => {
    expect(bandFor(BAND_FLOOR.prime)).toBe('prime');
    expect(bandFor(BAND_FLOOR.worthALook)).toBe('worthALook');
    expect(bandFor(BAND_FLOOR.marginal)).toBe('marginal');
    expect(bandFor(BAND_FLOOR.marginal - 1)).toBe('notToday');
  });

  /*
   * Mapping every veto to Unsafe put 12 of 84 days in the danger band, on days
   * whose worst crime was 4.3 mm of rain. If red means bad tennis weather it
   * cannot also mean do not go in the water.
   */
  it('spends the danger band only on danger', () => {
    expect(bandFor(30, true, 'gust')).toBe('unsafe');
    expect(bandFor(30, true, 'waveHeight')).toBe('unsafe');
    expect(bandFor(30, true, 'precipitation')).toBe('notToday');
    expect(bandFor(30, true, undefined)).toBe('notToday');
  });

  /*
   * `windSpeed` was in the danger set. Sustained wind only ever vetoes from
   * above, so it was not the shortfall risk that keeps it out of
   * `getSuggestionsByDay`'s DECIDES_SAFETY — but picnicking, outdoor reading
   * and outdoor chess veto on it at 30 km/h, and a breezy afternoon in a park
   * is not a day to tell someone to sit out. Dangerous wind arrives as a gust.
   */
  it('does not call sustained wind dangerous — that is what gust is for', () => {
    expect(bandFor(30, true, 'windSpeed')).toBe('notToday');
    expect(bandFor(30, true, 'gust')).toBe('unsafe');
  });

  it('keeps marginal out of the good set — it is not a day to promise anyone', () => {
    expect(isGood('prime')).toBe(true);
    expect(isGood('worthALook')).toBe(true);
    expect(isGood('marginal')).toBe(false);
    expect(isGood('notToday')).toBe(false);
  });

  /*
   * Croyde Bay scored 41 — one point inside Marginal — while gusting to 52 km/h
   * with 5 mm of rain, and read "Tuesday is nothing special."
   */
  it('calls a day severe on the numbers the reason is about to print', () => {
    expect(isSevere(5.0, 52)).toBe(true);
    expect(isSevere(4.0, 10)).toBe(true);
    expect(isSevere(0.2, 45)).toBe(true);
    expect(isSevere(1.4, 21)).toBe(false);
    expect(isSevere(2.8, 44)).toBe(false);
    // Missing readings are not evidence of severity.
    expect(isSevere(undefined, undefined)).toBe(false);
  });
});
