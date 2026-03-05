/**
 * Post-harvest advice for empty beds that previously had plants.
 * Provides seasonal bed care and rotation suggestions.
 */

import {
  ROTATION_GROUP_FRIENDLY,
  type RotationGroup,
} from './bedIntelligenceTypes';

export interface PostHarvestAdvice {
  seasonalAdvice: string;
  nextSteps: string;
}

/**
 * Get seasonal post-harvest advice based on current month and last crop's rotation group.
 *
 * @param month - Current month (1-12)
 * @param rotationGroup - The rotation group of the last crop grown (or null)
 */
export function getPostHarvestAdvice(
  month: number,
  rotationGroup: RotationGroup | null,
): PostHarvestAdvice {
  let seasonalAdvice: string;
  let nextSteps: string;

  // Seasonal bed care
  if (month >= 11 || month <= 2) {
    seasonalAdvice = 'Rest the soil over winter. Spread a layer of well-rotted compost or manure and mulch to protect from heavy rain and frost.';
    nextSteps = 'No rush to replant — let the soil recover. Plan next year\'s planting while you wait.';
  } else if (month >= 3 && month <= 4) {
    seasonalAdvice = 'Spring is here! Clear any debris, fork over the soil gently, and apply a general-purpose organic fertiliser.';
    nextSteps = 'The bed is ready for spring sowings. Check your planting calendar for what to start now.';
  } else if (month >= 5 && month <= 6) {
    seasonalAdvice = 'Fill gaps with quick-growing salad leaves, radishes, or herbs. Alternatively, sow green manure (phacelia or mustard) to improve soil health.';
    nextSteps = 'Fast-growing crops like lettuce, rocket, and spring onions can fill this bed within weeks.';
  } else if (month >= 7 && month <= 8) {
    seasonalAdvice = 'Consider autumn and winter crops: kale, spring cabbage, overwintering onions, or a late sowing of salads under cover.';
    nextSteps = 'There\'s still time for a second crop this season. Choose quick-maturing varieties.';
  } else {
    // Sep-Oct
    seasonalAdvice = 'Ideal time to sow green manure (rye and vetch, or phacelia) to fix nitrogen and protect bare soil. Or plant garlic and broad beans for an early spring harvest.';
    nextSteps = 'Green manure now will give you richer soil for spring. Dig it in 4 weeks before planting.';
  }

  // Rotation suggestion if we know the last crop's group
  if (rotationGroup) {
    const friendly = ROTATION_GROUP_FRIENDLY[rotationGroup];
    if (friendly?.followWith) {
      nextSteps = `For crop rotation, try planting ${friendly.followWith} next.`;
    }
  }

  return { seasonalAdvice, nextSteps };
}
