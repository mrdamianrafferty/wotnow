/**
 * Score and rank fishing techniques based on current environmental conditions
 *
 * Takes technique codes (from species.effective_techniques) and scores them
 * based on real-time conditions to help anglers choose HOW to fish TODAY.
 */

export interface TechniqueConditions {
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
}

export interface ScoredTechnique {
  technique: string;    // Normalized code (e.g., 'BOT', 'SPN')
  name: string;         // Display name (e.g., 'Bottom Fishing')
  score: number;        // 0-100
  reason?: string;      // Why this technique scores well/poorly TODAY
  emoji: string;
}

interface ConditionRule {
  condition: (c: TechniqueConditions) => boolean;
  bonus: number;        // Can be negative
  reason: string;
}

interface TechniqueRules {
  base: number;
  name: string;
  emoji: string;
  rules: ConditionRule[];
  goodExplanation: string;
  poorExplanation: string;
}

/**
 * Normalize technique codes to standard short codes
 * Handles both short codes (TRL, SPN) and full names (trolling, spinning)
 */
const TECHNIQUE_CODE_MAP: Record<string, string> = {
  // Short codes (already normalized)
  'BOT': 'BOT',
  'RLG': 'RLG',
  'FLF': 'FLF',
  'SLF': 'SLF',
  'LRF': 'LRF',
  'SPN': 'SPN',
  'JIG': 'JIG',
  'TRL': 'TRL',
  'SAB': 'SAB',
  'FLY': 'FLY',
  'SURF': 'SURF',
  'EGI': 'EGI',

  // Full names → short codes
  'bottom_fishing': 'BOT',
  'float_fishing': 'FLF',
  'surfcasting': 'SURF',
  'spinning': 'SPN',
  'jigging': 'JIG',
  'soft_plastics': 'SPN',  // Treat as spinning variant
  'fly_fishing': 'FLY',
  'trolling': 'TRL',
  'drifting': 'TRL',      // Similar to trolling
  'chumming': 'BOT',      // Bottom-oriented
  'pier_fishing': 'BOT',  // Mixed methods, default to bottom
  'kayak_fishing': 'SPN', // Light tackle, treat as spinning
};

/**
 * Condition-based scoring rules for each technique
 *
 * Based on angler expertise:
 * - BOT: Needs steady tide, sensible swell
 * - RLG: Needs gentle tide and settled seas
 * - FLF: Needs sheltered spots, light chop
 * - SLF: Similar to FLF but handles depth better
 * - LRF: Needs calm seas, clear water
 * - SPN: Needs chop + moving tide, clear enough for lures
 * - JIG: Punches through chop, works at depth
 * - TRL: Needs moderate chop, clean water, steady speed
 * - SAB: Works around structure, even moderate wind
 * - FLY: Needs light wind, clear water
 * - SURF: Needs clean 0.5-1.5m surf
 * - EGI: Needs calm water, clear conditions, night lights
 */
