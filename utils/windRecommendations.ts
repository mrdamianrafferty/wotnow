// utils/windRecommendations.ts
// Wind-aware recommendation utilities for activities (unit: m/s)

export type WindSafety = 'safe' | 'manageable' | 'challenging' | 'unsafe' | 'unknown';

export type WindRecommendationLevel =
  | 'excellent'
  | 'optimal'
  | 'beneficial'
  | 'min_wind_needed'
  | 'safe'
  | 'caution'
  | 'difficult'
  | 'uncomfortable'
  | 'unpleasant'
  | 'impractical'
  | 'unsafe'
  | 'dangerous'
  | 'impossible'
  | 'unplayable'
  | 'irrelevant'
  | 'unknown';

export interface WindRecommendation {
  level: WindRecommendationLevel;
  message: string;
  safety: WindSafety;
  label?: string;
  emoji?: string;
  color?: string;
}

const WIND_RECOMMENDATION_LEVELS: Record<Exclude<WindRecommendationLevel, 'unknown'>, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Excellent', emoji: '🌟', color: 'green' },
  optimal: { label: 'Optimal', emoji: '✅', color: 'green' },
  beneficial: { label: 'Good', emoji: '👍', color: 'green' },
  min_wind_needed: { label: 'Needs More Wind', emoji: '🪁', color: 'orange' },
  safe: { label: 'Safe', emoji: '✅', color: 'green' },
  caution: { label: 'Use Caution', emoji: '⚠️', color: 'orange' },
  difficult: { label: 'Difficult', emoji: '😰', color: 'orange' },
  uncomfortable: { label: 'Uncomfortable', emoji: '😕', color: 'orange' },
  unpleasant: { label: 'Unpleasant', emoji: '😣', color: 'orange' },
  impractical: { label: 'Impractical', emoji: '🚫', color: 'red' },
  unsafe: { label: 'Unsafe', emoji: '⛔', color: 'red' },
  dangerous: { label: 'Dangerous', emoji: '🚨', color: 'red' },
  impossible: { label: 'Impossible', emoji: '❌', color: 'red' },
  unplayable: { label: 'Unplayable', emoji: '❌', color: 'red' },
  irrelevant: { label: 'Not Affected', emoji: '🏠', color: 'blue' },
};

// Wind speed thresholds for different activities (in m/s)
// Conversion: 1 m/s = 3.6 km/h = 2.24 mph
export type WindThresholds = Partial<{
  // For wind sports
  min_wind: number; optimal_min: number; optimal_max: number; expert_max: number;
  // Negative impacts
  caution: number; difficult: number; uncomfortable: number; unpleasant: number; impractical: number; unsafe: number; dangerous: number; impossible: number; unplayable: number;
  // Explicit irrelevance (indoor)
  irrelevant: boolean;
}>;

