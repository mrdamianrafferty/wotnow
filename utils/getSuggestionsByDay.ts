// src/utils/getSuggestionsByDay.ts

// Lightweight types used here
type SuitabilityLevel = 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
import type { ActivityType } from '../data/activities/types';
import type { SnowRecommendationLevel } from './snowRecommendations';

export interface WeatherData {
  temperature?: number;               // °C — daytime mean where the source has one
  /** Overnight minimum. What decides a camping night; nothing else was reading it. */
  temperatureMin?: number;            // °C
  temperatureMax?: number;            // °C
  precipitation?: number;             // mm over the period
  /**
   * How many hours of that period saw any rain.
   *
   * Carried because a daily total cannot tell 4 mm in one downpour from 4 mm
   * spread over sixteen hours, and those are not the same day for a campsite or
   * a walk. Absent when the source publishes no such field.
   */
  precipitationHours?: number;
  /**
   * WHEN the rain falls, where the source publishes it hour by hour.
   *
   * "Rain for 10 hours of it, 2.3 mm in total" is two numbers and no picture.
   * The forecast knows more than that: measured at Rutland, 4 September has
   * 91% of its rain before noon and nothing after, which is a different day
   * from 8 September, whose 4 mm is smeared across sixteen hours. Both came
   * out as the same sentence.
   *
   * `spread` is the honest answer when no window holds enough of the total to
   * be worth naming — and it is common, so it is not a failure state.
   */
  rainWindow?: 'overnight' | 'morning' | 'afternoon' | 'evening' | 'spread';
  windspeed?: number;                 // km/h — the period MEAN where available
  /** The period's peak sustained wind. Used for limits, not for description. */
  windspeedMax?: number;              // km/h
  /**
   * Peak gust. Absent when the source publishes none, and never inferred from
   * the mean — a fabricated gust is worse than no gust, because the models
   * treat an absent criterion as neutral and a present one as measured.
   */
  gustspeed?: number;                 // km/h
  /**
   * Degrees the wind is blowing FROM, 0-359, dominant over the period.
   *
   * The engine has had a `windDirection` field for coastal models since they
   * were written, and no inland source ever filled it — so every criterion that
   * mentioned direction was scored neutral. It is the difference between two
   * entirely different days at one wind speed.
   */
  winddirection?: number;             // degrees
  clouds?: number;                    // %
  humidity?: number;                  // %
  visibility?: number;                // m
  waterTemperature?: number;          // °
  waveHeight?: number;                // m
  swellHeight?: number;               // m
  swellPeriod?: number;               // s
  sunsetTs?: number | null;
  // Snow inputs (optional)
  snowDepthCm?: number;               // cm
  snowfallRateMmH?: number;           // mm/h
  // ➕ Soil moisture (0–1 m3/m3 or 0–100 %)
  soilMoisture?: number;
}

export interface EveningBonusResult {
  multiplier: number;
  reasons?: Record<string, string>;
}

export interface Suggestion {
  activityId: string;
  score: number;
  evaluation: SuitabilityLevel;
  reasoning?: string;
  outOfSeason?: boolean;
  eveningReasons?: EveningBonusResult['reasons'];
  snow?: { level: SnowRecommendationLevel; message: string };
}

// Removed unused imports to satisfy linter
// import { selectHeroActivity } from './heroSelector';
import { scoreConditions,
         scorePoorConditions,
         applySnowRecommendationScoring,
         applyWindRecommendationScoring,
         adjustScoreForMud } from './activitySuitability';
import type { WeatherData as SuitabilityWeather, MinimalActivity, CriterionScore } from './activitySuitability';
import { applyEveningBonus } from './eveningScoring';
import { describeConditions, phraseFor } from './activityReasons';
import { assessSoilCondition, isMudSensitive, getMudMessage } from './soilMoistureUtils';
// import { activityTypes } from '../data/activityTypes';
// import { getActivityMessage } from '../data/activityMessages';

// Minimum score threshold for activity suggestions (unless includeAllActivities is true)
const MINIMUM_ACCEPTABLE_SCORE = 40; // Matches your 'fair' threshold in toLevel()

/**
 * Scoring traces, off unless asked for.
 *
 * These were unconditional `console.log`s, one of which dumped the whole weather
 * object as pretty-printed JSON per activity per day. Building the Anglian
 * board is nine waters times eight activities times seven days, so a single
 * request wrote several hundred of them into the serverless log — enough to
 * bury anything worth reading and to cost real time in the process.
 */
const TRACE = process.env.ACTIVITY_SCORING_TRACE === '1';
function debug(...args: unknown[]): void {
  if (TRACE) console.log(...args);
}

// Simple context tags helper used by scoring/bonuses
function buildContextTagsForDay(dayName: string, hour: number, isToday: boolean): string[] {
  const dn = dayName.toLowerCase();
  const tags = new Set<string>([dn]);
  if (dn === 'saturday' || dn === 'sunday') tags.add('weekend');
  else tags.add('weekday');

  if (hour >= 17) tags.add('evening');
  else if (hour >= 12) tags.add('afternoon');
  else tags.add('morning');

  if (isToday) tags.add('today');
  return Array.from(tags);
}

/**
 * A forecast entry's timestamp in milliseconds, whichever unit it arrived in.
 *
 * The documented contract is seconds. Milliseconds are accepted because several
 * callers pass `Date.now()` and the mistake is undetectable downstream: a
 * millisecond value multiplied by a thousand lands tens of thousands of years
 * out, `getMonth()` returns something plausible, and a day is capped for being
 * out of a season nobody chose. Anything past the year 5138 in seconds is a
 * millisecond value, and nothing this function scores is a forecast for then.
 */
