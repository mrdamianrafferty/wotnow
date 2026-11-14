/**
 * A score, its band and its label never contradict each other — and the web
 * and the app call the same day the same way.
 *
 * Archery at Llys-y-frân on 14 November 2026 came out of activity-conditions
 * as 73 and "poor": the part-of-day promotion had moved the score and left
 * the day-level evaluation behind, with the reasoning blanked. A consumer had
 * to show the day as unscored. These pin the invariants across every activity
 * model and a spread of weather, rather than the one case that was noticed.
 */
import { getActivityScoreForLocation, type LocationForecast } from '@/lib/seo/getActivityScore';
import { dayCall } from '@/lib/godaisy/call/dayCall';
import { makeCall } from '@/lib/godaisy/call/makeCall';
import { bandFor } from '@/lib/godaisy/call/bands';
import { activityTypes } from '@/data/activityTypes';
import { evaluationForScore, getSuggestionsByDay } from '@/utils/getSuggestionsByDay';
import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';
import type { SeoLocation } from '@/data/seoLocations';

const NOW = new Date('2026-09-07T06:00:00Z');
const day0 = Math.floor(Date.parse('2026-09-07T12:00:00Z') / 1000);

const FINE: WeatherData = {
  temperature: 17, precipitation: 0, precipitationHours: 0,
  windspeed: 11, windspeedMax: 14, gustspeed: 19,
  clouds: 30, humidity: 62, visibility: 20000,
};
const FOUL: WeatherData = {
  temperature: 12, precipitation: 7, precipitationHours: 6,
  windspeed: 33, windspeedMax: 38, gustspeed: 41,
  clouds: 96, humidity: 94, visibility: 6000,
};
const WILD: WeatherData = { ...FOUL, windspeed: 62, windspeedMax: 70, gustspeed: 88 };
const GUSTY: WeatherData = { ...FINE, windspeed: 25, windspeedMax: 32, gustspeed: 48 };
const SHOWERY: WeatherData = { ...FINE, precipitation: 4.2, precipitationHours: 3, clouds: 70 };

/** Seven days that between them hit promotion, demotion, veto and the gust cap. */
const WEEK: LocationForecast = [
  { weather: { ...FOUL, precipitation: 6.9 }, parts: { morning: FINE, afternoon: FINE, evening: FOUL } },
  { weather: FINE, parts: { morning: FINE, afternoon: FINE, evening: FINE } },
  { weather: WILD, parts: { morning: WILD, afternoon: FINE, evening: WILD } },
  { weather: GUSTY, parts: { morning: FINE, afternoon: GUSTY, evening: GUSTY } },
  { weather: SHOWERY, parts: { morning: SHOWERY, afternoon: FINE, evening: FINE } },
  { weather: FOUL, parts: { morning: FOUL, afternoon: FOUL, evening: FINE } },
  { weather: { ...FINE, precipitation: 3.5, precipitationHours: 9 } },
].map((d, i) => ({ ...d, date: day0 + i * 86_400 }));

const PLACE: SeoLocation = {
  slug: 'testville', name: 'Testville', region: '', country: '',
  lat: 51.89, lon: -4.87, timezone: 'Europe/London', activities: [], beachFacingDeg: null,
} as SeoLocation;

describe('score, band and evaluation agree', () => {
  beforeAll(() => { jest.useFakeTimers().setSystemTime(NOW); });
  afterAll(() => { jest.useRealTimers(); });

  it.each(activityTypes.map((a) => a.id))('%s, every day of a mixed week', async (id) => {
    const p = await getActivityScoreForLocation(id, PLACE, undefined, WEEK);
    expect(p).not.toBeNull();
    for (const d of p!.weeklyOutlook) {
      expect(d.evaluation).toBe(evaluationForScore(d.score));
      if (d.band !== 'unsafe') expect(bandFor(d.score)).toBe(d.band);
    }
    expect(p!.todayBand).toBe(p!.weeklyOutlook[0].band);
  });

  it('a lifted day is not "poor", and says when to go', async () => {
    const p = await getActivityScoreForLocation('hiking', PLACE, undefined, WEEK);
    const today = p!.weeklyOutlook[0];
    expect(today.score).toBeGreaterThanOrEqual(60);
    expect(today.evaluation).not.toBe('poor');
    expect(['prime', 'worthALook']).toContain(today.band);
    expect(today.reasoning).toMatch(/Best (in the|before|from)/);
  });

  it('every good day the web shows has something to say', async () => {
    for (const a of activityTypes) {
      const p = await getActivityScoreForLocation(a.id, PLACE, undefined, WEEK);
      for (const d of p!.weeklyOutlook) {
        if (d.band === 'prime' || d.band === 'worthALook') expect(d.reasoning).not.toBe('');
      }
    }
  });
});

describe('the app and the web call the same day the same way', () => {
  it.each(WEEK.map((d, i) => [i, d] as const))('day %i', (_i, d) => {
    const suggestions = getSuggestionsByDay({
      forecast: [{ date: d.date, weather: d.weather }],
      activities: activityTypes,
      interests: activityTypes.map((a) => a.id),
      now: NOW,
      includeAllActivities: true,
    })[0].suggestions;
    const ids = suggestions.map((s) => s.activityId);
    const c = makeCall({
      date: d.date, place: 'Testville', weather: d.weather, suggestions,
      sports: ids, seeded: [], parts: d.parts, activities: activityTypes, now: NOW,
    });
    const options = [c.call, ...(c.alternates ?? [])].filter(Boolean) as Array<{ activityId: string; score: number; band: string }>;
    for (const o of options) {
      const s = suggestions.find((x) => x.activityId === o.activityId) as Suggestion;
      const web = dayCall({ suggestion: s, weather: d.weather, parts: d.parts, date: d.date, activities: activityTypes, now: NOW });
      expect({ id: o.activityId, score: o.score, band: o.band })
        .toEqual({ id: o.activityId, score: web.score, band: web.band });
    }
  });
});

describe('dayCall rules', () => {
  const s = (activityId: string, score: number, extra: Partial<Suggestion> = {}) =>
    ({ activityId, score, ...extra } as Suggestion);

  it('pulls a severe marginal day under the Marginal floor with its band', () => {
    const r = dayCall({ suggestion: s('hiking', 45), weather: FOUL, date: day0, activities: activityTypes, now: NOW });
    expect(r.band).toBe('notToday');
    expect(bandFor(r.score)).toBe('notToday');
  });

  it('caps a day gusting near the activity limit below Prime', () => {
    const cycling = activityTypes.find((a) => a.id === 'cycling');
    const gustLimit = cycling?.poorConditions?.map((c) => /^gust\s*>\s*([\d.]+)$/.exec(c.trim()))
      .find(Boolean);
    if (!gustLimit) return; // model carries no gust limit — nothing to cap
    const gust = Number(gustLimit[1]) * 3.6 * 0.8;
    const r = dayCall({ suggestion: s('cycling', 90), weather: { ...FINE, gustspeed: gust }, date: day0, activities: activityTypes, now: NOW });
    expect(r.gusty).toBe(true);
    expect(r.band).toBe('worthALook');
    expect(bandFor(r.score)).toBe(r.band);
  });

  it('keeps Unsafe as the band, which no score can say', () => {
    const r = dayCall({
      suggestion: s('kayaking', 6, { vetoed: true, binding: { key: 'gust', score: 0 } as Suggestion['binding'] }),
      weather: WILD, date: day0, activities: activityTypes, now: NOW,
    });
    expect(r.band).toBe('unsafe');
    expect(evaluationForScore(r.score)).toBe('poor');
  });
});
