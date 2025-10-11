// pages/api/findr/get-reference-data.ts
// Generate reference data from actual catch logs with enrichment

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface SpeciesStats {
  id: string;
  code: string;
  commonName: string;
  scientificName: string;
  averageSize: string;
  seasonality: string[];
  preferredBaits: string[];
  habitatTypes: string[];
  successRate: number;
  totalCatches: number;
  bestMonth: string;
  averageDepth?: number;
  preferredSubstrate?: string;
  tips: string[];
}

interface BaitStats {
  baitName: string;
  targetSpecies: string[];
  successRate: number;
  totalUses: number;
  bestConditions: string[];
  cost: 'low' | 'medium' | 'high';
  availability: 'common' | 'seasonal' | 'rare';
  tips: string[];
}

interface HabitatStats {
  type: string;
  description: string;
  bestSpecies: string[];
  optimalConditions: {
    tideStates: string[];
    timeOfDay: string[];
    seasons: string[];
    weatherConditions: string[];
  };
  successRate: number;
  totalSessions: number;
  avgCatchPerSession: number;
  avgDepth?: number;
  commonSubstrates: string[];
  tips: string[];
}

interface ReferenceDataResponse {
  species: SpeciesStats[];
  baits: BaitStats[];
  habitats: HabitatStats[];
  generated_at: string;
}

interface CatchEntry {
  id?: string;
  user_id?: string;
  species_name?: string;
  quantity: number;
  depth_meters?: number;
  substrate?: string;
  rectangle_code?: string;
  catch_date: string;
  notes?: string;
  weather_conditions?: string;
}

interface SpeciesAggregation {
  catches: CatchEntry[];
  blanks: number;
  totalQuantity: number;
  months: Record<string, number>;
  depths: number[];
  substrates: string[];
  locations: string[];
}

interface BaitAggregation {
  uses: number;
  successes: number;
  species: Set<string>;
  conditions: Set<string>;
}

