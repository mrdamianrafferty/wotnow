/**
 * Thunder ends an outdoor activity — the one number every governing body agrees
 * on, and the one thing this library did not score at all.
 *
 * The ECB's guidance is "30 minutes after the last thunder it should be safe to
 * go out". Golf suspends immediately under Rule 5.7b, one prolonged note. The
 * RFU, England Hockey and the FA all give the match official the same power.
 * It is the 30-30 rule and it is universal — and auditing the team sports and
 * golf for call-off thresholds turned up that nothing here read it.
 *
 * A thunderstorm reached a reader only through whatever rain came with it, so a
 * warm, still, DRY afternoon with an electrical storm in it read 94 — "about as
 * good as it gets for cricket". Measured, and the reason this exists.
 *
 * ─── Three decisions worth not undoing ───────────────────────────────────
 *
 * COUNTED, NOT MEANED. WMO weather codes are a nominal scale: the average of 95
 * and 0 is 47.5, which is not a weather. The aggregates carry a COUNT of hours
 * with thunder in them.
 *
 * ABSENT IS NOT ZERO. A source with no hourly codes yields `undefined`, and the
 * scorer leaves such a day alone. "We do not know" and "there is no thunder"
 * are different statements and only one of them may keep somebody outdoors.
 *
 * DAYTIME ONLY. The daily figure counts 09:00-18:00, as every other daily
 * aggregate in the adapter does. A storm that crosses at three in the morning
 * is not a reason to keep anyone in. The dayparts carry their own count for
 * finer questions than a day.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { aggregateDayparts } from '../lib/weather/dayparts';
import { bandFor } from '../lib/godaisy/call/bands';

function suggestion(activityId: string, over: Record<string, unknown>) {
  const now = new Date('2026-07-11T13:00:00');
  const weather = { temperature: 24, precipitation: 0, precipitationHours: 0, clouds: 35,
    windspeed: 9, gustspeed: 14, humidity: 65, visibility: 25000, soilMoisture: 30, ...over };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number; reasoning?: string;
                                    vetoed?: boolean; binding?: { key?: string } }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!;
}

const OUTDOOR = ['cricket', 'golf', 'sailing_inland', 'wild_swimming', 'picnicking',
                 'hiking', 'football_soccer', 'road_cycling'];

describe('a dry, warm, still afternoon with thunder in it is not a good day', () => {
  it.each(OUTDOOR)('%s is vetoed by thunder', (id) => {
    const clear = suggestion(id, {});
    const storm = suggestion(id, { thunderstormHours: 2 });
    // Every one of these read 81-94 before, on identical weather.
    expect(clear.score).toBeGreaterThan(60);
    expect(storm.score).toBeLessThan(20);
    expect(storm.vetoed).toBe(true);
  });

  it.each(OUTDOOR)('%s reads as unsafe, not merely as a no', (id) => {
    const storm = suggestion(id, { thunderstormHours: 2 });
    expect(bandFor(storm.score, storm.vetoed, storm.binding?.key)).toBe('unsafe');
  });

  it('says lightning is the reason, ahead of anything else that fired', () => {
    const storm = suggestion('cricket', { thunderstormHours: 2, windspeed: 40, gustspeed: 60 });
    // A gale fired too; the sentence a reader needs is still the lightning.
    expect(storm.reasoning).toMatch(/thunderstorm/i);
    expect(storm.binding?.key).toBe('thunderstormHours');
  });

  it('names a single stormy hour without inventing a plural', () => {
    expect(suggestion('golf', { thunderstormHours: 1 }).reasoning).toMatch(/Thunderstorms forecast\./);
    expect(suggestion('golf', { thunderstormHours: 3 }).reasoning).toMatch(/3 hours of them/);
  });
});

describe('what it must not do', () => {
  it('leaves a day alone when the source publishes no codes', () => {
    // Absent is unknown. Reading it as "no thunder" would be a false all-clear.
    expect(suggestion('cricket', {}).score)
      .toBe(suggestion('cricket', { thunderstormHours: undefined }).score);
  });

  it('does not veto on a forecast of zero thunder hours', () => {
    expect(suggestion('cricket', { thunderstormHours: 0 }).score).toBeGreaterThan(60);
  });

  it.each(['cafe', 'reading'])('does not reach %s, which is indoors', (id) => {
    expect(suggestion(id, { thunderstormHours: 3 }).score)
      .toBe(suggestion(id, {}).score);
  });
});

describe('the hours are counted off the WMO codes', () => {
  const hourly = (codes: number[]) => ({
    time: codes.map((_, i) => `2026-07-11T${String(i).padStart(2, '0')}:00`),
    weather_code: codes,
    temperature_2m: codes.map(() => 20),
  });

  it('counts 95, 96 and 99 and nothing below them', () => {
    const codes = new Array(24).fill(3);
    codes[10] = 95; codes[11] = 96; codes[12] = 99;
    codes[13] = 82;   // violent rain showers — heavy, but not thunder
    const parts = aggregateDayparts(hourly(codes));
    const day = parts['2026-07-11'];
    expect(day.morning?.thunderHours).toBe(2);      // 10:00 and 11:00
    expect(day.afternoon?.thunderHours).toBe(1);    // 12:00; 13:00 is code 82
  });

  it('reports zero rather than undefined when codes exist and none is thunder', () => {
    const parts = aggregateDayparts(hourly(new Array(24).fill(1)));
    expect(parts['2026-07-11'].afternoon?.thunderHours).toBe(0);
  });

  it('reports undefined when the series carries no codes at all', () => {
    const parts = aggregateDayparts({
      time: ['2026-07-11T13:00'], temperature_2m: [20],
    });
    expect(parts['2026-07-11'].afternoon?.thunderHours).toBeUndefined();
  });
});
