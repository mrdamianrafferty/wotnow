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

/**
 * The reason ported from the old SEO-page copy (utils/getSuggestionsByDay's
 * `getReasoningForScore`), which this drawer's `bindingClause` never covered:
 * humidity, visibility, wind direction and snow could decide a score and the
 * "Why" sentence would say nothing about any of them.
 */
describe('binding clauses this drawer used to drop', () => {
  const goodDay = (weather: WeatherData, bindingKey: string) => makeVerdict({
    suggestion: {
      activityId: 'road_cycling',
      score: 55,
      binding: { key: bindingKey, score: 0.2, condition: '', value: 0 },
    },
    activityName: 'Go Cycling',
    weather,
    band: 'worthALook',
    isFirst: true,
    weekday: 'Wednesday',
    dayIndex: 3,
  });

  it('names humidity on a warm day as sticky heat, not just a number', () => {
    const v = goodDay({ temperature: 22, humidity: 93 }, 'humidity');
    expect(v.reason).toMatch(/close and sticky at 93%/i);
  });

  it('names the same humidity on a cold day as damp chill instead', () => {
    const v = goodDay({ temperature: 4, humidity: 93 }, 'humidity');
    expect(v.reason).toMatch(/damp and clammy at 93%/i);
  });

  it('names fog when visibility is the binding criterion', () => {
    const v = goodDay({ temperature: 12, visibility: 600 }, 'visibility');
    expect(v.reason).toMatch(/thick fog/i);
  });

  it('names the wind direction when it is the binding criterion', () => {
    const v = goodDay({ temperature: 12, winddirection: 90 }, 'windDirection');
    expect(v.reason).toMatch(/out of the east/i);
  });

  it('names snow underfoot when it is the binding criterion', () => {
    const v = goodDay({ temperature: 1, snowDepthCm: 4 }, 'snowDepthCm');
    expect(v.reason).toMatch(/4 cm of snow underfoot/i);
  });

  /*
   * A FORECAST THAT DOES NOT CARRY RAIN IS NOT A DRY DAY.
   *
   * `w.precipitation ?? 0` made a missing field indistinguishable from zero, so
   * the sentence asserted "Dry through." over data it never had. The fact grid
   * beside it drops the tile on the same input, which is what made the two
   * halves of the lockup contradict each other.
   */
  describe('precipitation the forecast never carried', () => {
    it('does not call the day dry when precipitation binds but is missing', () => {
      const v = goodDay({ temperature: 16 }, 'precipitation');
      expect(v.reason).not.toMatch(/dry/i);
    });

    it('says the temperature alone rather than "dry, 16°C"', () => {
      const v = goodDay({ temperature: 16 }, 'temperature');
      expect(v.reason).not.toMatch(/dry/i);
      expect(v.reason).toMatch(/16°C/);
    });

    it('still says dry when the forecast actually says zero', () => {
      const v = goodDay({ temperature: 16, precipitation: 0 }, 'precipitation');
      expect(v.reason).toMatch(/dry through/i);
    });

    it('still names the rain when there is some', () => {
      const v = goodDay({ temperature: 16, precipitation: 3.4 }, 'precipitation');
      expect(v.reason).toMatch(/3\.4 mm of rain/i);
    });
  });

  /*
   * The unsafe branch read `gustspeed ?? windspeedMax ?? windspeed` and the
   * write-off branch read `gustspeed ?? windspeed`, so on a source with a peak
   * sustained wind but no gust the two disagreed about the same day — and the
   * write-off took the mean, dropping under its own 35 km/h naming threshold.
   */
  it('names the peak wind on a write-off day when no gust is published', () => {
    const v = makeVerdict({
      suggestion: { activityId: 'road_cycling', score: 20 },
      activityName: 'Go Cycling',
      weather: { temperature: 9, windspeed: 24, windspeedMax: 48 },
      band: 'notToday',
      isFirst: true,
      weekday: 'Wednesday',
      dayIndex: 3,
    });
    expect(v.reason).toMatch(/gusting to 48 km\/h/i);
  });

  it('still warns about humidity on a write-off day, even when something else binds', () => {
    const v = makeVerdict({
      suggestion: { activityId: 'road_cycling', score: 20, binding: { key: 'precipitation', score: 0, condition: '', value: 8 } },
      activityName: 'Go Cycling',
      weather: { ...WET, humidity: 95 },
      band: 'notToday',
      isFirst: true,
      weekday: 'Wednesday',
      dayIndex: 3,
    });
    expect(v.reason).toMatch(/close and sticky at 95%/i);
  });
});
