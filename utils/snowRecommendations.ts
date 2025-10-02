// utils/snowRecommendations.ts
// Snow-aware recommendation utilities for activities

export type SnowSafety = 'safe' | 'manageable' | 'challenging' | 'unsafe' | 'unknown';

export type SnowRecommendationLevel =
  | 'excellent'
  | 'optimal'
  | 'beneficial'
  | 'required'
  | 'safe'
  | 'caution'
  | 'difficult'
  | 'uncomfortable'
  | 'impractical'
  | 'unsafe'
  | 'dangerous'
  | 'impossible'
  | 'unplayable'
  | 'too_deep'
  | 'irrelevant'
  | 'requires_winter_gear'
  | 'snowfall_unsafe'
  | 'snowfall_caution'
  | 'insufficient'
  | 'adequate'
  | 'unknown';

export interface SnowRecommendation {
  level: SnowRecommendationLevel;
  message: string;
  safety: SnowSafety;
  label?: string;
  emoji?: string;
  color?: string;
}

// Activity recommendation levels
const RECOMMENDATION_LEVELS: Record<Exclude<SnowRecommendationLevel, 'unknown' | 'insufficient' | 'adequate'>, { label: string; emoji: string; color: string }> = {
  excellent: { label: 'Excellent', emoji: '🌟', color: 'green' },
  optimal: { label: 'Optimal', emoji: '✅', color: 'green' },
  beneficial: { label: 'Good', emoji: '👍', color: 'green' },
  required: { label: 'Minimum Required', emoji: '⚠️', color: 'orange' },
  safe: { label: 'Safe', emoji: '✅', color: 'green' },
  caution: { label: 'Use Caution', emoji: '⚠️', color: 'orange' },
  difficult: { label: 'Difficult', emoji: '😰', color: 'orange' },
  uncomfortable: { label: 'Uncomfortable', emoji: '😕', color: 'orange' },
  impractical: { label: 'Impractical', emoji: '🚫', color: 'red' },
  unsafe: { label: 'Unsafe', emoji: '⛔', color: 'red' },
  dangerous: { label: 'Dangerous', emoji: '🚨', color: 'red' },
  impossible: { label: 'Impossible', emoji: '❌', color: 'red' },
  unplayable: { label: 'Unplayable', emoji: '❌', color: 'red' },
  too_deep: { label: 'Too Deep', emoji: '🏔️', color: 'red' },
  irrelevant: { label: 'Not Affected', emoji: '🏠', color: 'blue' },
  requires_winter_gear: { label: 'Winter Gear Required', emoji: '🧥', color: 'blue' },
  snowfall_unsafe: { label: 'Unsafe Due to active snowfall', emoji: '🌨️', color: 'red' },
  snowfall_caution: { label: 'Caution - active snowfall', emoji: '❄️', color: 'orange' },
};