const WIND_ACTIVITY_THRESHOLDS: Record<string, WindThresholds> = {
  // Cycling activities - very sensitive to wind, especially crosswinds
  /**
   * Relaxed 2026-09. The old 9 m/s "unsafe" encodes being pushed into traffic by
   * a crosswind, which is a real risk on an open road and not one that exists on
   * a traffic-free reservoir circuit — where it was scoring a Force 5 headwind
   * at 10 out of 100. Wind is effort here; gusts are the hazard.
   */
  road_cycling: {
    caution: 9,     // Force 5 — a hard lap
    difficult: 13,  // Force 6
    unsafe: 17,     // Force 7
  },
  mountain_biking: {
    caution: 9, // 32 km/h - less exposed but still affected
    unsafe: 13, // 47 km/h
    dangerous: 17, // 61 km/h
  },
  gravel_biking: {
    caution: 8, // 29 km/h - between road and mountain
    unsafe: 11, // 40 km/h
    dangerous: 15, // 54 km/h
  },
  cycling: {
    caution: 7,
    unsafe: 9,
    dangerous: 13,
  },

  // Water sports - sailing and wind sports
  sailing: {
    min_wind: 3, // 11 km/h - minimum for sailing
    optimal_min: 4, // 14 km/h - good sailing starts
    optimal_max: 11, // 40 km/h - up to 25 knots for offshore boats
    caution: 13, // 47 km/h, 30 mph
    dangerous: 15, // 54 km/h, 35 mph - "bad day for most sailboats"
  },
  /**
   * Inland dinghy sailing, re-cut 2026-09 to agree with the condition bands.
   *
   * These and `data/activities/watersports.ts` were calibrated separately and
   * disagreed on the same sport: at Force 6 the band said "Good weather" while
   * this table said "Use Caution", and the engine printed both in one sentence.
   * They now describe the same ladder — Force 3-4 good, Force 5 for experienced
   * hands, Force 6 ashore.
   *
   * Force 6 starts at 39 km/h, i.e. 10.8 m/s, which is also the `boatsOffForce`
   * that Rutland and Grafham already declare in RiseDaisy's own thresholds file.
   */
  sailing_inland: {
    /* Force 2. Below it you drift rather than sail — which is a disappointment
       and not a danger, so `poorConditions` in the model stops only at a flat
       calm while this rung says "you want more wind than this". */
    min_wind: 1.7,
    optimal_min: 1.7,   // Force 2 — beginners sail in this
    optimal_max: 8,     // Force 4 — the club day
    caution: 8,         // Force 5, experienced hands only
    unsafe: 10.8,       // Force 6 — the stop
    dangerous: 13.9,    // Force 7
  },
  windsurfing: {
    min_wind: 4, // 14 km/h - minimum for beginners
    optimal_min: 6, // 22 km/h
    optimal_max: 11, // 40 km/h
    expert_max: 15, // 54 km/h
    dangerous: 18, // 65 km/h
  },
  /**
   * Inland windsurfing, re-cut 2026-09 to the same operator limit as sailing.
   *
   * The old `expert_max: 15` (29 kn) combined with `dangerous: 18` left Force 7
   * returning a bare "safe" with no message at all, which is how a near gale
   * came to read as a good day. A windsurfer will say Force 6 is when it gets
   * interesting and on open coast they are right; this is enclosed water under
   * a rescue boat, and the operator's limit is the limit.
   */
  windsurfing_inland: {
    min_wind: 1.7,      // below Force 2 there is no way back
    optimal_min: 3.4,   // Force 3 — a beginner is moving
    optimal_max: 8,     // Force 4 — planing for most recreational rigs
    /* Deliberately NO `expert_max`. That key routes Force 5 to the "beneficial"
       level, which adds points; here Force 5 is the experienced-riders rung and
       must read as Fair, so it falls through to `caution` below instead. */
    caution: 8,         // Force 5
    unsafe: 10.8,       // Force 6 — the stop
    dangerous: 13.9,    // Force 7
  },
  kitesurfing: {
    min_wind: 6, // 22 km/h - minimum for kitesurfing
    optimal_min: 7, // 25 km/h
    optimal_max: 13, // 47 km/h
    expert_max: 18, // 65 km/h
    dangerous: 20, // 72 km/h
  },

  // Other water sports
  /* Enclosed water, and committed once off the bank: the wind that matters is
     the one you paddle home against. Force 5 is a rescue-boat call. */
  kayaking: {
    caution: 5.5,   // upper Force 3
    difficult: 7,   // Force 4
    unsafe: 10,     // Force 5
  },
  sea_kayaking: {
    caution: 6, // 22 km/h - more exposed
    difficult: 9, // 32 km/h
    unsafe: 13, // 47 km/h
  },
  /* An open canoe is a sail with a paddler in it — the most wind-affected hull
     on these waters and the first ashore. */
  canoeing: {
    caution: 4,     // Force 3
    difficult: 5.5,
    unsafe: 8,      // Force 5
  },
  /* Highest windage, lowest power, no keel. The dominant incident is being
     blown off the bank and not getting back, which is a DIRECTION problem the
     engine cannot yet read — so these stand in conservatively for a test we
     cannot make. */
  stand_up_paddleboarding: {
    caution: 3.5,   // Force 3
    difficult: 5,
    unsafe: 7,      // upper Force 4
  },
  sup_sea: {
    caution: 5,
    difficult: 8,
    unsafe: 11,
  },
  surfing: {
    caution: 11, // 40 km/h - offshore winds can be dangerous
    difficult: 15,
    unsafe: 18,
  },
  jet_skiing: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },

  // Newly wired water users & swimmers
  snorkeling: {
    caution: 5, // 18 km/h - surface chop impacts clarity and safety
    unsafe: 9,  // 32 km/h - strong chop and drift
    dangerous: 13, // 47 km/h - unsafe conditions
  },
  sea_swimming: {
    caution: 6, // 22 km/h - increased chop and drift
    unsafe: 9,  // 32 km/h
    dangerous: 13, // 47 km/h
  },
  swimming: {
    caution: 7, // 25 km/h - outdoor pool/lake discomfort
    unsafe: 11, // 40 km/h
    dangerous: 15, // 54 km/h
  },
  scuba_diving: {
    caution: 9,  // 32 km/h - surface intervals/boat entries affected
    unsafe: 13,  // 47 km/h
    dangerous: 17, // 61 km/h
  },

  // Action & coastal scrambling
  rock_hopping: {
    caution: 11, // 40 km/h - exposed footing on wet rocks
    unsafe: 15,  // 54 km/h
    dangerous: 18, // 65 km/h
  },

  // Precision sports - affected by ball flight and balance
  golf: {
    uncomfortable: 7, // 25 km/h - affects ball flight
    difficult: 11, // 40 km/h - putting becomes challenging
    unplayable: 15, // 54 km/h
  },
  tennis: {
    caution: 4, // 14 km/h - affects ball trajectory
    difficult: 9, // 32 km/h - seriously impacts play
    unplayable: 13, // 47 km/h
  },
  tennis_indoor: { irrelevant: true },
  badminton: {
    caution: 3, // 11 km/h - shuttlecock very sensitive
    difficult: 6,
    unplayable: 9,
  },
  table_tennis: {
    caution: 4, // 14 km/h - if outdoor
    difficult: 7,
    unplayable: 11,
  },
  archery: {
    caution: 6, // 22 km/h - arrow flight affected
    difficult: 9,
    unsafe: 13,
  },
  pickleball: {
    caution: 6,
    difficult: 11,
    unplayable: 15,
  },

  // Team sports - ball flight and player safety
  football_soccer: {
    caution: 9, // 32 km/h - affects ball flight
    difficult: 13, // 47 km/h
    unsafe: 17, // 61 km/h
  },
  rugby: {
    caution: 11, // 40 km/h - more tolerant than soccer
    difficult: 15,
    unsafe: 18,
  },
  american_football: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  cricket: {
    caution: 7, // 25 km/h - ball flight critical
    difficult: 11,
    unsafe: 15,
  },
  baseball: {
    caution: 7,
    difficult: 11,
    unsafe: 15,
  },
  basketball_outdoor: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },
  beach_volleyball: {
    caution: 7, // 25 km/h - exposed location
    difficult: 11,
    unsafe: 15,
  },
  volleyball_indoor: { irrelevant: true },
  netball: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },
  hockey: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  hurling_camogie: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },
  gaelic_football: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },

  // Running and fitness activities
  running: {
    caution: 9, // 32 km/h
    difficult: 13, // 47 km/h
    unsafe: 17, // 61 km/h
  },
  trail_running: {
    caution: 11, // 40 km/h - more sheltered by terrain
    difficult: 15,
    unsafe: 18,
  },

  // Action sports
  skateboarding: {
    caution: 7, // 25 km/h - balance critical
    unsafe: 11, // 40 km/h
    dangerous: 15,
  },
  rollerblading: {
    caution: 7,
    unsafe: 11,
    dangerous: 15,
  },
  rock_climbing: {
    caution: 13, // 47 km/h - more tolerant when secured
    difficult: 17, // 61 km/h
    dangerous: 22, // 79 km/h
  },
  indoor_climbing: { irrelevant: true },

  // Nature and recreation activities
  hiking: {
    caution: 11, // 40 km/h - walking becomes difficult
    difficult: 17, // 61 km/h - risk of falling branches
    dangerous: 26, // 94 km/h - risk of being blown over (60+ mph)
  },
  /* A scope on a tripod is unusable well before a walker is uncomfortable. */
  birdwatching: {
    caution: 8,      // Force 5
    difficult: 12,   // Force 6
    impractical: 16, // Force 7
  },
  photography: {
    caution: 9, // 32 km/h - camera stability issues
    difficult: 13,
    impractical: 17,
  },
  outdoor_painting: {
    caution: 7, // 25 km/h - easel stability
    difficult: 11,
    impractical: 15,
  },
  foraging: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  mushroom_hunting: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  /* Open water. Chop makes a swimmer invisible to anyone watching from the bank
     long before it makes them uncomfortable, which is why this is tighter than
     it looks. Water temperature, not wind, is the real limit — see the model. */
  wild_swimming: {
    caution: 5,     // Force 3
    unsafe: 8,      // Force 5
    dangerous: 11,  // Force 6
  },
  gardening: {
    caution: 9, // 32 km/h - tools and materials affected
    difficult: 13,
    unsafe: 17,
  },
  stargazing: {
    caution: 9, // 32 km/h - telescope stability
    difficult: 13,
    impractical: 17,
  },
  /* Matched to the model's own new bands. The model previously had no
     reachable wind limit at all, so this table was the only thing acting. */
  dog_walking: {
    caution: 9,     // Force 5
    difficult: 13,  // Force 6
    unsafe: 17,     // Force 7
  },

  // Recreation activities
  picnicking: {
    uncomfortable: 7, // 25 km/h - items blown around
    impractical: 11,
    unsafe: 15,
  },
  bbq: {
    caution: 9, // 32 km/h - fire safety concerns
    unsafe: 13,
    dangerous: 17,
  },
  beach: {
    uncomfortable: 9, // 32 km/h - sand blowing
    difficult: 13,
    unpleasant: 17,
  },
  geocaching: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  camping: {
    caution: 11, // 40 km/h - tent stability
    unsafe: 15, // 54 km/h - tent damage risk
    dangerous: 18, // 65 km/h - structural failure
  },
  outdoor_playground: {
    caution: 9, // 32 km/h - child safety
    unsafe: 13,
    dangerous: 17,
  },
  outdoor_chess: {
    uncomfortable: 6, // 22 km/h - pieces blown over
    impractical: 9,
    impossible: 13,
  },

  // Fitness activities
  outdoor_yoga: {
    uncomfortable: 7, // 25 km/h - balance affected
    difficult: 11,
    impractical: 15,
  },
  outdoor_meditation: {
    uncomfortable: 9,
    difficult: 13,
    impractical: 17,
  },
  outdoor_gym: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },
  gym_workout: { irrelevant: true },
  zumba: { irrelevant: true },
  boxing: { irrelevant: true },
  spinning: { irrelevant: true },
  urban_exploring: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },

  // Music and reading
  outdoor_music: {
    uncomfortable: 7, // 25 km/h - instrument/sheet music issues
    difficult: 11,
    impractical: 15,
  },
  outdoor_reading: {
    uncomfortable: 6, // 22 km/h - pages blowing
    impractical: 9,
    impossible: 13,
  },

  // Fishing activities
  fly_fishing_freshwater: {
    caution: 7, // 25 km/h - casting accuracy affected
    difficult: 11,
    unsafe: 15,
  },
  coarse_fishing: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },
  sea_fishing_shore: {
    caution: 9,
    difficult: 13,
    unsafe: 17,
  },
  sea_fishing_boat: {
    caution: 7, // 25 km/h - boat handling affected
    unsafe: 11,
    dangerous: 15,
  },
  ice_fishing: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
  },

  // Winter sports
  skiing: {
    caution: 13, // 47 km/h - visibility and control affected
    difficult: 17,
    dangerous: 22, // 79 km/h - lift closures typical
  },
  snowboarding: {
    caution: 13,
    difficult: 17,
    dangerous: 22,
  },
  cross_country_skiing: {
    caution: 11, // 40 km/h - more exposed than alpine
    difficult: 15,
    dangerous: 18,
  },

  // Ice sports
  ice_skating: {
    caution: 9, // 32 km/h - if outdoor rinks
    difficult: 13,
    unsafe: 17,
    irrelevant: true, // if indoor
  },
  curling: {
    irrelevant: true, // typically indoor
  },
  ice_hockey: {
    irrelevant: true, // typically indoor
  },
  ice_hockey_us: {
    irrelevant: true,
  },
  ice_hockey_indoor: {
    irrelevant: true,
  },

  // Indoor activities
  squash: { irrelevant: true },
  yoga: { irrelevant: true },
  meditation: { irrelevant: true },
  pilates: { irrelevant: true },
  martial_arts: { irrelevant: true },
  tai_chi: { irrelevant: true },
  indoor_swimming: { irrelevant: true },
  painting: { irrelevant: true },
  crafts: { irrelevant: true },
  knitting: { irrelevant: true },
  diy: { irrelevant: true },
  playing_records: { irrelevant: true },
  make_music: { irrelevant: true },
  dance: { irrelevant: true },
  reading: { irrelevant: true },

  // Motorbike
  riding_motorbike: {
    caution: 9, // 32 km/h - crosswinds dangerous
    unsafe: 13, // 47 km/h
    dangerous: 17, // 61 km/h
  },
};

