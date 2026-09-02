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
import { phraseFor } from '../utils/activityReasons';
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

describe('ground condition is supplied, and it is never a hazard', () => {
  /**
   * Twenty-four models referenced `soilMoisture` and nothing filled it, so every
   * one of those criteria was dropped. Wiring it needed three things settled,
   * and each was found by measuring rather than by reading.
   *
   * UNITS. Open-Meteo publishes m³/m³ — 0.35, not 35 — and the models are
   * written in percent, and the generic band scorer converts nothing. Handing
   * over the raw figure would have compared 0.35 against `soilMoisture=20..35`
   * and fired `soilMoisture<10` as a hazard on literally every day.
   *
   * CALIBRATION. A year of hourly data at Rutland ran 12.3% to 52.2%, median
   * 39.8. Both poor thresholds the models carried — `<10` and `>60` — fire on
   * 0.0% of that year. They were invented numbers; these are fitted ones.
   *
   * HAZARD. Dry ground is the best a walker can hope for, and a bog is
   * unpleasant rather than unsafe. Neither should short-circuit a score.
   */
  const JULY = new Date('2026-07-15T10:00:00Z');
  const ground = (soilMoisture?: number) => ({
    temperature: 17, temperatureMin: 12, windspeed: 10, gustspeed: 17,
    winddirection: 220, precipitation: 0, precipitationHours: 0,
    clouds: 35, humidity: 72, visibility: 30000,
    ...(soilMoisture === undefined ? {} : { soilMoisture }),
  });

  test('firm ground is the top band, and dry ground is not a disaster', () => {
    // `soilMoisture<10` as a hazard vetoed a perfect summer day down to 14.
    expect(scoreOf('hiking', ground(24), JULY).score).toBeGreaterThanOrEqual(80);
    expect(scoreOf('hiking', ground(13), JULY).score).toBeGreaterThan(60);
  });

  test('a bog costs a day most of its score without vetoing it', () => {
    // 81 to 14 on a two-point change, where the ground itself has a gradient.
    const s = scoreOf('hiking', ground(52), JULY);
    expect(s.score).toBeGreaterThan(20);
    expect(s.score).toBeLessThan(60);
    expect(s.reasoning).not.toMatch(/not safe/i);
  });

  test('the score falls as the ground gets wetter, without a cliff', () => {
    const at = (v: number) => scoreOf('hiking', ground(v), JULY).score;
    expect(at(24)).toBeGreaterThan(at(40));
    expect(at(40)).toBeGreaterThanOrEqual(at(48));
    expect(at(48)).toBeGreaterThan(at(52));
  });

  test('and it says so', () => {
    expect(scoreOf('hiking', ground(48), JULY).reasoning?.toLowerCase()).toMatch(/mud/);
  });

  test('every soil threshold is inside the range that actually occurs', () => {
    // Measured 12.3 to 52.2 over a year. A threshold outside that is dead code.
    for (const a of activityTypes) {
      const all = [...(a.perfectConditions ?? []), ...(a.goodConditions ?? []),
                   ...(a.fairConditions ?? []), ...(a.poorConditions ?? [])];
      for (const c of all.filter((x) => x.startsWith('soilMoisture'))) {
        for (const n of (c.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)) {
          expect(n).toBeGreaterThanOrEqual(12);
          expect(n).toBeLessThanOrEqual(53);
        }
      }
    }
  });
});

