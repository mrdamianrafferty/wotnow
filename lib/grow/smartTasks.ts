/**
 * Smart Task Generation Service
 *
 * Generates personalized gardening tasks based on:
 * - User's actual plants
 * - Climate zone and frost conditions
 * - Garden conditions (soil, sun, moisture)
 * - Seasonal timing
 * - Weather forecasts (watering, planting windows)
 * - Growth stage (harvest reminders)
 */

import type { ClimateZoneCode, FrostRiskLevel } from './climate';
import {
  getClimateZoneFrostRisk,
  isInFrostRiskPeriod,
  getClimateZoneFrostDates,
} from './climate';
import type {
  WeatherForecast,
  SoilConditions,
} from './weatherTaskEngine';
import {
  calculateWateringRecommendation,
  calculatePlantingWindows,
} from './weatherTaskEngine';

export type TaskType = 'planting' | 'care' | 'protection' | 'harvest' | 'watering' | 'seasonal';
export type TaskUrgency = 'now' | 'soon' | 'upcoming' | 'later';
export type FrostTolerance = 'hardy' | 'half_hardy' | 'tender';

export interface PlantInfo {
  slug: string;
  name: string | null;
  frostTolerance: FrostTolerance | null;
  frostProtectionNeeded: boolean;
  plantedAt?: string | null;
  daysToHarvest?: number | null;
  waterNeeds?: 'low' | 'medium' | 'high' | null;
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
  forecast?: WeatherForecast[];
  soilConditions?: SoilConditions;
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

// =============================================================================
// WATERING TASK GENERATOR
// =============================================================================

/**
 * Approximate days to harvest for common crops.
 * Used when grow_user_plants doesn't have species-level data.
 */
const DEFAULT_DAYS_TO_HARVEST: Record<string, number> = {
  lettuce: 45, spinach: 40, radish: 28, rocket: 30,
  chard: 55, kale: 60, spring_onion: 60,
  beetroot: 60, carrot: 70, turnip: 55,
  pea: 65, bean: 60, broad_bean: 90, runner_bean: 70, french_bean: 55,
  courgette: 50, cucumber: 55, squash: 90, pumpkin: 100, butternut_squash: 100,
  tomato: 75, pepper: 80, chilli: 85, aubergine: 80,
  potato: 90, sweet_potato: 100, sweetcorn: 85,
  broccoli: 70, cauliflower: 80, cabbage: 75, brussels_sprouts: 120,
  onion: 100, garlic: 180, leek: 120, shallot: 90,
  parsnip: 110, celery: 100, celeriac: 120,
  strawberry: 60, raspberry: 70, blueberry: 80,
};

/**
 * Generate watering task based on weather forecast and soil conditions.
 * Uses calculateWateringRecommendation from weatherTaskEngine.
 */
export function generateWateringTask(
  ctx: SmartTaskContext
): SmartTask | null {
  if (!ctx.forecast || !ctx.soilConditions || ctx.forecast.length === 0) {
    return null;
  }

  // Build minimal UserPlant array for the weather engine
  const userPlants = ctx.userPlants.map((p) => ({
    id: p.slug,
    plantName: p.name || p.slug,
    plantSlug: p.slug,
    frostTolerance: p.frostTolerance,
    waterNeeds: p.waterNeeds ?? null,
  }));

  const rec = calculateWateringRecommendation(ctx.forecast, ctx.soilConditions, userPlants);

  if (rec.shouldWater) {
    const urgency: TaskUrgency = rec.adjustmentFactor >= 1.3 ? 'now' : 'soon';
    return {
      id: generateTaskId('watering', ['garden']),
      type: 'watering',
      title: rec.adjustmentFactor >= 1.3
        ? 'Water your garden — conditions are dry'
        : 'Water your garden today',
      description: rec.reason + '. ' + rec.details.slice(0, 2).join('. '),
      plants: ctx.userPlants.map((p) => p.slug),
      urgency,
      isRelevant: true,
      relevanceReason: rec.reason,
      conditions: {
        weatherBased: true,
        frostBased: false,
        seasonBased: false,
        soilBased: true,
      },
    };
  }

  // Generate a "skip watering" informational task
  if (rec.adjustmentFactor === 0 || rec.reason.toLowerCase().includes('rain')) {
    return {
      id: generateTaskId('watering', ['garden']),
      type: 'watering',
      title: 'Skip watering today',
      description: rec.reason + '. ' + rec.details.slice(0, 2).join('. '),
      plants: [],
      urgency: 'later',
      isRelevant: true,
      relevanceReason: rec.reason,
      conditions: {
        weatherBased: true,
        frostBased: false,
        seasonBased: false,
        soilBased: true,
      },
    };
  }

  return null;
}

// =============================================================================
// PLANTING WINDOW TASK GENERATOR
// =============================================================================

/**
 * Generate planting window tasks based on soil temperature.
 * Uses calculatePlantingWindows from weatherTaskEngine.
 */
export function generatePlantingWindowTasks(
  ctx: SmartTaskContext
): SmartTask[] {
  if (!ctx.forecast || !ctx.soilConditions || ctx.forecast.length === 0) {
    return [];
  }

  const userPlants = ctx.userPlants.map((p) => ({
    id: p.slug,
    plantName: p.name || p.slug,
    plantSlug: p.slug,
    frostTolerance: p.frostTolerance,
    waterNeeds: p.waterNeeds ?? null,
  }));

  const windows = calculatePlantingWindows(ctx.soilConditions, ctx.forecast, userPlants);
  const tasks: SmartTask[] = [];

  for (const window of windows) {
    if (window.canPlantNow) {
      tasks.push({
        id: generateTaskId('planting', [window.plantSlug]),
        type: 'planting',
        title: `Soil is warm enough to sow ${window.plantSlug} outdoors`,
        description: window.reason,
        plants: [window.plantSlug],
        urgency: 'soon',
        isRelevant: true,
        relevanceReason: window.reason,
        conditions: {
          weatherBased: false,
          frostBased: false,
          seasonBased: true,
          soilBased: true,
        },
      });
    } else if (window.daysUntilReady !== undefined && window.daysUntilReady <= 14) {
      tasks.push({
        id: generateTaskId('planting', [window.plantSlug]),
        type: 'planting',
        title: `Wait ${window.daysUntilReady} more days before sowing ${window.plantSlug}`,
        description: `Soil temp ${window.currentSoilTemp.toFixed(1)}°C, needs ${window.soilTempRequired}°C minimum.`,
        plants: [window.plantSlug],
        urgency: 'upcoming',
        isRelevant: true,
        relevanceReason: window.reason,
        conditions: {
          weatherBased: false,
          frostBased: false,
          seasonBased: true,
          soilBased: true,
        },
      });
    }
  }

  return tasks;
}

// =============================================================================
// HARVEST REMINDER TASK GENERATOR
// =============================================================================

/**
 * Generate harvest reminders based on planted_at dates and species days_to_harvest.
 */
export function generateHarvestReminders(
  ctx: SmartTaskContext
): SmartTask[] {
  const tasks: SmartTask[] = [];
  const now = ctx.currentDate ?? new Date();
  const nowMs = now.getTime();

  for (const plant of ctx.userPlants) {
    if (!plant.plantedAt) continue;

    const plantedDate = new Date(plant.plantedAt);
    if (isNaN(plantedDate.getTime())) continue;

    const daysToHarvest = plant.daysToHarvest
      ?? DEFAULT_DAYS_TO_HARVEST[plant.slug]
      ?? null;

    if (daysToHarvest === null) continue;

    const daysSincePlanted = Math.floor((nowMs - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = daysToHarvest - daysSincePlanted;
    const plantName = plant.name || plant.slug;

    if (daysRemaining <= 0 && daysRemaining > -14) {
      // Ready to harvest now
      tasks.push({
        id: generateTaskId('harvest', [plant.slug]),
        type: 'harvest',
        title: `Your ${plantName} may be ready to harvest`,
        description: `Planted ${daysSincePlanted} days ago (typical harvest at ${daysToHarvest} days). Check for readiness.`,
        plants: [plant.slug],
        urgency: 'now',
        isRelevant: true,
        relevanceReason: `${daysSincePlanted} days since planting, expected harvest at ${daysToHarvest} days`,
        conditions: {
          weatherBased: false,
          frostBased: false,
          seasonBased: true,
          soilBased: false,
        },
      });
    } else if (daysRemaining > 0 && daysRemaining <= 7) {
      // Approaching harvest window
      tasks.push({
        id: generateTaskId('harvest', [plant.slug]),
        type: 'harvest',
        title: `${plantName} approaching harvest — ${daysRemaining} days to go`,
        description: `Planted ${daysSincePlanted} days ago. Entering peak harvest window soon.`,
        plants: [plant.slug],
        urgency: 'upcoming',
        isRelevant: true,
        relevanceReason: `${daysRemaining} days until expected harvest`,
        conditions: {
          weatherBased: false,
          frostBased: false,
          seasonBased: true,
          soilBased: false,
        },
      });
    }
  }

  return tasks;
}

// =============================================================================
// SEASONAL MAINTENANCE TASK GENERATOR
// =============================================================================

/**
 * Seasonal maintenance tasks derived from month + climate zone.
 */
const SEASONAL_TASKS: Array<{
  months: number[];
  title: string;
  description: string;
  zones?: ClimateZoneCode[];
}> = [
  // Spring
  {
    months: [3, 4],
    title: 'Start hardening off indoor seedlings',
    description: 'Gradually acclimatise seedlings grown indoors by placing them outside for increasing periods over 7-10 days before transplanting.',
  },
  {
    months: [3],
    title: 'Prepare beds for spring sowing',
    description: 'Clear winter debris, fork over soil, and rake to a fine tilth. Apply compost or well-rotted manure.',
  },
  {
    months: [4, 5],
    title: 'Install plant supports',
    description: 'Set up bean poles, pea sticks, tomato cages, and other plant supports before crops need them.',
  },
  {
    months: [4, 5],
    title: 'Start regular slug patrols',
    description: 'Check around vulnerable seedlings at dusk. Set beer traps or apply organic slug deterrents.',
  },
  // Summer
  {
    months: [6, 7],
    title: 'Pinch out tomato side shoots',
    description: 'Remove side shoots (suckers) from cordon tomato varieties to focus energy on fruit production.',
  },
  {
    months: [6, 7, 8],
    title: 'Deadhead flowers regularly',
    description: 'Remove spent blooms from annuals and perennials to encourage continued flowering.',
  },
  {
    months: [7, 8],
    title: 'Summer prune trained fruit trees',
    description: 'Prune espalier, cordon, and fan-trained fruit trees to maintain shape and encourage fruit buds.',
  },
  // Autumn
  {
    months: [9, 10],
    title: 'Collect and save seeds',
    description: 'Harvest seeds from your best-performing plants for next year. Dry thoroughly and store in labelled envelopes.',
  },
  {
    months: [9, 10],
    title: 'Plant spring-flowering bulbs',
    description: 'Plant tulips, daffodils, crocuses, and alliums now for spring colour.',
  },
  {
    months: [10, 11],
    title: 'Protect tender plants before first frost',
    description: 'Move tender plants to shelter, wrap containers with fleece, and mulch around crowns of borderline-hardy plants.',
    zones: ['atlantic_mild', 'cool_maritime', 'continental_cool', 'mountain_cool'],
  },
  {
    months: [10, 11],
    title: 'Clean and store garden tools',
    description: 'Clean soil from tools, oil metal parts, sharpen blades. Store in a dry place to prevent rust.',
  },
  {
    months: [11],
    title: 'Spread organic mulch on empty beds',
    description: 'Apply a thick layer of compost, leaf mould, or well-rotted manure to protect soil over winter.',
  },
  // Winter
  {
    months: [12, 1, 2],
    title: 'Prune dormant fruit trees',
    description: 'Prune apple, pear, and other deciduous fruit trees while dormant. Remove crossing, dead, and diseased branches.',
  },
  {
    months: [1, 2],
    title: 'Order seeds and plan the growing season',
    description: 'Review last year, plan crop rotations, and order seeds early for the best selection.',
  },
  {
    months: [2, 3],
    title: 'Start early seeds indoors',
    description: 'Sow peppers, aubergines, and early tomatoes on a windowsill or in a heated propagator.',
  },
  {
    months: [2],
    title: 'Chit seed potatoes',
    description: 'Place seed potatoes in egg boxes in a cool, light spot to encourage short, sturdy sprouts before planting in March.',
  },
];

export function generateSeasonalMaintenanceTasks(
  ctx: SmartTaskContext
): SmartTask[] {
  const date = ctx.currentDate ?? new Date();
  const month = date.getMonth() + 1; // 1-12
  const tasks: SmartTask[] = [];

  for (const item of SEASONAL_TASKS) {
    if (!item.months.includes(month)) continue;

    // Zone filtering
    if (item.zones && ctx.climateZone && !item.zones.includes(ctx.climateZone)) {
      continue;
    }

    tasks.push({
      id: generateTaskId('seasonal' as TaskType, ['general']),
      type: 'care',
      title: item.title,
      description: item.description,
      plants: [],
      urgency: 'upcoming',
      isRelevant: true,
      relevanceReason: `Seasonal task for month ${month}`,
      conditions: {
        weatherBased: false,
        frostBased: false,
        seasonBased: true,
        soilBased: false,
      },
    });
  }

  return tasks;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

/**
 * Main function to generate all relevant smart tasks
 */
export function generateSmartTasks(ctx: SmartTaskContext): SmartTask[] {
  const tasks: SmartTask[] = [];

  // 1. Frost protection (existing)
  const frostResult = shouldShowFrostProtection(ctx);
  if (frostResult.show && frostResult.tenderPlants.length > 0) {
    tasks.push(generateFrostProtectionTask(frostResult.tenderPlants, ctx));
  }

  // 2. Watering task (weather-driven)
  const wateringTask = generateWateringTask(ctx);
  if (wateringTask) {
    tasks.push(wateringTask);
  }

  // 3. Planting window tasks (soil temperature)
  const plantingTasks = generatePlantingWindowTasks(ctx);
  tasks.push(...plantingTasks);

  // 4. Harvest reminders (growth stage)
  const harvestTasks = generateHarvestReminders(ctx);
  tasks.push(...harvestTasks);

  // 5. Seasonal maintenance tasks (calendar-based)
  const seasonalTasks = generateSeasonalMaintenanceTasks(ctx);
  tasks.push(...seasonalTasks);

  return tasks;
}
