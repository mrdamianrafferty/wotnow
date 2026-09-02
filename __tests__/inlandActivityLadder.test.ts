/**
 * The reservoir ladder, pinned.
 *
 * Every case here is a defect that was live in production and measured before
 * it was fixed, so each test is a regression guard rather than a restatement of
 * the implementation. Where a number appears it is a Beaufort boundary, because
 * that is what the thresholds are set against and what the operator's own limit
 * is expressed in.
 */
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { scoreConditions, evaluateConditionScore } from '../utils/activitySuitability';
import { activityTypes } from '../data/activityTypes';
import type { ActivityType } from '../data/activities/types';

const JULY = new Date('2026-07-15T10:00:00Z');
const JANUARY = new Date('2026-01-14T10:00:00Z');

/** Mid-band wind for each Beaufort force, in km/h. */
const FORCE_KPH = [0.4, 3, 9, 16, 24, 34, 44, 56, 68];

function scoreOf(id: string, weather: Record<string, number>, now = JULY) {
  const activity = activityTypes.find((a) => a.id === id);
  if (!activity) throw new Error(`no such activity: ${id}`);
  const [day] = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather }],
    activities: [activity],
    interests: [id],
    now,
    includeAllActivities: true,
  });
  const s = day.suggestions.find((x) => x.activityId === id);
  if (!s) throw new Error(`no suggestion for ${id}`);
  return s;
}

const fair = (kph: number, extra: Record<string, number> = {}) =>
  ({ temperature: 17, temperatureMin: 12, windspeed: kph, precipitation: 0, precipitationHours: 0, clouds: 40, humidity: 65, ...extra });

describe('inland sailing and windsurfing: Force 5 experts, Force 6 stop', () => {
  for (const id of ['sailing_inland', 'windsurfing_inland']) {
    test(`${id}: Force 4 is the day to go`, () => {
      expect(scoreOf(id, fair(FORCE_KPH[4])).score).toBeGreaterThanOrEqual(80);
    });

    test(`${id}: Force 5 is workable but not recommended — experienced hands`, () => {
      const s = scoreOf(id, fair(FORCE_KPH[5]));
      expect(s.score).toBeGreaterThanOrEqual(40);
      expect(s.score).toBeLessThan(60);
    });

    test(`${id}: Force 6 is a hard stop, not "challenging"`, () => {
      // Was measured at 62 and "Good weather" on a water whose keeper takes the
      // boats off at Force 6.
      expect(scoreOf(id, fair(FORCE_KPH[6])).score).toBeLessThan(20);
    });

    test(`${id}: Force 7 and Force 8 stay stopped`, () => {
      expect(scoreOf(id, fair(FORCE_KPH[7])).score).toBeLessThan(20);
      expect(scoreOf(id, fair(FORCE_KPH[8])).score).toBeLessThan(20);
    });
  }

  test('sailing: a flat calm is nothing, but Force 2 is a lesson', () => {
    const calm = scoreOf('sailing_inland', fair(FORCE_KPH[0]));
    const light = scoreOf('sailing_inland', fair(FORCE_KPH[2]));
    expect(calm.score).toBeLessThan(40);
    expect(calm.reasoning).toMatch(/flat calm/i);
    expect(light.score).toBeGreaterThanOrEqual(60);
  });

  test('a calm is never described as unsafe', () => {
    // "Not safe for sailing today" on a windless morning is both false and the
    // kind of false that teaches a reader to ignore the real warnings.
    expect(scoreOf('sailing_inland', fair(FORCE_KPH[0])).reasoning).not.toMatch(/not safe/i);
  });
});

describe('gusts are read, and they end the day on their own', () => {
  test('a Force 4 mean with Force 7 gusts is not a sailing day', () => {
    // Rutland, 2026-09-04: mean 25.9 km/h, gusts 60.5 km/h. Before gusts were
    // supplied at all, this scored 82 and read "Good weather".
    const withGust = scoreOf('sailing_inland', fair(25.9, { gustspeed: 60.5 }));
    expect(withGust.score).toBeLessThan(20);
    expect(withGust.reasoning).toMatch(/gust/i);
  });

  test('an absent gust is not invented from the mean', () => {
    const noGust = scoreOf('sailing_inland', fair(25.9));
    expect(noGust.score).toBeGreaterThanOrEqual(60);
  });
});

describe('open-water swimming cannot be sold on a cold day', () => {
  test('a 3 °C January morning is not "Peak"', () => {
    // Measured before the fix: 95 and "Perfect conditions for Go Wild
    // Swimming!" — the model's whole thermal ladder was written in keys the
    // inland pipeline never supplied.
    const s = scoreOf('wild_swimming', fair(8, { temperature: 3, temperatureMin: 0 }), JANUARY);
    expect(s.score).toBeLessThan(40);
  });

  test('cannot reach the top band without a water temperature', () => {
    const s = scoreOf('wild_swimming', fair(4, { temperature: 20 }));
    expect(s.score).toBeLessThan(80);
  });
});