// Snow thresholds for different activities (in cm for depth, mm/h for snowfall rate)
// NOTE: Keys must match activity IDs used throughout the app
const SNOW_ACTIVITY_THRESHOLDS: Record<string, Partial<{
  // Snow sports
  required: number; optimal: number; excellent: number; too_deep: number;
  // Snowfall influence
  max_snowfall: number; caution_snowfall: number;
  // Negative impacts
  impossible: number; unplayable: number; dangerous: number; unsafe: number; difficult: number; impractical: number; uncomfortable: number; caution: number;
  // Beneficial cases
  beneficial: number; cold_limit: number;
  // Gear requirement
  requires_winter_gear: number;
  // Explicit irrelevance (indoor)
  irrelevant: boolean;
}> > = {
  // Snow sports - where snow is required/beneficial but has safety limits
  skiing: { required: 20, optimal: 50, excellent: 100, too_deep: 300, max_snowfall: 25, caution_snowfall: 10 },
  snowboarding: { required: 30, optimal: 50, excellent: 100, too_deep: 300, max_snowfall: 25, caution_snowfall: 10 },
  cross_country_skiing: { required: 10, optimal: 30, excellent: 50, too_deep: 150, max_snowfall: 15, caution_snowfall: 5 },
  ice_fishing: { required: 5, optimal: 10, too_deep: 100, max_snowfall: 15, caution_snowfall: 5 },

  // Immediate safety showstoppers - any accumulation is dangerous
  road_cycling: { unsafe: 0.1, max_snowfall: 0.5 },
  riding_motorbike: { unsafe: 0.1, max_snowfall: 0.5 },
  skateboarding: { unsafe: 0.1, max_snowfall: 0.1 },
  rollerblading: { unsafe: 0.1, max_snowfall: 0.1 },

  // High-precision surface sports - very low tolerance
  tennis: { caution: 0.5, unsafe: 1, max_snowfall: 0.5 },
  tennis_indoor: { irrelevant: true },
  pickleball: { unsafe: 1, max_snowfall: 0.5 },
  badminton: { caution: 0.5, unsafe: 1, max_snowfall: 0.5 },
  table_tennis: { caution: 0.5, unsafe: 1, max_snowfall: 0.5 },
  netball: { unsafe: 1, max_snowfall: 0.5 },
  basketball_outdoor: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5 },

  // Team sports - moderate tolerance but safety concerns
  football_soccer: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 10, caution_snowfall: 2.5 },
  rugby: { caution: 2, difficult: 5, unsafe: 10, max_snowfall: 10, caution_snowfall: 5 },
  american_football: { caution: 2, difficult: 5, unsafe: 10, max_snowfall: 15, caution_snowfall: 5 },
  cricket: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5, caution_snowfall: 1 },
  baseball: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5, caution_snowfall: 1 },
  hurling_camogie: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  gaelic_football: { caution: 2, difficult: 5, unsafe: 10, max_snowfall: 10, caution_snowfall: 5 },
  hockey: { unsafe: 1, max_snowfall: 1 },
  beach_volleyball: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5 },

  // Individual outdoor sports
  golf: { caution: 1, difficult: 3, unplayable: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  archery: { caution: 3, difficult: 10, unsafe: 15, max_snowfall: 10, caution_snowfall: 2.5 },

  // Action sports with moderate tolerance
  mountain_biking: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5, caution_snowfall: 1 },
  gravel_biking: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 2.5, caution_snowfall: 1 },
  rock_climbing: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 1, caution_snowfall: 0.5 },
  indoor_climbing: { irrelevant: true },
  // Add rock_hopping with very low tolerance on snowy rocks
  rock_hopping: { caution: 0.1, unsafe: 1, max_snowfall: 1, caution_snowfall: 0.5 },

  // Running and cardio
  running: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 10, caution_snowfall: 2.5 },
  trail_running: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  cycling: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 0.5 },
  urban_exploring: { caution: 3, difficult: 10, unsafe: 15, max_snowfall: 10, caution_snowfall: 5 },

  // Water sports - primarily access/safety issues
  kayaking: { caution: 1, difficult: 5, unsafe: 15, max_snowfall: 5, caution_snowfall: 2.5 },
  sea_kayaking: { caution: 5, difficult: 15, max_snowfall: 5, caution_snowfall: 2.5 },
  canoeing: { caution: 1, difficult: 5, unsafe: 15, max_snowfall: 5, caution_snowfall: 2.5 },
  surfing: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  stand_up_paddleboarding: { caution: 1, difficult: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  sup_sea: { caution: 5, difficult: 15, max_snowfall: 5, caution_snowfall: 2.5 },
  sailing: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  sailing_inland: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  windsurfing: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  windsurfing_inland: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  kitesurfing: { caution: 10, difficult: 20, max_snowfall: 15, caution_snowfall: 10 },
  jet_skiing: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  
  // Newly wired water users
  snorkeling: { caution: 1, unsafe: 3, max_snowfall: 5, caution_snowfall: 2.5 },
  sea_swimming: { caution: 1, unsafe: 3, max_snowfall: 5, caution_snowfall: 2.5 },
  swimming: { caution: 1, unsafe: 3, max_snowfall: 5, caution_snowfall: 2.5 },
  scuba_diving: { caution: 1, difficult: 5, max_snowfall: 10, caution_snowfall: 5 },

  // Nature activities
  hiking: { caution: 5, difficult: 15, dangerous: 30, too_deep: 100, max_snowfall: 10, caution_snowfall: 2.5 },
  birdwatching: { caution: 1, difficult: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  photography: { beneficial: 1, optimal: 5, max_snowfall: 15, caution_snowfall: 5 },
  foraging: { caution: 1, difficult: 3, impossible: 10, max_snowfall: 2.5, caution_snowfall: 1 },
  mushroom_hunting: { caution: 1, difficult: 3, impossible: 5, max_snowfall: 1, caution_snowfall: 0.5 },
  wild_swimming: { caution: 1, unsafe: 3, max_snowfall: 5, caution_snowfall: 2.5 },
  gardening: { impossible: 1, max_snowfall: 0.5 },
  stargazing: { beneficial: 1, max_snowfall: 0.5, caution_snowfall: 0.1 },
  dog_walking: { caution: 1, difficult: 5, max_snowfall: 15, caution_snowfall: 5 },

  // Recreation activities
  picnicking: { uncomfortable: 1, impractical: 3, max_snowfall: 2.5, caution_snowfall: 1 },
  bbq: { uncomfortable: 1, impractical: 3, max_snowfall: 1, caution_snowfall: 1.5 },
  beach: { uncomfortable: 1, impractical: 3, max_snowfall: 1, caution_snowfall: 0.5 },
  geocaching: { caution: 5, difficult: 15, max_snowfall: 10, caution_snowfall: 5 },
  camping: { requires_winter_gear: 1, dangerous: 20, max_snowfall: 5, caution_snowfall: 10 },
  outdoor_playground: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 1.5, caution_snowfall: 1 },
  outdoor_chess: { uncomfortable: 1, impractical: 3, max_snowfall: 1, caution_snowfall: 0.5 },

  // Fitness activities
  outdoor_yoga: { caution: 1, difficult: 3, max_snowfall: 2.5, caution_snowfall: 1 },
  outdoor_meditation: { uncomfortable: 1, difficult: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  outdoor_gym: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 1, caution_snowfall: 0.5 },
  gym_workout: { irrelevant: true },
  zumba: { irrelevant: true },
  boxing: { irrelevant: true },
  spinning: { irrelevant: true },

  // Indoor activities (marked as irrelevant)
  squash: { irrelevant: true },
  volleyball_indoor: { irrelevant: true },
  ice_hockey_us: { irrelevant: true },
  yoga: { irrelevant: true },
  meditation: { irrelevant: true },
  pilates: { irrelevant: true },
  martial_arts: { irrelevant: true },
  tai_chi: { irrelevant: true },
  indoor_swimming: { irrelevant: true },
  // Update: outdoor ice activities are snow-sensitive (accumulation on ice and active snowfall)
  ice_skating: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 5, caution_snowfall: 2 },
  curling: { irrelevant: true },
  ice_hockey: { caution: 1, difficult: 3, unsafe: 5, max_snowfall: 5, caution_snowfall: 2 },
  ice_hockey_indoor: { irrelevant: true },
  painting: { irrelevant: true },
  outdoor_painting: { uncomfortable: 1, impractical: 3, max_snowfall: 10, caution_snowfall: 5 },
  crafts: { irrelevant: true },
  knitting: { irrelevant: true },
  diy: { irrelevant: true },
  playing_records: { irrelevant: true },
  make_music: { irrelevant: true },
  dance: { irrelevant: true },
  outdoor_music: { uncomfortable: 1, impractical: 3, difficult: 5, max_snowfall: 5, caution_snowfall: 2.5 },
  reading: { irrelevant: true },
  outdoor_reading: { uncomfortable: 1, impractical: 3, max_snowfall: 2.5, caution_snowfall: 1 },

  // Fishing
  fly_fishing_freshwater: { caution: 1, difficult: 5, dangerous: 30, max_snowfall: 10, caution_snowfall: 5 },
  coarse_fishing: { caution: 1, difficult: 5, dangerous: 30, max_snowfall: 15, caution_snowfall: 5 },
  sea_fishing_shore: { caution: 1, difficult: 5, dangerous: 30, max_snowfall: 10, caution_snowfall: 5 },
  sea_fishing_boat: { caution: 10, unsafe: 20, max_snowfall: 10, caution_snowfall: 5 },
};

