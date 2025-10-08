// Pollen utilities for WotNow
// Provides pollen level classification and health recommendations

export enum PollenLevel {
  NONE = 0,      // 0-2: Minimal pollen
  LOW = 1,       // 3-4: Low levels, minimal symptoms for most
  MODERATE = 2,  // 5-6: Moderate levels, some may experience symptoms
  HIGH = 3,      // 7-8: High levels, most allergy sufferers affected
  VERY_HIGH = 4, // 9-10: Very high levels, significant symptoms likely
  EXTREME = 5    // 11+: Extreme levels, unusually severe (optional)
}

export type PollenSummary = {
  grass?: number;
  tree?: number; 
  weed?: number;
  olive?: number;
};

export type PollenAssessment = {
  grass: PollenLevel;
  tree: PollenLevel;
  weed: PollenLevel;
  olive: PollenLevel;
  overall: PollenLevel;
  warnings: string[];
};

/**
 * Classify a pollen value into severity levels
 * Based on common allergy alert systems
 */
export function classifyPollenLevel(value?: number): PollenLevel {
  if (!value || value < 0) return PollenLevel.NONE;
  if (value <= 0.5) return PollenLevel.LOW;
  if (value <= 2) return PollenLevel.MODERATE;
  if (value <= 4) return PollenLevel.HIGH;
  if (value <= 10) return PollenLevel.VERY_HIGH;
  return PollenLevel.EXTREME; // 11+ for unusually severe conditions
}

/**
 * Get human-readable pollen level description
 */
export function getPollenLevelDescription(level: PollenLevel): string {
  switch (level) {
    case PollenLevel.NONE: return 'None';
    case PollenLevel.LOW: return 'Low';
    case PollenLevel.MODERATE: return 'Moderate';
    case PollenLevel.HIGH: return 'High';
    case PollenLevel.VERY_HIGH: return 'Very High';
    case PollenLevel.EXTREME: return 'Extreme';
    default: return 'Unknown';
  }
}

/**
 * Get pollen type icon path
 */
export function getPollenIcon(type: 'grass' | 'tree' | 'weed' | 'olive' | 'overall'): string {
  const basePath = '/weather-icons/design/fill/final';
  switch (type) {
    case 'grass': return `${basePath}/pollen-grass.svg`;
    case 'tree': return `${basePath}/pollen-tree.svg`;
    case 'weed': return `${basePath}/pollen-flower.svg`; // Using flower for weed
    case 'olive': return `${basePath}/pollen-olive.svg`;
    case 'overall': return `${basePath}/pollen.svg`;
    default: return `${basePath}/pollen.svg`;
  }
}

/**
 * Assess pollen conditions and generate warnings
 * Only generates warnings for moderate+ levels and present pollen types
 */
export function assessPollenConditions(pollen?: PollenSummary): PollenAssessment {
  if (!pollen) {
    return {
      grass: PollenLevel.NONE,
      tree: PollenLevel.NONE,
      weed: PollenLevel.NONE,
      olive: PollenLevel.NONE,
      overall: PollenLevel.NONE,
      warnings: []
    };
  }

  const grass = classifyPollenLevel(pollen.grass);
  const tree = classifyPollenLevel(pollen.tree);
  const weed = classifyPollenLevel(pollen.weed);
  const olive = classifyPollenLevel(pollen.olive);
  
  // Overall level is the highest of the three
  const overall = Math.max(grass, tree, weed, olive) as PollenLevel;
  
  const warnings: string[] = [];
  
  // Only generate warnings for moderate+ levels and when data is actually present
  if (pollen.grass != null && grass >= PollenLevel.MODERATE) {
    if (grass >= PollenLevel.HIGH) {
      warnings.push('High grass pollen');
    } else {
      warnings.push('Moderate grass pollen');
    }
  }
  
  if (pollen.tree != null && tree >= PollenLevel.MODERATE) {
    if (tree >= PollenLevel.HIGH) {
      warnings.push('High tree pollen - consider closing windows and limiting outdoor time');
    } else {
      warnings.push('Moderate tree pollen levels detected');
    }
  }
  
  if (pollen.weed != null && weed >= PollenLevel.MODERATE) {
    if (weed >= PollenLevel.HIGH) {
      warnings.push('High weed pollen - allergic reactions possible');
    } else {
      warnings.push('Moderate weed pollen levels detected');
    }
  }

  if (pollen.olive != null && olive >= PollenLevel.MODERATE) {
    if (olive >= PollenLevel.HIGH) {
      warnings.push('High olive pollen');
    } else {
      warnings.push('Moderate olive pollen levels detected');
    }
  }
  
  // Overall activity advice
  if (overall >= PollenLevel.VERY_HIGH) {
    warnings.push('Very high pollen levels');
  } else if (overall >= PollenLevel.HIGH) {
    warnings.push('High pollen levels');
  } else if (overall >= PollenLevel.MODERATE) {
    warnings.push('Moderate pollen levels');
  }

  return { grass, tree, weed, olive, overall, warnings };
}

