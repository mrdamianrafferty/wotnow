/**
 * An indoor activity is never the best thing about a fine day.
 *
 * Reported as "a lot of cafe days even though the weather is pleasant", and
 * reproduced: on an 18°C dry evening under half cloud, `cafe` scored 89 —
 * Prime — and outranked picnicking at 83. Two faults, both pinned below.
 *
 *   THE DISCOUNT WAS A CLIFF. It required rain, cloud, temperature and wind to
 *   be simultaneously ideal (`precip === 0 && clouds < 30 && temp 15-25 &&
 *   wind < 20`). Miss any one and indoor kept its full base. The same 18°C dry
 *   day scored cafe 76 at 10% cloud and 89 at 45% — thirteen points at a hard
 *   edge, with the ordinary British afternoon on the wrong side of it.
 *
 *   THE EVENING BONUS REACHED PRIME. `cafe` is tagged 'evening', so after six
 *   its assigned 65 was multiplied to 89. An activity that defines no
 *   conditions at all — `cafe` has no perfect, good, fair or poor — cannot
 *   have a prime day, because there is nothing to be prime about.
 *
 * The first attempt at the second fix was worse than the bug: clamping the
 * multiplied score put every evening on the ceiling, so cafe read 77 whether
 * it was clear or pouring. The bonus scales into the remaining headroom now,
 * which is what `evening keeps the weather ordering` guards.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { bandFor, BAND_FLOOR } from '../lib/godaisy/call/bands';

const INTERESTS = ['urban_exploring', 'picnicking', 'stargazing', 'cafe', 'reading'];

/** Score every interest for one day at one hour. */
function scores(weather: Record<string, unknown>, hour: number): Map<string, number> {
  const now = new Date();
  now.setHours(hour, 0, 0, 0);
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never,
    interests: INTERESTS,
    now,
    includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return new Map(byDay[0].suggestions.map((s) => [s.activityId, s.score]));
}

const cafeOn = (weather: Record<string, unknown>, hour: number) => scores(weather, hour).get('cafe')!;

const GORGEOUS = { temperature: 18, precipitation: 0, clouds: 10, windspeed: 8 };
const PLEASANT = { temperature: 18, precipitation: 0, clouds: 45, windspeed: 8 };
const WARM = { temperature: 27, precipitation: 0, clouds: 10, windspeed: 8 };
const BREEZY = { temperature: 18, precipitation: 0, clouds: 10, windspeed: 22 };
const GREY = { temperature: 12, precipitation: 0, clouds: 90, windspeed: 15 };
const WET = { temperature: 14, precipitation: 4, clouds: 95, windspeed: 25 };

const MORNING = 9;
const EVENING = 19;

describe('an activity with no weather criteria cannot be Prime', () => {
  it.each([
    ['gorgeous', GORGEOUS], ['pleasant', PLEASANT], ['warm', WARM],
    ['breezy', BREEZY], ['grey', GREY], ['wet', WET],
  ])('stays below the Prime floor on a %s day, morning and evening', (_label, weather) => {
    for (const hour of [MORNING, EVENING]) {
      // 89 was the measured value that started this. The floor is 78.
      expect(cafeOn(weather, hour)).toBeLessThan(BAND_FLOOR.prime);
      expect(bandFor(cafeOn(weather, hour))).not.toBe('prime');
    }
  });
});

describe('the nice-day discount is a gradient, not a cliff', () => {
  it('marks a pleasant day down nearly as far as a gorgeous one', () => {
    // Before: 76 vs 89 — thirteen points for 35% more cloud.
    const gap = cafeOn(PLEASANT, EVENING) - cafeOn(GORGEOUS, EVENING);
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(4);
  });

  it.each([['warm', WARM], ['breezy', BREEZY]])(
    'does not lose the whole discount because one term crossed a threshold (%s)',
    (_label, weather) => {
      // 26°C or a 21 km/h breeze used to void the discount entirely.
      expect(cafeOn(weather, EVENING) - cafeOn(GORGEOUS, EVENING)).toBeLessThanOrEqual(5);
    },
  );

  it('still prefers indoors as the day gets worse', () => {
    const ordered = [GORGEOUS, PLEASANT, GREY, WET].map((w) => cafeOn(w, EVENING));
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    // And the span is worth having: a wet day is meaningfully more indoor.
    expect(ordered[3] - ordered[0]).toBeGreaterThanOrEqual(8);
  });
});

describe('evening keeps the weather ordering', () => {
  it('does not flatten every evening onto the ceiling', () => {
    // The failed first fix: clamping a multiplied score gave 77 for both.
    expect(cafeOn(WET, EVENING)).toBeGreaterThan(cafeOn(GORGEOUS, EVENING));
  });

  it('still lifts the evening above the morning', () => {
    // The bonus is worth keeping — a cafe IS a better idea at seven than nine.
    for (const w of [GORGEOUS, PLEASANT, WET]) {
      expect(cafeOn(w, EVENING)).toBeGreaterThanOrEqual(cafeOn(w, MORNING));
    }
  });
});

describe('an indoor activity does not ring the phone', () => {
  /*
   * The scoring fix alone did not close this. Moving cafe from 89 to 65 took
   * it out of Prime and left it in "worth a look" — which is exactly what
   * `daily-call.ts` sends on. A user whose only sport is a cafe cleared that
   * gate at seven every evening, in any weather, and got "Today is a day for a
   * café" pushed to them forever.
   *
   * `daily-call.ts` now also requires the called activity to be
   * weather-sensitive. This asserts the condition that gate reads, rather than
   * importing a cron handler that wants Supabase and APNs to exist.
   */
  const isGoodBand = (n: number) => n >= BAND_FLOOR.worthALook;

  it('would otherwise clear the send bar on any evening', () => {
    // The thing the extra gate exists for: score alone does not save us.
    expect(isGoodBand(cafeOn(PLEASANT, EVENING))).toBe(true);
    expect(isGoodBand(cafeOn(GREY, EVENING))).toBe(true);
  });

  it('is marked weather-insensitive, which is what the gate reads', () => {
    const cafe = (allSports as Array<{ id: string; weatherSensitive?: boolean }>)
      .find((a) => a.id === 'cafe');
    expect(cafe?.weatherSensitive).toBe(false);
  });
});

describe('outdoor still wins a day that is good for going out', () => {
  it.each([['gorgeous', GORGEOUS], ['pleasant', PLEASANT], ['breezy', BREEZY]])(
    'ranks a real outdoor activity above cafe on a %s evening',
    (_label, weather) => {
      const s = scores(weather, EVENING);
      // The reported symptom: cafe at 89 sat above picnicking at 83.
      expect(s.get('urban_exploring')!).toBeGreaterThan(s.get('cafe')!);
    },
  );

  it('lets indoor rise when the day is actually a write-off', () => {
    const s = scores(WET, EVENING);
    expect(s.get('cafe')!).toBeGreaterThan(s.get('picnicking')!);
  });
});
