// Lightweight, dependency-free activity recommender for Settings (and elsewhere).
// It ranks suggested activities based on a user's current selections using
// a neighbour map. Rank = frequency (desc), then alphabetical by label (or id).
//
// Usage:
//   import { activityRecommendations, rankRecommendations } from './recommendations';
//   const suggestions = rankRecommendations(currentSlugs, { limit: 8, labelMap: ACTIVITY_NAME_MAP });
//
// Notes:
// - `labelMap` is optional: pass a Record<slug, label> to get smarter alphabetical tie-breaks.
// - IDs in the map that don't exist in your catalogue are ignored at ranking time.
// - Pure, side-effect free: safe to use on server or client.

export type ActivityId = string;
export type LabelMap = Record<ActivityId, string>;

export type ActivityRecommendationsMap = Record<ActivityId, ActivityId[]>;

/**
 * Your curated neighbour map.
 * Feel free to extend/trim as your catalogue evolves.
 */
export const activityRecommendations: ActivityRecommendationsMap = {
  beach_volleyball: ['volleyball_indoor', 'football_soccer', 'basketball_outdoor'],
  cricket: ['football_soccer', 'hockey', 'tennis'],
  american_football: ['baseball', 'basketball_outdoor', 'american_football'],
  baseball: ['american_football', 'basketball_outdoor', 'golf'],
  hurling_camogie: ['gaelic_football', 'hockey', 'football_soccer'],
  gaelic_football: ['hurling_camogie', 'football_soccer', 'netball'],
  hockey: ['ice_hockey', 'hurling_camogie', 'ice_hockey_indoor'],
  netball: ['basketball_outdoor', 'volleyball_indoor', 'beach_volleyball'],
  football_soccer: ['gaelic_football', 'american_football', 'beach_volleyball'],
  golf: ['pickleball', 'tennis', 'archery'],
  tennis: ['tennis_indoor', 'padel', 'squash'],
  tennis_indoor: ['tennis', 'squash', 'badminton'],
  squash: ['tennis_indoor', 'badminton', 'table_tennis'],
  badminton: ['squash', 'table_tennis', 'tennis_indoor'],
  table_tennis: ['pickleball', 'badminton', 'squash'],
  outdoor_gardening: ['foraging', 'mushroom_hunting', 'outdoor_meditation'],
  archery: ['golf', 'fishing', 'hiking'],
  pickleball: ['table_tennis', 'padel', 'tennis'],
  padel: ['tennis', 'pickleball', 'squash'],
  kayaking: ['sea_kayaking', 'canoeing', 'stand_up_paddleboarding'],
  sea_kayaking: ['kayaking', 'canoeing', 'surfing'],
  canoeing: ['kayaking', 'sea_kayaking', 'stand_up_paddleboarding'],
  surfing: ['kitesurfing', 'windsurfing', 'stand_up_paddleboarding'],
  stand_up_paddleboarding: ['sup_sea', 'kayaking', 'surfing'],
  sup_sea: ['stand_up_paddleboarding', 'sea_kayaking', 'surfing'],
  snorkeling: ['scuba_diving', 'wild_swimming', 'sea_swimming'],
  wild_swimming: ['sea_swimming', 'indoor_swimming', 'snorkeling'],
  indoor_swimming: ['wild_swimming', 'sea_swimming', 'gym_workout'],
  mountain_biking: ['gravel_biking', 'trail_running', 'cycling'],
  rock_climbing: ['indoor_climbing', 'hiking', 'mountain_biking'],
  indoor_climbing: ['rock_climbing', 'gym_workout', 'boxing'],
  skateboarding: ['rollerblading', 'urban_exploring', 'cycling'],
  rollerblading: ['skateboarding', 'ice_skating', 'cycling'],
  running: ['trail_running', 'road_cycling', 'hiking'],
  trail_running: ['running', 'hiking', 'mountain_biking'],
  road_cycling: ['cycling', 'running', 'gravel_biking'],
  cycling: ['road_cycling', 'mountain_biking', 'gravel_biking'],
  gravel_biking: ['mountain_biking', 'road_cycling', 'cycling'],
  urban_exploring: ['photography', 'geocaching', 'skateboarding'],
  gym_workout: ['outdoor_gym', 'boxing', 'spinning'],
  outdoor_gym: ['gym_workout', 'outdoor_yoga', 'running'],
  yoga: ['outdoor_yoga', 'pilates', 'meditation'],
  outdoor_yoga: ['yoga', 'outdoor_meditation', 'pilates'],
  meditation: ['outdoor_meditation', 'yoga', 'tai_chi'],
  outdoor_meditation: ['meditation', 'outdoor_yoga', 'tai_chi'],
  pilates: ['yoga', 'gym_workout', 'zumba'],
  martial_arts: ['boxing', 'tai_chi', 'gym_workout'],
  tai_chi: ['yoga', 'meditation', 'martial_arts'],
  hiking: ['trail_running', 'birdwatching', 'foraging'],
  birdwatching: ['hiking', 'photography', 'foraging'],
  basketball_outdoor: ['american_football', 'netball', 'beach_volleyball'],
  horse_riding: ['hiking', 'trail_running', 'dog_walking'],
  photography: ['outdoor_painting', 'birdwatching', 'urban_exploring'],
  foraging: ['mushroom_hunting', 'hiking', 'outdoor_gardening'],
  mushroom_hunting: ['foraging', 'hiking', 'outdoor_gardening'],
  stargazing: ['camping', 'outdoor_meditation', 'hiking'],
  fishing: ['fly_fishing_freshwater', 'coarse_fishing', 'sea_fishing_shore'],
  fly_fishing_freshwater: ['fishing', 'coarse_fishing', 'hiking'],
  coarse_fishing: ['fishing', 'fly_fishing_freshwater', 'sea_fishing_shore'],
  sea_fishing_shore: ['sea_fishing_boat', 'fishing', 'coarse_fishing'],
  sea_fishing_boat: ['sea_fishing_shore', 'sailing', 'fishing'],
  ice_fishing: ['fishing', 'ice_skating', 'cross_country_skiing'],
  picnicking: ['bbq', 'beach', 'outdoor_reading'],
  beach: ['sea_swimming', 'beach_volleyball', 'picnicking'],
  bbq: ['picnicking', 'camping', 'cooking'],
  geocaching: ['hiking', 'urban_exploring', 'dog_walking'],
  camping: ['hiking', 'stargazing', 'bbq'],
  outdoor_reading: ['picnicking', 'reading', 'cafe'],
  dog_walking: ['hiking', 'running', 'urban_exploring'],
  outdoor_playground: ['dog_walking', 'picnicking', 'outdoor_chess'],
  outdoor_chess: ['playing_cards', 'outdoor_reading', 'cafe'],
  skiing: ['snowboarding', 'cross_country_skiing', 'ice_skating'],
  snowboarding: ['skiing', 'skateboarding', 'surfing'],
  cross_country_skiing: ['skiing', 'trail_running', 'hiking'],
  ice_skating: ['ice_hockey', 'rollerblading', 'curling'],
  curling: ['ice_skating', 'bowling', 'outdoor_chess'],
  ice_hockey: ['ice_hockey_indoor', 'hockey', 'ice_skating'],
  ice_hockey_indoor: ['ice_hockey', 'hockey', 'volleyball_indoor'],
  painting: ['outdoor_painting', 'crafts', 'photography'],
  outdoor_painting: ['painting', 'photography', 'outdoor_reading'],
  crafts: ['knitting', 'diy', 'painting'],
  knitting: ['crafts', 'reading', 'meditation'],
  diy: ['crafts', 'outdoor_gardening', 'cooking'],
  playing_records: ['make_music', 'live_music', 'reading'],
  make_music: ['outdoor_music', 'playing_records', 'dance'],
  dance: ['zumba', 'make_music', 'live_music'],
  outdoor_music: ['make_music', 'live_music', 'outdoor_meditation'],
  reading: ['outdoor_reading', 'cafe', 'museum'],
  going_to_pub: ['cafe', 'live_music', 'comedy'],
  playing_cards: ['outdoor_chess', 'going_to_pub', 'cafe'],
  watch_a_movie: ['cinema', 'reading', 'theatre'],
  cooking: ['bbq', 'diy', 'cafe'],
  cinema: ['watch_a_movie', 'theatre', 'comedy'],
  museum: ['gallery', 'theatre', 'reading'],
  shopping: ['cafe', 'gallery', 'urban_exploring'],
  rock_hopping: ['hiking', 'rock_climbing', 'beach'],
  cafe: ['going_to_pub', 'reading', 'shopping'],
  sailing_inland: ['sailing', 'kayaking', 'windsurfing_inland'],
  jetskiing: ['surfing', 'sea_kayaking', 'windsurfing'],
  scuba_diving: ['snorkeling', 'sea_swimming', 'sea_fishing_boat'],
  kitesurfing: ['windsurfing', 'surfing', 'jetskiing'],
  volleyball_indoor: ['beach_volleyball', 'netball', 'badminton'],
  windsurfing: ['kitesurfing', 'surfing', 'sailing'],
  windsurfing_inland: ['windsurfing', 'sailing_inland', 'stand_up_paddleboarding'],
  gaming: ['online', 'watch_a_movie', 'playing_cards'],
  boxing: ['martial_arts', 'gym_workout', 'spinning'],
  zumba: ['dance', 'pilates', 'spinning'],
  spinning: ['gym_workout', 'cycling', 'zumba'],
  riding_motorbike: ['cycling', 'road_cycling', 'urban_exploring'],
  bowling: ['curling', 'playing_cards', 'going_to_pub'],
  gallery: ['museum', 'painting', 'photography'],
  online: ['gaming', 'watch_a_movie', 'reading'],
  sailing: ['sailing_inland', 'sea_fishing_boat', 'windsurfing'],
  sea_swimming: ['wild_swimming', 'snorkeling', 'beach'],
  comedy: ['theatre', 'live_music', 'going_to_pub'],
  live_music: ['outdoor_music', 'comedy', 'theatre'],
  theatre: ['cinema', 'comedy', 'live_music'],
};

