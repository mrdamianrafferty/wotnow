// utils/soilMoistureUtils.ts
// Soil condition utilities for activities sensitive to ground moisture

// Activities significantly affected by muddy/sodden ground
export const MUD_SENSITIVE_ACTIVITIES = [
  // Trail/Off-road activities
  'trail_running',
  'mountain_biking',
  'gravel_biking',
  'hiking',
  'dog_walking',
  'geocaching',
  'orienteering',
  'cross_country_skiing', // when not frozen

  // Field sports
  'football_soccer',
  'rugby',
  'gaelic_football',
  'hurling_camogie',
  'cricket',
  'baseball',
  'american_football',

  // Outdoor recreation
  'camping',
  'picnicking',
  'outdoor_playground',
  'horse_riding',

  // Nature activities
  'foraging',
  'mushroom_hunting',
  'birdwatching', // trail access

  // Other outdoor activities
  'archery', // field conditions
  'golf', // course conditions
] as const;

export type SoilLevel = 'dry' | 'optimal' | 'damp' | 'muddy' | 'sodden';
export type SoilImpact = 'positive' | 'neutral' | 'caution' | 'warning' | 'severe';

export interface SoilCondition {
  level: SoilLevel;
  value: number; // 0-100 volumetric %
  label: string;
  color: string;
  impact: SoilImpact;
}

export function isMudSensitive(activityId: string): boolean {
  return (MUD_SENSITIVE_ACTIVITIES as readonly string[]).includes(activityId);
}

/**
 * Assess soil condition from a soil moisture value.
 * Accepts either 0-1 (m³/m³) or 0-100 (%). Returns a normalized 0-100 % value.
 */
export function assessSoilCondition(soilMoisture: number): SoilCondition {
  // Soil moisture is typically in m³/m³ (0-1) or percentage (0-100)
  // Convert to percentage if needed
  const moisture = soilMoisture <= 1 ? soilMoisture * 100 : soilMoisture;

  if (moisture < 15) {
    return {
      level: 'dry',
      value: moisture,
      label: 'Dry and firm ground',
      color: '#fbbf24', // yellow
      impact: 'neutral',
    };
  } else if (moisture < 30) {
    return {
      level: 'optimal',
      value: moisture,
      label: 'Perfect ground conditions',
      color: '#10b981', // green
      impact: 'positive',
    };
  } else if (moisture < 45) {
    return {
      level: 'damp',
      value: moisture,
      label: 'Damp but manageable',
      color: '#3b82f6', // blue
      impact: 'neutral',
    };
  } else if (moisture < 60) {
    return {
      level: 'muddy',
      value: moisture,
      label: 'Muddy conditions expected',
      color: '#f59e0b', // orange
      impact: 'caution',
    };
  } else {
    return {
      level: 'sodden',
      value: moisture,
      label: 'Very muddy/waterlogged',
      color: '#ef4444', // red
      impact: 'severe',
    };
  }
}

// Activity-specific muddy ground messages
export function getMudMessage(activityId: string, soilCondition: SoilCondition): string | null {
  if (soilCondition.level === 'dry' || soilCondition.level === 'optimal') {
    return null; // No warning needed
  }

  const mudMessages: Record<string, Partial<Record<SoilLevel, string>>> = {
    // Trail activities
    trail_running: {
      damp: 'Trails may be slightly slippery',
      muddy: 'Expect muddy trails - consider trail shoes with good grip',
      sodden: 'Very muddy trails - be prepared for challenging conditions',
    },
    mountain_biking: {
      damp: 'Trails in good condition with some damp sections',
      muddy: 'Muddy trails - lower tire pressure for better grip',
      sodden: 'Extremely muddy - consider postponing to protect trails',
    },
    hiking: {
      damp: 'Some damp patches on trails',
      muddy: 'Muddy paths - waterproof boots recommended',
      sodden: 'Very muddy conditions - gaiters and poles advisable',
    },

    // Field sports
    football_soccer: {
      damp: 'Pitch slightly soft but playable',
      muddy: 'Muddy pitch - expect heavy conditions',
      sodden: 'Pitch may be waterlogged in places',
    },
    rugby: {
      damp: 'Good conditions for rugby',
      muddy: 'Traditional muddy rugby conditions',
      sodden: 'Very heavy pitch - scrums will be challenging',
    },
    cricket: {
      damp: 'Outfield may be slow',
      muddy: 'Poor conditions - consider postponing',
      sodden: 'Unplayable - pitch likely waterlogged',
    },

    // Recreation
    camping: {
      damp: 'Ground slightly damp - use a groundsheet',
      muddy: 'Muddy campsite - choose pitch carefully',
      sodden: 'Very wet ground - elevated camping recommended',
    },
    dog_walking: {
      damp: 'Your dog might get slightly muddy',
      muddy: 'Muddy paws guaranteed - bring towels',
      sodden: 'Very muddy - consider paved paths instead',
    },

    // Default for other activities
    default: {
      damp: 'Ground conditions slightly damp',
      muddy: 'Muddy conditions - dress accordingly',
      sodden: 'Very muddy/wet ground conditions',
    },
  };

  const messages = mudMessages[activityId] || mudMessages.default;
  return messages[soilCondition.level] ?? null;
}