interface HabitatAggregation {
  sessions: number;
  successes: number;
  totalCatch: number;
  species: Set<string>;
  depths: number[];
  substrates: Set<string>;
  months: Set<string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReferenceDataResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, type } = req.query;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build base query - optionally filter by user
    let catchesQuery = supabase
      .from('findr_catches')
      .select('*')
      .gte('quantity', 0); // Include blanks for session stats

    if (user_id) {
      catchesQuery = catchesQuery.eq('user_id', user_id);
    }

    const { data: catches, error } = await catchesQuery;

    if (error || !catches) {
      return res.status(500).json({ error: 'Failed to fetch catch data' });
    }

    // Generate stats based on requested type
    const response: ReferenceDataResponse = {
      species: type === 'species' || !type ? generateSpeciesStats(catches) : [],
      baits: type === 'baits' || !type ? generateBaitStats(catches) : [],
      habitats: type === 'habitats' || !type ? generateHabitatStats(catches) : [],
      generated_at: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error generating reference data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function generateSpeciesStats(catches: CatchEntry[]): SpeciesStats[] {
  const speciesMap = new Map<string, SpeciesAggregation>();

  catches.forEach(catchEntry => {
    const speciesName = catchEntry.species_name;
    if (!speciesName) {
      return;
    }

    let stats = speciesMap.get(speciesName);
    if (!stats) {
      stats = {
        catches: [],
        blanks: 0,
        totalQuantity: 0,
        months: {},
        depths: [],
        substrates: [],
        locations: [],
      };
      speciesMap.set(speciesName, stats);
    }

    if (catchEntry.quantity > 0) {
      stats.catches.push(catchEntry);
      stats.totalQuantity += catchEntry.quantity;

      if (typeof catchEntry.depth_meters === 'number') {
        stats.depths.push(catchEntry.depth_meters);
      }

      if (catchEntry.substrate) {
        stats.substrates.push(catchEntry.substrate);
      }

      if (catchEntry.rectangle_code) {
        stats.locations.push(catchEntry.rectangle_code);
      }

      const month = new Date(catchEntry.catch_date).toLocaleString('default', { month: 'long' });
      stats.months[month] = (stats.months[month] || 0) + 1;
    } else {
      stats.blanks += 1;
    }
  });

  const speciesStats: SpeciesStats[] = [];

  speciesMap.forEach((stats, speciesName) => {
    const totalSessions = stats.catches.length + stats.blanks;
    const successRate = totalSessions > 0 ? Math.round((stats.catches.length / totalSessions) * 100) : 0;
    const bestMonth = Object.entries(stats.months).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

    const avgDepth = stats.depths.length > 0
      ? Math.round(stats.depths.reduce((a, b) => a + b, 0) / stats.depths.length)
      : undefined;

    const substrateCounts: Record<string, number> = {};
    stats.substrates.forEach(sub => {
      substrateCounts[sub] = (substrateCounts[sub] || 0) + 1;
    });
    const preferredSubstrate = Object.entries(substrateCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const habitatTypes = extractHabitats(stats.catches);
    const seasonality = getSeasonalityFromMonths(stats.months);
    const tips = generateSpeciesTips(speciesName, avgDepth, preferredSubstrate, successRate);

    speciesStats.push({
      id: speciesName.toUpperCase().substring(0, 3),
      code: speciesName.toUpperCase().substring(0, 3),
      commonName: speciesName,
      scientificName: getScientificName(speciesName),
      averageSize: 'Varies',
      seasonality,
      preferredBaits: [],
      habitatTypes,
      successRate,
      totalCatches: stats.totalQuantity,
      bestMonth,
      averageDepth: avgDepth,
      preferredSubstrate,
      tips,
    });
  });

  return speciesStats.sort((a, b) => b.totalCatches - a.totalCatches);
}

function generateBaitStats(catches: CatchEntry[]): BaitStats[] {
  const baitMap = new Map<string, BaitAggregation>();

  catches.forEach(catchEntry => {
    if (!catchEntry.notes) {
      return;
    }

    const baitMatch = catchEntry.notes.match(/bait:\s*([^.]+)/i);
    if (!baitMatch) {
      return;
    }

    const baitName = baitMatch[1].trim();

    let stats = baitMap.get(baitName);
    if (!stats) {
      stats = {
        uses: 0,
        successes: 0,
        species: new Set<string>(),
        conditions: new Set<string>(),
      };
      baitMap.set(baitName, stats);
    }

    stats.uses += 1;

    if (catchEntry.quantity > 0) {
      stats.successes += 1;
      if (catchEntry.species_name) {
        stats.species.add(catchEntry.species_name);
      }
    }

    if (catchEntry.weather_conditions) {
      stats.conditions.add(catchEntry.weather_conditions);
    }
  });

  const baitStats: BaitStats[] = [];

  baitMap.forEach((stats, baitName) => {
    baitStats.push({
      baitName,
      targetSpecies: Array.from(stats.species),
      successRate: stats.uses > 0 ? Math.round((stats.successes / stats.uses) * 100) : 0,
      totalUses: stats.uses,
      bestConditions: Array.from(stats.conditions).slice(0, 3),
      cost: 'medium',
      availability: 'common',
      tips: [`Used successfully ${stats.successes} times`, `Works well for ${stats.species.size} species`],
    });
  });

  return baitStats.sort((a, b) => b.totalUses - a.totalUses);
}
function generateHabitatStats(catches: CatchEntry[]): HabitatStats[] {
  const habitatMap = new Map<string, HabitatAggregation>();

  catches.forEach(catchEntry => {
    let habitatType = 'Unknown';

    if (catchEntry.substrate === 'rock') {
      habitatType = 'Rocky Shore';
    } else if (catchEntry.substrate === 'sand') {
      habitatType = 'Sandy Beach';
    } else if (catchEntry.notes?.toLowerCase().includes('pier') ||
               catchEntry.notes?.toLowerCase().includes('harbor')) {
      habitatType = 'Pier/Harbor';
    } else if (catchEntry.notes?.toLowerCase().includes('estuary')) {
      habitatType = 'Estuary';
    } else if (catchEntry.substrate === 'mixed') {
      habitatType = 'Mixed Ground';
    }

    let stats = habitatMap.get(habitatType);
    if (!stats) {
      stats = {
        sessions: 0,
        successes: 0,
        totalCatch: 0,
        species: new Set<string>(),
        depths: [],
        substrates: new Set<string>(),
        months: new Set<string>(),
      };
      habitatMap.set(habitatType, stats);
    }

    stats.sessions += 1;

    if (catchEntry.quantity > 0) {
      stats.successes += 1;
      stats.totalCatch += catchEntry.quantity;
      if (catchEntry.species_name) {
        stats.species.add(catchEntry.species_name);
      }
    }

    if (typeof catchEntry.depth_meters === 'number') {
      stats.depths.push(catchEntry.depth_meters);
    }

    if (catchEntry.substrate) {
      stats.substrates.add(catchEntry.substrate);
    }

    const month = new Date(catchEntry.catch_date).toLocaleString('default', { month: 'long' });
    stats.months.add(month);
  });

  const habitatStats: HabitatStats[] = [];

  habitatMap.forEach((stats, habitatType) => {
    const successRate = stats.sessions > 0 ? Math.round((stats.successes / stats.sessions) * 100) : 0;
    const avgCatch = stats.sessions > 0 ? stats.totalCatch / stats.sessions : 0;
    const avgDepth = stats.depths.length > 0
      ? Math.round(stats.depths.reduce((a, b) => a + b, 0) / stats.depths.length)
      : undefined;

    habitatStats.push({
      type: habitatType,
      description: getHabitatDescription(habitatType),
      bestSpecies: Array.from(stats.species).slice(0, 5),
      optimalConditions: {
        tideStates: ['Rising', 'High'],
        timeOfDay: ['Dawn', 'Dusk'],
        seasons: Array.from(stats.months).slice(0, 3),
        weatherConditions: ['Calm', 'Overcast'],
      },
      successRate,
      totalSessions: stats.sessions,
      avgCatchPerSession: Math.round(avgCatch * 10) / 10,
      avgDepth,
      commonSubstrates: Array.from(stats.substrates),
      tips: generateHabitatTips(habitatType, successRate, avgDepth),
    });
  });

  return habitatStats.sort((a, b) => b.totalSessions - a.totalSessions);
}

/**
 * Helper functions
 */

function extractHabitats(catches: CatchEntry[]): string[] {
  const habitats = new Set<string>();
  catches.forEach(c => {
    if (c.substrate === 'rock') habitats.add('Rocky shore');
    if (c.substrate === 'sand') habitats.add('Sandy beach');
    if (c.notes?.toLowerCase().includes('pier')) habitats.add('Pier/harbor');
    if (c.notes?.toLowerCase().includes('deep')) habitats.add('Deep water');
  });
  return Array.from(habitats).slice(0, 4);
}

function getSeasonalityFromMonths(months: Record<string, number>): string[] {
  const seasons: string[] = [];
  const monthSeasons: Record<string, string> = {
    December: 'Winter', January: 'Winter', February: 'Winter',
    March: 'Spring', April: 'Spring', May: 'Spring',
    June: 'Summer', July: 'Summer', August: 'Summer',
    September: 'Autumn', October: 'Autumn', November: 'Autumn',
  };

  Object.keys(months).forEach(month => {
    const season = monthSeasons[month];
    if (season && !seasons.includes(season)) {
      seasons.push(season);
    }
  });

  return seasons.length > 0 ? seasons : ['All year'];
}

function getScientificName(commonName: string): string {
  const scientificNames: Record<string, string> = {
    'Mackerel': 'Scomber scombrus',
    'Bass': 'Dicentrarchus labrax',
    'Sea Bass': 'Dicentrarchus labrax',
    'Cod': 'Gadus morhua',
    'Pollock': 'Pollachius pollachius',
    'Plaice': 'Pleuronectes platessa',
    'Flounder': 'Platichthys flesus',
  };
  return scientificNames[commonName] || 'Species unknown';
}

function generateSpeciesTips(name: string, avgDepth?: number, substrate?: string, successRate?: number): string[] {
  const tips: string[] = [];

  if (avgDepth) {
    tips.push(`Most catches around ${avgDepth}m depth`);
  }

  if (substrate) {
    tips.push(`Prefers ${substrate} substrate`);
  }

  if (successRate && successRate > 60) {
    tips.push(`High success rate - reliable target`);
  } else if (successRate && successRate < 40) {
    tips.push(`Challenging species - requires patience`);
  }

  return tips.length > 0 ? tips : ['Keep detailed logs to build better insights'];
}

function getHabitatDescription(type: string): string {
  const descriptions: Record<string, string> = {
    'Rocky Shore': 'Coastline with rocks and boulders providing structure and shelter',
    'Sandy Beach': 'Open sandy coastline with consistent bottom composition',
    'Pier/Harbor': 'Man-made structures providing deep water access',
    'Estuary': 'Where freshwater meets saltwater with rich feeding grounds',
    'Mixed Ground': 'Varied bottom composition with multiple habitat features',
  };
  return descriptions[type] || 'Fishing location with unique characteristics';
}

function generateHabitatTips(type: string, successRate: number, avgDepth?: number): string[] {
  const tips: string[] = [];

  if (successRate > 60) {
    tips.push(`Productive habitat with ${successRate}% success rate`);
  }

  if (avgDepth) {
    tips.push(`Average depth ${avgDepth}m`);
  }

  if (type === 'Rocky Shore') {
    tips.push('Target gullies and white water for best results');
  } else if (type === 'Sandy Beach') {
    tips.push('Look for channels and deeper holes');
  } else if (type === 'Pier/Harbor') {
    tips.push('Fish near structure and at different depths');
  }

  return tips;
}