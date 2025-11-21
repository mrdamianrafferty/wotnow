/**
 * Score and rank habitats based on current environmental conditions
 *
 * Takes habitat types (from species.preferred_habitats) and scores them
 * based on real-time conditions to help anglers choose WHERE to fish TODAY.
 */

export interface HabitatConditions {
  // Wind
  wind_speed_kts?: number | null;
  wind_direction_deg?: number | null;

  // Waves & swell
  wave_height_m?: number | null;

  // Water conditions
  current_speed_ms?: number | null;
  kd490?: number | null;          // water clarity (diffuse attenuation coefficient)
  sea_temp_c?: number | null;

  // Tide
  tide_stage?: string | null;     // 'flooding', 'ebbing', 'high_slack', 'low_slack'

  // Time
  time_of_day?: 'dawn' | 'day' | 'dusk' | 'night' | null;

  // Location context
  water_depth_m?: number | null;  // Estimated depth at location
}

export interface ScoredHabitat {
  habitat: string;
  score: number;        // 0-100
  reason?: string;      // Why this habitat scores well/poorly TODAY
  emoji: string;
}

interface ConditionRule {
  condition: (c: HabitatConditions) => boolean;
  bonus: number;        // Can be negative
  reason: string;
}

interface HabitatRules {
  base: number;
  emoji: string;
  rules: ConditionRule[];
  goodExplanation: string;
  poorExplanation: string;
}

/**
 * Condition-based scoring rules for each habitat type
 *
 * Based on angler expertise:
 * - rocky_shore: Loves settled seas with movement, hates big swell
 * - sandy_beach: Loves moderate surf, hates flat calm or storm conditions
 * - pier_harbor: Loves shelter, hates strong wrapping swell
 * - estuary: Loves steady tidal flow, hates slack or extreme freshwater
 * - shallow_water: Loves calm with gentle movement, hates big wind/swell
 * - deep_water: Loves heavier weather, hates dead calm + no tide
 * - wreck_reef: Loves moderate swell, hates very strong tide/drift
 * - open_sea: Loves stable conditions, hates heavy chop and white-out
 */