// Activities where any snowfall or any accumulation is unsafe (zero tolerance)
const ZERO_TOLERANCE_SNOW_ACTIVITIES = new Set<string>([
  'road_cycling',
  'riding_motorbike',
  'skateboarding',
  'rollerblading',
  // Added per user request
  'tennis',
  'pickleball',
  'badminton',
  'table_tennis',
  'netball',
  'hockey',
  'wild_swimming',
  'gardening',
]);

export function getSnowActivityRecommendation(
  activityKey: string,
  snowDepthCm: number,
  snowfallRateMmH = 0
): SnowRecommendation {
  const thresholds = SNOW_ACTIVITY_THRESHOLDS[activityKey];

  if (!thresholds) {
    return {
      level: 'unknown',
      message: 'Activity not found in snow impact database',
      safety: 'unknown',
    };
  }

  // Handle irrelevant activities (indoor)
  if (thresholds.irrelevant) {
    return {
      level: 'irrelevant',
      message: 'Snow conditions do not affect this indoor activity',
      safety: 'safe',
      ...RECOMMENDATION_LEVELS.irrelevant,
    };
  }

  // Zero‑tolerance activities: any snowfall or any accumulation is unsafe
  if (ZERO_TOLERANCE_SNOW_ACTIVITIES.has(activityKey)) {
    if (snowfallRateMmH > 0) {
      return {
        level: 'snowfall_unsafe',
        message: 'Unsafe in the snow. Slippery surfaces.',
        safety: 'unsafe',
        ...RECOMMENDATION_LEVELS.snowfall_unsafe,
      };
    }
    if (snowDepthCm > 0) {
      return {
        level: 'unsafe',
        message: 'Unsafe: any snow makes surfaces hazardous.',
        safety: 'unsafe',
        ...RECOMMENDATION_LEVELS.unsafe,
      };
    }
  }

  // Priority 1: Check active snowfall first (can override depth-based recommendations)
  if (snowfallRateMmH > 0) {
    if (thresholds.max_snowfall && snowfallRateMmH >= thresholds.max_snowfall) {
      return {
        level: 'snowfall_unsafe',
        message: `Unsafe due to heavy snowfall (${snowfallRateMmH}mm/h). Poor visibility and dangerous conditions`,
        safety: 'unsafe',
        ...RECOMMENDATION_LEVELS.snowfall_unsafe,
      };
    }
  }

  // Priority 2: Handle snow sports (where snow is beneficial/required)
  if (thresholds.required) {
    // Too deep (safety override)
    if (thresholds.too_deep && snowDepthCm >= thresholds.too_deep) {
      return {
        level: 'too_deep',
        message: `Dangerous - snow too deep (${snowDepthCm}cm). Risk of avalanches, closed facilities, or access issues`,
        safety: 'unsafe',
        ...RECOMMENDATION_LEVELS.too_deep,
      };
    }

    if (snowDepthCm < thresholds.required) {
      return {
        level: 'insufficient',
        message: `Insufficient snow depth. Need at least ${thresholds.required}cm for safe conditions`,
        safety: 'unsafe',
        ...RECOMMENDATION_LEVELS.required,
      };
    } else if (thresholds.excellent && snowDepthCm >= thresholds.excellent) {
      let message = `Excellent snow conditions! ${snowDepthCm}cm provides outstanding conditions`;
      if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
        message += ` ⚠️ Active snowfall reduces visibility`;
        return {
          level: 'snowfall_caution',
          message,
          safety: 'manageable',
          ...RECOMMENDATION_LEVELS.snowfall_caution,
        };
      }
      return {
        level: 'excellent',
        message,
        safety: 'safe',
        ...RECOMMENDATION_LEVELS.excellent,
      };
    } else if (thresholds.optimal && snowDepthCm >= thresholds.optimal) {
      let message = `Optimal snow depth for great conditions`;
      if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
        message += ` ⚠️ Active snowfall reduces visibility`;
        return {
          level: 'snowfall_caution',
          message,
          safety: 'manageable',
          ...RECOMMENDATION_LEVELS.snowfall_caution,
        };
      }
      return {
        level: 'optimal',
        message,
        safety: 'safe',
        ...RECOMMENDATION_LEVELS.optimal,
      };
    } else {
      let message = `Adequate snow depth for basic conditions`;
      if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
        message += ` ⚠️ Active snowfall reduces visibility`;
        return {
          level: 'snowfall_caution',
          message,
          safety: 'manageable',
          ...RECOMMENDATION_LEVELS.snowfall_caution,
        };
      }
      return {
        level: 'adequate',
        message,
        safety: 'safe',
        ...RECOMMENDATION_LEVELS.beneficial,
      };
    }
  }

  // Priority 3: Activities where snow can be beneficial
  if (thresholds.beneficial && snowDepthCm >= thresholds.beneficial) {
    if (!thresholds.cold_limit || snowDepthCm <= thresholds.cold_limit) {
      let message = `Snow conditions enhance this activity`;
      if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
        message += ` ⚠️ Active snowfall affects conditions`;
        return {
          level: 'snowfall_caution',
          message,
          safety: 'manageable',
          ...RECOMMENDATION_LEVELS.snowfall_caution,
        };
      }
      return {
        level: 'beneficial',
        message,
        safety: 'safe',
        ...RECOMMENDATION_LEVELS.beneficial,
      };
    }
  }

  // Priority 4: Too deep for non-snow activities
  if (thresholds.too_deep && snowDepthCm >= thresholds.too_deep) {
    return {
      level: 'too_deep',
      message: `Snow too deep (${snowDepthCm}cm) for safe participation without specialized equipment`,
      safety: 'unsafe',
      ...RECOMMENDATION_LEVELS.too_deep,
    };
  }

  // Priority 5: Negative impacts (most activities)
  const checks: Array<{ threshold: keyof typeof thresholds; level: Exclude<SnowRecommendationLevel,
    'excellent'|'optimal'|'beneficial'|'required'|'safe'|'too_deep'|'irrelevant'|'requires_winter_gear'|'snowfall_unsafe'|'snowfall_caution'|'unknown'|'insufficient'|'adequate'> }>
    = [
      { threshold: 'impossible', level: 'impossible' },
      { threshold: 'unplayable', level: 'unplayable' },
      { threshold: 'dangerous', level: 'dangerous' },
      { threshold: 'unsafe', level: 'unsafe' },
      { threshold: 'difficult', level: 'difficult' },
      { threshold: 'impractical', level: 'impractical' },
      { threshold: 'uncomfortable', level: 'uncomfortable' },
      { threshold: 'caution', level: 'caution' },
    ];

  for (const check of checks) {
    const tVal = thresholds[check.threshold] as number | undefined;
    if (typeof tVal === 'number' && snowDepthCm >= tVal) {
      const rec = RECOMMENDATION_LEVELS[check.level];
      let message = `${snowDepthCm}cm of snow - ${check.level} conditions`;

      if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
        message += ` ⚠️ Snowfall (${snowfallRateMmH}mm/h) worsens conditions`;
        if (['caution', 'difficult', 'uncomfortable'].includes(check.level)) {
          return {
            level: 'snowfall_caution',
            message,
            safety: 'challenging',
            ...RECOMMENDATION_LEVELS.snowfall_caution,
          };
        }
      }

      return {
        level: check.level,
        message,
        safety: ['dangerous', 'unsafe', 'impossible', 'unplayable'].includes(check.level) ? 'unsafe'
              : ['difficult', 'impractical'].includes(check.level) ? 'challenging' : 'manageable',
        ...rec,
      };
    }
  }

  // Gear requirements
  if (typeof thresholds.requires_winter_gear === 'number' && snowDepthCm >= thresholds.requires_winter_gear) {
    let message = `Winter gear and experience required for safe participation`;
    if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
      message += ` ⚠️ Snowing increases difficulty`;
      return {
        level: 'snowfall_caution',
        message,
        safety: 'challenging',
        ...RECOMMENDATION_LEVELS.snowfall_caution,
      };
    }
    return {
      level: 'requires_winter_gear',
      message,
      safety: 'manageable',
      ...RECOMMENDATION_LEVELS.requires_winter_gear,
    };
  }

  // Default: safe conditions, but check for snowfall impact
  let message = snowDepthCm === 0 ? 'No snow impact on this activity' : 'Snow conditions are manageable';
  if (snowfallRateMmH > 0 && thresholds.caution_snowfall && snowfallRateMmH >= thresholds.caution_snowfall) {
    message = `Generally safe, but active snowfall (${snowfallRateMmH}mm/h) may affect conditions`;
    return {
      level: 'snowfall_caution',
      message,
      safety: 'manageable',
      ...RECOMMENDATION_LEVELS.snowfall_caution,
    };
  }

  return {
    level: 'safe',
    message,
    safety: 'safe',
    ...RECOMMENDATION_LEVELS.safe,
  };
}

