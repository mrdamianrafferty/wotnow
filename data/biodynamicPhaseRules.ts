// data/biodynamicPhaseRules.ts
export type MoonPhase =
  | 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous'
  | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

export interface GardenHint {
  title: string;
  tasks: string[];      // short imperative hints
  avoid?: string[];     // optional “don’t”s
}

export const biodynamicByPhase: Record<MoonPhase, GardenHint> = {
  new: {
    title: 'New Moon — start & settle',
    tasks: [
      'Sow leafy salads and herbs',
      'Transplant delicate starts',
      'Irrigate and apply gentle feeds'
    ],
    avoid: ['Heavy pruning', 'Major tilling in wet soil']
  },
  waxing_crescent: {
    title: 'Waxing — build above-ground growth',
    tasks: [
      'Sow/plant fruiting annuals (beans, tomatoes, courgettes)',
      'Train climbers, tie in vines',
      'Light foliar feed'
    ]
  },
  first_quarter: {
    title: 'First Quarter — momentum',
    tasks: [
      'Successive sowings of fruit/flower crops',
      'Graft and pinch for branching',
      'Mulch rapidly growing beds'
    ]
  },
  waxing_gibbous: {
    title: 'Waxing Gibbous — refine & support',
    tasks: [
      'Final pre-full sowings of fruit/flower crops',
      'Stake and support tall plants',
      'Compost tea or foliar tonic'
    ],
    avoid: ['Hard pruning']
  },
  full: {
    title: 'Full Moon — peak sap',
    tasks: [
      'Harvest leafy crops and cut flowers',
      'Collect seeds from early annuals',
      'Enjoy fragrance harvests (mint, basil)'
    ],
    avoid: ['Hard pruning of trees and vines']
  },
  waning_gibbous: {
    title: 'Waning — root focus',
    tasks: [
      'Sow root crops (carrot, beetroot, radish)',
      'Turn compost, add browns',
      'Apply soil amendments (compost, rock dust)'
    ]
  },
  last_quarter: {
    title: 'Last Quarter — reduce & control',
    tasks: [
      'Weed and mow to slow regrowth',
      'Prune for restraint',
      'Tidy beds; solarise problem patches'
    ]
  },
  waning_crescent: {
    title: 'Old Moon — reset & prepare',
    tasks: [
      'Bed prep and tool care',
      'Transplant shock recovery',
      'Sort/store harvests'
    ],
    avoid: ['Starting long-season crops']
  }
};