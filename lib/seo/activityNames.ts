/**
 * How an activity is named and addressed, in one place.
 *
 * These three lived inside `pages/[activity]/[location].tsx` as private
 * functions. The hub at `/[activity]`, the index at `/activities` and the leaf
 * page all have to agree on both — a hub that links to `/stand-up-paddleboarding`
 * while the route expects `stand-up-paddleboarding` is a 404, and a hub headed
 * "Where is good for Go Surfing today?" is not English.
 *
 * `activityTypes` carries names written for the app's own picker — surfing is
 * "Go Surfing" there, which reads correctly in a list of things to choose and
 * not at all inside a sentence. `prettyActivityName` is the sentence form.
 *
 * @module lib/seo/activityNames
 */

/**
 * Activity ids are snake_case in the data layer and kebab-case in a URL.
 * Both directions, because both are used at both ends of every link.
 */
export const activityIdToSlug = (id: string): string => id.replace(/_/g, '-');
export const slugToActivityId = (slug: string): string => slug.replace(/-/g, '_');

/**
 * The name as it reads inside a sentence — "a good day for sea kayaking".
 *
 * Lower case throughout, because every caller puts it mid-sentence or applies
 * its own capitalisation in CSS. The overrides are the ids whose underscores do
 * not simply become spaces, plus the ones whose app-facing name is a verb
 * phrase.
 */
export function prettyActivityName(id: string): string {
  const overrides: Record<string, string> = {
    football_soccer: 'football',
    sea_kayaking: 'sea kayaking',
    stand_up_paddleboarding: 'stand-up paddleboarding',
    sup_sea: 'sea SUP',
    sea_swimming: 'sea swimming',
    wild_swimming: 'wild swimming',
    rock_climbing: 'rock climbing',
    indoor_climbing: 'indoor climbing',
    mountain_biking: 'mountain biking',
    road_cycling: 'road cycling',
    gravel_biking: 'gravel cycling',
    trail_running: 'trail running',
    fly_fishing_freshwater: 'fly fishing',
    sea_fishing_shore: 'shore sea fishing',
    sea_fishing_boat: 'boat sea fishing',
    coarse_fishing: 'coarse fishing',
    ice_fishing: 'ice fishing',
    cross_country_skiing: 'cross-country skiing',
    ice_skating: 'ice skating',
    ice_hockey: 'ice hockey',
    ice_hockey_indoor: 'indoor ice hockey',
    ice_hockey_us: 'ice hockey',
    gaelic_football: 'Gaelic football',
    hurling_camogie: 'hurling and camogie',
    american_football: 'American football',
    beach_volleyball: 'beach volleyball',
    basketball_outdoor: 'outdoor basketball',
    volleyball_indoor: 'indoor volleyball',
    tennis_indoor: 'indoor tennis',
    indoor_swimming: 'indoor swimming',
    outdoor_yoga: 'outdoor yoga',
    outdoor_meditation: 'outdoor meditation',
    outdoor_painting: 'outdoor painting',
    outdoor_music: 'outdoor music',
    outdoor_chess: 'outdoor chess',
    outdoor_reading: 'outdoor reading',
    outdoor_gardening: 'gardening',
    outdoor_playground: 'outdoor play',
    outdoor_gym: 'outdoor gym',
    urban_exploring: 'urban exploring',
    going_to_pub: 'going to the pub',
    table_tennis: 'table tennis',
    playing_cards: 'card games',
    watch_a_movie: 'film at home',
    playing_records: 'listening to records',
    make_music: 'making music',
    jet_skiing: 'jet skiing',
    rock_hopping: 'rock hopping',
    martial_arts: 'martial arts',
    tai_chi: 'tai chi',
    mushroom_hunting: 'mushroom hunting',
    sailing_inland: 'inland sailing',
    windsurfing_inland: 'inland windsurfing',
    riding_motorbike: 'motorbike riding',
    gym_workout: 'gym workouts',
  };
  return overrides[id] ?? id.replace(/_/g, ' ');
}
