/**
 * What does not get a programmatic page, and why.
 *
 * Its own module, and a tiny one, because `middleware.ts` imports it to serve
 * 410 on the retired URLs and middleware runs on every request to the site.
 * `data/seoLocations.ts` is forty kilobytes of city records; pulling that into
 * the edge bundle for one string lookup is not a trade worth making, and
 * relying on tree-shaking to notice would be relying on it silently.
 *
 * `data/seoLocations.ts` re-exports all three, so nothing else needs to know
 * this file exists.
 *
 * @module data/seoRetiredActivities
 */

/**
 * Every activity whose score the weather does not decide.
 *
 * These still exist in the app, and they still matter there: the indoor prompt
 * on a written-off day is one of the better things the product does. What they
 * cannot carry is a page whose entire title is a weather question.
 *
 * The estate was 8,413 pages, of which 3,854 were these — an `INDOOR_ALWAYS`
 * archetype seeding knitting, gaming, DIY and sixteen more at all 106
 * locations, plus eighteen indoor entries inside `UNIVERSAL`.
 * `/knitting/reykjavik` was live, and read: "Today is a day worth a look. A
 * good day for knitting. Moderate breeze, Force 4, gusting Force 7, 11 °C."
 *
 * The exposure was never limited to the junk. A site-level thin-content
 * assessment takes the surf pages down with the knitting ones.
 *
 * WHY A LIST AND NOT AN IMPORT. It is exactly the set of ids the archetypes use
 * for which `activityTypes` says `weatherSensitive: false`, and
 * `__tests__/seoLocations.test.ts` asserts that equality in both directions on
 * every run — so it cannot drift, and adding a new indoor activity to an
 * archetype fails the build rather than quietly publishing 106 more pages. It
 * is not derived at runtime because `data/activityTypes` pulls in every
 * activity definition, which is the weight this module exists to avoid.
 *
 * If you are adding an id here, the question to ask is the page's own H1: is
 * "is today a good day for this?" a question the forecast answers?
 */
export const WEATHER_INDEPENDENT: ReadonlySet<string> = new Set([
  'badminton',
  'bowling',
  'boxing',
  'cafe',
  'cinema',
  'cooking',
  'crafts',
  'dance',
  'diy',
  'gallery',
  'gaming',
  'going_to_pub',
  'gym_workout',
  'ice_hockey_indoor',
  'indoor_climbing',
  'indoor_swimming',
  'knitting',
  'make_music',
  'martial_arts',
  'meditation',
  'museum',
  'painting',
  'pilates',
  'playing_cards',
  'playing_records',
  'reading',
  'shopping',
  'spinning',
  'squash',
  'table_tennis',
  'tai_chi',
  'tennis_indoor',
  'volleyball_indoor',
  'watch_a_movie',
  'yoga',
  'zumba',
]);

/**
 * Ids the archetypes named that no activity actually has.
 *
 * `online` was in `INDOOR_ALWAYS` and therefore at all 106 locations, so one
 * submitted URL in eighty was a soft 404 — `getStaticProps` validates against
 * `activityTypes` and returned `notFound` every time. Small in itself, and
 * exactly the signal that makes a crawler trust the rest of a sitemap less.
 *
 * The test asserts this stays out of the live estate; it is a named constant so
 * the next one has somewhere to be recorded rather than being quietly deleted
 * from an archetype and forgotten.
 */
export const RETIRED_ACTIVITY_IDS: ReadonlySet<string> = new Set(['online']);

/** Both reasons a slug no longer gets a page. */
export const NOT_A_PAGE: ReadonlySet<string> = new Set([
  ...WEATHER_INDEPENDENT,
  ...RETIRED_ACTIVITY_IDS,
]);

/**
 * The same set as URL slugs.
 *
 * Activity ids are snake_case in the data layer and kebab-case in the URL —
 * `pages/[activity]/[location].tsx` converts between them at both ends. The
 * middleware only ever sees the URL form, so it gets the URL form, rather than
 * a third copy of that conversion written inline where it can disagree.
 */
export const NOT_A_PAGE_SLUGS: ReadonlySet<string> = new Set(
  [...NOT_A_PAGE].map((id) => id.replace(/_/g, '-'))
);