/**
 * ─── How these messages are worded, and why they changed ─────────────────
 *
 * Every string below used to print the raw m/s float. Verbatim from the engine:
 * "Use Caution — 6.944444444444445 m/s (25 km/h) wind creates use caution
 * conditions". Three faults in one line — an unrounded float, a unit nobody at
 * a sailing club uses, and a tautology that defines the label by repeating it.
 *
 * They now speak Beaufort and knots, which is what the people on these waters
 * ask each other, and they say what the wind will DO rather than restating the
 * severity word already shown beside them.
 *
 * These are the fallback voice. Where the scorer can identify which criterion
 * actually decided the day, `utils/activityReasons` writes the sentence instead
 * and never reaches here.
 */
const FORCE_BOUNDS_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

function toForce(ms: number): number {
  const kmh = ms * 3.6;
  for (let i = 0; i < FORCE_BOUNDS_KMH.length; i++) if (kmh < FORCE_BOUNDS_KMH[i]) return i;
  return 12;
}

function toKnots(ms: number): number {
  return Math.round(ms * 1.94384);
}

/** "Force 5, 18 knots" — the one number a wind sentence should carry. */
function windPhrase(ms: number): string {
  const kn = toKnots(ms);
  return `Force ${toForce(ms)}, ${kn} knot${kn === 1 ? '' : 's'}`;
}

