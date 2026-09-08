/**
 * What a criterion is FOR — the one table that six ad-hoc sets were
 * approximating.
 *
 * ─── What this replaces ──────────────────────────────────────────────────
 *
 * "How much does this criterion matter" was expressed six times, in three
 * files, by sets that were each added to fix one bug:
 *
 *     SHORTFALL_NOT_HAZARD   activitySuitability   too little isn't dangerous
 *     NEVER_A_HAZARD         activitySuitability   penalises, never vetoes
 *     NOT_A_HAZARD_ON_LAND   activitySuitability   gust, conditional on water
 *     PRICED_ELSEWHERE       getSuggestionsByDay   exempt from the band floor
 *     DECIDES_SAFETY         getSuggestionsByDay   stricter floor on water
 *     DANGEROUS_KEYS         bands                 which vetoes read "unsafe"
 *
 * `gust` appeared in three of them with three different answers. None was
 * per-activity. Together they were an unmanaged approximation of one question,
 * and every new criterion — thunder, freezing rain — had to be added to
 * several of them by hand, with nothing to say which.
 *
 * ─── The three roles ─────────────────────────────────────────────────────
 *
 *   SAFETY     being wrong gets somebody hurt. Vetoes, and the veto reads as
 *              `unsafe` rather than as a no.
 *   VIABILITY  the activity cannot happen. Vetoes, and reads as `notToday`.
 *   COMFORT    the day is worse but possible. Penalises. Never vetoes, and
 *              never disqualifies a band on its own.
 *
 * Eighteen keys, sixteen of which take one role everywhere. The two that do
 * not are the two the code already had predicates for, which is the reason to
 * believe the model rather than a coincidence:
 *
 *   `gust`       safety on water, comfort on land. A gust capsizes a dinghy
 *                and takes a tablecloth off a lawn. `isWaterActivity`.
 *   `windSpeed`  safety when there is too much, viability when too little —
 *                no amount of sunshine makes a windless day windsurfable.
 *                `firedLow`.
 *
 * ─── Read this before adding a key ───────────────────────────────────────
 *
 * An unlisted key defaults to VIABILITY, which vetoes but does not claim to be
 * dangerous. That is the conservative answer for something nobody has thought
 * about: it will stop a day rather than silently pass one, and it will not put
 * a red band on a picnic. `__tests__/criterionRoles.test.ts` asserts every key
 * the library actually uses is listed, so the default is a safety net and not
 * a place to leave things.
 *
 * @module utils/criterionRoles
 */

export type CriterionRole = 'safety' | 'viability' | 'comfort';

/**
 * The keys whose role never depends on the activity or the direction.
 *
 * `airTemperature`, `temperatureMin` and `temperatureMax` sit beside
 * `temperature` because they are the same physical quantity read at a
 * different moment — camping states its cold limit on the overnight low, and
 * an audit that greps only `temperature` misreads it as having none.
 */
const FIXED_ROLES: Readonly<Record<string, CriterionRole>> = {
  /* SAFETY — the sea, the sky and the things that put you in hospital. */
  waveHeight: 'safety',
  swellHeight: 'safety',
  waterTemperature: 'safety',
  snowfallRateMmH: 'safety',
  visibility: 'safety',
  thunderstormHours: 'safety',
  freezingRainHours: 'safety',

  /* VIABILITY — the activity stops being the activity. */
  temperature: 'viability',
  airTemperature: 'viability',
  temperatureMin: 'viability',
  temperatureMax: 'viability',
  snowDepthCm: 'viability',
  swellPeriod: 'viability',
  windRelative: 'viability',
  windDirection: 'viability',
  /* Too MUCH wind stops the activity, and the poor band says where. It is not
     filed as safety because the danger afloat is carried by `gust`, and putting
     a red band on every windy day would spend the word. */
  windSpeed: 'viability',

  /* COMFORT — the day is worse. It is still a day. */
  soilMoisture: 'comfort',
  humidity: 'comfort',
  cloudCover: 'comfort',
  clouds: 'comfort',
  precipitation: 'comfort',
};