/**
 * Get activity-specific pollen advice
 */
export function getPollenAdviceForActivity(
  activityId: string, 
  pollenAssessment: PollenAssessment
): string | null {
  const { overall, grass, tree } = pollenAssessment;
  
  // Only provide advice for outdoor activities with moderate+ pollen
  if (overall < PollenLevel.MODERATE) return null;
  
  // Activity-specific advice
  const outdoorActivities = new Set([
    'running', 'trail_running', 'cycling', 'road_cycling', 'hiking',
    'outdoor_gym', 'outdoor_yoga', 'gardening', 'outdoor_gardening',
    'dog_walking', 'photography', 'birdwatching', 'picnicking',
    'football_soccer', 'tennis', 'golf', 'frisbee'
  ]);
  
  if (!outdoorActivities.has(activityId)) return null;
  
  // Generate specific advice based on activity and pollen levels
  const levelDesc = getPollenLevelDescription(overall).toLowerCase();
  
  switch (activityId) {
    case 'running':
    case 'trail_running':
      if (overall >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} pollen - consider treadmill or postpone until evening`;
      }
      return `Expect ${levelDesc} pollen - avoid early morning runs`;
      
    case 'cycling':
    case 'road_cycling':
      if (overall >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} pollen`;
      }
      return `Expect ${levelDesc} pollen`;
      
    case 'gardening':
    case 'outdoor_gardening':
      if (grass >= PollenLevel.HIGH || tree >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} pollen - wear mask and gloves, shower after gardening`;
      }
      return `Expect ${levelDesc} pollen - limit time outdoors and avoid lawn mowing`;
      
    case 'outdoor_gym':
    case 'outdoor_yoga':
      if (overall >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} pollen`;
      }
      return `Expect ${levelDesc} pollen - consider indoor alternatives if you're sensitive`;
      
    case 'golf':
      if (grass >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} grass pollen`;
      }
      return `Expect ${levelDesc} pollen`;
      
    default:
      if (overall >= PollenLevel.HIGH) {
        return `Expect ${levelDesc} pollen`;
      }
      return `Expect ${levelDesc} pollen`;
  }
}

/**
 * Get the best time recommendations to avoid pollen
 */
export function getPollenTimingAdvice(level: PollenLevel): string | null {
  if (level < PollenLevel.MODERATE) return null;
  
  if (level >= PollenLevel.HIGH) {
    return 'Pollen peaks 6-10am and evening - plan activities for late morning or early afternoon';
  }
  
  return 'Pollen levels typically lower in late morning and after rain';
}

/**
 * Convert raw pollen value to a 0-100 index for better user understanding
 */
export function getPollenIndex(value?: number): number {
  if (!value || value <= 0) return 0;
  // Scale raw values to 0-100 index (approximate mapping)
  return Math.min(Math.round(value * 10), 100);
}

/**
 * Get pollen severity badge text
 */
export function getPollenSeverityBadge(level: PollenLevel): string {
  switch (level) {
    case PollenLevel.NONE: return 'None';
    case PollenLevel.LOW: return 'Low';
    case PollenLevel.MODERATE: return 'Moderate';
    case PollenLevel.HIGH: return 'High';
    case PollenLevel.VERY_HIGH: return 'Very High';
    default: return 'Unknown';
  }
}
