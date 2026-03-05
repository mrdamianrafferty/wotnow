/**
 * Growth stage calculation for plants based on days_to_maturity data.
 * Returns stage info with label, badge colours, and care tips.
 */

export type GrowthStage =
  | 'seedling'
  | 'establishing'
  | 'growing_on'
  | 'approaching_harvest'
  | 'ready_to_harvest'
  | 'past_peak';

export interface GrowthStageInfo {
  stage: GrowthStage;
  label: string;
  badgeClass: string;
  careTip: string;
  progress: number; // 0-1+ (can exceed 1 for past_peak)
  isPerennial: boolean;
  perennialNote?: string;
}

const STAGE_CONFIG: Record<GrowthStage, { label: string; badgeClass: string; careTip: string }> = {
  seedling: {
    label: 'Seedling',
    badgeClass: 'bg-lime-100 text-lime-800',
    careTip: 'Keep soil moist but not waterlogged. Protect from strong winds and late frosts.',
  },
  establishing: {
    label: 'Establishing',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    careTip: 'Water regularly and begin feeding with a balanced fertiliser. Thin out if overcrowded.',
  },
  growing_on: {
    label: 'Growing On',
    badgeClass: 'bg-green-100 text-green-800',
    careTip: 'Maintain consistent watering. Mulch to retain moisture and suppress weeds.',
  },
  approaching_harvest: {
    label: 'Approaching Harvest',
    badgeClass: 'bg-amber-100 text-amber-800',
    careTip: 'Reduce watering slightly for root crops. Check daily for signs of ripeness.',
  },
  ready_to_harvest: {
    label: 'Ready to Harvest',
    badgeClass: 'bg-yellow-100 text-yellow-800 font-semibold',
    careTip: 'Harvest regularly to encourage continued cropping. Pick in the morning for best flavour.',
  },
  past_peak: {
    label: 'Past Peak',
    badgeClass: 'bg-red-100 text-red-800',
    careTip: 'Consider removing spent plants. Add to compost and prepare the bed for the next crop.',
  },
};

/**
 * Calculate the growth stage for a planting.
 *
 * @param plantedAt - ISO date string of when the plant was planted
 * @param daysToMaturityMin - Minimum days to maturity (from plant_species)
 * @param daysToMaturityMax - Maximum days to maturity (from plant_species)
 * @returns GrowthStageInfo or null if maturity data is unavailable
 */
export function getGrowthStage(
  plantedAt: string,
  daysToMaturityMin: number | null,
  daysToMaturityMax: number | null,
): GrowthStageInfo | null {
  if (daysToMaturityMin == null && daysToMaturityMax == null) {
    return null;
  }

  const min = daysToMaturityMin ?? daysToMaturityMax!;
  const max = daysToMaturityMax ?? daysToMaturityMin!;

  // Perennial: days_to_maturity_min >= 365 indicates multi-year establishment
  if (min >= 365) {
    const yearCount = Math.ceil(min / 365);
    return {
      stage: 'establishing',
      label: 'Establishing',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      careTip: 'Perennial plant — focus on establishing strong roots. Avoid heavy harvesting in early years.',
      progress: 0,
      isPerennial: true,
      perennialNote: `First harvest expected in year ${yearCount}`,
    };
  }

  const plantedDate = new Date(plantedAt);
  const now = new Date();
  const daysSincePlanted = Math.floor((now.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));

  const midpoint = (min + max) / 2;
  const progress = daysSincePlanted / midpoint;

  let stage: GrowthStage;
  if (progress <= 0.12) {
    stage = 'seedling';
  } else if (progress <= 0.30) {
    stage = 'establishing';
  } else if (progress <= 0.65) {
    stage = 'growing_on';
  } else if (progress <= 0.85) {
    stage = 'approaching_harvest';
  } else if (progress <= 1.0) {
    stage = 'ready_to_harvest';
  } else {
    stage = 'past_peak';
  }

  const config = STAGE_CONFIG[stage];

  return {
    stage,
    label: config.label,
    badgeClass: config.badgeClass,
    careTip: config.careTip,
    progress,
    isPerennial: false,
  };
}