/**
 * ─── The reasoning the three deleted sets carried, kept ──────────────────
 *
 * SHORTFALL_NOT_HAZARD, on why too little is not a danger: "`windSpeed<1.5` on
 * a dinghy, or `waveHeight<0.25` on a surfboard, says 'there is nothing to work
 * with', not 'you may not come back'. Before this distinction existed, a flat
 * calm on a sailing tile produced the sentence 'Not safe for sailing today',
 * which is both false and the kind of false that teaches a reader to ignore the
 * real warnings."
 *
 * NEVER_A_HAZARD, on ground condition: "Dry ground is the best a walker can
 * hope for — several models carried `soilMoisture<10` as a poor condition,
 * inherited from an agricultural reading where dry soil is a real problem, and
 * left as a hazard it vetoed a perfect summer day. And a waterlogged path is
 * unpleasant, not unsafe: at the wettest hour of the measured year it dropped
 * hiking from 81 to 14 on a two-point change, which is a cliff where the ground
 * itself has a gradient. These still count towards the penalty, so a bog still
 * costs a day most of its score. They simply cannot short-circuit the scoring
 * the way a gale can."
 *
 * NOT_A_HAZARD_ON_LAND, on gusts: measured over a real year at five UK and
 * Irish places, the daily maximum gust has a median of 12.3 m/s and runs about
 * three times the daily mean wind — so an ordinary Force 3 afternoon carries a
 * 12 m/s gust somewhere in it, and picnicking, bbq and outdoor yoga were all
 * reading UNSAFE on the median day of the British year.
 *
 * All three are the same sentence: a criterion that makes the day worse is not
 * a criterion that makes it dangerous.
 */

export interface RoleContext {
  /** True where the activity happens on water. `isWaterActivity`. */
  onWater?: boolean;
  /** True where the criterion fired because there was too LITTLE. `firedLow`. */
  firedLow?: boolean;
}

/**
 * The role a criterion plays for this activity, in this direction.
 *
 * `onWater` defaults to true and `firedLow` to false, so a caller that has not
 * thought about either gets the stricter reading rather than a silently
 * relaxed one.
 */
export function roleFor(key: string, ctx: RoleContext = {}): CriterionRole {
  /* A shortfall is a disappointment, not a danger — whatever the quantity is
     when there is too much of it. This is the whole of SHORTFALL_NOT_HAZARD,
     and it has to be tested first: `waveHeight` is a safety criterion at 3 m
     and "there is nothing to surf" at 0.1 m, and only one of those is a
     reason to stop somebody. */
  if (ctx.firedLow && SHORTFALL_IS_NOT_A_DANGER.has(key)) return 'comfort';

  if (key === 'gust') return ctx.onWater !== false ? 'safety' : 'comfort';

  return FIXED_ROLES[key] ?? 'viability';
}

/** Every key with a stated role, for the test that keeps the table complete. */
export const ROLED_KEYS: readonly string[] = [...Object.keys(FIXED_ROLES), 'gust'];

/**
 * Quantities where having too LITTLE is the disappointment.
 *
 * See the quoted reasoning above: a flat calm on a sailing tile used to read
 * "Not safe for sailing today".
 */
const SHORTFALL_IS_NOT_A_DANGER: ReadonlySet<string> = new Set([
  'windSpeed', 'gust', 'waveHeight', 'swellHeight', 'swellPeriod', 'snowDepthCm',
]);

/**
 * A criterion that has fired: does it stop the day, or only cost it?
 *
 * The single question `NEVER_A_HAZARD`, `NOT_A_HAZARD_ON_LAND` and the
 * `firedLow` half of `SHORTFALL_NOT_HAZARD` were each answering.
 */
export function isHazard(key: string, ctx: RoleContext = {}): boolean {
  return roleFor(key, ctx) !== 'comfort';
}

/**
 * Does a veto on this key deserve the red band?
 *
 * `DANGEROUS_KEYS` in `lib/godaisy/call/bands`. Only SAFETY earns it —
 * "unsafe" has to mean somebody could get hurt, or it stops being read. A
 * picnic marked unsafe on the median British day was the bug that started
 * this; see `__tests__/gustOnLand.test.ts`.
 */
export function isDangerous(key: string, ctx: RoleContext = {}): boolean {
  return roleFor(key, ctx) === 'safety';
}

/**
 * ─── The set that did NOT consolidate, and why ───────────────────────────
 *
 * `PRICED_ELSEWHERE` in `getSuggestionsByDay` stays where it is, as
 * `{ precipitation }`. It looked like a sixth member of this family and it is
 * not: it answers "is this quantity already charged somewhere else?", which is
 * a fact about the SCORER, not about the criterion.
 *
 * Rain is charged by `wetness`, by `rainWeight` and by three caps, so a fourth
 * charge at the band floor was fatal — 45 of the 118 models write
 * `precipitation=0` in their good band, which scores zero at about a
 * millimetre. Nothing else in the library is charged four times, so nothing
 * else belongs in that exemption.
 *
 * Deriving it from COMFORT was tried and broke three tests in one run: a
 * waterlogged field stopped disqualifying a picnic, and stargazing under 50%
 * cloud stopped being demoted. Both are deliberate, both are comfort
 * criteria, and both SHOULD be able to disqualify a band — they simply must
 * not be able to call the day dangerous. That is the line this module draws,
 * and it is a different line from the one PRICED_ELSEWHERE draws.
 */
