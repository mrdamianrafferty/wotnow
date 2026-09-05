/**
 * You cannot stargaze in the morning.
 *
 * `dayparts.ts` always said the things that happen after dark "read the evening
 * part", but nothing enforced it: `scoreParts` scored morning, afternoon and
 * evening alike for everything, so stargazing was judged on how clear the sky
 * was at ten in the morning. On a September Saturday in Sheffield the call read
 *
 *     a stargazing day. Dry, 18°. Best in the morning.
 *
 * — advice about when to go and look at the stars, for an hour when there are
 * none. The bars under it in the evidence drawer said the same thing three
 * times over.
 *
 * The second half of this is the guard in `promote`, which used to be
 * `bars.length < 2`. Scoring a night activity in the evening alone leaves it
 * with one bar by design, so that guard would have quietly turned promotion off
 * for exactly the case stargazing exists for: a day that clouded over and an
 * evening that cleared.
 */

import { makeCall } from '@/lib/godaisy/call/makeCall';
import { partBands, bestWindow } from '@/lib/godaisy/call/window';
import { allSports } from '@/data/activities';
import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';

const NOW = new Date('2026-09-07T06:00:00Z');
const DATE = Math.floor(Date.parse('2026-09-07T12:00:00Z') / 1000);
const ACTIVITIES = allSports as never;

/** Clear and still — a good sky. */
const CLEAR: WeatherData = {
  temperature: 14, precipitation: 0, precipitationHours: 0,
  windspeed: 8, windspeedMax: 11, gustspeed: 15,
  clouds: 5, humidity: 60, visibility: 30000,
};
/** Overcast. Nothing to see. */
const MURK: WeatherData = {
  temperature: 13, precipitation: 2, precipitationHours: 3,
  windspeed: 14, windspeedMax: 18, gustspeed: 24,
  clouds: 98, humidity: 92, visibility: 8000,
};

const call = (day: WeatherData, parts: Record<string, WeatherData>) =>
  makeCall({
    date: DATE,
    place: 'Testville',
    weather: day,
    suggestions: [{ activityId: 'stargazing', score: 30, evaluation: 'poor' } as unknown as Suggestion],
    sports: ['stargazing'],
    seeded: ['stargazing'],
    names: { stargazing: 'Go Stargazing' },
    weekday: 'Monday',
    parts,
    activities: ACTIVITIES,
    now: NOW,
  });

describe('a night activity', () => {
  it('is scored in the evening only', () => {
    const bars = partBands('stargazing', { morning: CLEAR, afternoon: CLEAR, evening: MURK }, DATE, ACTIVITIES, NOW);

    expect(bars.map((b) => b.name)).toEqual(['evening']);
  });

  it('still scores an ordinary activity across the whole day', () => {
    const bars = partBands('urban_exploring', { morning: CLEAR, afternoon: CLEAR, evening: MURK }, DATE, ACTIVITIES, NOW);

    expect(bars.map((b) => b.name)).toEqual(['morning', 'afternoon', 'evening']);
  });

  it('never says "best in the morning"', () => {
    const c = call(CLEAR, { morning: CLEAR, afternoon: CLEAR, evening: CLEAR });

    expect(c.call?.verdict.reason ?? '').not.toMatch(/morning|afternoon/i);
  });

  /*
   * "Best in the evening" for stargazing is a tautology, not advice, and
   * `bestWindow` already declines to name a window when every part it scored is
   * good. Scoring one part means that is the ordinary case.
   */
  it('names no window at all when the evening holds', () => {
    const w = bestWindow('stargazing', { morning: MURK, afternoon: MURK, evening: CLEAR }, DATE, ACTIVITIES, NOW);

    expect(w).toBeUndefined();
  });

  it('is still promoted by a clear evening after a clouded-over day', () => {
    const c = call(MURK, { morning: MURK, afternoon: MURK, evening: CLEAR });

    expect(c.isNoDay).toBe(false);
    expect(c.call?.band).not.toBe('notToday');
  });

  it('is not promoted by a clear morning', () => {
    const c = call(MURK, { morning: CLEAR, afternoon: MURK, evening: MURK });

    expect(c.isNoDay).toBe(true);
  });
});
