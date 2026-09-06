/**
 * The window, and the sentence it becomes.
 *
 * The window is the difference between a forecast and advice, and its main
 * failure mode is saying something rather than nothing — a window on every day
 * is noise, and a cause that is true of every day ("it cools off after that") is
 * the app sounding like it noticed something it did not.
 */

import { bestWindow } from '@/lib/godaisy/call/window';
import { makeVerdict } from '@/lib/godaisy/call/verdict';
import { allSports } from '@/data/activities';
import type { WeatherData } from '@/utils/getSuggestionsByDay';

const NOW = new Date('2026-09-07T09:00:00Z');
const DATE = Math.floor(Date.parse('2026-09-07T12:00:00Z') / 1000);
const ACTIVITIES = allSports as never;

const fine: WeatherData = { temperature: 17, precipitation: 0, windspeed: 10, gustspeed: 18, clouds: 20, humidity: 60, visibility: 20000 };
const foul: WeatherData = { temperature: 13, precipitation: 9, windspeed: 46, gustspeed: 70, clouds: 95, humidity: 95, visibility: 3000 };

describe('the window', () => {
  /*
   * A day that holds all day has no window. "Best all day" is not a restriction,
   * and the window earns its place by being one — 16 of 84 days in the reference
   * run carry one, which is the rate that keeps it meaning something.
   */
  it('says nothing when every part is good', () => {
    const w = bestWindow('hiking', { morning: fine, afternoon: fine, evening: fine }, DATE, ACTIVITIES, NOW);
    expect(w).toBeUndefined();
  });

  it('says nothing when no part is good — a no does not need a window', () => {
    const w = bestWindow('hiking', { morning: foul, afternoon: foul, evening: foul }, DATE, ACTIVITIES, NOW);
    expect(w).toBeUndefined();
  });

  it('says nothing with fewer than two parts — one part is a day, not a window', () => {
    expect(bestWindow('hiking', { morning: fine }, DATE, ACTIVITIES, NOW)).toBeUndefined();
    expect(bestWindow('hiking', undefined, DATE, ACTIVITIES, NOW)).toBeUndefined();
  });

  it('finds the run that holds, and names what closes it', () => {
    const w = bestWindow('hiking', { morning: fine, afternoon: fine, evening: foul }, DATE, ACTIVITIES, NOW);
    expect(w?.parts).toEqual(['morning', 'afternoon']);
    expect(w?.ends).toBeTruthy();
  });

  it('finds a run that starts later in the day', () => {
    const w = bestWindow('hiking', { morning: foul, afternoon: fine, evening: fine }, DATE, ACTIVITIES, NOW);
    expect(w?.parts).toEqual(['afternoon', 'evening']);
    // Nothing follows the run, so there is nothing to blame for ending it.
    expect(w?.ends).toBeUndefined();
  });

  it('takes the longest run when the day is broken up', () => {
    const w = bestWindow('hiking', { morning: fine, afternoon: foul, evening: fine }, DATE, ACTIVITIES, NOW);
    // Two runs of one. The earliest wins, because a window is advice about when
    // to go and a person can still act on the earlier one.
    expect(w?.parts).toEqual(['morning']);
  });

  /*
   * `reading` is `weatherSensitive: false` and is scored by a synthetic
   * heuristic built to rank it against outdoor alternatives, not a real
   * claim about when in the day it suits — it produced "Best before six."
   * on live because the heuristic reacts to each part's own weather. Reading
   * is not limited to one time of day, in fine weather or in foul.
   */
  it('never gives an indoor, non-weather-sensitive activity a window', () => {
    expect(bestWindow('reading', { morning: fine, afternoon: fine, evening: foul }, DATE, ACTIVITIES, NOW)).toBeUndefined();
    expect(bestWindow('reading', { morning: foul, afternoon: fine, evening: fine }, DATE, ACTIVITIES, NOW)).toBeUndefined();
    expect(bestWindow('reading', { morning: foul, afternoon: foul, evening: fine }, DATE, ACTIVITIES, NOW)).toBeUndefined();
  });
});

describe('the window, as a sentence', () => {
  const say = (window: { parts: string[]; ends?: string }) =>
    makeVerdict({
      suggestion: { activityId: 'hiking', score: 85, vetoed: false },
      activityName: 'Go Hiking',
      weather: fine,
      band: 'prime',
      isFirst: true,
      weekday: 'Monday',
      dayIndex: 3,
      window,
    }).reason;

  it('writes each run the way a person says it', () => {
    expect(say({ parts: ['morning'] })).toContain('Best in the morning.');
    expect(say({ parts: ['evening'] })).toContain('Best in the evening.');
    expect(say({ parts: ['morning', 'afternoon'] })).toContain('Best before six.');
    expect(say({ parts: ['afternoon', 'evening'] })).toContain('Best from midday on.');
  });

  it('never lists parts — "the morning and the afternoon" is not a sentence', () => {
    expect(say({ parts: ['morning', 'afternoon'] })).not.toMatch(/morning and/);
  });

  it('names the cause when the cause is news', () => {
    expect(say({ parts: ['morning'], ends: 'gust' })).toContain('the wind gets up after that');
    expect(say({ parts: ['morning'], ends: 'precipitation' })).toContain('the rain comes in after that');
  });

  /*
   * "Best in the morning, and it cools off after that" shipped, on a dry 19°
   * Sunday. True — and true of every day there has ever been. The window still
   * says when; it just stops claiming to know why.
   */
  it('stays quiet about the diurnal cycle, which is not news', () => {
    for (const ends of ['temperature', 'uvIndex']) {
      const r = say({ parts: ['morning'], ends });
      expect(r).toContain('Best in the morning.');
      expect(r).not.toMatch(/cools off|sun gets strong/);
    }
  });

  it('drops the half-sentence for a cause it has no honest phrase for', () => {
    const r = say({ parts: ['morning'], ends: 'humidity' });
    expect(r).toContain('Best in the morning.');
    expect(r).not.toContain(', and');
  });

  it('says nothing at all about time when there is no window', () => {
    const r = makeVerdict({
      suggestion: { activityId: 'hiking', score: 85, vetoed: false },
      activityName: 'Go Hiking',
      weather: fine,
      band: 'prime',
      isFirst: true,
      weekday: 'Monday',
      dayIndex: 3,
    }).reason;
    expect(r).not.toMatch(/Best (in|before|from)/);
  });
});
