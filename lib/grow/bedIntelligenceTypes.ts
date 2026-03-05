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
