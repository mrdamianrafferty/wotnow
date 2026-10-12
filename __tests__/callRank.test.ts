/**
 * Which good option leads.
 *
 * Five weeks of real output had photography as the answer on 17 of 32 days and
 * the surf, the kayak and the rods never once, because the call ranked on score
 * alone and photography's "good" ladder is the most forgiving in the library.
 *
 * These pin the two rules that fix it — weekends favour the bigger outing, and
 * near-ties take turns — and, as importantly, what neither is allowed to do:
 * lift an option that is not good, or contradict the score underneath.
 */

import { makeCall } from '@/lib/godaisy/call/makeCall';
import { gustCeiling, isAdventurous, isWeekend, rotateLeaders, NEAR_TIE } from '@/lib/godaisy/call/rank';
import { allSports } from '@/data/activities';
import { getSuggestionsByDay, type Suggestion, type WeatherData } from '@/utils/getSuggestionsByDay';

const NOW = new Date('2026-09-07T06:00:00Z');
const ACTIVITIES = allSports as never;
const FINE: WeatherData = {
  temperature: 18, precipitation: 0, precipitationHours: 0,
  windspeed: 11, windspeedMax: 14, gustspeed: 19,
  clouds: 30, humidity: 62, visibility: 20000,
};

/** Noon UTC on a given day. 2026-10-10 is a Saturday, 2026-10-12 a Monday. */
const at = (iso: string) => Math.floor(Date.parse(`${iso}T12:00:00Z`) / 1000);

const lead = (iso: string, scores: Record<string, number>) =>
  makeCall({
    date: at(iso),
    place: 'Gijón',
    weather: FINE,
    suggestions: Object.entries(scores).map(
      ([activityId, score]) => ({ activityId, score, evaluation: 'good' } as unknown as Suggestion),
    ),
    sports: Object.keys(scores),
    activities: ACTIVITIES,
    now: NOW,
  });

/** Consecutive calendar days from `start`. */
const days = (start: string, n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10));

describe('what counts as adventurous', () => {
  const by = (id: string) => allSports.find((a) => a.id === id);

  it('takes the outings that need a few hours', () => {
    for (const id of ['surfing', 'sea_kayaking', 'hiking', 'fly_fishing_freshwater', 'sea_fishing_shore']) {
      expect(isAdventurous(by(id))).toBe(true);
    }
  });

  it('leaves the sit-down and the everyday alone', () => {
    for (const id of ['photography', 'outdoor_gardening', 'picnicking', 'bbq', 'urban_exploring', 'cafe', 'reading']) {
      expect(isAdventurous(by(id))).toBe(false);
    }
  });
});

describe('weekends', () => {
  it('knows a Saturday and a Sunday from the rest', () => {
    expect(isWeekend(at('2026-10-10'))).toBe(true);
    expect(isWeekend(at('2026-10-11'))).toBe(true);
    expect(isWeekend(at('2026-10-12'))).toBe(false);
  });

  it('lets the surf lead a Saturday it would not lead a Monday', () => {
    // 72 + the weekend bonus clears photography's 78 by more than a near-tie.
    const scores = { surfing: 72, photography: 78 };

    for (const sat of ['2026-10-10', '2026-10-17', '2026-10-24']) {
      expect(lead(sat, scores).call?.activityId).toBe('surfing');
    }

    // On a Monday 72 is a near-tie with 78, so the two take turns — but a
    // 20-point gap is not a tie, and there the better day still wins.
    const mondays = days('2026-10-12', 28).filter((d) => !isWeekend(at(d)));
    const wide = mondays.map((d) => lead(d, { surfing: 60, photography: 80 }).call?.activityId);
    expect(new Set(wide)).toEqual(new Set(['photography']));
  });

  it('does not move the score or the band — only the order', () => {
    const sat = lead('2026-10-10', { surfing: 72, photography: 78 });
    const surf = sat.alternates.find((a) => a.activityId === 'surfing');
    const photo = sat.alternates.find((a) => a.activityId === 'photography');
    expect(surf?.score).toBe(72);
    expect(photo?.score).toBe(78);
    expect(surf?.band).toBe('worthALook');
    expect(photo?.band).toBe('prime');
  });

  it('never lifts an option that is not good', () => {
    // 50 is Marginal. Plus 12 is 62, which would be "worth a look" if the bonus
    // were allowed to change the band. It is not.
    const { call, alternates } = lead('2026-10-10', { surfing: 50, photography: 78 });
    expect(call?.activityId).toBe('photography');
    expect(alternates.map((a) => a.activityId)).toEqual(['photography']);
  });

  it('does not put a café ahead of anything outdoors', () => {
    const { call } = lead('2026-10-10', { cafe: 95, photography: 78 });
    expect(call?.activityId).toBe('photography');
  });
});

