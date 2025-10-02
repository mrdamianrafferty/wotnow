import type { ActivityType } from './activities/types';

// Core display structure (no acts here)
export type SecondaryCategory = { key: string; icon: string };
export type Cluster = { key: string; icon: string; subcategories: SecondaryCategory[] };

// Curated clusters/subcategories used in onboarding UI
export const CLUSTERS: Cluster[] = [
  {
    key: 'Active Sports',
    icon: '🏃‍♂️',
    subcategories: [
      { key: 'Outdoor Sports', icon: '🤾‍♂️' },
      { key: 'Indoor Sports', icon: '🎾' },
      { key: 'Water Sports', icon: '🛶' },
      { key: 'Action Sports', icon: '🚵‍♂️' },
      { key: 'Winter Sports', icon: '⛷️' },
    ],
  },
  {
    key: 'Fitness & Wellness',
    icon: '💪',
    subcategories: [
      { key: 'Mindfulness', icon: '🧘‍♂️' },
      { key: 'Keeping Fit', icon: '🏃' },
    ],
  },
  {
    key: 'Outdoor Activities',
    icon: '🌲',
    subcategories: [
      { key: 'Nature Activities', icon: '🌳' },
      { key: 'Fishing', icon: '🎣' },
      { key: 'Kicking Back and Relaxing', icon: '🍔' },
    ],
  },
  {
    key: 'Creative & Arts',
    icon: '🎨',
    subcategories: [
      { key: 'Visual Arts', icon: '🎨' },
    ],
  },
  {
    key: 'Indoor Activities',
    icon: '🏠',
    subcategories: [
      { key: 'Relaxing at Home', icon: '🧶' },
      { key: 'Going Out', icon: '🍻' },
    ],
  },
];

// Optional explicit overrides for tricky items
// Map activity id -> one of the subcategory keys above
const OVERRIDES: Record<string, SecondaryCategory['key']> = {
  // Examples:
  // 'cycling': 'Action Sports',
  // 'indoor_climbing': 'Indoor Sports',
  // 'road_cycling': 'Action Sports',
  // 'beach': 'Kicking Back and Relaxing',
};

const t = (s: string) => s.toLowerCase();
const hasTag = (a: ActivityType, ...tags: string[]) =>
  (a.tags || []).some(x => tags.includes(t(String(x))));
const idLike = (a: ActivityType, ...pieces: string[]) =>
  pieces.some(p => a.id.includes(p));

const by = {
  water(a: ActivityType) {
    return hasTag(a, 'water','marine','sea','coast','sailing','windsurf','kitesurf','paddle','sup','surf','scuba','snorkel','kayak','canoe')
        || idLike(a, 'sail','surf','sup','kayak','canoe','scuba','snorkel','kitesurf','windsurf','jet_ski');
  },
  winter(a: ActivityType) {
    return hasTag(a, 'snow','ice','winter','ski','snowboard','skate')
        || idLike(a, 'ski','snow','ice_skating','curling','ice_hockey');
  },
  fishing(a: ActivityType) {
    return a.category === 'fishing' || hasTag(a, 'fishing') || idLike(a, 'fishing');
  },
  indoor(a: ActivityType) {
    return hasTag(a, 'indoor') || idLike(a, 'indoor');
  },
  teamBall(a: ActivityType) {
    return hasTag(a, 'team','ball','pitch','court') ||
           idLike(a, 'football','rugby','cricket','netball','basketball','volleyball','hockey','gaelic','baseball','padel','pickleball');
  },
  action(a: ActivityType) {
    return hasTag(a, 'bike','climb','trail','mtb','boulder','skate','roller','parkour') ||
           idLike(a, 'mountain_biking','gravel','road_cycling','trail_running','skate','roller','climbing');
  },
  mindfulness(a: ActivityType) {
    return hasTag(a, 'mindfulness','wellness','yoga','meditation','tai_chi','pilates');
  },
  fitness(a: ActivityType) {
    return hasTag(a, 'fitness','run','gym','workout','zumba','boxing','martial','spinning') ||
           idLike(a, 'running','gym','zumba','boxing','spinning','martial');
  },
  nature(a: ActivityType) {
    return hasTag(a, 'nature','wildlife','forage','mushroom','astro','stars','bird','hike') ||
           idLike(a, 'hiking','bird','foraging','mushroom','stargazing','wild_swimming');
  },
  relaxingOutdoor(a: ActivityType) {
    return hasTag(a, 'beach','bbq','picnic','camp','relax','chill','dog','playground','park') ||
           idLike(a, 'beach','bbq','picnic','camp','dog_walking','outdoor_playground','outdoor_reading','outdoor_chess','rock_hopping');
  },
  visualArts(a: ActivityType) {
    return hasTag(a, 'art','craft','paint','photo','music','dance','gallery') ||
           idLike(a, 'painting','craft','photography','knitting','diy','playing_records','make_music','dance','gallery');
  },
  goingOut(a: ActivityType) {
    return hasTag(a, 'social','night','out','pub','cafe','cinema','museum','shopping','bowling','cards') ||
           idLike(a, 'pub','cafe','cinema','museum','shopping','bowling','playing_cards');
  },
  relaxingHome(a: ActivityType) {
    return (!a.weatherSensitive || hasTag(a, 'home','indoors')) &&
           (hasTag(a, 'reading','movie','online','cooking','knitting','diy','gaming') ||
            idLike(a, 'reading','watch_a_movie','online','cooking','knitting','diy','gaming'));
  },
};

