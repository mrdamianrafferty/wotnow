/**
 * A day with a good run in it is not a write-off.
 *
 * Tested through `makeCall` rather than against the promotion function alone,
 * because the bug this fixes was never in one function — it was the day-level
 * band, the verdict, the facts and the good-list disagreeing with each other.
 * Every one of those has to move together or the day comes out promoted with a
 * no-day sentence, which is worse than what it replaced.
 *
 * The rules being pinned all bound the same risk: this turns a NO into a YES,
 * and being wrong in that direction costs someone a wasted journey.
 */

import { makeCall } from '@/lib/godaisy/call/makeCall';
import { allSports } from '@/data/activities';
import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';

const NOW = new Date('2026-09-07T06:00:00Z');
const DATE = Math.floor(Date.parse('2026-09-07T12:00:00Z') / 1000);
const ACTIVITIES = allSports as never;

/** Anything a walker would be happy with. */
const FINE: WeatherData = {
  temperature: 17, precipitation: 0, precipitationHours: 0,
  windspeed: 11, windspeedMax: 14, gustspeed: 19,
  clouds: 30, humidity: 62, visibility: 20000,
};
/** Wet and blowy, but nothing dangerous. */
const FOUL: WeatherData = {
  temperature: 12, precipitation: 7, precipitationHours: 6,
  windspeed: 33, windspeedMax: 38, gustspeed: 41,
  clouds: 96, humidity: 94, visibility: 6000,
};
/** Past the safe limit. */
const WILD: WeatherData = { ...FOUL, windspeed: 62, windspeedMax: 70, gustspeed: 88 };

const call = (day: WeatherData, parts: Record<string, WeatherData>) => {
  const suggestions = [
    { activityId: 'hiking', score: 0, evaluation: 'poor' } as unknown as Suggestion,
  ];
  return makeCall({
    date: DATE,
    place: 'Testville',
    weather: day,
    // Re-scored from `weather` inside the call for the parts; the suggestion's
    // own score is replaced by the promotion when one happens.
    suggestions,
    sports: ['hiking'],
    seeded: ['hiking'],
    names: { hiking: 'Go Hiking' },
    dayIndex: 3,
    weekday: 'Monday',
    parts,
    activities: ACTIVITIES,
    now: NOW,
  });
};