const HABITAT_CONDITION_RULES: Record<string, HabitatRules> = {
  'rocky_shore': {
    base: 70,
    emoji: '🪨',
    goodExplanation: 'rocky ground holds baitfish and predators in settled seas',
    poorExplanation: 'big swell or onshore wind makes rocks dangerous',
    rules: [
      {
        condition: (c) => {
          const waves = c.wave_height_m ?? 0;
          return waves >= 0.3 && waves <= 1.0;
        },
        bonus: 15,
        reason: 'ideal swell height for rocky shore'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.5,
        bonus: -25,
        reason: 'big swell pushes fish off the edges'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) < 0.2,
        bonus: -10,
        reason: 'too calm - fish less active around rocks'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 20,
        bonus: -15,
        reason: 'strong onshore wind makes rocks dangerous'
      },
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          return wind >= 5 && wind <= 15;
        },
        bonus: 10,
        reason: 'moderate wind creates perfect movement'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.3,
        bonus: 5,
        reason: 'current brings baitfish around rocky structure'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.2,
        bonus: 5,
        reason: 'clear water helps predators hunt around rocks'
      },
    ],
  },

  'sandy_beach': {
    base: 65,
    emoji: '🏝️',
    goodExplanation: 'surf stirs up worms and crabs in the gutters',
    poorExplanation: 'flat calm makes beaches lifeless, heavy surf buries gear',
    rules: [
      {
        condition: (c) => {
          const waves = c.wave_height_m ?? 0;
          return waves >= 0.5 && waves <= 1.2;
        },
        bonus: 20,
        reason: 'perfect surf to stir up natural food'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) < 0.3,
        bonus: -20,
        reason: 'flat calm seas make beaches lifeless'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.8,
        bonus: -20,
        reason: 'heavy surf buries baits and drags gear'
      },
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          return wind >= 5 && wind <= 15;
        },
        bonus: 10,
        reason: 'light to moderate onshore breeze fires up the beach'
      },
      {
        condition: (c) => c.tide_stage === 'flooding',
        bonus: 10,
        reason: 'rising tide pushes fish into the surf zone'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.15 && (c.kd490 ?? 0) < 0.35,
        bonus: 5,
        reason: 'slightly coloured water is ideal for surf fishing'
      },
    ],
  },

  'pier_harbor': {
    base: 75,
    emoji: '🏗️',
    goodExplanation: 'shelter and structure attract baitfish, brilliant at night',
    poorExplanation: 'strong swell wrapping around walls makes it unfishable',
    rules: [
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.2,
        bonus: 15,
        reason: 'perfect when the open coast is too rough'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -20,
        reason: 'swell wrapping around walls makes it dangerous'
      },
      {
        condition: (c) => c.time_of_day === 'night' || c.time_of_day === 'dusk',
        bonus: 15,
        reason: 'baitfish gather under lights at night'
      },
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          return tide >= 0.1 && tide <= 0.5;
        },
        bonus: 10,
        reason: 'gentle tide flow keeps baitfish around structure'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 1.0,
        bonus: -15,
        reason: 'fast tide flow makes it unfishable'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) <= 10,
        bonus: 5,
        reason: 'shelter from wind makes for comfortable fishing'
      },
    ],
  },

  'estuary': {
    base: 70,
    emoji: '🏞️',
    goodExplanation: 'steady tidal flow brings feeding fish into coloured water',
    poorExplanation: 'slack water or extreme freshwater run-off shuts fish down',
    rules: [
      {
        condition: (c) => c.tide_stage === 'flooding' || c.tide_stage === 'ebbing',
        bonus: 20,
        reason: 'moving tide activates feeding in the estuary'
      },
      {
        condition: (c) => c.tide_stage?.includes('slack') ?? false,
        bonus: -20,
        reason: 'slack water shuts fish down'
      },
      {
        condition: (c) => {
          const flow = c.current_speed_ms ?? 0;
          return flow >= 0.3 && flow <= 0.8;
        },
        bonus: 15,
        reason: 'steady tidal flow is perfect for estuaries'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.25,
        bonus: 10,
        reason: 'fish feed confidently in coloured estuarine water'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.1,
        bonus: -10,
        reason: 'very clear water makes fish more cautious'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) > 12,
        bonus: 5,
        reason: 'warmer water increases estuary activity'
      },
    ],
  },

  'shallow_water': {
    base: 65,
    emoji: '💧',
    goodExplanation: 'fish use shallows for feeding during stable conditions',
    poorExplanation: 'big wind or swell spooks fish and churns up the bottom',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 12 && waves <= 0.8;
        },
        bonus: 20,
        reason: 'calm conditions let fish feed in the shallows'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.2,
        bonus: -25,
        reason: 'big swell mixes up the bottom and spooks fish'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 18,
        bonus: -20,
        reason: 'strong wind churns shallow water too much'
      },
      {
        condition: (c) => c.time_of_day === 'day',
        bonus: 10,
        reason: 'sunlight and gentle movement activate shallow feeders'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) > 15,
        bonus: 10,
        reason: 'warmer water brings fish into the shallows'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.2,
        bonus: 5,
        reason: 'clear water helps predators hunt in shallows'
      },
    ],
  },

  'deep_water': {
    base: 65,
    emoji: '⚓',
    goodExplanation: 'deep marks fish well in heavier weather - wind matters less',
    poorExplanation: 'dead calm with no tide makes fish sulk on the bottom',
    rules: [
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.5,
        bonus: 20,
        reason: 'great for deep water when shallows are rough'
      },
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 8 && waves <= 0.5;
        },
        bonus: -15,
        reason: 'dead calm conditions make fish lethargic'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.4,
        bonus: 15,
        reason: 'tide flow activates bottom feeders'
      },
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          const wind = c.wind_speed_kts ?? 0;
          return tide < 0.1 && wind < 5;
        },
        bonus: -20,
        reason: 'no tide and no wind makes fish sulk'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) < 12,
        bonus: 10,
        reason: 'cooler water suits deep water species'
      },
    ],
  },

  'wreck_reef': {
    base: 75,
    emoji: '🪸',
    goodExplanation: 'structure attracts baitfish and predators even in moderate swell',
    poorExplanation: 'very strong tide makes it hard to keep lures in the zone',
    rules: [
      {
        condition: (c) => {
          const waves = c.wave_height_m ?? 0;
          return waves >= 0.5 && waves <= 1.5;
        },
        bonus: 15,
        reason: 'moderate swell keeps wreck fish active'
      },
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          return tide >= 0.3 && tide <= 0.8;
        },
        bonus: 15,
        reason: 'steady tide brings baitfish to structure'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 1.2,
        bonus: -25,
        reason: 'very strong tide makes it hard to fish the structure'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.25,
        bonus: 10,
        reason: 'clearer water helps predators hunt around structure'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -15,
        reason: 'big drift makes staying in the zone difficult'
      },
    ],
  },

  'open_sea': {
    base: 65,
    emoji: '🛥️',
    goodExplanation: 'stable conditions are ideal for open water fishing',
    poorExplanation: 'heavy chop and white-out make open water challenging',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 15 && waves <= 1.2;
        },
        bonus: 20,
        reason: 'calm stable seas are perfect for fishing'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -25,
        reason: 'heavy chop scatters shoals and pushes fish deeper'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 25,
        bonus: -20,
        reason: 'white-out conditions make open sea unfishable'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.15,
        bonus: 15,
        reason: 'clear, well-oxygenated water is ideal for open sea fishing'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) > 16,
        bonus: 10,
        reason: 'warm water brings more fish to the surface'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.5,
        bonus: 5,
        reason: 'current lines concentrate baitfish'
      },
    ],
  },
};

