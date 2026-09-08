/**
 * What can be done after dark.
 *
 * The call cuts a day into morning, afternoon and evening and says which is
 * best. The evening bucket is 18:00 to midnight, and in December in the UK the
 * sun is down for all of it — so "Best in the evening" for cricket is the same
 * mistake as "Best in the morning" for stargazing, from the other end of the
 * day. Measured before this existed: football in Sheffield on 12 December
 * scored prime/81 in the evening bucket, identical to its 10am score.
 *
 * `computeEveningLightMultiplier` has known how to handle this since it was
 * written — it reads `floodlit`, `evening_ok` and `summer_evening` off an
 * activity's tags and suppresses the rest after sunset. It had nothing to read:
 * of 81 outdoor activities, exactly one carried any light tag at all
 * (`ice_skating`), and none were marked floodlit.
 *
 * SO THE LISTS LIVE HERE, NOT IN THE TAGS. Thirty judgements scattered across
 * eight data files is thirty places to look when one of them is wrong, and
 * these are judgements — "is this normally floodlit" has a different answer in
 * Sheffield and in Seville. One list is one place to argue with.
 *
 * THE DEFAULT IS DAYTIME. Anything not named below is suppressed after dark,
 * which is the right direction to be wrong in: the cost of a missing entry is
 * that the app declines to suggest a fine evening, and the cost of a wrong one
 * is somebody driving to a reservoir to find they cannot see the water.
 * Watersports, winter sports and nature activities are absent as a block and
 * that is deliberate rather than an oversight.
 *
 * @module data/activityLight
 */

/**
 * Played under lights, so darkness is not the constraint.
 *
 * The test is whether the ordinary amateur version of the thing happens under
 * floodlights on a winter evening — five-a-side and club tennis, yes; a village
 * cricket match, no; a round of golf, no, whatever the driving range does.
 */
export const FLOODLIT: ReadonlySet<string> = new Set([
  'football_soccer',
  'american_football',
  'rugby',
  'gaelic_football',
  'hurling_camogie',
  'hockey',
  'netball',
  'basketball_outdoor',
  'baseball',
  'tennis',
  'padel',
  'pickleball',
  'ice_hockey',
  'ice_skating',
  'skateboarding',
]);

/**
 * Done after dark without floodlights, by ordinary people, routinely.
 *
 * Not "possible in the dark" — almost anything is possible with a head torch.
 * The test is whether it is a normal way to do the activity. Running and
 * cycling with lights are how half of winter training happens; night fishing is
 * the point of night fishing; a barbecue and music outdoors are evening things
 * by nature. Hiking and trail running are NOT here: people do them at night,
 * but suggesting a dark mountain to somebody who did not ask is the failure
 * this whole file is guarding against.
 *
 * These are damped rather than allowed — `EVENING_OK_AFTER_DARK` is -30%, so an
 * evening run still ranks below the same run in daylight.
 */
export const AFTER_DARK: ReadonlySet<string> = new Set([
  'running',
  'cycling',
  'road_cycling',
  'dog_walking',
  'urban_exploring',
  'camping',
  'bbq',
  'sea_fishing_shore',
  'coarse_fishing',
]);

/**
 * Things the evening is *for*.
 *
 * The other two lists only ever take score away. These give it back: the pub,
 * the cinema, a gig and a dance floor are not neutral about the hour, they are
 * evening-shaped, and an app that offers you bowling at nine in the morning has
 * not understood the question any better than one that offers you cricket at
 * nine at night.
 *
 * Being on this list also means darkness is not a constraint — a gig outdoors
 * in December is a gig, not a problem — so `outdoor_music` needs no separate
 * after-dark entry.
 *
 * Deliberately short. Almost anything *can* be done in the evening, and a long
 * list here would flatten back into no preference at all; these are the ones
 * where the evening is the point rather than an option.
 */
export const EVENING: ReadonlySet<string> = new Set([
  'going_to_pub',
  'cinema',
  'bowling',
  'dance',
  'outdoor_music',
  'make_music',
  'playing_records',
  'watch_a_movie',
]);

/**
 * Things nobody does before nine in the morning.
 *
 * The day grew a fourth part, `early` (06:00-09:00), so a hot country's usable
 * window would stop being averaged into a 27 °C late morning. It is judged at
 * 07:00 — and at seven o'clock the weather can be perfect for a barbecue and
 * the suggestion still be absurd. Conditions are not the only thing that makes
 * an hour wrong for an activity.
 *
 * ─── Why the default is the OTHER WAY ROUND from the lists above ─────────
 *
 * `AFTER_DARK` names what CAN be done, and anything unlisted is suppressed,
 * because the cost of a wrong entry is somebody driving to a reservoir they
 * cannot see. This list names what CANNOT, and anything unlisted is allowed.
 *
 * The asymmetry is deliberate, and it is about what a missing entry costs. Most
 * physical activity is fine at seven — running, walking the dog, cycling,
 * fishing, birdwatching, a dawn tee time, an early court — and in the climates
 * this part of the day exists FOR, seven o'clock is the only civilised hour
 * there is. An allow-list would have to name almost every activity in the
 * library, would certainly be under-populated, and every omission would silently
 * undo the thing the early block was built to do.
 *
 * So a missing entry here costs an odd-sounding suggestion, and a wrong entry
 * costs a Sevillian being told there is nowhere to run at the only cool hour of
 * their day. The first is embarrassing and the second is useless.
 *
 * ─── What is on it, and what deliberately is not ─────────────────────────
 *
 * A MEAL OR AN OCCASION, which needs other people and a time of day people keep.
 * A barbecue at seven in the morning is the case that prompted this.
 *
 * A SCHEDULED EVENT. Nobody puts on outdoor music at dawn.
 *
 * NOT the team sports, though a 7 a.m. fixture would be odd: the app is not
 * scheduling a match, it is saying the conditions suit a game, and a kickabout
 * before work is a real thing. NOT golf or tennis — a dawn tee time and an
 * early court are precisely what people do to beat the heat. NOT the beach: in
 * a hot country a swim at seven is the whole point.
 */
export const NOT_BEFORE_NINE: ReadonlySet<string> = new Set([
  'bbq',
  'picnicking',
  'outdoor_music',
  /* Indoor and evening things that never reach the early bucket anyway, listed
     so the set reads as a complete judgement rather than a partial one. */
  'going_to_pub',
]);

/**
 * The tags `computeEveningLightMultiplier` expects, for one activity.
 *
 * Merged with whatever the library already carries rather than replacing it, so
 * an activity that grows a real `floodlit` tag in its own data keeps working
 * and this file can lose the entry.
 */
export function lightTagsFor(activityId: string, existing: readonly string[] = []): string[] {
  const out = [...existing];
  if (FLOODLIT.has(activityId) && !out.includes('floodlit')) out.push('floodlit');
  if (AFTER_DARK.has(activityId) && !out.includes('evening_ok')) out.push('evening_ok');
  return out;
}