/**
 * What each negative level MEANS, in place of the label repeating itself.
 *
 * The old template read "{label} — {n} m/s wind creates {label} conditions",
 * which tells a reader nothing they did not get from the badge. These say what
 * the wind will actually do to the activity.
 */
const NEGATIVE_EFFECT: Record<string, string> = {
  dangerous: 'genuinely dangerous to be out in.',
  unsafe: 'past the point this is safe.',
  impossible: 'simply not happening today.',
  unplayable: 'too much to play in.',
  impractical: 'more trouble than it is worth.',
  unpleasant: 'no fun at all.',
  difficult: 'hard going, and it will not let up.',
  uncomfortable: 'enough to take the pleasure out of it.',
  caution: 'manageable, but worth respecting.',
};

// Universal danger threshold (all outdoor activities)
const UNIVERSAL_DANGER_MS = 26; // 94 km/h ~ 60 mph

export function getWindActivityRecommendation(activityKey: string, windSpeedMs: number): WindRecommendation {
  const thresholds = WIND_ACTIVITY_THRESHOLDS[activityKey];

  if (!thresholds) {
    return {
      level: 'unknown',
      message: 'Activity not found in wind impact database',
      safety: 'unknown',
    };
  }

  // Indoor / irrelevant activities
  if (thresholds.irrelevant) {
    return {
      level: 'irrelevant',
      message: 'Wind conditions do not affect this indoor activity',
      safety: 'safe',
      ...WIND_RECOMMENDATION_LEVELS.irrelevant,
    };
  }

  // Universal danger override
  if (windSpeedMs >= UNIVERSAL_DANGER_MS) {
    return {
      level: 'dangerous',
      message: `${windPhrase(windSpeedMs)}. Too much wind to be outdoors safely.`,
      safety: 'unsafe',
      ...WIND_RECOMMENDATION_LEVELS.dangerous,
    };
  }

  // Wind-required sports (sailing, windsurfing, kitesurfing)
  if (typeof thresholds.min_wind === 'number') {
    if (windSpeedMs < (thresholds.min_wind as number)) {
      return {
        level: 'min_wind_needed',
        message: `Not enough wind — ${windPhrase(windSpeedMs)}. It needs about ${windPhrase(thresholds.min_wind as number)} to work at all.`,
        safety: 'challenging',
        ...WIND_RECOMMENDATION_LEVELS.min_wind_needed,
      };
    }

    const optMin = thresholds.optimal_min;
    const optMax = thresholds.optimal_max;
    const expertMax = thresholds.expert_max;

    if (typeof optMin === 'number' && typeof optMax === 'number' && windSpeedMs >= optMin && windSpeedMs <= optMax) {
      return {
        level: 'optimal',
        message: `${windPhrase(windSpeedMs)} — right in the band this wants.`,
        safety: 'safe',
        ...WIND_RECOMMENDATION_LEVELS.optimal,
      };
    }

    if (typeof expertMax === 'number' && windSpeedMs <= expertMax) {
      return {
        level: 'beneficial',
        message: `${windPhrase(windSpeedMs)} — enough to be worth it, and enough to want some experience.`,
        safety: 'safe',
        ...WIND_RECOMMENDATION_LEVELS.beneficial,
      };
    }
    // else continue to negative checks below (too windy)
  }

  // Negative impacts (ordered by severity)
  const checks: Array<{ threshold: keyof WindThresholds; level: Exclude<WindRecommendationLevel,
    'excellent'|'optimal'|'beneficial'|'min_wind_needed'|'safe'|'irrelevant'|'unknown'> }> = [
    { threshold: 'dangerous', level: 'dangerous' },
    { threshold: 'unsafe', level: 'unsafe' },
    { threshold: 'impossible', level: 'impossible' },
    { threshold: 'unplayable', level: 'unplayable' },
    { threshold: 'impractical', level: 'impractical' },
    { threshold: 'unpleasant', level: 'unpleasant' },
    { threshold: 'difficult', level: 'difficult' },
    { threshold: 'uncomfortable', level: 'uncomfortable' },
    { threshold: 'caution', level: 'caution' },
  ];

  for (const check of checks) {
    const tVal = thresholds[check.threshold] as number | undefined;
    if (typeof tVal === 'number' && windSpeedMs >= tVal) {
      const rec = WIND_RECOMMENDATION_LEVELS[check.level];
      return {
        level: check.level,
        message: `${windPhrase(windSpeedMs)} — ${NEGATIVE_EFFECT[check.level]}`,
        safety: ['dangerous', 'unsafe', 'impossible', 'unplayable'].includes(check.level) ? 'unsafe'
              : ['difficult', 'impractical'].includes(check.level) ? 'challenging' : 'manageable',
        ...rec,
      };
    }
  }

  // Default safe
  return {
    level: 'safe',
    message: windSpeedMs === 0 ? 'Flat calm.' : `${windPhrase(windSpeedMs)} — nothing the wind is going to spoil.`,
    safety: 'safe',
    ...WIND_RECOMMENDATION_LEVELS.safe,
  };
}

