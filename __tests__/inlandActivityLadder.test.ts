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

describe('a season is a closure, not a preference', () => {
  /**
   * Applying `seasonalMonths` was a fix — it had been computed and only logged.
   * It also made forty models actively wrong overnight, because most of those
   * month lists were never a statement about possibility. They said "this is
   * nicer in summer", which the temperature bands already say, and a 35-point
   * cap is the wrong instrument for it.
   *
   * Stargazing was the clearest case: listed April to October, when the dark
   * hours are longest in December. The cap was on precisely the best months.
   *
   * A season now survives only where the activity is genuinely closed —
   * snow, ice, a fixture list, a campsite's gates, a fruiting body, a passage.
   */
  const JAN = new Date('2026-01-15T10:00:00Z');
  const clearWinterDay = {
    temperature: 6, temperatureMin: 1, windspeed: 10, gustspeed: 18,
    winddirection: 200, precipitation: 0, precipitationHours: 0,
    clouds: 20, humidity: 75, visibility: 30000,
  };

  test.each(['hiking', 'stargazing', 'geocaching', 'golf', 'mountain_biking', 'trail_running'])(
    '%s is not out of season in January', (id) => {
      const s = scoreOf(id, clearWinterDay, JAN);
      expect(s.score).toBeGreaterThan(35);        // the season cap
      expect(s.reasoning).not.toMatch(/out of season/i);
    });

  test.each(['skiing', 'mushroom_hunting', 'camping', 'cricket'])(
    '%s keeps its season, because that one is real', (id) => {
      const a = activityTypes.find((x) => x.id === id)!;
      expect(a.seasonalMonths?.length).toBeGreaterThan(0);
      expect(a.seasonalMonths?.length).toBeLessThan(12);
    });

  test('stargazing in particular is no longer capped in its best month', () => {
    expect(activityTypes.find((x) => x.id === 'stargazing')!.seasonalMonths).toBeUndefined();
  });
});

describe('the sentence names the activity as a person would', () => {
  test('imperative name prefixes are stripped, not just "Go"', () => {
    // "a good day for play golf" and "not a day for do some gardening".
    const JAN = new Date('2026-01-15T10:00:00Z');
    const day = { temperature: 6, temperatureMin: 1, windspeed: 10, gustspeed: 18,
                  precipitation: 0, precipitationHours: 0, clouds: 20, humidity: 75, visibility: 30000 };
    expect(scoreOf('golf', day, JAN).reasoning).toMatch(/for golf/);
    expect(scoreOf('outdoor_gardening', day, JAN).reasoning).toMatch(/for gardening/);
  });

  test('humidity is not offered as the reason when it is nowhere near its limit', () => {
    // 75% read as 42% of the way to a 90% limit, because the `>` scorer grades
    // against the threshold's own magnitude. "Not a day for trail running.
    // Humid at 75%." on a clear January morning.
    const JAN = new Date('2026-01-15T10:00:00Z');
    const r = scoreOf('trail_running', {
      temperature: 6, temperatureMin: 1, windspeed: 10, gustspeed: 18,
      precipitation: 0, precipitationHours: 0, clouds: 20, humidity: 75, visibility: 30000,
    }, JAN).reasoning ?? '';
    expect(r).not.toMatch(/humid/i);
  });
});

describe('visibility is carried, and it decides days', () => {
  /**
   * Open-Meteo publishes visibility hourly and the adapter had been fetching it
   * since it was written — it simply never reached the daily shape, so every
   * model's visibility criteria were scored neutral and it was the one thing
   * named in every activity's `neutralCriteria`.
   *
   * It is the variable that most often decides whether a day outdoors is worth
   * it. You cannot scan three thousand acres of reservoir through murk, and it
   * stops birding, photography and stargazing long before wind does.
   */
  const OCT = new Date('2026-10-15T10:00:00Z');
  const day = (visibility: number) => ({
    temperature: 12, temperatureMin: 8, windspeed: 8, gustspeed: 14,
    winddirection: 200, precipitation: 0, precipitationHours: 0,
    clouds: 45, humidity: 80, visibility,
  });

  test('a clear day and a foggy one are no longer the same day', () => {
    const clear = scoreOf('birdwatching', day(25000), OCT).score;
    const fog = scoreOf('birdwatching', day(800), OCT).score;
    expect(clear).toBeGreaterThanOrEqual(80);
    expect(fog).toBeLessThan(40);
  });

  test('and the fog is what the sentence blames', () => {
    expect(scoreOf('birdwatching', day(800), OCT).reasoning).toMatch(/fog|visibility/i);
  });

  test('murk sits between the two rather than at one end', () => {
    const murky = scoreOf('birdwatching', day(4000), OCT).score;
    expect(murky).toBeLessThan(scoreOf('birdwatching', day(25000), OCT).score);
    expect(murky).toBeGreaterThan(scoreOf('birdwatching', day(800), OCT).score);
  });

  test('an absent visibility is still absent, not a fabricated 10 km', () => {
    // The old default was counted as a measurement and failed the strict
    // `visibility>10` in every perfect band in the library.
    const withNone = scoreOf('birdwatching', {
      temperature: 12, temperatureMin: 8, windspeed: 8, gustspeed: 14,
      winddirection: 200, precipitation: 0, precipitationHours: 0, clouds: 45, humidity: 80,
    }, OCT).score;
    expect(withNone).toBeGreaterThanOrEqual(80);
  });
});