describe('a British day can reach the top band', () => {
  /**
   * Twenty-one models required a mid-range humidity to be scored perfect —
   * `humidity=40..55` for road cycling, `40..60` for hiking, `30..50` for rock
   * climbing. Measured at Rutland, British daily-mean humidity over a week ran
   * 69% to 87%. Those bands are not demanding, they are unreachable.
   *
   * It also encodes a preference nobody has: humidity is felt at the top of the
   * scale and not in the middle, and nobody experiences 55% as better than 70%.
   * The high-side limits in the good, fair and poor bands say the real thing
   * and are untouched.
   *
   * The second-order effect was the interesting one. With perfect unreachable,
   * every pleasant day fell into the good band — whose criteria are loose `<`
   * tests that a flat calm and a Force 4 both satisfy — so the score did not
   * move with the wind at all. Hiking read 85 from calm to Force 4. That looked
   * like a defect in the `<` operator and was not: it was this.
   */
  const JULY = new Date('2026-07-15T10:00:00Z');
  const britishDay = (windspeed: number) => ({
    temperature: 17, temperatureMin: 12, windspeed, gustspeed: windspeed * 1.6,
    winddirection: 220, precipitation: 0, precipitationHours: 0,
    clouds: 35, humidity: 72, visibility: 30000,
  });

  test.each(['hiking', 'camping', 'road_cycling', 'birdwatching'])(
    '%s can be Peak on a still, mild, 72%% day', (id) => {
      expect(scoreOf(id, britishDay(1), JULY).score).toBeGreaterThanOrEqual(80);
    });

  test.each(['hiking', 'camping', 'road_cycling', 'birdwatching'])(
    '%s scores lower in a Force 4 than in a flat calm', (id) => {
      const calm = scoreOf(id, britishDay(1), JULY).score;
      const breezy = scoreOf(id, britishDay(24), JULY).score;
      expect(breezy).toBeLessThan(calm);
    });

  test('no perfect band still demands a mid-range humidity', () => {
    const offenders: string[] = [];
    for (const a of activityTypes) {
      for (const c of a.perfectConditions ?? []) {
        if (/^humidity=\d+\.\.\d+/.test(c)) offenders.push(`${a.id}: ${c}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('the reason names the thing that actually decided it', () => {
  const NIGHT = new Date('2026-01-15T20:00:00Z');
  const sky = (clouds: number, precipitation = 0, precipitationHours = 0) => ({
    temperature: 6, temperatureMin: 2, windspeed: 8, gustspeed: 14, winddirection: 220,
    precipitation, precipitationHours, clouds, humidity: 80, visibility: 25000,
  });

  test('cloud is the reason for stargazing, because cloud is the question', () => {
    // The copy table was keyed on `cloudCover` while the model says `clouds`, so
    // the cloud that vetoed the night had no words and the sentence blamed the
    // breeze: "Not a day for stargazing. Light breeze, Force 2."
    const r = scoreOf('stargazing', sky(95), NIGHT).reasoning ?? '';
    expect(r.toLowerCase()).toMatch(/cloud/);
  });

  test('zero of a thing is not nearly too much of it', () => {
    // `precipitation>0` scored 0.5 — half way to firing — on a completely dry
    // night, because the graduated `>` scorer divides by the threshold's own
    // magnitude and zero has none. It printed "Rain, which settles it."
    const r = scoreOf('stargazing', sky(35), NIGHT).reasoning ?? '';
    expect(r.toLowerCase()).not.toMatch(/rain/);
  });

  test('but real rain still is the reason', () => {
    expect(scoreOf('stargazing', sky(5, 6, 5), NIGHT).reasoning?.toLowerCase()).toMatch(/rain/);
  });

  test('a drizzly day says hours, not a rounded-down millimetre', () => {
    // Production printed "0.0 mm of rain forecast." on a night of continuous
    // drizzle: the hours drove the verdict and the total rounded to nothing.
    const r = scoreOf('road_cycling', {
      temperature: 15, temperatureMin: 11, windspeed: 10, gustspeed: 18, winddirection: 220,
      precipitation: 0.04, precipitationHours: 11, clouds: 85, humidity: 85, visibility: 20000,
    }, NIGHT).reasoning ?? '';
    expect(r).toMatch(/11 hours/);
    expect(r).not.toMatch(/0\.0 mm/);
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

  test('the activity is named the way a person says it, never by its label', () => {
    /* The rule is that the LABEL never reaches the sentence — "Go Sailing" and
       "Walk the Dog" are how the library files an activity, not how anybody
       refers to it. It used to be checked by pinning one idiom ("walking the
       dog"), which also pinned the phrasing: giving dog walking its own verdict
       failed this while satisfying it, because "Ideal for a long one with the
       dog" is the same rule kept better. So the label is what is asserted on,
       and the subject is asserted separately. */
    for (const [id, label, subject] of [
      ['dog_walking', 'Walk the Dog', /dog/i],
      ['sailing_inland', 'Go Sailing', /sail/i],
      ['birdwatching', 'Go Birdwatching', /watch|binocular|bird/i],
    ] as const) {
      const r = scoreOf(id, fair(10)).reasoning ?? '';
      expect(r).not.toContain(label);
      expect(r).toMatch(subject);
    }
  });

  test('every day gets a reason, not just a restated badge', () => {
    for (const kph of FORCE_KPH) {
      const r = scoreOf('kayaking', fair(kph)).reasoning ?? '';
      // Two sentences minimum: the verdict, then something factual after it.
      expect(r.split('. ').length).toBeGreaterThanOrEqual(2);
    }
  });
});

/**
 * Rain demotes a day. It does not erase one.
 *
 * Measured at Rutland on 7 September 2026: 0.3 mm of rain across three hours,
 * a Force 3 and 15-20 °C. The day's good band scored 0.899 — fractionally
 * BETTER than the dry Sunday beside it, which scored 81 — and it came back as
 * 33, "Not a day for hiking", because the rain gate sat inside the band's own
 * `else if`. Failing it dropped the day past `fair`, which lists marginal
 * ranges and so scores near zero on a pleasant day, into the bucket reserved
 * for days that match nothing the activity describes.
 */
describe('rain demotes a band rather than disqualifying it', () => {
  const pleasant = {
    temperature: 18, temperatureMin: 15, windspeed: 14, gustspeed: 30,
    visibility: 25000, soilMoisture: 30, clouds: 40,
  };
  const withRain = (mm: number, hours: number) =>
    ({ ...pleasant, precipitation: mm, precipitationHours: hours });

  /* The bucket for "matches nothing" tops out at 39. A day whose good band is
     satisfied must never land in it on account of rain alone. */
  const NOTHING_MATCHED_CEILING = 39;

  for (const id of ['hiking', 'camping', 'cycling', 'trail_running']) {
    it(`${id}: a good day with some rain lands above the matched-nothing bucket`, () => {
      const wet = scoreOf(id, withRain(2, 6));
      const dry = scoreOf(id, withRain(0, 0));
      expect(dry.score).toBeGreaterThan(wet.score);
      expect(wet.score).toBeGreaterThan(NOTHING_MATCHED_CEILING);
    });
  }

  it('names the rain whenever the rain is what cost the points', () => {
    /* The naming threshold and the band gate were different numbers, so a day
       between them was sunk by rain and then explained by the breeze: "Not a
       day for hiking. Gentle breeze, Force 3, 19 °C" under a score of 33. */
    const s = scoreOf('hiking', withRain(2, 6));
    expect(s.score).toBeLessThan(60);
    expect(s.reasoning).toMatch(/rain|drizzl|wet|shower/i);
  });

  it('three hours of barely-there drizzle costs a few points, not forty', () => {
    /* 0.3 mm over three hours is 0.1 mm/h — a fifth of the Met Office drizzle
       boundary. It read as a quarter of a washout because the duration limb
       counted hours regardless of what fell. */
    const dry = scoreOf('hiking', withRain(0, 0)).score;
    const damp = scoreOf('hiking', withRain(0.3, 3)).score;
    expect(dry - damp).toBeLessThan(20);
  });

  it('but a genuinely wet day is still a poor one', () => {
    for (const [mm, hours] of [[6, 10], [10, 12], [15, 16], [8, 2]] as const) {
      expect(scoreOf('hiking', withRain(mm, hours)).score).toBeLessThan(40);
    }
  });

  it('more rain always scores lower, with no step back up', () => {
    const ladder = ([[0, 0], [0.3, 3], [1, 4], [2, 6], [4, 8], [6, 10], [10, 12]] as const)
      .map(([mm, h]) => scoreOf('hiking', withRain(mm, h)).score);
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]).toBeLessThanOrEqual(ladder[i - 1]);
    }
  });
});

/**
 * The precipitation ladder, as an invariant rather than a set of pinned numbers.
 *
 * THE RULE: every model's bands form a contiguous ladder — good 0..G, fair
 * G..F, poor >F — so that any millimetre figure lands in exactly one of them,
 * and no model treats measurable rain as a hazard. That is what these tests
 * enforce, and it holds however the individual thresholds are later retuned.
 *
 * Why it needs enforcing, from the state that prompted it: models had gaps
 * (good `precipitation=0` beside fair `1..5`, so 0.3 mm matched nothing),
 * inversions (a good band reaching past its own poor threshold), and fair
 * bands identical to their good one. Several wrote `precipitation>0` in poor,
 * which is not a threshold but a refusal to pick one — it fires on 0.3 mm
 * spread over three hours, and a fired poor criterion is a HAZARD, so a trace
 * of drizzle scored the same as a gale.
 */
describe('precipitation bands form a contiguous ladder', () => {
  type Range = { lo: number; hi: number } | null;
  const parse = (c?: string): Range => {
    if (!c) return null;
    let m = c.match(/^precipitation=(-?[\d.]+)\.\.(-?[\d.]+)$/);
    if (m) return { lo: +m[1], hi: +m[2] };
    m = c.match(/^precipitation=(-?[\d.]+)$/);
    if (m) return { lo: +m[1], hi: +m[1] };
    m = c.match(/^precipitation>=?(-?[\d.]+)$/);
    if (m) return { lo: +m[1], hi: Infinity };
    m = c.match(/^precipitation<=?(-?[\d.]+)$/);
    if (m) return { lo: 0, hi: +m[1] };
    return null;
  };
  const pick = (b: string[] = []) => b.find((c) => c.startsWith('precipitation'));

  /* Storm birding WANTS rain, and the snow models read this key as snowfall. */
  const NOT_RAIN_AVERSE = new Set([
    'birdwatching_passage', 'skiing', 'snowboarding', 'cross_country_skiing', 'ice_fishing',
  ]);
  const models = (activityTypes as ActivityType[])
    .filter((a) => a.weatherSensitive && !NOT_RAIN_AVERSE.has(a.id));

  it.each(models.map((a) => [a.id, a] as const))('%s: good, fair and poor meet without a gap', (_id, a) => {
    const G = parse(pick(a.goodConditions)), F = parse(pick(a.fairConditions)), P = parse(pick(a.poorConditions));
    if (G && F) expect(F.lo).toBeLessThanOrEqual(G.hi);        // no crack between good and fair
    if (F && P) expect(P.lo).toBeLessThanOrEqual(F.hi);        // no crack between fair and poor
    if (F && P) expect(F.lo).toBeLessThan(P.lo);               // fair is not a subset of poor
    if (G && P) expect(G.hi).toBeLessThanOrEqual(P.lo);        // good does not reach into poor
  });

  it('no model treats any measurable rain as a hazard', () => {
    /* `precipitation>0` vetoed a pleasant day to 14 on 0.1 mm/h of drizzle. */
    const offenders = models
      .map((a) => [a.id, parse(pick(a.poorConditions))] as const)
      .filter(([, P]) => P && P.hi === Infinity && P.lo <= 0.1)
      .map(([id]) => id);
    expect(offenders).toEqual([]);
  });

  it('a trace of drizzle no longer scores the same as a gale', () => {
    const base = { temperature: 18, temperatureMin: 14, windspeed: 14, gustspeed: 28, visibility: 25000, soilMoisture: 30, clouds: 40 };
    for (const id of ['outdoor_chess', 'outdoor_reading', 'stargazing', 'skateboarding', 'beach']) {
      const trace = scoreOf(id, { ...base, precipitation: 0.3, precipitationHours: 3 }).score;
      expect(trace).toBeGreaterThan(16);
    }
  });
});

/**
 * What a shelf of cards reads like, which is not the same as what one reads like.
 *
 * These were all found by looking at eight tiles at once on the Anglian board.
 * Individually every sentence was defensible; together they repeated, and one
 * of them answered the wrong question.
 */
describe('the cards read as a set', () => {
  const drizzlyBreeze = {
    temperature: 17, temperatureMin: 14, windspeed: 24, windspeedMax: 32,
    gustspeed: 42, winddirection: 250, visibility: 20000, soilMoisture: 40,
    precipitation: 2.7, precipitationHours: 9, clouds: 85,
  };

  it('two activities side by side do not open with the same sentence', () => {
    /* "A good day for sailing." beside "A good day for windsurfing." — one
       template across a whole shelf read as generated rather than written. */
    const opener = (id: string) => (scoreOf(id, drizzlyBreeze).reasoning ?? '').split('. ')[0];
    const openers = ['sailing_inland', 'windsurfing_inland', 'kayaking', 'wild_swimming',
      'road_cycling', 'dog_walking', 'birdwatching'].map(opener);
    expect(new Set(openers).size).toBe(openers.length);
  });

  it('a good day says what is good about it, not only what is wrong', () => {
    /* This was a regression: marking the rain `decisive` let it become the
       whole sentence under a "good" verdict, so the tile said it was a good
       day for sailing and then named the only bad thing about it. */
    for (const id of ['sailing_inland', 'windsurfing_inland']) {
      const s = scoreOf(id, drizzlyBreeze);
      expect(s.evaluation).toBe('good');
      /* The wind is why it is good, and the wind has to be in there. */
      expect(s.reasoning).toMatch(/Force \d/);
    }
  });

  it('nobody sits down to walk a dog', () => {
    const r = scoreOf('dog_walking', drizzlyBreeze).reasoning ?? '';
    expect(r).not.toMatch(/sit in it/);
    expect(r).toMatch(/dog/i);
    /* Birdwatching keeps it, because a birdwatcher really is sitting still. */
    expect(scoreOf('birdwatching', drizzlyBreeze).reasoning).toMatch(/sit in it/);
  });

  it('says gusts in English rather than in statistics', () => {
    const r = scoreOf('stand_up_paddleboarding', drizzlyBreeze).reasoning ?? '';
    expect(r).not.toMatch(/on the mean|the mean\b/);
    expect(r).toMatch(/gust/i);
  });

  it('every sentence it appends ends as a sentence', () => {
    /* The ground note was pasted on without a full stop, so the card trailed
       off mid-line. */
    for (const id of ['dog_walking', 'hiking', 'birdwatching', 'mountain_biking']) {
      const r = (scoreOf(id, { ...drizzlyBreeze, soilMoisture: 48 }).reasoning ?? '').trim();
      expect(r).toMatch(/[.!?]$/);
      expect(r).not.toMatch(/ - /);   // a spaced hyphen is not a dash
    }
  });
});

/**
 * Every activity can be named inside a sentence.
 *
 * The library names activities as instructions — "Play Golf", "Do Archery",
 * "Go to the Beach" — and the sentence needs a noun phrase. Stripping the verb
 * covers most of them and produced "A good day for do archery" and "A good day
 * for to the beach" for the rest, which is the sort of thing nobody sees until
 * the whole shelf is on screen at once.
 */
describe('every activity has a phrase that fits the sentence', () => {
  /* A phrase that opens with a bare verb or a preposition cannot follow "a
     good day for". This is the whole rule, applied to the whole library. */
  const CANNOT_OPEN = /^(?:do|hit|head|visit|explore|meditate|read|paint|play|watch|make|take|have|try|go|to|get|enjoy|see|catch|find|learn|practi[cs]e|shoot|throw)\b/i;

  it.each((activityTypes as ActivityType[]).filter((a) => a.weatherSensitive).map((a) => [a.id, a] as const))(
    '%s reads as a noun phrase',
    (_id, a) => {
      const phrase = phraseFor(a.id, a.name);
      expect(phrase).not.toMatch(CANNOT_OPEN);
      expect(phrase).not.toMatch(/\s{2,}/);
      expect(phrase.trim()).toBe(phrase);
      expect(phrase.length).toBeGreaterThan(1);
    },
  );
});
