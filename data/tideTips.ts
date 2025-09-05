// data/tideTips.ts

export const TIDE_PHASES = ['high', 'low', 'rising', 'falling'] as const;
export type TidePhase = typeof TIDE_PHASES[number];

export type TideTip = {
  title: string;          // short, user-facing label
  detail: string;         // one-liner you can show in tooltips/cards
  tags?: string[];        // quick filters (fishing, surf, family, safety, etc.)
  icon?: 'tide-high' | 'tide-low' | 'tide-rising' | 'tide-falling'; // map to your SVG set
};

export const tideTips: Record<TidePhase, TideTip[]> = {
  /** High tide: deeper water access, easier entries/exits, some reefs/points work best. */
  high: [
    {
      title: 'Sea swim & snorkel',
      detail: 'Easier entry with more water over rocks and reef ledges.',
      tags: ['swim', 'snorkel', 'access'],
      icon: 'tide-high',
    },
    {
      title: 'Reef/point surfing',
      detail: 'Many reefs/points break cleaner with extra depth at high.',
      tags: ['surf', 'reef', 'cleaner'],
      icon: 'tide-high',
    },
    {
      title: 'Launch/land boats',
      detail: 'Best under-keel clearance for harbours, slips and moorings.',
      tags: ['boating', 'harbour', 'access'],
      icon: 'tide-high',
    },
    {
      title: 'SUP in channels',
      detail: 'Fuller estuary channels reduce grounding risk and weed snags.',
      tags: ['SUP', 'estuary', 'access'],
      icon: 'tide-high',
    },
    {
      title: 'Pier/harbour fishing',
      detail: 'Extra depth brings fish within reach around structures.',
      tags: ['fishing', 'structures'],
      icon: 'tide-high',
    },
  ],

  /** Low tide: maximum exposure and beach space. */
  low: [
    {
      title: 'Rockpooling',
      detail: 'Pools exposed and lively; explore gently and watch your footing.',
      tags: ['family', 'nature', 'explore'],
      icon: 'tide-low',
    },
    {
      title: 'Foraging',
      detail: 'Shellfish and edible seaweeds become accessible—follow local regs.',
      tags: ['foraging', 'food', 'care'],
      icon: 'tide-low',
    },
    {
      title: 'Photography',
      detail: 'Revealed reefs, sandbars and mirror-wet sands for dramatic shots.',
      tags: ['photo', 'landscape'],
      icon: 'tide-low',
    },
    {
      title: 'Beach sports',
      detail: 'Wide, firm sand for runs, kites, football and games.',
      tags: ['family', 'fitness', 'play'],
      icon: 'tide-low',
    },
    {
      title: 'Cave & cove access',
      detail: 'Some spots are only reachable at lower states—check timings.',
      tags: ['explore', 'safety'],
      icon: 'tide-low',
    },
  ],

  /** Rising (flood) tide: food pushes in, fish follow; depth improves beach bars. */
  rising: [
    {
      title: 'Shore fishing (mullet, bass)',
      detail: 'Rising water floods feeding zones—prime time from mid to top.',
      tags: ['fishing', 'mullet', 'bass', 'prime'],
      icon: 'tide-rising',
    },
    {
      title: 'Beach-break surfing',
      detail: 'Increasing depth over sandbars can tidy up shape and push.',
      tags: ['surf', 'beach-break'],
      icon: 'tide-rising',
    },
    {
      title: 'Small-craft launch',
      detail: 'Each minute adds depth—get afloat with less heaving and scraping.',
      tags: ['boating', 'SUP', 'access'],
      icon: 'tide-rising',
    },
    {
      title: 'Collect bait',
      detail: 'Peeler crabs and lugworm zones come into comfortable range.',
      tags: ['fishing', 'bait'],
      icon: 'tide-rising',
    },
    {
      title: 'Wader watching',
      detail: 'Birds bunch closer as mudflats slowly cover—great views.',
      tags: ['wildlife', 'birding'],
      icon: 'tide-rising',
    },
  ],

  /** Falling (ebb) tide: retreating water reveals space; outflow moves food and debris. */
  falling: [
    {
      title: 'Long beach walks',
      detail: 'Fresh, firm sand opens up as the water drops away.',
      tags: ['fitness', 'family'],
      icon: 'tide-falling',
    },
    {
      title: 'Explore safely',
      detail: 'Best window for coves and reefs—mind the return route.',
      tags: ['explore', 'safety'],
      icon: 'tide-falling',
    },
    {
      title: 'Kites & games',
      detail: 'Maximum beach width for kites, football and frisbee.',
      tags: ['play', 'family'],
      icon: 'tide-falling',
    },
    {
      title: 'Ebb-tide fishing',
      detail: 'Some species track food washing out of gullies and estuaries.',
      tags: ['fishing', 'flow'],
      icon: 'tide-falling',
    },
    {
      title: 'Treasure hunt',
      detail: 'Sea glass, driftwood and shells collect on the falling tide.',
      tags: ['foraging', 'family'],
      icon: 'tide-falling',
    },
  ],
};

/** Helper: return the five tips for a given phase */
export function getTideTips(phase: TidePhase): TideTip[] {
  return tideTips[phase] ?? [];
}