const TECHNIQUE_CONDITION_RULES: Record<string, TechniqueRules> = {
  'BOT': {
    base: 75,
    name: 'Bottom Fishing',
    emoji: '⚓',
    goodExplanation: 'steady tide and sensible swell let you hold bottom',
    poorExplanation: 'too much surf or tide drags the rig around',
    rules: [
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          const waves = c.wave_height_m ?? 0;
          return tide >= 0.2 && tide <= 0.7 && waves <= 1.5;
        },
        bonus: 20,
        reason: 'perfect conditions to hold bottom'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -25,
        reason: 'heavy surf buries baits and drags tackle'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 1.2,
        bonus: -20,
        reason: 'strong tide makes it hard to hold bottom'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) < 0.3 && (c.current_speed_ms ?? 0) < 0.1,
        bonus: -15,
        reason: 'too calm - fish less active on the bottom'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.3,
        bonus: 10,
        reason: 'scent-based fishing works well in murky water'
      },
    ],
  },

  'RLG': {
    base: 70,
    name: 'Running Ledger',
    emoji: '🎣',
    goodExplanation: 'perfect for shy feeders in gentle tide and settled seas',
    poorExplanation: 'loses sensitivity in big swell or fast tide',
    rules: [
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          const waves = c.wave_height_m ?? 0;
          return tide >= 0.1 && tide <= 0.5 && waves <= 1.0;
        },
        bonus: 20,
        reason: 'gentle conditions give maximum bite detection'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.5,
        bonus: -20,
        reason: 'big swell kills sensitivity'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.8,
        bonus: -20,
        reason: 'fast tide loses the delicate feel'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) <= 12,
        bonus: 10,
        reason: 'calm wind helps detect subtle takes'
      },
    ],
  },

  'FLF': {
    base: 70,
    name: 'Float Fishing',
    emoji: '🎈',
    goodExplanation: 'ideal for wrasse and bream in sheltered spots',
    poorExplanation: 'strong wind or swell drags the float everywhere',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 12 && waves <= 0.6;
        },
        bonus: 20,
        reason: 'sheltered conditions are perfect for float control'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 18,
        bonus: -25,
        reason: 'strong wind makes float fishing impossible'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.0,
        bonus: -20,
        reason: 'swell drags the float all over the place'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.25,
        bonus: 10,
        reason: 'clear water helps fish find suspended baits'
      },
      {
        condition: (c) => c.time_of_day === 'day',
        bonus: 5,
        reason: 'visual fishing works best in daylight'
      },
    ],
  },

  'SLF': {
    base: 70,
    name: 'Sliding Float',
    emoji: '🎈',
    goodExplanation: 'lets you fish deeper water cleanly for mullet and bass',
    poorExplanation: 'useless in big swell or gusty wind',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 15 && waves <= 0.8;
        },
        bonus: 15,
        reason: 'calm enough to fish deeper water cleanly'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 20,
        bonus: -25,
        reason: 'gusty wind makes sliding floats uncontrollable'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.2,
        bonus: -20,
        reason: 'big swell ruins the presentation'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.3,
        bonus: 10,
        reason: 'moving water brings fish into mid-water feeding'
      },
    ],
  },

  'LRF': {
    base: 65,
    name: 'Light Rock Fishing',
    emoji: '🦐',
    goodExplanation: 'tiny lures in calm seas catch hyper-active micro species',
    poorExplanation: 'useless in heavy swell or murky water',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          const clarity = c.kd490 ?? 0;
          return wind <= 10 && waves <= 0.5 && clarity < 0.2;
        },
        bonus: 25,
        reason: 'perfect calm clear conditions for micro lures'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.0,
        bonus: -30,
        reason: 'heavy swell makes tiny lures impossible to fish'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.3,
        bonus: -25,
        reason: 'fish cannot see tiny lures in murky water'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 15,
        bonus: -20,
        reason: 'wind makes light tackle uncontrollable'
      },
      {
        condition: (c) => c.time_of_day === 'night',
        bonus: 5,
        reason: 'rockpools come alive at night'
      },
    ],
  },

  'SPN': {
    base: 75,
    name: 'Spinning',
    emoji: '🎣',
    goodExplanation: 'chop and moving tide switch predators on',
    poorExplanation: 'messy seas and strong winds kill lure action',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          const tide = c.current_speed_ms ?? 0;
          return wind >= 5 && wind <= 15 && waves >= 0.3 && waves <= 1.2 && tide > 0.2;
        },
        bonus: 25,
        reason: 'perfect conditions for lure fishing'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.8,
        bonus: -25,
        reason: 'messy seas ruin lure action'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 22,
        bonus: -25,
        reason: 'strong wind makes casting and control impossible'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.35,
        bonus: -15,
        reason: 'too murky for lures to be visible'
      },
      {
        condition: (c) => (c.kd490 ?? 0) < 0.2,
        bonus: 15,
        reason: 'clear water with chop is ideal for lures'
      },
      {
        condition: (c) => c.time_of_day === 'dawn' || c.time_of_day === 'dusk',
        bonus: 10,
        reason: 'prime feeding time for lure fishing'
      },
    ],
  },

  'JIG': {
    base: 75,
    name: 'Jigging',
    emoji: '🪝',
    goodExplanation: 'jigs punch through chop and find fish at depth',
    poorExplanation: 'extreme drift or tide makes staying in contact difficult',
    rules: [
      {
        condition: (c) => {
          const waves = c.wave_height_m ?? 0;
          const tide = c.current_speed_ms ?? 0;
          return waves >= 0.5 && waves <= 1.8 && tide <= 1.0;
        },
        bonus: 20,
        reason: 'ideal conditions for vertical jigging'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 1.5,
        bonus: -25,
        reason: 'extreme tide makes it impossible to stay vertical'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.5,
        bonus: -20,
        reason: 'heavy seas make depth control very difficult'
      },
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          return tide >= 0.3 && tide <= 0.8;
        },
        bonus: 15,
        reason: 'steady tide brings baitfish around structure'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) < 0.3,
        bonus: -10,
        reason: 'too calm - jigs work better with some movement'
      },
    ],
  },

  'TRL': {
    base: 70,
    name: 'Trolling',
    emoji: '🚤',
    goodExplanation: 'moderate chop and clean water are perfect for covering water',
    poorExplanation: 'too rough to tow lures cleanly, too calm for fish to rise',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          const clarity = c.kd490 ?? 0;
          return wind >= 5 && wind <= 18 && waves >= 0.5 && waves <= 1.5 && clarity < 0.25;
        },
        bonus: 25,
        reason: 'ideal trolling conditions - moderate chop and clear water'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -25,
        reason: 'too rough to tow lures cleanly'
      },
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind < 5 && waves < 0.3;
        },
        bonus: -20,
        reason: 'too calm - pelagics less active at the surface'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.35,
        bonus: -15,
        reason: 'murky water reduces trolling effectiveness'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) > 16,
        bonus: 15,
        reason: 'warm water brings pelagics to the surface'
      },
    ],
  },

  'SAB': {
    base: 75,
    name: 'Sabiki / Bait Catching',
    emoji: '🐟',
    goodExplanation: 'attracts baitfish around piers and lights',
    poorExplanation: 'difficult in heavy swell or muddy water',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          return wind <= 18 && waves <= 1.2;
        },
        bonus: 15,
        reason: 'calm enough to fish sabiki rigs effectively'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.8,
        bonus: -20,
        reason: 'heavy swell tangles multi-hook rigs'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.4,
        bonus: -15,
        reason: 'muddy water makes it hard for baitfish to see the lures'
      },
      {
        condition: (c) => c.time_of_day === 'night',
        bonus: 15,
        reason: 'baitfish gather under pier lights at night'
      },
      {
        condition: (c) => (c.current_speed_ms ?? 0) > 0.3,
        bonus: 10,
        reason: 'moving tide brings baitfish around structure'
      },
    ],
  },

  'FLY': {
    base: 65,
    name: 'Saltwater Fly',
    emoji: '🪰',
    goodExplanation: 'light wind and clear water make fly deadly',
    poorExplanation: 'strong wind or murky water makes it almost impossible',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const clarity = c.kd490 ?? 0;
          return wind <= 10 && clarity < 0.15;
        },
        bonus: 30,
        reason: 'perfect calm clear conditions for fly fishing'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 18,
        bonus: -35,
        reason: 'strong wind makes casting and presentation impossible'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.3,
        bonus: -30,
        reason: 'murky water ruins sight fishing'
      },
      {
        condition: (c) => {
          const tide = c.current_speed_ms ?? 0;
          return tide >= 0.2 && tide <= 0.6;
        },
        bonus: 15,
        reason: 'moving tide activates feeding behavior'
      },
      {
        condition: (c) => c.time_of_day === 'dawn' || c.time_of_day === 'dusk',
        bonus: 10,
        reason: 'prime sight fishing time'
      },
    ],
  },

  'SURF': {
    base: 75,
    name: 'Surfcasting',
    emoji: '🌊',
    goodExplanation: 'clean surf lifts food off the sand',
    poorExplanation: 'flat seas reduce activity, storm surf buries gear',
    rules: [
      {
        condition: (c) => {
          const waves = c.wave_height_m ?? 0;
          return waves >= 0.5 && waves <= 1.5;
        },
        bonus: 25,
        reason: 'perfect surf height for beach fishing'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) < 0.3,
        bonus: -25,
        reason: 'flat seas make beaches lifeless'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 2.0,
        bonus: -25,
        reason: 'storm surf buries gear and washes out gutters'
      },
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          return wind >= 5 && wind <= 15;
        },
        bonus: 15,
        reason: 'moderate onshore wind creates ideal surf conditions'
      },
      {
        condition: (c) => c.tide_stage === 'flooding',
        bonus: 10,
        reason: 'rising tide pushes fish into the surf zone'
      },
      {
        condition: (c) => (c.wind_speed_kts ?? 0) > 25,
        bonus: -20,
        reason: 'strong cross-winds make casting dangerous'
      },
    ],
  },

  'EGI': {
    base: 70,
    name: 'Squid / Cuttlefish Jigs',
    emoji: '🦑',
    goodExplanation: 'squid love clear water, light wind and night-time lights',
    poorExplanation: 'too much swell or murky water shuts them down',
    rules: [
      {
        condition: (c) => {
          const wind = c.wind_speed_kts ?? 0;
          const waves = c.wave_height_m ?? 0;
          const clarity = c.kd490 ?? 0;
          return wind <= 12 && waves <= 0.6 && clarity < 0.2;
        },
        bonus: 25,
        reason: 'perfect calm clear conditions for squid'
      },
      {
        condition: (c) => (c.wave_height_m ?? 0) > 1.2,
        bonus: -25,
        reason: 'too much swell shuts squid down'
      },
      {
        condition: (c) => (c.kd490 ?? 0) > 0.3,
        bonus: -25,
        reason: 'murky water makes egis ineffective'
      },
      {
        condition: (c) => c.time_of_day === 'night' || c.time_of_day === 'dusk',
        bonus: 20,
        reason: 'squid hunt actively under lights at night'
      },
      {
        condition: (c) => (c.sea_temp_c ?? 15) > 14,
        bonus: 10,
        reason: 'warmer water increases squid activity'
      },
    ],
  },
};

