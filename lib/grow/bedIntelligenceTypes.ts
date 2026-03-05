export type RotationGroup =
  | 'brassica'
  | 'legume'
  | 'root_allium'
  | 'solanaceae'
  | 'cucurbit'
  | 'permanent'
  | 'non_rotating';

export const ROTATION_GROUP_LABELS: Record<RotationGroup, string> = {
  brassica: 'Brassicas',
  legume: 'Legumes',
  root_allium: 'Roots & Alliums',
  solanaceae: 'Solanaceae',
  cucurbit: 'Cucurbits',
  permanent: 'Permanent',
  non_rotating: 'Non-rotating',
};

/** User-friendly names with examples and rotation follow-with suggestions */
export const ROTATION_GROUP_FRIENDLY: Record<RotationGroup, {
  label: string;
  examples: string;
  followWith: string;
}> = {
  brassica: {
    label: 'Brassicas (cabbage family)',
    examples: 'cabbage, broccoli, kale, cauliflower',
    followWith: 'roots like carrots, parsnips or beetroot, and alliums (onion family)',
  },
  legume: {
    label: 'Legumes (pea & bean family)',
    examples: 'peas, beans, broad beans',
    followWith: 'brassicas like cabbage, kale or broccoli — they love the nitrogen legumes leave behind',
  },
  root_allium: {
    label: 'Roots & alliums (onion family)',
    examples: 'carrots, parsnips, onions, garlic, beetroot',
    followWith: 'legumes like peas and beans to rebuild soil nitrogen',
  },
  solanaceae: {
    label: 'Nightshades (tomato family)',
    examples: 'tomatoes, peppers, potatoes, aubergines',
    followWith: 'legumes like peas and beans, or roots like carrots and parsnips',
  },
  cucurbit: {
    label: 'Cucurbits (squash family)',
    examples: 'courgettes, pumpkins, cucumbers, squash',
    followWith: 'legumes like peas and beans, or roots and alliums',
  },
  permanent: {
    label: 'Permanent plantings',
    examples: 'fruit trees, perennial herbs, asparagus',
    followWith: '',
  },
  non_rotating: {
    label: 'Non-rotating',
    examples: '',
    followWith: '',
  },
};

export interface RotationWarning {
  rotationGroup: RotationGroup;
  groupLabel: string;
  lastPlantedYear: number;
  avoidUntilYear: number;
  message: string;
}

export interface CompanionSets {
  goodCompanions: string[];
  badCompanions: string[];
}

export interface SuccessionPrompt {
  removedPlantName: string;
  removedMonth: string;
  suggestions: { speciesSlug: string; speciesName: string; windowType: string }[];
}

export interface QuickFillSuggestion {
  speciesSlug: string;
  speciesName: string;
  category: string | null;
  reason: string;
}

export interface BedIntelligenceResponse {
  rotationWarnings: RotationWarning[];
  companionSets: CompanionSets;
  successionPrompts: SuccessionPrompt[];
  quickFillSuggestions: QuickFillSuggestion[] | null;
}