/**
 * Rank recommendations for a given set of selected activities.
 */
export function rankRecommendations(
  selected: ActivityId[],
  opts?: {
    limit?: number;
    /**
     * Additional slugs to exclude (e.g., temporarily hidden).
     */
    exclude?: ActivityId[];
    /**
     * Optional mapping for stable display names; used for alphabetical tie-breaks.
     */
    labelMap?: LabelMap;
    /**
     * If provided, candidates not present in this set are discarded.
     * Useful when your catalogue is a strict subset of the map.
     */
    allowedIds?: Set<ActivityId>;
  }
): ActivityId[] {
  const limit = Math.max(0, opts?.limit ?? 8);
  const excludeSet = new Set([...(opts?.exclude ?? []), ...selected]);
  const allowed = opts?.allowedIds;

  const scores = new Map<ActivityId, number>();

  for (const id of selected) {
    const neighbours = activityRecommendations[id] || [];
    for (const n of neighbours) {
      if (excludeSet.has(n)) continue;
      if (allowed && !allowed.has(n)) continue;
      scores.set(n, (scores.get(n) || 0) + 1);
    }
  }

  // Convert to array and sort by (score desc, label asc, id asc)
  const entries = Array.from(scores.entries());
  entries.sort((a, b) => {
    const [aid, ascore] = a;
    const [bid, bscore] = b;
    if (ascore !== bscore) return bscore - ascore;

    const aLabel = opts?.labelMap?.[aid] ?? aid;
    const bLabel = opts?.labelMap?.[bid] ?? bid;
    const lcmp = aLabel.localeCompare(bLabel, undefined, { sensitivity: 'base' });
    if (lcmp !== 0) return lcmp;
    return aid.localeCompare(bid);
  });

  return entries.slice(0, limit).map(([id]) => id);
}

/**
 * Tiny helper to turn an id into a label using a provided map,
 * with a graceful fallback.
 */
export function idToLabel(id: ActivityId, labelMap?: LabelMap): string {
  return labelMap?.[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
