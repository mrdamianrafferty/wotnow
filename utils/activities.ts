export interface ActivityCategory {
  key: string;
  label: string;
  icon?: string;
  description?: string;
}

export const mainCategories: ActivityCategory[] = [
  { key: 'planting', label: 'Planting', icon: '🌱', description: 'Sowing seeds, transplanting, succession planting' },
  { key: 'watering', label: 'Watering', icon: '💧', description: 'Irrigation, moisture management, drought care' },
  { key: 'maintenance', label: 'Maintenance', icon: '🧹', description: 'Weeding, mulching, general upkeep' },
  { key: 'pruning', label: 'Pruning', icon: '✂️', description: 'Pruning shrubs, trees, perennials, deadheading' },
  { key: 'feeding', label: 'Feeding', icon: '🪴', description: 'Fertilising, amending soil, composting' },
  { key: 'harvest', label: 'Harvest', icon: '🧺', description: 'Picking produce, cutting flowers, storage prep' },
  { key: 'planning', label: 'Planning', icon: '🗓️', description: 'Garden planning, journaling, task scheduling' },
  { key: 'wildlife', label: 'Wildlife', icon: '🦋', description: 'Habitat support, pollinator care, biodiversity' },
];

export function findCategoryLabel(key: string) {
  const match = mainCategories.find((category) => category.key === key);
  return match?.label ?? key;
}