export function getSnowActivityRecommendations(
  activityKeys: string[],
  snowDepthCm: number,
  snowfallRateMmH = 0
): Record<string, SnowRecommendation> {
  const recommendations: Record<string, SnowRecommendation> = {};
  for (const activityKey of activityKeys) {
    recommendations[activityKey] = getSnowActivityRecommendation(activityKey, snowDepthCm, snowfallRateMmH);
  }
  return recommendations;
}

export function filterActivitiesBySnow(
  activityKeys: string[],
  snowDepthCm: number,
  acceptableLevels: SnowRecommendationLevel[] = ['safe', 'beneficial', 'optimal', 'excellent', 'irrelevant']
): string[] {
  return activityKeys.filter((activityKey) => {
    const recommendation = getSnowActivityRecommendation(activityKey, snowDepthCm);
    return acceptableLevels.includes(recommendation.level);
  });
}

export function getSnowActivitySummary(
  activityKeys: string[],
  snowDepthCm: number
) {
  const summary: Record<'safe'|'manageable'|'challenging'|'unsafe'|'unknown', Array<{ activity: string; recommendation: SnowRecommendation }>> = {
    safe: [], manageable: [], challenging: [], unsafe: [], unknown: []
  };

  for (const activityKey of activityKeys) {
    const recommendation = getSnowActivityRecommendation(activityKey, snowDepthCm);
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
