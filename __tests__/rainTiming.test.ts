/**
 * When the rain falls, not just how much of it there is.
 *
 * "Rain for 10 hours of it, 2.3 mm in total" is two numbers and no picture,
 * and it was the same sentence for two quite different days. Measured at
 * Rutland: 4 September puts 91% of its 12 mm before noon and is dry by
 * lunchtime; 8 September smears 4 mm across sixteen hours. One of those is a
 * day you plan an afternoon around and the other is a wash, and the forecast
 * knew which was which the whole time — the hourly precipitation series was
 * already being fetched and never read.
 */
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import type { ActivityType } from '../data/activities/types';

const JULY = new Date('2026-07-15T10:00:00Z');

function reasonFor(id: string, weather: Record<string, unknown>): string {
  const activity = (activityTypes as ActivityType[]).find((a) => a.id === id);
  if (!activity) throw new Error(`no such activity: ${id}`);
  const [day] = getSuggestionsByDay({
    forecast: [{ date: Math.floor(JULY.getTime() / 1000), weather: weather as never }],
    activities: [activity], interests: [id], now: JULY, includeAllActivities: true,
  });
  return day.suggestions.find((s) => s.activityId === id)?.reasoning ?? '';
}

const base = {
  temperature: 17, temperatureMin: 13, windspeed: 14, windspeedMax: 20, gustspeed: 26,
  winddirection: 250, visibility: 22000, soilMoisture: 35, clouds: 80,
};

describe('the rain says when', () => {
  it('names the window when the forecast knows one', () => {
    for (const [window, phrase] of [
      ['morning', /in the morning/],
      ['afternoon', /in the afternoon/],
      ['evening', /in the evening/],
      ['overnight', /overnight/],
    ] as const) {
      const r = reasonFor('hiking', { ...base, precipitation: 5, precipitationHours: 5, rainWindow: window });
      expect(r).toMatch(phrase);
    }
  });

  it('says showers rather than rain when it is light enough to be showers', () => {
    /* 2 mm across 6 hours is a third of a millimetre an hour — showers. */
    const r = reasonFor('dog_walking', { ...base, precipitation: 2, precipitationHours: 6, rainWindow: 'afternoon' });
    expect(r).toMatch(/showers in the afternoon/i);
  });

  it('does not name a window the forecast could not find', () => {
    /* `spread` is the common answer and it is not a failure: naming an
       afternoon on a day that rains all day would send somebody out in it. */
    const r = reasonFor('hiking', { ...base, precipitation: 4, precipitationHours: 16, rainWindow: 'spread' });
    expect(r).not.toMatch(/in the (morning|afternoon|evening)|overnight/);
    expect(r).toMatch(/16 hours|most of the day|on and off/i);
  });

  it('works with no window at all, as before', () => {
    /* Sources that publish no hourly series still get a sentence. */
    const r = reasonFor('hiking', { ...base, precipitation: 4, precipitationHours: 9 });
    expect(r).toMatch(/9 hours/);
  });

  it('never claims a window on a dry day', () => {
    const r = reasonFor('hiking', { ...base, precipitation: 0, precipitationHours: 0 });
    expect(r).not.toMatch(/rain|shower|drizzl/i);
  });
});
