/**
 * Seasonal colour temperature for bed cards.
 * Returns inline style objects to avoid Tailwind purge issues.
 * All colours use rgba with 40% opacity for subtlety.
 */

export type SeasonalTint = {
  backgroundColor: string;
  borderColor: string;
  label: string;
};

const SEASONS: Record<string, SeasonalTint> = {
  awakening: {
    backgroundColor: 'rgba(219, 234, 254, 0.4)', // blue-50
    borderColor: 'rgba(191, 219, 254, 0.6)',       // blue-200
    label: 'Awakening',
  },
  spring: {
    backgroundColor: 'rgba(209, 250, 229, 0.4)', // emerald-50
    borderColor: 'rgba(167, 243, 208, 0.6)',       // emerald-200
    label: 'Spring',
  },
  midsummer: {
    backgroundColor: 'rgba(220, 252, 231, 0.4)', // green-50
    borderColor: 'rgba(187, 247, 208, 0.6)',       // green-200
    label: 'Midsummer',
  },
  highSummer: {
    backgroundColor: 'rgba(254, 243, 199, 0.4)', // amber-50
    borderColor: 'rgba(253, 230, 138, 0.6)',       // amber-200
    label: 'High Summer',
  },
  autumn: {
    backgroundColor: 'rgba(255, 237, 213, 0.4)', // orange-50
    borderColor: 'rgba(254, 215, 170, 0.6)',       // orange-200
    label: 'Autumn',
  },
  winter: {
    backgroundColor: 'rgba(248, 250, 252, 0.4)', // slate-50
    borderColor: 'rgba(226, 232, 240, 0.6)',       // slate-200
    label: 'Winter Rest',
  },
};

/**
 * Returns seasonal tint based on the current month (1-12).
 * Defaults to current month if not provided.
 */
export function getSeasonalTint(month?: number): SeasonalTint {
  const m = month ?? (new Date().getMonth() + 1);

  if (m >= 2 && m <= 3) return SEASONS.awakening;
  if (m >= 4 && m <= 5) return SEASONS.spring;
  if (m === 6) return SEASONS.midsummer;
  if (m >= 7 && m <= 8) return SEASONS.highSummer;
  if (m >= 9 && m <= 10) return SEASONS.autumn;
  return SEASONS.winter; // Nov, Dec, Jan
}