describe('the two kinds of reservoir birding', () => {
  /**
   * A large inland reservoir has two birding modes that want opposite weather,
   * and one model could not hold both. The ordinary kind wants a still bright
   * day; storm birding wants an Atlantic gale, because that is what forces
   * seabirds inland onto Rutland and Grafham.
   *
   * This is also the demo's argument in its purest form: two rows, one
   * forecast, opposite answers — and not a contrivance, but how the people who
   * go there actually behave.
   */
  const OCT = new Date('2026-10-15T10:00:00Z');
  const gale = (dir: number) => ({
    temperature: 11, temperatureMin: 8, windspeed: 56, gustspeed: 80,
    winddirection: dir, precipitation: 8, precipitationHours: 9, clouds: 95, humidity: 88,
  });
  const still = {
    temperature: 14, temperatureMin: 9, windspeed: 6, gustspeed: 12,
    winddirection: 200, precipitation: 0, precipitationHours: 0, clouds: 35, humidity: 70,
  };

  test('an October westerly gale splits the two apart', () => {
    const ordinary = scoreOf('birdwatching', gale(245), OCT);
    const storm = scoreOf('birdwatching_passage', gale(245), OCT);
    expect(ordinary.score).toBeLessThan(40);
    expect(storm.score).toBeGreaterThanOrEqual(80);
  });

  test('a still bright day splits them the other way', () => {
    expect(scoreOf('birdwatching', still, OCT).score).toBeGreaterThanOrEqual(80);
    expect(scoreOf('birdwatching_passage', still, OCT).score).toBeLessThan(40);
  });

  test('direction is the whole thing — the same gale from the east is not the same day', () => {
    // Until wind direction was threaded through the inland pipeline the engine
    // could not tell these apart at all, and scored them identically.
    const west = scoreOf('birdwatching_passage', gale(245), OCT).score;
    const east = scoreOf('birdwatching_passage', gale(85), OCT).score;
    expect(west - east).toBeGreaterThan(25);
  });

  test('and it says so, rather than blaming the wind speed', () => {
    const r = scoreOf('birdwatching_passage', gale(85), OCT).reasoning ?? '';
    expect(r.toLowerCase()).toMatch(/compass|atlantic|land/);
  });

  test('storm birding is out of season in midwinter, gale or not', () => {
    const JAN = new Date('2026-01-15T10:00:00Z');
    const s = scoreOf('birdwatching_passage', gale(245), JAN);
    expect(s.score).toBeLessThan(40);
    expect(s.reasoning).toMatch(/season/i);
  });

  test('a calm day is not "unsafe" for something that merely wants wind', () => {
    // windSpeed<8 is a shortfall, not a hazard. See SHORTFALL_NOT_HAZARD.
    expect(scoreOf('birdwatching_passage', still, OCT).reasoning).not.toMatch(/not safe/i);
  });

  test('an activity that asks for rain is not also charged for it', () => {
    // Its perfect band reads `precipitation=1..8` — rain in the wind is what
    // puts them down. It scored 38 on the best day of its year before this.
    expect(scoreOf('birdwatching_passage', gale(245), OCT).score).toBeGreaterThanOrEqual(80);
  });

  test('a hard frost is good birding, not poor', () => {
    // The old bands called anything below freezing poor, reading the
    // thermometer as though the observer were the subject. A frost ices the
    // shallow waters and concentrates everything onto the deep ones.
    const JAN = new Date('2026-01-15T10:00:00Z');
    const s = scoreOf('birdwatching', {
      temperature: -2, temperatureMin: -5, windspeed: 5, gustspeed: 10,
      winddirection: 60, precipitation: 0, precipitationHours: 0, clouds: 15, humidity: 85,
    }, JAN);
    expect(s.score).toBeGreaterThanOrEqual(60);
  });
});

describe('a wind bonus cannot outvote the rest of the model', () => {
  test('the right wind from the wrong quarter does not float a day to 82', () => {
    // `optimal` used to set `Math.max(score, 82)` — a floor, letting a table
    // that knows one variable overwrite a verdict reached from all of them.
    const OCT = new Date('2026-10-15T10:00:00Z');
    const s = scoreOf('birdwatching_passage', {
      temperature: 11, temperatureMin: 8, windspeed: 56, gustspeed: 80,
      winddirection: 85, precipitation: 8, precipitationHours: 9, clouds: 95, humidity: 88,
    }, OCT);
    expect(s.score).toBeLessThan(80);
  });
});

