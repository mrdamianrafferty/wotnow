/**
 * Smart Task Generation Service
 *
 * Generates personalized gardening tasks based on:
 * - User's actual plants
 * - Climate zone and frost conditions
 * - Garden conditions (soil, sun, moisture)
 * - Seasonal timing
 */

import type { ClimateZoneCode, FrostRiskLevel } from './climate';
import {
  getClimateZoneFrostRisk,
  isInFrostRiskPeriod,
  getClimateZoneFrostDates,
} from './climate';

export type TaskType = 'planting' | 'care' | 'protection' | 'harvest' | 'watering';
export type TaskUrgency = 'now' | 'soon' | 'upcoming' | 'later';
export type FrostTolerance = 'hardy' | 'half_hardy' | 'tender';

export interface PlantInfo {
  slug: string;
  name: string | null;
  frostTolerance: FrostTolerance | null;
  frostProtectionNeeded: boolean;
}

export interface GardenConditions {
  soilType: string | null;
  sunExposure: string | null;
  moisture: string | null;
  hasGreenhouse: boolean;
  hasRaisedBeds: boolean;
  hasColdFrame: boolean;
}

export interface SmartTaskContext {
  climateZone: ClimateZoneCode | null;
  elevation: number | null;
  userPlants: PlantInfo[];
  gardenConditions: GardenConditions | null;
  currentDate?: Date;
}

export interface SmartTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  plants: string[]; // slugs of plants this applies to
  urgency: TaskUrgency;
  isRelevant: boolean;
  relevanceReason?: string;
  conditions: {
    weatherBased: boolean;
    frostBased: boolean;
    seasonBased: boolean;
    soilBased: boolean;
  };
}

/**
 * Check if frost protection tasks should be shown
 */
export function shouldShowFrostProtection(ctx: SmartTaskContext): {
  show: boolean;
  reason: string;
  tenderPlants: PlantInfo[];
} {
  // No climate zone = can't determine frost risk
  if (!ctx.climateZone) {
    return {
      show: false,
      reason: 'No climate zone set - cannot determine frost risk',
      tenderPlants: [],
    };
  }

  // Find tender plants
  const tenderPlants = ctx.userPlants.filter(
    (p) => p.frostTolerance === 'tender' && p.frostProtectionNeeded
  );

  // No tender plants = no frost protection needed
  if (tenderPlants.length === 0) {
    return {
      show: false,
      reason: 'No frost-sensitive plants in your garden',
      tenderPlants: [],
    };
  }

  // Check if user has greenhouse (protected environment)
  if (ctx.gardenConditions?.hasGreenhouse) {
    return {
      show: false,
      reason: 'Plants in greenhouse are protected from frost',
      tenderPlants,
    };
  }

  // Check climate zone frost risk
  const frostRisk = getClimateZoneFrostRisk(ctx.climateZone);
  if (frostRisk === 'none' || frostRisk === 'low') {
    return {
      show: false,
      reason: `Your climate zone (${ctx.climateZone}) has ${frostRisk} frost risk`,
      tenderPlants,
    };
  }

  // Check if we're in frost risk period
  const date = ctx.currentDate ?? new Date();
  const inFrostPeriod = isInFrostRiskPeriod(ctx.climateZone, date);

  if (!inFrostPeriod) {
    return {
      show: false,
      reason: 'Currently outside frost risk period',
      tenderPlants,
    };
  }

  // All conditions met - show frost protection
  return {
    show: true,
    reason: `${tenderPlants.length} frost-sensitive plant(s) need protection`,
    tenderPlants,
  };
}

/**
 * Generate watering advice based on soil type
 */
export function getWateringAdvice(soilType: string | null): {
  frequency: string;
  depth: string;
  tips: string[];
} {
  switch (soilType?.toLowerCase()) {
    case 'clay':
      return {
        frequency: 'Less frequently',
        depth: 'Deep watering to penetrate dense soil',
        tips: [
          'Clay retains water - avoid overwatering',
          'Water slowly to prevent runoff',
          'Add organic matter to improve drainage',
        ],
      };
    case 'sandy':
      return {
        frequency: 'More frequently',
        depth: 'Regular, moderate watering',
        tips: [
          'Sandy soil drains quickly',
          'Water more often but in smaller amounts',
          'Mulch heavily to retain moisture',
        ],
      };
    case 'loam':
      return {
        frequency: 'Regular intervals',
        depth: 'Moderate watering depth',
        tips: [
          'Loam has excellent drainage and retention',
          'Water when top inch of soil is dry',
          'Ideal soil for most plants',
        ],
      };
    case 'chalky':
      return {
        frequency: 'Regular watering',
        depth: 'Moderate to deep',
        tips: [
          'Chalky soil drains quickly',
          'May need more frequent watering in summer',
          'Add organic matter to improve water retention',
        ],
      };
    case 'peat':
      return {
        frequency: 'Less frequently',
        depth: 'Light to moderate',
        tips: [
          'Peat retains moisture well',
          'Watch for waterlogging',
          'Good for acid-loving plants',
        ],
      };
    default:
      return {
        frequency: 'As needed',
        depth: 'Moderate',
        tips: [
          'Water when top inch of soil feels dry',
          'Adjust based on weather and plant needs',
        ],
      };
  }
}

