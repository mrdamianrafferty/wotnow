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
  road_cycling: {
    caution: 7, // 25 km/h, 15 mph - crosswinds affect handling
    unsafe: 9, // 32 km/h, 20 mph - many cyclists' limit
    dangerous: 13, // 47 km/h, 29 mph - risk of being blown off road
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
  sailing_inland: {
    min_wind: 3,
    optimal_min: 4,
    optimal_max: 9, // 32 km/h - smaller boats, more protected
    caution: 11,
    dangerous: 13, // 47 km/h - small boats can be knocked down at 20 mph
  },
  windsurfing: {
    min_wind: 4, // 14 km/h - minimum for beginners
    optimal_min: 6, // 22 km/h
    optimal_max: 11, // 40 km/h
    expert_max: 15, // 54 km/h
    dangerous: 18, // 65 km/h
  },
  windsurfing_inland: {
    min_wind: 4,
    optimal_min: 6,
    optimal_max: 11,
    expert_max: 15,
    dangerous: 18,
  },
  kitesurfing: {
    min_wind: 6, // 22 km/h - minimum for kitesurfing
    optimal_min: 7, // 25 km/h
    optimal_max: 13, // 47 km/h
    expert_max: 18, // 65 km/h
    dangerous: 20, // 72 km/h
  },

  // Other water sports
  kayaking: {
    caution: 7, // 25 km/h
    difficult: 11, // 40 km/h
    unsafe: 15, // 54 km/h
  },
  sea_kayaking: {
    caution: 6, // 22 km/h - more exposed
    difficult: 9, // 32 km/h
    unsafe: 13, // 47 km/h
  },
  canoeing: {
    caution: 6, // 22 km/h - high profile, catches wind
    difficult: 9,
    unsafe: 13,
  },
  stand_up_paddleboarding: {
    caution: 6,
    difficult: 9,
    unsafe: 11, // 40 km/h
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
  birdwatching: {
    caution: 11, // 40 km/h - affects bird behavior and observation
    difficult: 15,
    impractical: 18,
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
  wild_swimming: {
    caution: 7, // 25 km/h - water conditions affected
    unsafe: 11,
    dangerous: 15,
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
  dog_walking: {
    caution: 11,
    difficult: 15,
    unsafe: 18,
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

function toKmh(ms: number) {
  return Math.round(ms * 3.6);
}

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
      message: `Extreme winds (${windSpeedMs} m/s, ${toKmh(windSpeedMs)} km/h). Unsafe for outdoor activities`,
      safety: 'unsafe',
      ...WIND_RECOMMENDATION_LEVELS.dangerous,
    };
  }

  // Wind-required sports (sailing, windsurfing, kitesurfing)
  if (typeof thresholds.min_wind === 'number') {
    if (windSpeedMs < (thresholds.min_wind as number)) {
      return {
        level: 'min_wind_needed',
        message: `Insufficient wind. Need at least ${thresholds.min_wind} m/s (${toKmh(thresholds.min_wind)} km/h)` ,
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
        message: `Optimal wind for this activity (${windSpeedMs} m/s, ${toKmh(windSpeedMs)} km/h)`,
        safety: 'safe',
        ...WIND_RECOMMENDATION_LEVELS.optimal,
      };
    }

    if (typeof expertMax === 'number' && windSpeedMs <= expertMax) {
      return {
        level: 'beneficial',
        message: `Good wind conditions (better for experienced participants)`,
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
        message: `${rec.label} — ${windSpeedMs} m/s (${toKmh(windSpeedMs)} km/h) wind creates ${rec.label.toLowerCase()} conditions`,
        safety: ['dangerous', 'unsafe', 'impossible', 'unplayable'].includes(check.level) ? 'unsafe'
              : ['difficult', 'impractical'].includes(check.level) ? 'challenging' : 'manageable',
        ...rec,
      };
    }
  }

  // Default safe
  return {
    level: 'safe',
    message: windSpeedMs === 0 ? 'Calm conditions' : `Wind conditions are manageable (${windSpeedMs} m/s, ${toKmh(windSpeedMs)} km/h)`,
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