describe('promoting a day out of its own totals', () => {
  /*
   * The case that started it. Newquay on 7 September: "a write-off for cycling"
   * over bars scoring prime, prime, notToday, because the day totalled 6.9 mm
   * of rain against cycling's 3 mm veto and nearly all of it fell after six.
   */
  it('lifts a day whose morning and afternoon hold up', () => {
    const c = call({ ...FOUL, precipitation: 6.9 }, { morning: FINE, afternoon: FINE, evening: FOUL });
    expect(c.isNoDay).toBe(false);
    expect(c.call?.band).not.toBe('notToday');
    expect(c.call?.verdict.verdict).not.toMatch(/write-off/);
  });

  it('says WHEN, every time it lifts a day', () => {
    const c = call({ ...FOUL, precipitation: 6.9 }, { morning: FINE, afternoon: FINE, evening: FOUL });
    expect(c.call?.verdict.reason).toMatch(/Best (in the|before|from)/);
  });

  /*
   * "Monday is a walking day. Dry through." went out over a day carrying 3.7 mm
   * of rain — true of the afternoon it was recommending, false of the day, and
   * the reader has no way to tell which was meant.
   */
  it('never claims the whole day is dry when only part of it is', () => {
    const c = call({ ...FOUL, precipitation: 3.7 }, { morning: FOUL, afternoon: FINE, evening: FINE });
    expect(c.call?.verdict.reason).not.toMatch(/Dry through|Dry, /);
    expect(c.call?.verdict.reason).toMatch(/Best/);
  });

  it('leaves a day alone when every part is as bad as the day', () => {
    const c = call(FOUL, { morning: FOUL, afternoon: FOUL, evening: FOUL });
    expect(c.isNoDay).toBe(true);
    expect(c.call?.verdict.verdict).toMatch(/write-off/);
  });

  /*
   * The Lake District came out as "a good day for a long walk" on a day
   * carrying 12.3 mm of rain, on the strength of one tolerable evening. One
   * gap at the end of a soaking is not a day out.
   */
  it('will not lift a severe day on one good part alone', () => {
    const c = call({ ...FOUL, precipitation: 12.3 }, { morning: FOUL, afternoon: FOUL, evening: FINE });
    expect(c.isNoDay).toBe(true);
  });

  it('will lift an ORDINARY bad day on one good part', () => {
    const c = call({ ...FOUL, precipitation: 2.8, gustspeed: 33 }, { morning: FINE, afternoon: FOUL, evening: FOUL });
    expect(c.isNoDay).toBe(false);
    expect(c.call?.verdict.reason).toMatch(/Best in the morning/);
  });

  /*
   * A daily gust past the safe limit is a safety call, and a calm-looking part
   * is not a rebuttal — a six-hour bucket's own maximum can easily miss the
   * gust that matters. Comfort is negotiable by the hour; danger is not.
   */
  it('never lifts a day whose own gust is a gale, however calm its parts look', () => {
    // The parts are deliberately inconsistent with the day, which cannot happen
    // in real data — they come from the same series. It is written that way on
    // purpose: the two band checks are the scorer's OPINION about one activity,
    // and this pins the check that reads the weather instead.
    const c = call(WILD, { morning: FINE, afternoon: FINE, evening: FINE });
    expect(c.isNoDay).toBe(true);
    expect(c.call?.verdict.verdict).toMatch(/write-off|sit out/);
  });

  it('never lifts a day the scorer vetoed as dangerous', () => {
    const vetoed = {
      activityId: 'hiking', score: 14, evaluation: 'poor',
      vetoed: true, binding: { key: 'gust', score: 0.1, condition: 'gust<40' },
    } as unknown as Suggestion;
    const c = makeCall({
      date: DATE, place: 'Testville', weather: WILD, suggestions: [vetoed],
      sports: ['hiking'], seeded: ['hiking'], names: { hiking: 'Go Hiking' },
      dayIndex: 3, weekday: 'Monday',
      parts: { morning: FINE, afternoon: FINE, evening: FINE },
      activities: ACTIVITIES, now: NOW,
    });
    expect(c.call?.band).toBe('unsafe');
    expect(c.isNoDay).toBe(true);
  });

  it('never lifts past an unsafe part', () => {
    const c = call({ ...FOUL, precipitation: 5 }, { morning: FINE, afternoon: WILD, evening: FINE });
    expect(c.call?.band === 'prime' || c.call?.band === 'worthALook').toBe(false);
  });

  it('does nothing without parts — the old behaviour, unchanged', () => {
    const c = makeCall({
      date: DATE, place: 'Testville', weather: FOUL,
      suggestions: [{ activityId: 'hiking', score: 0, evaluation: 'poor' } as unknown as Suggestion],
      sports: ['hiking'], seeded: ['hiking'], names: { hiking: 'Go Hiking' },
      dayIndex: 3, weekday: 'Monday', activities: ACTIVITIES, now: NOW,
    });
    expect(c.isNoDay).toBe(true);
    expect(c.call?.verdict.verdict).toMatch(/write-off/);
  });

  /* A promoted day must not still be counted a no-day: that darkens the screen
     and offers an indoor activity under a sentence saying to go out. */
  it('agrees with itself — band, verdict and no-day flag move together', () => {
    const c = call({ ...FOUL, precipitation: 6.9 }, { morning: FINE, afternoon: FINE, evening: FOUL });
    const good = c.call?.band === 'prime' || c.call?.band === 'worthALook';
    expect(good).toBe(true);
    expect(c.isNoDay).toBe(false);
    expect(c.alternates.length).toBeGreaterThan(0);
  });
});