// Decide subcategory for one activity (priority ordered)
export function classifySubcategory(a: ActivityType): SecondaryCategory['key'] {
  if (OVERRIDES[a.id]) return OVERRIDES[a.id];

  if (by.fishing(a)) return 'Fishing';
  if (by.water(a)) return 'Water Sports';
  if (by.winter(a)) return 'Winter Sports';
  if (by.action(a)) return 'Action Sports';

  if (by.teamBall(a) && !by.indoor(a)) return 'Outdoor Sports';
  if (by.indoor(a) && by.teamBall(a)) return 'Indoor Sports';

  if (by.fitness(a)) return 'Keeping Fit';
  if (by.mindfulness(a)) return 'Mindfulness';

  if (by.nature(a)) return 'Nature Activities';
  if (by.visualArts(a)) return 'Visual Arts';
  if (by.goingOut(a)) return 'Going Out';

  if (by.relaxingOutdoor(a)) return 'Kicking Back and Relaxing';
  if (by.relaxingHome(a)) return 'Relaxing at Home';

  // Fallback bucket name used only if needed
  return 'Other activities';
}

// Build a UI-ready taxonomy from activities (guarantees coverage)
export function buildUiTaxonomyFromActivities(activities: ActivityType[]) {
  const subs = new Map<string, { key: string; icon: string; acts: string[] }>();
  for (const c of CLUSTERS) {
    for (const sc of c.subcategories) {
      subs.set(sc.key, { ...sc, acts: [] });
    }
  }

  // Assign all activities
  for (const a of activities) {
    const subKey = classifySubcategory(a);
    if (!subs.has(subKey)) {
      // create fallback bucket lazily
      subs.set('Other activities', { key: 'Other activities', icon: '🧭', acts: [] });
    }
    subs.get(subKey)!.acts.push(a.id);
  }

  // Assemble back into clusters, keeping order
  const result = CLUSTERS.map(c => ({
    key: c.key,
    icon: c.icon,
    subcategories: c.subcategories
      .map(sc => subs.get(sc.key))
      .filter(Boolean) as Array<{ key: string; icon: string; acts: string[] }>,
  })).filter(c => c.subcategories.length > 0);

  // Append fallback cluster if it exists
  const other = subs.get('Other activities');
  if (other && other.acts.length) {
    result.push({
      key: 'More ideas',
      icon: '✨',
      subcategories: [other],
    });
  }

  return result;
}

// Back-compat export name if you referenced TAXONOMY before
export const TAXONOMY = CLUSTERS;

// Convenience: list of subcategory names
export const SECONDARY_CATEGORIES = CLUSTERS.flatMap(c => c.subcategories.map(sc => sc.key));