/**
 * The generated verdicts — the ones no phrasebook entry covers.
 *
 * The write-off, the marginal shrug and the unsafe sentence are built from the
 * weather rather than picked from a list, so the phrasebook's fit and voice
 * tests never see them. Both bugs pinned here shipped because of that gap.
 */

import { makeVerdict } from '@/lib/godaisy/call/verdict';
import { allSports } from '@/data/activities';
import type { WeatherData } from '@/utils/getSuggestionsByDay';

/** Same budget as the phrasebook: Charis SIL at 44px in a 338px column. */
const MAX_VERDICT_CHARS = 41;

const WET: WeatherData = { temperature: 12, precipitation: 8, windspeed: 30, gustspeed: 55 };

const sports = (allSports as Array<{ id: string; name: string; weatherSensitive: boolean }>)
  .filter((a) => a.weatherSensitive);

const verdictFor = (id: string, name: string, band: 'notToday' | 'marginal' | 'unsafe') =>
  makeVerdict({
    suggestion: { activityId: id, score: band === 'marginal' ? 45 : 20, vetoed: band === 'unsafe' },
    activityName: name,
    weather: WET,
    band,
    isFirst: true,
    weekday: 'Wednesday',
    dayIndex: 3,
  });

describe('generated call verdicts', () => {
  it('names the sport the day is a write-off FOR', () => {
    const v = verdictFor('road_cycling', 'Go Cycling', 'notToday');
    expect(v.leadIn).toBe('Wednesday is');
    expect(v.verdict).toBe('a write-off for cycling.');
  });

  /*
   * "Wednesday is a write-off for cross-country skiing." is 50 characters as one
   * line and would overflow the lockup on 35 of 81 sports. The lead-in carries
   * the day, so only the second half has to fit.
   */
  it('fits the lockup for every weather-sensitive sport', () => {
    const tooLong: string[] = [];
    for (const a of sports) {
      const v = verdictFor(a.id, a.name, 'notToday');
      if (v.verdict.length > MAX_VERDICT_CHARS) tooLong.push(`${a.id}: "${v.verdict}" (${v.verdict.length})`);
    }
    expect(tooLong).toEqual([]);
  });

  /*
   * `phraseFor` hands back some phrases already carrying their frame — "for a
   * walk", "to the pub", "a day at the beach" — which produced "past the safe
   * limit for for a walk" in the unsafe branch.
   */
  it('never doubles a preposition after "for"', () => {
    const offenders: string[] = [];
    for (const a of sports) {
      for (const band of ['notToday', 'unsafe'] as const) {
        const v = verdictFor(a.id, a.name, band);
        const line = `${v.verdict} ${v.reason}`;
        if (/\bfor\s+(for|to)\b/.test(line)) offenders.push(`${a.id} (${band}): ${line}`);
        if (/\bfor\s+a day\b/.test(line)) offenders.push(`${a.id} (${band}): ${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the marginal shrug nameless and short — it is not a no', () => {
    const v = verdictFor('road_cycling', 'Go Cycling', 'marginal');
    expect(v.verdict).toBe('nothing special.');
    expect(v.verdict).not.toMatch(/write-off/);
  });

  it('holds the voice rules — one clause, no exclamation, ends in a full stop', () => {
    for (const a of sports.slice(0, 40)) {
      for (const band of ['notToday', 'marginal', 'unsafe'] as const) {
        const { verdict } = verdictFor(a.id, a.name, band);
        expect(verdict).toMatch(/\.$/);
        expect(verdict).not.toMatch(/[!]/);
        expect(verdict.slice(0, -1)).not.toContain('.');
      }
    }
  });
});