const YEAR_5138_IN_SECONDS = 1e11;
function toEpochMs(date: number): number {
  return date > YEAR_5138_IN_SECONDS ? date : date * 1000;
}

// Map numeric score to suitability label (for outdoor)
function toLevel(score: number): SuitabilityLevel | 'poor' {
  if (score >= 90) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

// Unified scoring function that returns both score and optional snow details
function calculateActivityScoreWithSnow(
  activity: ActivityType,
  weather: WeatherData,
  isWeatherGood: boolean,
  isEveningToday: boolean,
  contextTags: string[],
  opts: { nowTs: number; sunsetTs?: number | null; month?: number }
): {
  score: number;
  /** The criterion that decided the score. Absent for indoor activities. */
  binding?: CriterionScore;
  /** True when a hazard fired hard enough to short-circuit the scoring. */
  vetoed?: boolean;
  snow?: { level: SnowRecommendationLevel; message: string };
} {

  // Indoor activities: weather-reactive scoring
  if (!activity.weatherSensitive) {
    let score = 65;
    const precip = weather.precipitation ?? 0;
    const temp = weather.temperature;
    const wind = weather.windspeed ?? 0;
    const clouds = weather.clouds ?? 0;

    // Boost indoor activities in bad weather
    if (precip >= 5) score += 15;           // heavy rain — strong indoor boost
    else if (precip >= 1) score += 10;      // moderate rain
    else if (precip > 0) score += 5;        // light rain/drizzle

    if (wind >= 50) score += 5;             // very windy (km/h)
    if (typeof temp === 'number' && (temp <= 2 || temp >= 35)) score += 5; // extreme temps

    // Slightly reduce on beautiful days so outdoor activities rise above
    if (precip === 0 && clouds < 30 && typeof temp === 'number' && temp >= 15 && temp <= 25 && wind < 20) {
      score -= 10; // gorgeous day — mild deprioritisation
    }

    // Evening bonus still applies
    const hour = new Date(opts.nowTs).getHours();
    const eveningResult = applyEveningBonus(activity as unknown as ActivityType, hour, contextTags, opts);
    score *= eveningResult.multiplier;

    return { score: Math.max(40, Math.min(95, Math.round(score))) };
  }

  /**
   * Normalise into the suitability engine's units: m/s for wind, km for
   * visibility, °C throughout.
   *
   * Three corrections live in this block, all of them things the models already
   * asked for and were never given:
   *
   * `gust` — every water-sports model carries gust criteria and not one had ever
   * been evaluated, because nothing put a gust on this object. An absent gust is
   * left absent rather than derived from the mean: `evalAtomicScore` drops a
   * missing key instead of scoring it, which is the honest outcome, whereas a
   * fabricated gust would be scored as though measured.
   *
   * `airTemperature` — a real alias, not a workaround. Half the library says
   * `temperature` and half says `airTemperature` for the same quantity, and only
   * the first was ever supplied. That is why `wild_swimming`, whose bands are
   * written almost entirely in `airTemperature` and `waterTemperature`, was
   * scoring 95 and "Perfect conditions" on a 3 °C January day: every thermal
   * criterion it owns was invisible and it was left being scored on wind alone.
   *
   * `visibility` — no longer defaulted to 10 000 m. That default was worse than
   * nothing twice over: it was counted as a measurement, so the disclosure that
   * visibility could not be answered inland was false; and 10 km fails the
   * strict `visibility>10` in every model's perfect band, so it quietly held a
   * point off every top score in the library. Absent is now absent.
   */
  const windMeanMs = typeof weather.windspeed === 'number' ? weather.windspeed / 3.6 : undefined;
  const w: SuitabilityWeather = {
    temperature: weather.temperature,
    airTemperature: weather.temperature,
    temperatureMin: weather.temperatureMin,
    precipitation: weather.precipitation,
    precipitationHours: weather.precipitationHours,
    windSpeed: windMeanMs ?? 0,
    windSpeedMax: typeof weather.windspeedMax === 'number' ? weather.windspeedMax / 3.6 : undefined,
    gust: typeof weather.gustspeed === 'number' ? weather.gustspeed / 3.6 : undefined,
    windDirection: weather.winddirection,
    clouds: weather.clouds,
    cloudCover: weather.clouds,
    humidity: weather.humidity,
    visibility: typeof weather.visibility === 'number' ? weather.visibility / 1000 : undefined,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    swellHeight: weather.swellHeight,
    swellPeriod: weather.swellPeriod,
    // Snow passthrough
    snowDepthCm: weather.snowDepthCm,
    snowfallRateMmH: weather.snowfallRateMmH,
    // ➕ soil moisture passthrough
    soilMoisture: weather.soilMoisture,
  };

  // Heuristic: most non-water outdoor activities should not be marked good/perfect in rain
  const isWaterActivity = (activity.category?.toLowerCase().includes('water') || activity.secondaryCategory?.toLowerCase().includes('water') || activity.tags?.includes('water')) ?? false;
  const rainMm = typeof w.precipitation === 'number' ? w.precipitation : 0;

  /**
   * ─── Why there is no Math.random() in here any more ──────────────────────
   *
   * Each band used to assign its score as a base plus noise — `68 + random()*15`
   * for good, `90 + random()*8` for perfect. Measured on identical input eight
   * times, birdwatching returned 68, 70, 74, 79, 80, 80, 83: a spread of 15 on a
   * scale where the gap between "Good" and "Peak" is 20.
   *
   * That cost three things. A page refresh changed the number. Two waters could
   * not be compared, because the difference between them was smaller than the
   * noise. And `bestDay`, which sorts the week by score, could pick the wrong
   * day — the one feature most obviously built on the score meaning something.
   *
   * The replacement is not a constant per band, which would give a four-step
   * chart. It is the band's own match score, projected across the band's range:
   * a perfect match that scraped in at 0.81 lands near 88, one at 0.99 lands
   * near 98. Same band boundaries, same semantics, and the number now moves with
   * the weather instead of with the random number generator.
   */
  const span = (v: number, lo: number, hi: number, outLo: number, outHi: number) =>
    outLo + Math.max(0, Math.min(1, (v - lo) / (hi - lo))) * (outHi - outLo);

  let score = 30;

  /**
   * The hazard veto now floors the score instead of parking it mid-scale.
   *
   * It used to return `20 + round(random()*10)` — a band of 20 to 30 — while the
   * ordinary path routinely finished at 5 to 10 after the wind adjustment. So
   * the days the engine considered MOST dangerous scored ABOVE merely bad ones:
   * sailing measured 10 at Force 7 and 29 at Force 9, and canoeing, swimming and
   * windsurfing all did the same. On a board that ranks waters within an
   * activity, a storm could float above a poor day.
   *
   * A veto now lands between 2 and 15, monotonically decreasing with the
   * severity of what fired, and the ordinary path is clamped no lower than 16.
   * The two ranges cannot overlap, so a vetoed day is always at the bottom.
   */
  const poor = scorePoorConditions(activity.poorConditions ?? [], w);
  const penalty = poor.penalty;
  if (poor.hazards.length) {
    /**
     * Graded by how many hazards fired, not by the penalty figure.
     *
     * The penalty is the mean of only the conditions that fired, so a single
     * triggered hazard already saturates it at ~1 and every vetoed day would
     * land on the same number — a Force 6 scoring identically to a hurricane.
     * Counting them separates "over the limit" from "several things wrong at
     * once", which is the distinction a reader can act on.
     */
    const byCount = [14, 10, 6, 3][Math.min(3, poor.hazards.length - 1)];
    return {
      score: byCount,
      binding: poor.hazards.slice().sort((a, b) => b.score - a.score)[0],
      vetoed: true,
    };
  }

  /**
   * Rain is read as an intensity, not as a daily total measured against
   * hourly-looking thresholds.
   *
   * The caps below used to compare `precipitation` — a whole day's millimetres —
   * against 1 mm and 3 mm, which are the right numbers for millimetres per hour
   * and roughly a tenth of the right numbers for a day. An ordinary showery
   * British day (6 mm) put dog walking on 25, birdwatching on 26 and camping on
   * 20: all "Tough", none of them true.
   *
   * Where the source publishes `precipitationHours` the rate is computed and
   * used, which also separates 4 mm of downpour from sixteen hours of drizzle —
   * different days for a campsite, previously identical. Without it, the total
   * is divided by a nominal twelve-hour day rather than treated as an hourly
   * figure, which is a coarse but honest reading of what the number is.
   */
  const rainHours = typeof w.precipitationHours === 'number' && w.precipitationHours > 0
    ? w.precipitationHours
    : null;

  /**
   * How wet the day is, 0 to 1, judged against thresholds that match the
   * quantity actually available.
   *
   * With hours, that is an intensity: 4 mm/h is the Met Office's own boundary
   * for heavy rain, and a day is also wet simply by going on — twelve hours of
   * drizzle is a washout at any rate, so duration counts too.
   *
   * Without hours, the only honest reading is the daily total against DAILY
   * thresholds: about 10 mm is a properly wet British day. Applying an hourly
   * threshold to a daily total was the original error and it made every showery
   * day "Tough".
   */
  /**
   * Duration counts, but in proportion to whether it is actually raining.
   *
   * The duration limb was `rainHours / 12` flat, so THREE HOURS OF ANYTHING
   * scored 0.25 — enough to demote a band — however little fell. Measured at
   * Rutland: 0.3 mm across three hours is 0.1 mm/h, a fifth of the Met Office's
   * 0.5 mm/h drizzle boundary and damp air rather than weather, and it cost a
   * pleasant day 38 points against the identical day with one hour of it.
   *
   * So the limb is now weighted by intensity: half weight for rain too light to
   * notice, full weight once it is falling at 0.5 mm/h or more. The original
   * intent — that a day is wet partly by going on, not only by how hard it comes
   * down — is kept, and sixteen hours of drizzle still reads as a washout.
   */
  const rainRate = rainHours ? rainMm / rainHours : 0;
  const durationWeight = 0.5 + 0.5 * Math.min(1, rainRate / 0.5);
  const wetness = rainHours
    ? Math.min(1, Math.max(rainRate / 4, (rainHours / 12) * durationWeight))
    : Math.min(1, rainMm / 10);
  const rainRateMmH = rainHours ? rainMm / rainHours : null;

  /**
   * Does this activity's own model ASK for rain?
   *
   * The band gates and the caps further down both assume rain is unwelcome
   * unless the activity is on the water, which is true of almost everything and
   * false of the one that matters: storm birding's perfect band reads
   * `precipitation=1..8`, because rain in the wind is what puts seabirds down
   * on an inland reservoir. Without this it could never reach its good band on
   * the best day of its year, and was charged for the weather twice besides.
   *
   * The test is a lower bound above zero. `precipitation=0..2` means "a bit is
   * tolerable" and is treated as normal; `precipitation=1..8` means "it needs
   * to be raining", which is a different claim about the world.
   */
  const wantsRain = (activity.perfectConditions ?? []).some((c) =>
    /^precipitation=([1-9]|[1-9]\d)/.test(c));

  const perfect = scoreConditions(activity.perfectConditions ?? [], w);
  const good = scoreConditions(activity.goodConditions ?? [], w);
  const fair = scoreConditions(activity.fairConditions ?? [], w);
  let band = fair;

  /**
   * A band cannot be claimed while one of its own criteria is badly missed.
   *
   * The gate was the MEAN alone, so a criterion the day fails outright could be
   * outvoted by two it passes. Measured: inland windsurfing read "Good weather"
   * in a Force 2, because a pleasant temperature and no rain outweighed there
   * being no usable wind — and no amount of sunshine makes a windless day
   * windsurfable.
   *
   * The floor is deliberately loose. It is not there to make bands hard to
   * reach, only to stop one comfortable variable papering over the one that
   * actually decides whether the activity is possible.
   */
  /**
   * Rain is exempt from the floor, because rain is already priced three times.
   *
   * The floor asks whether one criterion is missed so badly that the activity
   * stops being possible — no amount of sunshine makes a windless day
   * windsurfable. Rain is not that kind of criterion for a land activity: it is
   * a comfort variable, and it is ALREADY charged by the gate below, by
   * `rainWeight`, and by the caps under that.
   *
   * Leaving it in the floor made it a fourth charge, and a fatal one. 45 of the
   * 118 models write `precipitation=0` in their GOOD band, which scores zero at
   * about a millimetre — so a single passing shower took `worst()` to 0, the
   * band was refused outright, and a pleasant day fell into the bucket for days
   * that resemble nothing the activity describes. Measured: hiking in 2 mm
   * across six hours, otherwise a Force 3 and 18 °C, scored 29.
   *
   * Exempting it here fixes all 45 without inventing 45 new thresholds, and a
   * genuinely wet day still scores badly — the caps see to that, and the ladder
   * test pins it.
   */
  const PRICED_ELSEWHERE = new Set(['precipitation']);
  const worst = (b: { criteria: { score: number; key: string }[] }) => {
    const scored = b.criteria.filter((c) => !PRICED_ELSEWHERE.has(c.key));
    return scored.length ? Math.min(...scored.map((c) => c.score)) : 1;
  };

  /**
   * WHAT pushed the day out of its band, not merely THAT something did.
   *
   * This was a boolean called `rainDemotedBand`, which was true and honest
   * while rain was the only thing that could demote a band. Once a missed
   * safety criterion could do it too, the flag was set for both and the copy
   * layer — which reads it to decide whether to name the rain — blamed the
   * rain for the gust. Measured on a bone-dry, gusty afternoon:
   *
   *   Paddleable, with something to watch. 0.0 mm of rain forecast.
   *
   * Nought millimetres, offered as the reason. Naming the cause instead of a
   * cause makes the sentence say the true thing rather than merely stop
   * saying the false one.
   */
  let demotedBy: 'rain' | 'safety' | null = null;

  /**
   * Rain DEMOTES a band. It does not disqualify one.
   *
   * The gate below used to sit inside the `else if`, so a day that satisfied the
   * good band on every count except the weather being dry fell past `fair` —
   * which lists MARGINAL ranges and therefore scores near zero on a pleasant day
   * — and landed in the "matched nothing" bucket, which tops out at 39.
   *
   * Measured at Rutland: Monday 7 September carried 0.3 mm across three hours,
   * a Force 3 and 15-20 °C. Its good band scored 0.899, fractionally BETTER than
   * the dry Sunday either side of it, which scored 81. Monday scored 33 — the
   * bucket's ceiling of 39, less the rain penalty. Three hours of drizzle, two
   * tenths of a millimetre of it, moved hiking from "Good" to "Not a day for
   * hiking" while the day itself was the better of the two.
   *
   * Note also that this is the SECOND charge for the same rain: `rainWeight`
   * below already subtracts for wetness, and the caps below that already stop a
   * genuinely wet day reading well. The gate's job is only to keep the word
   * "good" off a wet day, and a demotion does that without pretending the day
   * resembles nothing the activity describes.
   */
  const rainExempt = isWaterActivity || wantsRain;
  /**
   * A criterion that decides whether the activity is SAFE has to be met better
   * than one that decides whether it is pleasant.
   *
   * The floor is 0.35 for everything, deliberately loose — it exists to stop a
   * comfortable variable papering over the deciding one, not to make bands hard
   * to reach. But for the deciding one itself, 0.35 is too loose. Measured on a
   * Force 3 mean gusting Force 6 at Rutland:
   *
   *   kayaking   good band asks gust<9 m/s, the gust was 11 -> 0.39 -> "Good"
   *   canoeing   good band asks gust<7 m/s, the gust was 11 -> 0.21 -> vetoed
   *
   * Two tiles side by side on the same water, one reading "A good day on the
   * water" and the other "Not safe for canoeing today", separated by 0.18 on
   * one criterion. Kayaking was being called good while failing the gust rule
   * its own model writes down.
   *
   * The ORDER is right and stays — a board is a sail, an open canoe catches
   * wind, a kayak sits low, so their thresholds should differ. What was wrong
   * is that a clear miss still bought the word "good".
   */
  /* `windSpeed` is deliberately NOT here. Its common failure is too LITTLE of
     it — a windsurfer's good band starts at 4.5 m/s and a light day misses it
     from below — which is a shortfall, not a hazard, and the library already
     draws that line (see SHORTFALL_NOT_HAZARD in activitySuitability). Adding
     it demoted windsurfing on a gusty afternoon for the sin of a soft mean,
     which is the opposite of what a windsurfer thinks of that day. Too MUCH
     wind is caught by the poor band and its veto, as it was before. */
  const DECIDES_SAFETY = new Set(['gust', 'waveHeight', 'waterTemperature']);
  const worstSafety = (b: { criteria: { score: number; key: string }[] }) => {
    const scored = b.criteria.filter((c) => DECIDES_SAFETY.has(c.key));
    return scored.length ? Math.min(...scored.map((c) => c.score)) : 1;
  };

  const goodQualifies = good.criteria.length > 0 && good.mean > 0.5 && worst(good) >= 0.35;
  const rainBlocksGood = !rainExempt && wetness >= 0.2;
  /**
   * ...and only where the gust is a safety question rather than a comfort one.
   *
   * On the water a gust is what capsizes you; on a lawn it is what takes the
   * tablecloth. Applied to everything, this rule took golf, cricket,
   * picnicking, outdoor yoga and painting down 25 points apiece on an ordinary
   * breezy afternoon — which is the same over-reach as treating a bog as a
   * hazard, and wrong for the same reason.
   *
   * `isWaterActivity` is the line the rest of this function already draws.
   */
  const safetyBlocksGood = isWaterActivity && worstSafety(good) < 0.5;

  if (perfect.criteria.length && perfect.mean > 0.8 && worst(perfect) >= 0.5
      && (rainExempt || rainMm <= 0.2) && penalty < 0.3) {
    score = span(perfect.mean, 0.8, 1, 88, 98);
    band = perfect;
  } else if (goodQualifies && !rainBlocksGood && !safetyBlocksGood) {
    score = span(good.mean, 0.5, 1, 60, 87);
    band = good;
  } else if (goodQualifies) {
    /* Rain or a missed safety criterion refused the good band — neither
       disqualifies it. Land in the fair range, positioned by how good the day
       otherwise is, and take the ordinary fair reading if it is the kinder of
       the two.

       Demotion rather than refusal matters as much here as it did for rain:
       falling past `fair` lands in the bucket for days that match nothing,
       which would have taken kayaking on a gusty afternoon from 74 to about
       33 — from "a good day on the water" to worse than the canoeing beside
       it, which is the same contradiction the other way round. */
    const asFair = fair.criteria.length && fair.mean > 0.3 ? span(fair.mean, 0.3, 1, 40, 59) : 0;
    score = Math.max(span(good.mean, 0.5, 1, 40, 59), asFair);
    band = good;
    /* Rain first where both apply: it is the more legible complaint, and it is
       the one a reader can see out of the window. */
    demotedBy = rainBlocksGood ? 'rain' : 'safety';
  /* No `worst()` floor on the fair band, deliberately. Perfect and good list
     DESIRABLE values, so failing one badly should disqualify the band. Fair
     lists MARGINAL ones — "temperature=5..10 or 26..30" is the chilly-or-hot
     range — so a pleasant 16 °C scores zero against it. Applying the floor here
     would disqualify the fair band for being too nice a day. */
  } else if (fair.criteria.length && fair.mean > 0.3) {
    score = span(fair.mean, 0.3, 1, 40, 59);
  } else if (!perfect.criteria.length && !good.criteria.length && !fair.criteria.length) {
    /**
     * Nothing could be evaluated at all — the forecast carries none of the
     * fields this model asks about.
     *
     * That is a different statement from "the day is bad", and must not be
     * scored as one. It happens whenever a model written for the coast is asked
     * about an inland water: wave height, swell period and sea temperature are
     * all absent, so a genuinely unanswerable question would otherwise come out
     * as a confident "Tough". Mid-scale is the honest answer, and the endpoint's
     * `neutralCriteria` field exists to say so alongside it.
     */
    score = 50;
  } else {
    /* Criteria WERE evaluated and none of them matched a band — so the day
       really does sit outside everything this activity describes. Positioned by
       the best partial match, so a near miss still reads above a total one. */
    score = span(Math.max(perfect.mean, good.mean, fair.mean), 0, 0.5, 20, 39);
    band = [perfect, good, fair].sort((a, b) => b.mean - a.mean)[0];
  }

  // Evening adjustments for outdoor
  if (isEveningToday) {
    const hour = new Date(opts.nowTs).getHours();
    const eveningRes = applyEveningBonus(activity as unknown as ActivityType, hour, contextTags, opts);
    score *= eveningRes.multiplier;
  }

  // Subtract penalty (40pt full-scale impact)
  score = score - Math.round(penalty * 40);

  /**
   * Rain caps for non-water activities, now against a rate.
   *
   * 4 mm/h is the Met Office's own boundary for heavy rain and 0.5 mm/h is about
   * where drizzle becomes rain you notice. Both are thresholds for an intensity,
   * which is what `rainRateMmH` now is. A long drizzly day still lands here
   * through duration rather than through rate — see the seasonal and duration
   * handling below.
   */
  /**
   * Rain, graded rather than only capped — and counted for water sports too.
   *
   * A cap alone made every wet day score the same, so a drizzle and a downpour
   * were indistinguishable and "which day this week is driest" had no answer.
   * More rain now always scores lower.
   *
   * Water activities used to be exempt outright, on the reasonable ground that
   * someone about to get wet minds the rain less. Reasonable is not the same as
   * nil: sixteen hours of drizzle is a worse day on a dinghy than a dry one, and
   * exempting it entirely had 4.6 mm over sixteen hours reading as "A good day
   * for sailing". So they carry the same shape at about a third of the weight,
   * and keep their exemption from the hard caps.
   */
  /* An activity whose bands ask for rain is not also charged for getting it —
     the model already made that judgement. See wantsRain above. */
  const rainWeight = wantsRain ? 0 : isWaterActivity ? 9 : 25;
  score -= Math.round(wetness * rainWeight);
  if (!isWaterActivity && !wantsRain) {
    if (rainRateMmH !== null && rainRateMmH >= 4) score = Math.min(score, 39);
    else if (wetness >= 0.5) score = Math.min(score, 59);
    /* Hours of it, even gentle, is its own kind of poor day. Only applied where
       the source actually published the hours — never inferred. */
    if (rainHours !== null && rainHours >= 8) score = Math.min(score, 55);
  }

  // ➕ Wind-aware adjustment: caps a score whose wind the model's own bands
  // were too coarse to catch. See applyWindRecommendationScoring.
  score = applyWindRecommendationScoring(activity as MinimalActivity, w, score).score;

  /**
   * Soil moisture, for the activities that care about the ground — but only
   * where their own bands do not already score it.
   *
   * `adjustScoreForMud` is a generic penalty written for models that say
   * nothing about the ground. All twenty-four that DO say something now have
   * calibrated bands, and applying both charges them twice: measured, a muddy
   * day took the band's own reduction and then another 15 points and a cap at
   * 65 on top. Same shape as the rain caps, same resolution — the model's own
   * judgement wins, and the generic rule covers what the model is silent about.
   *
   * Its message survives either way: `getMudMessage` is appended to the
   * reasoning separately, and "Muddy paths — waterproof boots recommended" is
   * worth saying whichever half did the scoring.
   */
  const bandsScoreSoil = [
    ...(activity.perfectConditions ?? []), ...(activity.goodConditions ?? []),
    ...(activity.fairConditions ?? []), ...(activity.poorConditions ?? []),
  ].some((c) => c.startsWith('soilMoisture'));
  if (!bandsScoreSoil) {
    score = adjustScoreForMud(activity as MinimalActivity, w, score).score;
  }

  // ➕ Snow.
  const snowAdjusted = applySnowRecommendationScoring(activity as MinimalActivity, w, score);
  score = snowAdjusted.score;

  // Risk caps: a day carrying real hazard cannot present as a good one.
  if (penalty >= 0.5) score = Math.min(score, 59);
  else if (penalty >= 0.3) score = Math.min(score, 89);

  /**
   * Out of season, and finally acting on it.
   *
   * `seasonalMonths` has been on the models since they were written and
   * `outOfSeason` has been derived from it in the caller since then too — and
   * passed to `console.log` and nothing else. So wild swimming's [5,6,7,8,9] and
   * camping's April-to-September had no effect on any score, and Alton's
   * campsite scored the same in January as in July.
   *
   * Capped rather than zeroed: a mild February afternoon is a genuinely poor
   * camping day rather than an impossible one, and some of these seasons are
   * about a venue's opening hours rather than about the weather.
   */
  if (opts.month && activity.seasonalMonths?.length
      && !activity.seasonalMonths.includes(opts.month)) {
    score = Math.min(score, 35);
  }

  /**
   * ─── What the sentence is about ─────────────────────────────────────────
   *
   * One ordered choice, made here rather than in the copy layer, because only
   * this function knows which of the several things that moved the score
   * actually moved it most.
   *
   *   1. Rain, when rain is what pulled it down. The band is chosen before any
   *      of the rain handling above runs, so on a wet day the band's own weakest
   *      criterion is not the reason and the reader was being told about the
   *      breeze instead.
   *
   *   2. The poor condition nearest to firing. On a day that is not going well
   *      this is a far more reliable source than the matched band: a poor
   *      condition can only ever point the bad way, whereas a FAIR band lists
   *      marginal ranges — so a day comfortably better than one scores zero
   *      against it and gets reported as a failure. That produced "Very little
   *      wind — Force 4" on a swimming tile whose fair band was written for
   *      6–8 m/s.
   *
   *   3. The band's weakest criterion, but only for a perfect or good day,
   *      where every criterion in the band describes something desirable and
   *      the weakest one is therefore a real answer.
   *
   * Anything else leaves `binding` undefined and the copy layer falls back to a
   * plain statement of the day, which is always true and never contradicts the
   * verdict beside it.
   */
  const asBinding = (c: CriterionScore, badness: number): CriterionScore =>
    ({ ...c, score: 1 - badness });

  /**
   * Keys that cannot be the stated reason, however close to firing they look.
   *
   * `evaluateConditionScore` grades a `>` condition against the threshold's own
   * magnitude, which is a reasonable proxy for wind (span 8) and a poor one for
   * humidity (span 90): 75% reads as 42% of the way to a 90% limit, when in
   * practice British humidity never goes near zero and 75 is an ordinary
   * afternoon. That produced "Not a day for trail running. Humid at 75%." on a
   * clear January morning.
   *
   * Only humidity. Cloud was excluded here too at first and that was wrong: it
   * sits on a 0-100 scale with a meaningful zero, and for stargazing or
   * photography it is not a comfort variable but the whole question. Humidity
   * keeps its own note further down, which fires on the days it genuinely is
   * the story.
   */
  const NOT_A_REASON = new Set(['humidity']);
  const nearestPoor = poor.all
    .filter((c) => !NOT_A_REASON.has(c.key))
    /**
     * Zero of a thing is not nearly too much of it.
     *
     * `precipitation>0` scored 0.5 — "half way to firing" — on a completely dry
     * day, because the graduated `>` scorer divides by the threshold's own
     * magnitude and a threshold of zero has none. That put "Rain, which settles
     * it." on a clear dry night.
     */
    .filter((c) => !(c.direction === 'high' && c.value === 0))
    .slice().sort((a, b) => b.score - a.score)[0];

  /**
   * Name the rain whenever the rain is what cost the points.
   *
   * The naming threshold (0.35) and the band gate (0.20) were different numbers,
   * so a day in between was sunk by rain and then explained by something else.
   * That is how Monday came back as "Not a day for hiking. Gentle breeze,
   * Force 3, 19 °C" — a pleasant sentence under a score of 33, with the actual
   * cause unmentioned. A demotion now always speaks.
   */
  /* A day the SAFETY floor demoted says so, naming the criterion that did it —
     which for a paddler is the gust, and is the whole reason the day dropped a
     band. Ahead of the nearest-poor guess below, because this is not a guess. */
  const safetyBinding = demotedBy === 'safety'
    ? good.criteria
      .filter((c) => DECIDES_SAFETY.has(c.key))
      .slice().sort((a, b) => a.score - b.score)[0]
    : undefined;

  if (safetyBinding) {
    /**
     * Marked decisive, and NOT told which way it failed.
     *
     * This forced `direction: 'high'`, which is true of a gust and false of the
     * other thing in the safety set: water temperature fails from BELOW.
     * Measured, sea swimming in 12 °C water — under the good band, over the
     * poor one, so it reaches this path rather than the veto:
     *
     *   Workable for sea swimming. Water up at 12 °C.
     *
     * "Up at", of water too cold to be in. `clauseFor` infers the direction
     * from the condition and the value when none is given, and it infers it
     * correctly; the override existed only because every case I had in front
     * of me was a gust.
     */
    band = { mean: band.mean, criteria: [{ ...safetyBinding, decisive: true }] };
  } else if ((wetness > 0.35 || demotedBy === 'rain') && !wantsRain) {
    band = {
      mean: band.mean,
      criteria: [asBinding(
        {
          condition: 'precipitation=0..1',
          key: 'precipitation',
          score: 0,
          /* Injected because rain is known to be the cause — see `decisive`. */
          decisive: true,
          value: rainMm,
          /* Stated, because the numbers cannot say it: on a drizzly day the
             total is a fraction of a millimetre and reads as comfortably INSIDE
             the range, so the copy layer found no direction and said nothing
             about the rain at all. What made the day wet was its length. */
          direction: 'high',
        },
        wetness,
      )],
    };
  } else if (nearestPoor && nearestPoor.score > 0.4) {
    band = { mean: band.mean, criteria: [asBinding(nearestPoor, nearestPoor.score)] };
  } else if (score < 60) {
    /**
     * Neither rain nor a near-miss explains it, and below "good" the band's own
     * weakest link generally cannot be trusted — a fair band lists marginal
     * RANGES, so a day better than one scores zero against it.
     *
     * That reasoning holds for scalars, where "outside the range" can mean
     * either side. It does not hold for a direction: a wind outside the arc an
     * activity wants is simply the wrong wind, and there is no sense in which a
     * north-easterly is "better than marginal" for something that needs an
     * Atlantic westerly. So those keys survive the suppression, and the tile
     * gets to say the thing the reader most needs to hear.
     */
    const OUTSIDE_IS_SIMPLY_WRONG = new Set(['windDirection']);
    const directional = band.criteria
      .filter((c) => OUTSIDE_IS_SIMPLY_WRONG.has(c.key) && c.score < 0.5)
      .sort((a, b) => a.score - b.score)[0];
    band = { mean: band.mean, criteria: directional ? [directional] : [] };
  }

  /**
   * An activity decided by water temperature cannot claim a top score without one.
   *
   * Every band of `wild_swimming` and its siblings is written around
   * `waterTemperature`, and no inland source supplies it — so on a reservoir the
   * model is left scoring air temperature and wind. That is enough to rule a day
   * OUT, which is why the January case now reads correctly, but it is nowhere
   * near enough to rule one IN: a reservoir lags the air by weeks and is coldest
   * in spring, exactly when the first warm afternoon arrives.
   *
   * So the ceiling is the top of "Good". The day can still be described, and the
   * band it cannot reach is the one that would have put "Peak" beside a swim in
   * water nobody has measured.
   */
  if (typeof w.waterTemperature !== 'number'
      && activity.poorConditions?.some((c) => c.includes('waterTemperature'))) {
    score = Math.min(score, 79);
  }

  /* Floor is 16, not 5: below that belongs to the hazard veto alone, so a
     vetoed day always sorts under an un-vetoed one. See the veto above. */
  score = Math.max(16, Math.min(98, score));
  return {
    score: Math.round(score),
    /* The criterion that held the day back — the weakest one in whichever band
       decided the score. This is what the sentence is written from. */
    binding: band.criteria.slice().sort((a, b) => a.score - b.score)[0],
    snow: snowAdjusted.snow ? { level: snowAdjusted.snow.level, message: snowAdjusted.snow.message } : undefined,
  };
}

// Define these helper functions if they don't exist elsewhere
function getScoreEvaluation(score: number): SuitabilityLevel {
  return toLevel(score);
}

/**
 * The sentence shown under a verdict.
 *
 * Written from the criterion that actually decided the score — see
 * utils/activityReasons, which owns the words. This function's whole job is now
 * to assemble the inputs and to add the two contextual notes that are not
 * criteria of any band.
 */
function getReasoningForScore(
  score: number,
  activity: ActivityType,
  weather: WeatherData,
  ctx: { binding?: CriterionScore; vetoed?: boolean; outOfSeason?: boolean } = {},
): string {
  /* Same normalisation the scorer used, so the sentence quotes the numbers that
     were actually scored rather than re-deriving a different set. */
  const w: SuitabilityWeather = {
    temperature: weather.temperature,
    airTemperature: weather.temperature,
    temperatureMin: weather.temperatureMin,
    precipitation: weather.precipitation,
    precipitationHours: weather.precipitationHours,
    windSpeed: typeof weather.windspeed === 'number' ? weather.windspeed / 3.6 : undefined,
    gust: typeof weather.gustspeed === 'number' ? weather.gustspeed / 3.6 : undefined,
    windDirection: weather.winddirection,
    clouds: weather.clouds,
    cloudCover: weather.clouds,
    humidity: weather.humidity,
    visibility: typeof weather.visibility === 'number' ? weather.visibility / 1000 : undefined,
    waterTemperature: weather.waterTemperature,
    waveHeight: weather.waveHeight,
    soilMoisture: weather.soilMoisture,
  };

  let base = describeConditions({
    activityId: activity.id,
    /* When the rain falls. Beside the weather rather than in it — see the
       index signature on SuitabilityWeather. */
    rainWindow: weather.rainWindow,
    phrase: phraseFor(activity.id, activity.name),
    score,
    weather: w,
    binding: ctx.binding,
    vetoed: ctx.vetoed,
    outOfSeason: ctx.outOfSeason,
  });

  /* Humidity is in few bands but is what makes a warm day unpleasant. Skipped
     when it is already the binding criterion, or the sentence says it twice. */
  if (score < 40 && ctx.binding?.key !== 'humidity'
      && typeof weather.humidity === 'number' && weather.humidity >= 90) {
    base += ` Humid at ${Math.round(weather.humidity)}%, which will make it feel worse than the number suggests.`;
  }

  // Ground condition, where the activity is one that cares and the data exists.
  if (typeof weather.soilMoisture === 'number' && isMudSensitive(activity.id)) {
    const soil = assessSoilCondition(weather.soilMoisture);
    const msg = getMudMessage(activity.id, soil);
    if (msg) base += ` ${msg}`;
  }

  return base;
}

// Main function
export function getSuggestionsByDay({ 
  forecast, 
  activities, 
  interests,
  now,
  includeAllActivities = false,
  isEveningToday = false
}: {
  /**
   * One entry per day. `date` is a UNIX timestamp in SECONDS, matching what
   * OpenWeather and the Open-Meteo adapter both emit.
   *
   * The unit was undocumented and it started to matter: season is now read off
   * the month of the day being scored, so a millisecond value silently becomes
   * a date around the year 57,000 and the month comes out arbitrary. Callers
   * are normalised below rather than trusted, because the failure is invisible
   * — nothing throws, the score is just quietly capped for being out of a
   * season it was never in.
   */
  forecast: Array<{ date: number; weather: WeatherData }>;
  activities: ActivityType[];
  interests: string[];
  now: Date;
  includeAllActivities?: boolean;
  isEveningToday?: boolean;
}) {
  // Add debugging logs
  debug('📊 getSuggestionsByDay INPUTS:', { 
    forecastLength: forecast.length,
    activitiesCount: activities.length,
    interestsCount: interests.length,
    now: now.toISOString(),
    includeAllActivities,
    isEveningToday
  });

  return forecast.map((day: { date: number; weather: WeatherData }) => {
    debug('🌤️ Processing day:', day.date);
    
    const mapped = activities
      .map((activity: ActivityType) => {
        // Add important debugging log before scoring
        debug(`⚙️ Scoring activity: ${activity.id} with weather:`, day.weather);
        
        /**
         * Season is the month of the DAY BEING SCORED, not of `now`.
         *
         * The old reading took `now`, so on 29 September every day of a seven-day
         * outlook was scored as September — including the four that are October,
         * which is exactly the boundary where a venue's season ends. A one-line
         * error that only shows itself a few days a year, which is why it lasted.
         */
        const dayMonth = new Date(toEpochMs(day.date)).getMonth() + 1;
        const outOfSeason = Boolean(activity.seasonalMonths?.length
          && !activity.seasonalMonths.includes(dayMonth));

        // Calculate score for activity - use dynamic context tags
        const currentDate = new Date(now);
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[currentDate.getDay()];
        const month = currentDate.getMonth(); // 0-11 for Jan-Dec

        const contextTags = buildContextTagsForDay(
          currentDayName, 
          currentDate.getHours(),
          true // Is today
        );

        // Add season tags
        if (month >= 2 && month <= 4) contextTags.push('spring');
        if (month >= 5 && month <= 7) contextTags.push('summer');
        if (month >= 8 && month <= 10) contextTags.push('autumn');
        if (month >= 11 || month <= 1) contextTags.push('winter');

        debug(`🏷️ Using context tags:`, contextTags);

        const { score, snow, binding, vetoed } = calculateActivityScoreWithSnow(
          activity,
          day.weather,
          (day.weather.precipitation ?? 0) < 5, // isWeatherGood
          isEveningToday,
          contextTags,
          { nowTs: now.getTime(), month: dayMonth }
        );

        // When includeAllActivities is true, include ALL activities regardless of score
        if (includeAllActivities || score >= MINIMUM_ACCEPTABLE_SCORE) {
          return {
            activityId: activity.id,
            score,
            evaluation: getScoreEvaluation(score),
            reasoning: getReasoningForScore(score, activity, day.weather, { binding, vetoed, outOfSeason }),
            outOfSeason,
            snow: snow ? { level: snow.level, message: snow.message } : undefined,
          };
        }
        return null;
      });
      const suggestions: Suggestion[] = (mapped.filter(Boolean) as unknown) as Suggestion[];
    suggestions.sort((a, b) => b.score - a.score);
      
    debug(`✅ Finished day with ${suggestions.length} activities`);
    return {
      date: day.date,
      suggestions
    };
  });
}