/**
 * Normalize technique code to standard short code
 */
function normalizeTechniqueCode(code: string): string {
  return TECHNIQUE_CODE_MAP[code] || code;
}

/**
 * Score a single technique based on current conditions
 */
function scoreTechnique(
  techniqueCode: string,
  conditions: TechniqueConditions
): ScoredTechnique {
  // Normalize the code
  const normalizedCode = normalizeTechniqueCode(techniqueCode);
  const rules = TECHNIQUE_CONDITION_RULES[normalizedCode];

  // If no rules found, return neutral score
  if (!rules) {
    return {
      technique: normalizedCode,
      name: techniqueCode,
      score: 50,
      emoji: '🎣',
      reason: 'conditions are average for this technique',
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
        }
      }
    } catch (err) {
      // Silently skip rules that error (e.g., missing condition data)
      console.warn('[scoreTechnique] Rule evaluation error:', err);
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
    reason = 'conditions are reasonable for this technique';
  }

  return {
    technique: normalizedCode,
    name: rules.name,
    emoji: rules.emoji,
    score,
    reason,
  };
}

/**
 * Score and rank an array of techniques based on current conditions
 *
 * @param techniques - Array of technique codes from species.effective_techniques
 * @param conditions - Current environmental conditions
 * @returns Array of scored techniques sorted by suitability (highest first)
 *
 * @example
 * const techniques = ['SPN', 'BOT', 'FLY'];
 * const conditions = {
 *   wind_speed_kts: 12,
 *   wave_height_m: 0.8,
 *   current_speed_ms: 0.4,
 *   kd490: 0.18,
 *   tide_stage: 'flooding'
 * };
 * const scored = scoreTechniquesByConditions(techniques, conditions);
 * // Returns techniques ranked by score with explanations
 */
export function scoreTechniquesByConditions(
  techniques: string[] | null | undefined,
  conditions: TechniqueConditions
): ScoredTechnique[] {
  if (!techniques || techniques.length === 0) {
    return [];
  }

  return techniques
    .map(technique => scoreTechnique(technique, conditions))
    .sort((a, b) => b.score - a.score);  // Highest score first
}

/**
 * Get the full explanation text for a technique (for help/info screens)
 */
export function getTechniqueExplanation(techniqueCode: string): {
  code: string;
  emoji: string;
  name: string;
  goodExplanation: string;
  poorExplanation: string;
} | null {
  const normalizedCode = normalizeTechniqueCode(techniqueCode);
  const rules = TECHNIQUE_CONDITION_RULES[normalizedCode];
  if (!rules) return null;

  return {
    code: normalizedCode,
    emoji: rules.emoji,
    name: rules.name,
    goodExplanation: rules.goodExplanation,
    poorExplanation: rules.poorExplanation,
  };
}

/**
 * Get technique code mapping (for debugging/documentation)
 */
export function getTechniqueCodeMap(): Record<string, string> {
  return { ...TECHNIQUE_CODE_MAP };
}
