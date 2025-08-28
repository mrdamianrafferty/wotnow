// data/seasonalTips.ts
export type GardenTradition = 'arboriculture' | 'forest_gardening' | 'permaculture' | 'biodynamic';

export interface SeasonalTask {
  icon: string;
  title: string;
  description?: string;
  tasks: string[];
  notes?: string[];
}

export type SeasonalTipsByMonth = {
  [month: number]: {
    [tradition in GardenTradition]?: SeasonalTask;
  };
};

export const traditionTooltips: Record<GardenTradition, string> = {
  arboriculture: '🌳🪏 Arboriculture – the cultivation and management of trees',
  forest_gardening: '🌲🌿 Forest Gardening – working with layered, perennial systems',
  permaculture: '🍃♻️ Permaculture – designing sustainable, closed-loop ecosystems',
  biodynamic: '🌱✨ Biodynamic – gardening aligned with lunar and cosmic rhythms'
};

export const seasonalTipsByMonth: SeasonalTipsByMonth = {
  0: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Winter Tree Check',
      tasks: [
        'Inspect trees after storms',
        'Prune dormant apples/pears'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Winter Planning',
      tasks: [
        'Plan forest layers',
        'Clear invasive saplings'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Frost Observations',
      tasks: [
        'Observe frost patterns',
        'Revise zone maps indoors'
      ]
    }
  },
  1: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Late Dormant Pruning',
      tasks: [
        'Finish dormant pruning',
        'Check tree guards'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Mulch & Plan',
      tasks: [
        'Mulch young trees',
        'Plan polycultures'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Compost & Community',
      tasks: [
        'Maintain compost',
        'Start seed swap events'
      ]
    }
  },
  2: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Mulch & Monitor',
      tasks: [
        'Mulch trees',
        'Avoid pruning stone fruits in damp weather'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Bare-root Planting',
      tasks: [
        'Plant bare-root trees',
        'Plant understory shrubs'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Swales & Sheet Mulch',
      tasks: [
        'Build swales',
        'Prep beds with sheet mulch'
      ]
    }
  },
  3: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Bud Burst Monitoring',
      tasks: [
        'Monitor bud burst',
        'Remove dead branches'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Ground Cover Sowing',
      tasks: [
        'Sow nitrogen-fixing ground covers'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Spring Prep',
      tasks: [
        'Start companion planting',
        'Build insect hotels'
      ]
    }
  },
  4: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Early Pest Control',
      tasks: [
        'Check for pests',
        'Thin crowded shoots'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Layer Establishment',
      tasks: [
        'Establish herbaceous layer',
        'Sow climbers'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Mulch & Water Systems',
      tasks: [
        'Mulch intensively',
        'Connect water harvesting systems'
      ]
    }
  },
  5: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Water Watch',
      tasks: [
        'Prune soft shoots for shape',
        'Monitor water needs'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Harvest & Shade',
      tasks: [
        'Harvest early crops',
        'Plant shade-lovers'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Compost Tea',
      tasks: [
        'Create summer shade zones',
        'Apply compost tea'
      ]
    }
  },
  6: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Summer Pruning',
      tasks: [
        'Summer prune stone fruits',
        'Monitor heat stress'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Mulch & Harvest',
      tasks: [
        'Top up mulch',
        'Harvest herbs'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Preserve & Solarise',
      tasks: [
        'Harvest and preserve',
        'Solarise weedy patches'
      ]
    }
  },
  7: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Deep Watering',
      tasks: [
        'Inspect for pests and diseases',
        'Water deeply'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Late Planting',
      tasks: [
        'Seed late perennials',
        'Divide herbs'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Autumn Planning',
      tasks: [
        'Plan autumn crops',
        'Repair tool shed'
      ]
    }
  },
  8: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Seed & Light Pruning',
      tasks: [
        'Collect seeds',
        'Begin light pruning if needed'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Green Manure & Prep',
      tasks: [
        'Sow green manures',
        'Prep beds for fall'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Compost & Surplus Flow',
      tasks: [
        'Build compost bays',
        'Map surplus produce flow'
      ]
    }
  },
  9: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Tree Planting Begins',
      tasks: [
        'Start major pruning',
        'Plant young trees'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Path Mulching',
      tasks: [
        'Mulch paths',
        'Establish root crops'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Winter Prep',
      tasks: [
        'Store water and compostables for winter use'
      ]
    }
  },
  10: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Cleanup & Protection',
      tasks: [
        'Remove fallen leaves',
        'Inspect bark damage'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Fruit Tree Planting',
      tasks: [
        'Plant fruit trees',
        'Plant windbreaks'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'Cover & Repair',
      tasks: [
        'Cover beds with straw',
        'Fix fences'
      ]
    }
  },
  11: {
    arboriculture: {
      icon: '🌳🪏',
      title: 'Winter Assessment',
      tasks: [
        'Clean tools',
        'Assess tree structure'
      ]
    },
    forest_gardening: {
      icon: '🌲🌿',
      title: 'Reflect & Plan',
      tasks: [
        'Reflect on yields',
        'Plan diversity increases'
      ]
    },
    permaculture: {
      icon: '🍃♻️',
      title: 'System Review',
      tasks: [
        'Review system flows',
        'Write garden journal'
      ]
    }
  }
};