describe('near-ties take turns', () => {
  it('does not give one activity every day it is equally good', () => {
    const run = days('2026-10-12', 14)
      .filter((d) => !isWeekend(at(d)))
      .map((d) => lead(d, { photography: 80, urban_exploring: 79, picnicking: 78 }).call?.activityId);

    const counts = run.reduce<Record<string, number>>((acc, id) => {
      acc[id!] = (acc[id!] ?? 0) + 1;
      return acc;
    }, {});

    // Three equals over ten weekdays: nobody gets more than half.
    expect(Object.keys(counts).length).toBe(3);
    expect(Math.max(...Object.values(counts))).toBeLessThanOrEqual(5);
  });

  it('is the same answer however many times it is asked', () => {
    const a = lead('2026-10-14', { photography: 80, urban_exploring: 79 });
    const b = lead('2026-10-14', { photography: 80, urban_exploring: 79 });
    expect(a.call?.activityId).toBe(b.call?.activityId);
  });

  it('does not hand the day to a clearly worse option', () => {
    const wide = days('2026-10-12', 14)
      .filter((d) => !isWeekend(at(d)))
      .map((d) => lead(d, { photography: 90, picnicking: 90 - (NEAR_TIE + 4) }).call?.activityId);
    expect(new Set(wide)).toEqual(new Set(['photography']));
  });
});

describe('rotateLeaders', () => {
  const same = () => 'g';
  it('rotates only the leading run', () => {
    const items = [{ n: 'a', r: 90 }, { n: 'b', r: 88 }, { n: 'c', r: 60 }];
    const out = (seed: number) => rotateLeaders(items, (i) => i.r, same, seed).map((i) => i.n).join('');
    expect(out(0)).toBe('abc');
    expect(out(1)).toBe('bac');
    expect(out(2)).toBe('abc');
  });

  it('copes with a negative seed and with a single item', () => {
    expect(rotateLeaders([{ r: 1 }, { r: 1 }], (i) => i.r, same, -1)).toHaveLength(2);
    expect(rotateLeaders([{ r: 1 }], (i) => i.r, same, 5)).toEqual([{ r: 1 }]);
  });
});

describe('gardening in a gale', () => {
  /** The whole path: score the day with the real scorer, then make the call. */
  const gardening = (gustKmh: number) => {
    const date = at('2026-10-13');
    const weather = {
      temperature: 20, precipitation: 0, precipitationHours: 0,
      windspeed: 12, windspeedMax: 20, gustspeed: gustKmh,
      clouds: 60, humidity: 60, visibility: 20000, soilMoisture: 25,
    } as WeatherData;
    const byDay = getSuggestionsByDay({
      forecast: [{ date, weather }], activities: allSports, interests: ['outdoor_gardening'],
      now: NOW, includeAllActivities: true,
    }) as Array<{ date: number; suggestions: Suggestion[] }>;
    return makeCall({
      date, place: 'Gijón', weather, suggestions: byDay[0].suggestions,
      sports: ['outdoor_gardening'], activities: ACTIVITIES, now: NOW,
    }).call;
  };

  it('is still Prime on a still day', () => {
    expect(gardening(14)?.band).toBe('prime');
  });

  it('is not Prime when it is gusting to 44 km/h — which it was, on live', () => {
    const c = gardening(44);
    expect(c?.band).toBe('worthALook');
    // Score and band agree, rather than 88 sitting beside "Worth a look".
    expect(c?.score).toBeLessThan(78);
    // And the gust is what the sentence says, so the reader can see why.
    expect(c?.verdict.reason).toMatch(/44 km\/h/);
  });

  it('is still a yes at a gust the activity itself has not vetoed', () => {
    expect(gardening(40)?.band).toBe('worthALook');
  });

  it('is a no once the activity\'s own limit is passed', () => {
    expect(['marginal', 'notToday', 'unsafe']).toContain(gardening(60)?.band);
  });
});

describe('gustCeiling', () => {
  const by = (id: string) => allSports.find((a) => a.id === id);

  it('leaves water sports to their own safety handling', () => {
    expect(gustCeiling(by('surfing'), 70)).toBeUndefined();
    expect(gustCeiling(by('sea_kayaking'), 70)).toBeUndefined();
  });

  it('never caps an indoor activity, or a missing gust', () => {
    expect(gustCeiling(by('cafe'), 90)).toBeUndefined();
    expect(gustCeiling(by('outdoor_gardening'), undefined)).toBeUndefined();
  });
});
