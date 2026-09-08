/**
 * Perfect tolerates one thing being off. Not two, and never a safety one.
 *
 * `worst(perfect) >= 0.5` asked every criterion in the perfect band to hold at
 * once, and perfect bands are long — a dozen conditions is ordinary. What that
 * produced is best said with a real day rather than a rule.
 *
 * PETERBOROUGH, 24 APRIL 2026, for rock climbing. Fourteen degrees. No rain at
 * all, not a single wet hour. Seven kilometres an hour of wind. Seven per cent
 * cloud — a blue sky. It scored 39: "not a day for rock climbing", the bucket
 * for days that resemble nothing the activity describes.
 *
 * It scored 39 because the model asks for `cloudCover=20..40` and there was not
 * enough cloud. One comfort criterion, missed on the pleasant side, and the day
 * fell past perfect, past good — whose band also names cloud — and off the
 * scale entirely.
 *
 * The rule now: at most one criterion may sit below the floor, and it must be a
 * COMFORT one. The two exclusions are not symmetrical hedges:
 *
 *   SAFETY   the one thing a good day cannot be wrong about. A perfect day for
 *            kayaking that is gusting Force 6 is not a perfect day with a flaw,
 *            it is a day for staying ashore, and PRIME on that tile is the
 *            failure the band exists to avoid.
 *
 *   VIABILITY  not an extra rule but a reading of "off". A comfort miss means
 *            the day is worse; a viability miss means the activity is not
 *            happening. No amount of sunshine makes a windless day
 *            windsurfable.
 *
 * MEASURED, over 1,825 real place-days from the Open-Meteo archive scored
 * against all 81 weather-sensitive models — 215,350 activity-days:
 *
 *     731 scores rose (0.34%), none fell
 *     19 crossed into PRIME
 *
 * Small, and worth saying plainly: the floor was not what keeps the top of the
 * scale thin. `perfect.mean > 0.8`, `rainMm <= 0.2` and `penalty < 0.3` do that,
 * and they are unchanged here. This removes a strictness that could not be
 * justified, not one that was doing much work.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';

function score(activityId: string, weather: Record<string, unknown>): number {
  const now = new Date('2026-04-24T13:00:00Z');
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never,
    interests: [activityId],
    now,
    includeAllActivities: true,
  } as never) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return Math.round(byDay[0].suggestions.find((s) => s.activityId === activityId)?.score ?? 0);
}

/** Peterborough, 24 April 2026, from the Open-Meteo archive. Verbatim. */
const PETERBOROUGH_24_APRIL = {
  temperature: 14.333333333333334,
  temperatureMin: 2.5,
  temperatureMax: 16.8,
  precipitation: 0,
  precipitationHours: 0,
  windspeed: 7.02,
  windspeedMax: 10.620000000000001,
  gustspeed: 24.48,
  winddirection: 47,
  clouds: 7,
  humidity: 52.111111111111114,
  soilMoisture: 16.766666666666666,
  visibility: 25000,
} as const;

/**
 * PRIME reached through the PERFECT band scores 88-98; the good band tops out
 * at 87. So `>= 88` asserts "this day qualified as perfect", which is the thing
 * under test — a plain `>= 78` would also pass on a day the good band carried,
 * and two of these cases are exactly that.
 */
const PERFECT_BAND = 88;

const IDEAL = {
  temperatureMin: 12, precipitation: 0, precipitationHours: 0,
  winddirection: 200, humidity: 55, soilMoisture: 30, visibility: 25000,
} as const;

describe('one comfort criterion may be off', () => {
  it('calls a cloudless, dry, still April day perfect for rock climbing', () => {
    // The model asks cloudCover=20..40 and got 7. That is the only miss.
    expect(score('rock_climbing', PETERBOROUGH_24_APRIL)).toBeGreaterThanOrEqual(PERFECT_BAND);
  });

  it('does not tolerate a second miss', () => {
    // Same day, but now humid as well as cloudless — two comfort criteria out.
    expect(score('rock_climbing', { ...PETERBOROUGH_24_APRIL, humidity: 95 }))
      .toBeLessThan(PERFECT_BAND);
  });
});

describe('a safety criterion is never the one thing that may be off', () => {
  /**
   * Kayaking's perfect band asks `windSpeed<4` and `gust<6`, its fair band
   * reaches `gust=9..12`, and its stop is above that. A 3.5 m/s mean gusting
   * 10 m/s is inside every other perfect criterion and outside that one alone,
   * without the veto firing — the shoulder this rule decides, rather than a
   * gale the veto would have caught anyway. `perfect.mean` is 0.82, so the band
   * is genuinely in play and it is this rule that refuses it.
   */
  it('refuses the perfect band to kayaking when the gust is the only thing out', () => {
    const gusty = {
      ...IDEAL, temperature: 18, clouds: 30, waterTemperature: 17,
      windspeed: 3.5 * 3.6, windspeedMax: 4 * 3.6, gustspeed: 10 * 3.6,
    };
    expect(score('kayaking', gusty)).toBeLessThan(PERFECT_BAND);
  });
});

describe('a viability criterion is not "one thing being off"', () => {
  /**
   * Twenty-one degrees for rock climbing: past the perfect band's 12..18, well
   * inside the good band's 10..22, nothing else out, `perfect.mean` 0.88. It
   * lands at 83 — a good day, correctly, and not an ideal one.
   *
   * This is also the case that made `firedLow` wrong to pass into the role
   * lookup. That flag maps a shortfall onto COMFORT so a flat calm does not
   * read "not safe for sailing"; carried in here it would have called a 5 m/s
   * afternoon a perfect day for the windsurfer.
   */
  it('does not call a warm afternoon perfect for rock climbing', () => {
    const warm = {
      ...IDEAL, temperature: 21, clouds: 30,
      windspeed: 3 * 3.6, windspeedMax: 4 * 3.6, gustspeed: 5 * 3.6,
    };
    const s = score('rock_climbing', warm);
    expect(s).toBeLessThan(PERFECT_BAND);
    expect(s).toBeGreaterThanOrEqual(60);   // still a good day, not a refused one
  });
});