/**
 * Score a single habitat based on current conditions
 */
function scoreHabitat(habitat: string, conditions: HabitatConditions): ScoredHabitat {
  const rules = HABITAT_CONDITION_RULES[habitat];

  // If no rules found, return neutral score
  if (!rules) {
    return {
      habitat,
      score: 50,
      emoji: '🎣',
      reason: 'conditions are average for this habitat',
    };
  }

  let score = rules.base;
  let topReason: string | undefined;
  let topBonus = 0;

  // Apply each condition rule that matches
  for (const rule of rules.rules) {
    try {
      if (rule.condition(conditions)) {
        score += rule.bonus;
        // Track the highest absolute value bonus to use as the main reason
        if (Math.abs(rule.bonus) > Math.abs(topBonus)) {
          topBonus = rule.bonus;
          topReason = rule.reason;
          const _topBonusIsNegative = rule.bonus < 0;
        }
      }
    } catch (err) {
      // Silently skip rules that error (e.g., missing condition data)
      console.warn('[scoreHabitat] Rule evaluation error:', err);
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Generate explanation
  let reason: string;
  if (topReason) {
    reason = topReason;
  } else if (score >= 70) {
    reason = rules.goodExplanation;
  } else if (score < 50) {
    reason = rules.poorExplanation;
  } else {
    reason = 'conditions are reasonable for this habitat';
  }

  return {
    habitat,
    emoji: rules.emoji,
    score,
    reason,
  };
}

/**
 * Score and rank an array of habitats based on current conditions
 *
 * @param habitats - Array of habitat types from species.preferred_habitats
 * @param conditions - Current environmental conditions
 * @returns Array of scored habitats sorted by suitability (highest first)
 *
 * @example
 * const habitats = ['rocky_shore', 'sandy_beach', 'pier_harbor'];
 * const conditions = {
 *   wind_speed_kts: 12,
 *   wave_height_m: 0.8,
 *   tide_stage: 'flooding',
 *   time_of_day: 'day'
 * };
 * const scored = scoreHabitatsByConditions(habitats, conditions);
 * // Returns habitats ranked by score with explanations
 */
export function scoreHabitatsByConditions(
  habitats: string[] | null | undefined,
  conditions: HabitatConditions
): ScoredHabitat[] {
  if (!habitats || habitats.length === 0) {
    return [];
  }

  return habitats
    .map(habitat => scoreHabitat(habitat, conditions))
    .sort((a, b) => b.score - a.score);  // Highest score first
}

/**
 * Get the full explanation text for a habitat (for help/info screens)
 */
export function getHabitatExplanation(habitat: string): {
  emoji: string;
  name: string;
  goodExplanation: string;
  poorExplanation: string;
} | null {
  const rules = HABITAT_CONDITION_RULES[habitat];
  if (!rules) return null;

  // Convert habitat code to display name
  const displayNames: Record<string, string> = {
    'rocky_shore': 'Rocky Shore',
    'sandy_beach': 'Sandy Beach',
    'pier_harbor': 'Pier / Harbour',
    'estuary': 'Estuary',
    'shallow_water': 'Shallow Water',
    'deep_water': 'Deep Water',
    'wreck_reef': 'Wreck & Reef',
    'open_sea': 'Open Sea',
  };

  return {
    emoji: rules.emoji,
    name: displayNames[habitat] || habitat,
    goodExplanation: rules.goodExplanation,
    poorExplanation: rules.poorExplanation,
  };
}
