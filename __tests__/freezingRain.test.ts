/**
 * Freezing rain is not cold rain, and nothing here could tell the difference.
 *
 * It glazes every surface within minutes and it is what the Met Office issues
 * ice warnings for. The nasty part is that it does not need a cold day: the
 * classic setup is rain falling through a warm layer onto sub-zero ground, so
 * the AIR is above freezing and every cold veto in this library misses it.
 * Measured at 2 °C with 1 mm of rain, before this:
 *
 *     dog_walking 49    urban_exploring 44    golf 45
 *
 * "Workable", in the weather people break wrists in — and dog walking is the
 * most-used model in the library.
 *
 * Nothing else could see it. `precipitation` says a millimetre fell and
 * `temperature` says it was two degrees; neither of those is the fact that it
 * froze on contact. Only the WMO code knows, and the adapter was already
 * fetching it — the same shape as the thunder work in #176.
 *
 * ─── Where this deliberately differs from thunder ────────────────────────
 *
 * Thunder is counted over the DAYTIME, because it is dangerous while it is
 * happening and harmless twenty minutes after it stops. ICE IS NOT LIKE THAT:
 * rain that froze at six in the morning is still on the pavement at ten, and
 * the classic event is exactly that. So freezing rain is counted from midnight
 * to the end of the daytime window.
 *
 * Rime fog (WMO 48) is NOT included. It deposits ice too, by a different
 * mechanism and far more slowly, and its fog half is already visible as
 * `visibility`. One name over two weathers would make the sentence lie.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { aggregateDayparts } from '../lib/weather/dayparts';
import { bandFor } from '../lib/godaisy/call/bands';
import { phraseFor } from '../utils/activityReasons';

function suggestion(activityId: string, over: Record<string, unknown>) {
  const now = new Date('2026-01-14T11:00:00');
  const weather = { temperature: 2, precipitation: 1, precipitationHours: 3, clouds: 90,
    windspeed: 12, gustspeed: 18, humidity: 92, visibility: 8000, soilMoisture: 40, ...over };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number; reasoning?: string;
                                    vetoed?: boolean; binding?: { key?: string } }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!;
}

describe('rain that freezes where it lands is not a workable day', () => {
  it.each([
    ['dog_walking', 49], ['urban_exploring', 44], ['golf', 45],
  ])('%s no longer reads %i on an icy 2°C afternoon', (id, before) => {
    // The measured scores, above freezing, with every cold veto missing it.
    expect(suggestion(id as string, {}).score).toBe(before);
    const icy = suggestion(id as string, { freezingRainHours: 3 });
    expect(icy.score).toBeLessThan(20);
    expect(icy.vetoed).toBe(true);
  });

  it.each(['dog_walking', 'urban_exploring', 'golf', 'hiking', 'road_cycling'])(
    '%s reads as unsafe and names the ice', (id) => {
      const icy = suggestion(id, { freezingRainHours: 3 });
      expect(bandFor(icy.score, icy.vetoed, icy.binding?.key)).toBe('unsafe');
      expect(icy.reasoning).toMatch(/freezing rain/i);
    });

  it('puts lightning ahead of ice when both fire', () => {
    const both = suggestion('dog_walking', { freezingRainHours: 2, thunderstormHours: 2 });
    expect(both.reasoning).toMatch(/thunderstorm/i);
    expect(both.binding?.key).toBe('thunderstormHours');
  });
});

describe('what it must not do', () => {
  it('leaves the day alone when the source publishes no codes', () => {
    expect(suggestion('dog_walking', {}).score)
      .toBe(suggestion('dog_walking', { freezingRainHours: undefined }).score);
  });

  it('does not veto on a forecast of zero icy hours', () => {
    expect(suggestion('dog_walking', { freezingRainHours: 0 }).score)
      .toBe(suggestion('dog_walking', {}).score);
  });

  it('does not reach an indoor activity', () => {
    expect(suggestion('cafe', { freezingRainHours: 4 }).score)
      .toBe(suggestion('cafe', {}).score);
  });
});

describe('the hours are counted off the WMO codes', () => {
  const hourly = (codes: number[]) => ({
    time: codes.map((_, i) => `2026-01-14T${String(i).padStart(2, '0')}:00`),
    weather_code: codes,
    temperature_2m: codes.map(() => 2),
  });

  it('counts 56, 57, 66 and 67 and nothing between them', () => {
    const codes = new Array(24).fill(3);
    codes[10] = 56; codes[11] = 66;
    codes[12] = 57; codes[13] = 67;
    codes[14] = 61;   // ordinary rain — sits between the two pairs
    codes[15] = 63;
    const day = aggregateDayparts(hourly(codes))['2026-01-14'];
    expect(day.morning?.freezingRainHours).toBe(2);
    expect(day.afternoon?.freezingRainHours).toBe(2);   // 12:00 and 13:00 only
  });

  it('does not count rime fog, which is a different weather', () => {
    const codes = new Array(24).fill(3);
    codes[10] = 48;
    const day = aggregateDayparts(hourly(codes))['2026-01-14'];
    expect(day.morning?.freezingRainHours).toBe(0);
  });

  it('reports undefined when the series carries no codes at all', () => {
    const parts = aggregateDayparts({ time: ['2026-01-14T13:00'], temperature_2m: [2] });
    expect(parts['2026-01-14'].afternoon?.freezingRainHours).toBeUndefined();
  });
});

describe('"Not a day for for a walk"', () => {
  it('does not double the preposition on the one name shaped that way', () => {
    /*
     * `phraseFor` stripped the verb from "Go for a Walk" and left "for a walk",
     * and every sentence template supplies its own "for". Live on every veto
     * and demotion of the most ordinary activity in the library; surfaced only
     * because freezing rain gave it a new sentence to be wrong in.
     */
    expect(phraseFor('urban_exploring', 'Go for a Walk')).toBe('a walk');
    expect(suggestion('urban_exploring', { freezingRainHours: 3 }).reasoning)
      .not.toMatch(/for for/);
  });

  it('leaves the other name shapes alone', () => {
    expect(phraseFor('golf', 'Play Golf')).toBe('golf');
    expect(phraseFor('outdoor_gardening', 'Do Some Gardening')).toBe('gardening');
    expect(phraseFor('birdwatching_passage', 'Watch for Storm-Driven Birds')).toBe('storm birding');
    expect(phraseFor('cafe', 'Visit a Café')).toBe('a café');
  });
});