/**
 * Get sun exposure recommendations for plants
 */
export function getSunExposureAdvice(sunExposure: string | null): {
  suitablePlants: string[];
  avoidPlants: string[];
  tips: string[];
} {
  switch (sunExposure?.toLowerCase()) {
    case 'full-sun':
    case 'full sun':
      return {
        suitablePlants: ['Tomatoes', 'Peppers', 'Courgettes', 'Squash', 'Lavender', 'Rosemary'],
        avoidPlants: ['Lettuce (in hot summers)', 'Spinach', 'Ferns'],
        tips: [
          'Most vegetables thrive here',
          'Provide afternoon shade for leafy greens in summer',
          'Mulch to keep roots cool',
        ],
      };
    case 'partial-shade':
    case 'partial shade':
      return {
        suitablePlants: ['Lettuce', 'Spinach', 'Chard', 'Beetroot', 'Carrots', 'Herbs'],
        avoidPlants: ['Tomatoes', 'Peppers', 'Mediterranean herbs'],
        tips: [
          'Good for leafy greens and root vegetables',
          'Some fruiting plants may produce less',
          '4-6 hours of sun is sufficient for many crops',
        ],
      };
    case 'full-shade':
    case 'full shade':
      return {
        suitablePlants: ['Mint', 'Wild garlic', 'Rhubarb', 'Ferns', 'Hostas'],
        avoidPlants: ['Most vegetables', 'Fruiting plants', 'Mediterranean plants'],
        tips: [
          'Limited vegetable options',
          'Focus on shade-tolerant herbs and ornamentals',
          'Consider container gardening in sunnier spots',
        ],
      };
    default:
      return {
        suitablePlants: [],
        avoidPlants: [],
        tips: ['Set your sun exposure in settings for personalized advice'],
      };
  }
}

/**
 * Get frost date information for user
 */
export function getFrostDateInfo(
  climateZone: ClimateZoneCode | null,
  date?: Date
): {
  lastSpringFrost: Date | null;
  firstFallFrost: Date | null;
  frostFreeDepth: number | null;
  frostRisk: FrostRiskLevel;
  inFrostPeriod: boolean;
} {
  if (!climateZone) {
    return {
      lastSpringFrost: null,
      firstFallFrost: null,
      frostFreeDepth: null,
      frostRisk: 'moderate',
      inFrostPeriod: false,
    };
  }

  const year = (date ?? new Date()).getFullYear();
  const frostDates = getClimateZoneFrostDates(climateZone, year);

  return {
    lastSpringFrost: frostDates.lastSpringFrost,
    firstFallFrost: frostDates.firstFallFrost,
    frostFreeDepth: frostDates.frostFreeDepth,
    frostRisk: getClimateZoneFrostRisk(climateZone),
    inFrostPeriod: isInFrostRiskPeriod(climateZone, date),
  };
}

/**
 * Generate smart task ID
 */
function generateTaskId(type: TaskType, plants: string[]): string {
  const plantPart = plants.slice(0, 3).join('-') || 'general';
  return `${type}-${plantPart}-${Date.now()}`;
}

/**
 * Generate personalized frost protection task
 */
export function generateFrostProtectionTask(
  tenderPlants: PlantInfo[],
  _ctx: SmartTaskContext
): SmartTask {
  const plantNames = tenderPlants
    .map((p) => p.name || p.slug)
    .slice(0, 3)
    .join(', ');

  const moreCount = tenderPlants.length > 3 ? tenderPlants.length - 3 : 0;
  const suffix = moreCount > 0 ? ` and ${moreCount} more` : '';

  return {
    id: generateTaskId('protection', tenderPlants.map((p) => p.slug)),
    type: 'protection',
    title: 'Protect plants from frost',
    description: `Your ${plantNames}${suffix} need frost protection. Consider fleece covers, cloches, or moving containers to shelter.`,
    plants: tenderPlants.map((p) => p.slug),
    urgency: 'now',
    isRelevant: true,
    conditions: {
      weatherBased: false,
      frostBased: true,
      seasonBased: true,
      soilBased: false,
    },
  };
}

/**
 * Main function to generate all relevant smart tasks
 */
export function generateSmartTasks(ctx: SmartTaskContext): SmartTask[] {
  const tasks: SmartTask[] = [];

  // Check frost protection
  const frostResult = shouldShowFrostProtection(ctx);
  if (frostResult.show && frostResult.tenderPlants.length > 0) {
    tasks.push(generateFrostProtectionTask(frostResult.tenderPlants, ctx));
  }

  // Future: Add more task generators here
  // - Watering tasks based on weather forecast
  // - Planting window tasks based on calendar
  // - Harvest reminders based on planted_at dates

  return tasks;
}