describe('scoring integrity', () => {
  test('identical input scores identically', () => {
    const runs = Array.from({ length: 6 }, () => scoreOf('kayaking', fair(16)).score);
    expect(new Set(runs).size).toBe(1);
  });

  test('a vetoed day always sorts below an un-vetoed one', () => {
    // The veto used to floor at 20–30 while the ordinary path reached 10, so a
    // Force 9 outscored a Force 7.
    const stopped = scoreOf('sailing_inland', fair(FORCE_KPH[8])).score;
    const merelyBad = scoreOf('sailing_inland', fair(FORCE_KPH[1])).score;
    expect(stopped).toBeLessThan(merelyBad);
  });

  test('out of season is applied, not merely logged', () => {
    const summer = scoreOf('camping', fair(10), JULY).score;
    const winter = scoreOf('camping', fair(10, { temperature: 17, temperatureMin: 12 }), JANUARY).score;
    expect(winter).toBeLessThan(summer);
  });
});

describe('condition grammar', () => {
  test('an OR shorthand matches its second range', () => {
    // `key=A..B or C..D` dropped the second branch entirely: the implied key did
    // not carry across the OR, so a value in C..D scored zero and the whole
    // expression collapsed to its first branch. Goes through `scoreConditions`
    // because compound expressions are handled there, not by the atomic scorer.
    const { criteria } = scoreConditions(
      ['windSpeed=1.5..2.5 or 8..10.8'],
      { windSpeed: 9.4 },
    );
    expect(criteria).toHaveLength(1);
    expect(criteria[0].score).toBeGreaterThan(0.9);
  });

  test('an OR shorthand still matches its first range', () => {
    const { criteria } = scoreConditions(
      ['windSpeed=1.5..2.5 or 8..10.8'],
      { windSpeed: 2 },
    );
    expect(criteria[0].score).toBeGreaterThan(0.5);
  });

  test('a zero-anchored range is a ceiling, not a target', () => {
    // `precipitation=0..2` scored a dry day at zero, as though 1 mm were ideal.
    expect(evaluateConditionScore('precipitation=0..2', { precipitation: 0 })).toBe(1);
  });

  test('inside a range always beats outside it', () => {
    const atEdge = evaluateConditionScore('temperature=16..24', { temperature: 16 });
    const wellOutside = evaluateConditionScore('temperature=16..24', { temperature: 4 });
    expect(atEdge).toBeGreaterThan(wellOutside);
    expect(atEdge).toBeGreaterThanOrEqual(0.5);
  });

  test('cloud cover is scored, having been a silently dropped typo', () => {
    // Written `cloudCover=30-60` with a hyphen the parser cannot read, against a
    // key the weather object called `clouds`. Both halves failed silently.
    const { criteria } = scoreConditions(['cloudCover=30..60'], { cloudCover: 45 });
    expect(criteria).toHaveLength(1);
    expect(criteria[0].score).toBeGreaterThan(0.9);
  });

  test('no hyphenated ranges remain in the activity library', () => {
    const hyphenated: string[] = [];
    for (const a of activityTypes as ActivityType[]) {
      for (const band of [a.perfectConditions, a.goodConditions, a.fairConditions, a.poorConditions]) {
        for (const c of band ?? []) if (/[a-zA-Z]=\d+-\d+/.test(c)) hyphenated.push(`${a.id}: ${c}`);
      }
    }
    expect(hyphenated).toEqual([]);
  });
});

describe('the sentence agrees with the verdict', () => {
  test('approaching a "too much wind" limit is not reported as too little', () => {
    // `windSpeed>8` is a poor condition that fires from ABOVE, so a day at 7.2
    // is approaching too much wind. Read off the numbers alone it looks like a
    // shortfall, and swimming tiles carried "Very little wind — Force 4".
    const r = scoreOf('wild_swimming', fair(26, { temperature: 17 })).reasoning ?? '';
    expect(r).not.toMatch(/very little wind|not enough wind/i);
  });

  test('rain is named when rain is what pulled the score down', () => {
    // The band is chosen before any rain handling runs, so its weakest criterion
    // is not the reason on a wet day — the reader was told about the breeze.
    const r = scoreOf('dog_walking', fair(15, { precipitation: 4.6, precipitationHours: 16 })).reasoning ?? '';
    expect(r.toLowerCase()).toMatch(/rain|wet/);
  });

  test('a good day is never given a limiting reason that contradicts it', () => {
    for (const kph of FORCE_KPH) {
      const s = scoreOf('kayaking', fair(kph));
      if (s.score < 60) continue;
      expect(s.reasoning ?? '').not.toMatch(/not enough|too much|no way|not safe/i);
    }
  });
});

describe('the sentence says something', () => {
  test('no raw m/s floats reach the reader', () => {
    for (const id of ['sailing_inland', 'kayaking', 'camping', 'road_cycling']) {
      for (const kph of FORCE_KPH) {
        const r = scoreOf(id, fair(kph)).reasoning ?? '';
        expect(r).not.toMatch(/\d\.\d{3}/);
        expect(r).not.toMatch(/m\/s/);
      }
    }
  });

  test('a dangerous day is never "still an option"', () => {
    const r = scoreOf('camping', fair(FORCE_KPH[8])).reasoning ?? '';
    expect(r).not.toMatch(/still an option/i);
  });

  test('the activity is named the way a person says it', () => {
    expect(scoreOf('dog_walking', fair(10)).reasoning).toContain('walking the dog');
    expect(scoreOf('sailing_inland', fair(16)).reasoning).not.toContain('Go Sailing');
  });

  test('every day gets a reason, not just a restated badge', () => {
    for (const kph of FORCE_KPH) {
      const r = scoreOf('kayaking', fair(kph)).reasoning ?? '';
      // Two sentences minimum: the verdict, then something factual after it.
      expect(r.split('. ').length).toBeGreaterThanOrEqual(2);
    }
  });
});