describe('marine models have a reachable wind limit', () => {
  /**
   * Before 2026-09 they did not. Coastal sailing called a Force 10 acceptable,
   * windsurfing and kitesurfing a Force 11, with a Force 12 gust ceiling — above
   * anything British waters record and above the engine's own universal danger
   * cut-off, so those criteria were dead and the models behaved as though wind
   * had no upper bound.
   *
   * The ceiling asserted here is a gale, Force 8 at 20.6 m/s. Anything that
   * tolerates more than that is not modelling a sport.
   */
  const MARINE = ['sailing', 'windsurfing', 'kitesurfing', 'surfing', 'sea_kayaking',
                  'sea_swimming', 'snorkeling', 'scuba_diving', 'jet_skiing', 'jetskiing',
                  'sea_fishing_boat', 'sea_fishing_shore', 'sup_sea', 'beach'];

  test.each(MARINE)('%s stops at or below a gale', (id) => {
    const a = activityTypes.find((x) => x.id === id)!;
    const limits = (a.poorConditions ?? [])
      .filter((c) => /^(windSpeed|gust)>/.test(c))
      .map((c) => Number(/>([\d.]+)/.exec(c)![1]));
    expect(limits.length).toBeGreaterThan(0);
    for (const v of limits) expect(v).toBeLessThanOrEqual(23);
  });

  test('sea kayaking is a Force 5 boat, not a Force 8 one', () => {
    // Recreational sea kayaking is Force 4, Force 5 for the experienced. This
    // model previously called a Force 8 — 39 knots — acceptable.
    const a = activityTypes.find((x) => x.id === 'sea_kayaking')!;
    const stop = Number(/windSpeed>([\d.]+)/.exec((a.poorConditions ?? []).join(' '))![1]);
    expect(stop).toBeLessThanOrEqual(11);   // top of Force 5
  });

  test('the two jet-ski ids carry the same ladder', () => {
    // They are one sport with two records. Until one is retired they must at
    // least not disagree about when it is unsafe.
    const wind = (id: string) => (activityTypes.find((x) => x.id === id)!.poorConditions ?? [])
      .filter((c) => /^(windSpeed|gust)>/.test(c)).sort();
    expect(wind('jet_skiing')).toEqual(wind('jetskiing'));
  });

  test('marine models keep their wave height, because swell is not local wind', () => {
    for (const id of ['surfing', 'sea_kayaking', 'sea_swimming', 'kitesurfing']) {
      const a = activityTypes.find((x) => x.id === id)!;
      const all = [...(a.perfectConditions ?? []), ...(a.poorConditions ?? [])];
      expect(all.some((c) => c.includes('waveHeight'))).toBe(true);
    }
  });

  test('and their wind-relative logic, which is the genuinely marine part', () => {
    const a = activityTypes.find((x) => x.id === 'surfing')!;
    expect((a.goodConditions ?? []).some((c) => c.includes('windRelative'))).toBe(true);
  });
});

describe('inland models do not carry wave height', () => {
  /**
   * On enclosed water every wave is local wind-sea, so significant wave height
   * is a function of wind, fetch and depth and carries nothing the wind criteria
   * do not. Computed from the reservoirs' own outlines, the POOR wave lines
   * these models used to carry needed a Force 8 while the wind stop is Force 6,
   * so they could never fire; and where a wave line WAS inside the live range it
   * was a restatement of the wind, which would have made the band mean count
   * wind twice.
   *
   * Coastal models keep theirs, and must: swell travels, so out there wave
   * height is genuinely independent of the local wind.
   */
  const INLAND = ['sailing_inland', 'windsurfing_inland', 'kayaking', 'canoeing',
                  'stand_up_paddleboarding', 'wild_swimming'];

  test.each(INLAND)('%s has no waveHeight criterion', (id) => {
    const a = activityTypes.find((x) => x.id === id)!;
    const bands = [a.perfectConditions, a.goodConditions, a.fairConditions, a.poorConditions];
    for (const band of bands) {
      expect((band ?? []).filter((c) => c.includes('waveHeight'))).toEqual([]);
    }
  });

  test('coastal models still do', () => {
    for (const id of ['surfing', 'sea_kayaking', 'sea_swimming']) {
      const a = activityTypes.find((x) => x.id === id)!;
      const bands = [...(a.perfectConditions ?? []), ...(a.poorConditions ?? [])];
      expect(bands.some((c) => c.includes('waveHeight'))).toBe(true);
    }
  });

  test('a wave height in the forecast cannot sway an inland score', () => {
    // The property the removal buys, stated directly: wind decides these, and a
    // wave figure — measured, modelled or mistaken — cannot move the answer.
    // Before the removal it could, and would have been counting wind twice.
    for (const id of INLAND) {
      const plain = scoreOf(id, fair(FORCE_KPH[3])).score;
      const withWaves = scoreOf(id, fair(FORCE_KPH[3], { waveHeight: 0.9 })).score;
      expect(withWaves).toBe(plain);
    }
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