export function getWindActivityRecommendations(
  activityKeys: string[],
  windSpeedMs: number
): Record<string, WindRecommendation> {
  const recommendations: Record<string, WindRecommendation> = {};
  for (const activityKey of activityKeys) {
    recommendations[activityKey] = getWindActivityRecommendation(activityKey, windSpeedMs);
  }
  return recommendations;
}

export function filterActivitiesByWind(
  activityKeys: string[],
  windSpeedMs: number,
  acceptableLevels: WindRecommendationLevel[] = ['safe', 'beneficial', 'optimal', 'excellent', 'irrelevant']
): string[] {
  return activityKeys.filter((activityKey) => {
    const recommendation = getWindActivityRecommendation(activityKey, windSpeedMs);
    return acceptableLevels.includes(recommendation.level);
  });
}

export function getWindActivitySummary(
  activityKeys: string[],
  windSpeedMs: number
) {
  const summary: Record<'safe'|'manageable'|'challenging'|'unsafe'|'unknown', Array<{ activity: string; recommendation: WindRecommendation }>> = {
    safe: [], manageable: [], challenging: [], unsafe: [], unknown: []
  };

  for (const activityKey of activityKeys) {
    const recommendation = getWindActivityRecommendation(activityKey, windSpeedMs);
    const safetyLevel = (recommendation.safety || 'unknown') as keyof typeof summary;
    summary[safetyLevel].push({ activity: activityKey, recommendation });
  }

  return {
    ...summary,
    totals: {
      safe: summary.safe.length,
      manageable: summary.manageable.length,
      challenging: summary.challenging.length,
      unsafe: summary.unsafe.length,
      total: activityKeys.length,
    },
  };
}
