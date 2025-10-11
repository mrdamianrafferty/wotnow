// lib/findr/generateInsights.ts
// Generate actionable fishing tips from enriched catch data

import { createClient } from '@supabase/supabase-js';

export interface FishingInsight {
  type: 'depth' | 'substrate' | 'pattern' | 'timing' | 'location';
  title: string;
  message: string;
  confidence: 'high' | 'medium' | 'low';
  icon: string;
  actionable: boolean;
}

interface CatchRecord {
  id: string;
  user_id: string;
  species_name?: string | null;
  quantity: number;
  catch_date: string;
  depth_meters: number | null;
  substrate?: string | null;
  rectangle_code?: string | null;
}


/**
 * Analyze user's catches and generate personalized insights
 */
export async function generateFishingInsights(userId: string, speciesName?: string): Promise<FishingInsight[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const insights: FishingInsight[] = [];

  // Build query
  let query = supabase
    .from('findr_catches')
    .select('*')
    .eq('user_id', userId)
    .gt('quantity', 0) // Only successful catches
    .order('catch_date', { ascending: false })
    .limit(50);

  if (speciesName) {
    query = query.eq('species_name', speciesName);
  }

  const { data: catches, error } = await query;

  if (error || !catches || catches.length === 0) {
    return [];
  }

  // Generate insights based on patterns
  insights.push(...analyzeDepthPatterns(catches, speciesName));
  insights.push(...analyzeSubstratePatterns(catches, speciesName));
  insights.push(...analyzeLocationPatterns(catches, speciesName));
  insights.push(...analyzeTimingPatterns(catches, speciesName));

  // Sort by confidence and return top insights
  return insights
    .sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    })
    .slice(0, 5); // Return top 5 insights
}

/**
 * Analyze depth patterns in catches
 */
function analyzeDepthPatterns(catches: any[], speciesName?: string): FishingInsight[] {
  const insights: FishingInsight[] = [];
  
  // Filter catches with depth data
  const catchesWithDepth = catches.filter(c => c.depth_meters !== null);
  
  if (catchesWithDepth.length < 3) return insights;

  // Calculate depth statistics
  const depths = catchesWithDepth.map(c => c.depth_meters);
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const minDepth = Math.min(...depths);
  const maxDepth = Math.max(...depths);

  const species = speciesName || 'fish';
  const depthRange = `${Math.round(minDepth)}-${Math.round(maxDepth)}m`;

  // Create insight
  if (maxDepth - minDepth < 20) {
    // Narrow range = strong pattern
    insights.push({
      type: 'depth',
      title: `${species} Sweet Spot Found`,
      message: `You've had success catching ${species} consistently around ${Math.round(avgDepth)}m depth. Try similar depths for better results!`,
      confidence: 'high',
      icon: '🌊',
      actionable: true,
    });
  } else {
    // Wide range = general guidance
    insights.push({
      type: 'depth',
      title: `${species} Depth Range`,
      message: `Your ${species} catches range from ${depthRange}. They seem adaptable to different depths.`,
      confidence: 'medium',
      icon: '🌊',
      actionable: false,
    });
  }

  return insights;
}

/**
 * Analyze substrate/bottom type patterns
 */
function analyzeSubstratePatterns(catches: CatchRecord[], speciesName?: string): FishingInsight[] {
  const insights: FishingInsight[] = [];

  const catchesWithSubstrate = catches.filter(c => c.substrate && c.substrate !== 'unknown');

  if (catchesWithSubstrate.length < 3) return insights;

  // Count substrate types
  const substrateCounts: Record<string, number> = {};
  catchesWithSubstrate.forEach(c => {
    const key = c.substrate as string;
    substrateCounts[key] = (substrateCounts[key] || 0) + 1;
  });

  // Find most common substrate
  const mostCommon = Object.entries(substrateCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (!mostCommon) return insights;

  const [substrate, count] = mostCommon;
  const percentage = Math.round((count / catchesWithSubstrate.length) * 100);
  const species = speciesName || 'fish';

  const substrateEmoji: Record<string, string> = {
    rock: '🪨',
    sand: '🏖️',
    mud: '🟫',
    gravel: '⚫',
    mixed: '🌈',
  };

  const icon = substrateEmoji[substrate] || '🪨';

  if (percentage > 60) {
    insights.push({
      type: 'substrate',
      title: `${species} Love ${substrate}!`,
      message: `${percentage}% of your ${species} catches are over ${substrate}. Focus on similar bottom types!`,
      confidence: 'high',
      icon,
      actionable: true,
    });
  } else {
    insights.push({
      type: 'substrate',
      title: `Bottom Type Matters`,
      message: `You've caught ${species} over ${substrate} most often (${percentage}%). Worth targeting similar spots.`,
      confidence: 'medium',
      icon,
      actionable: true,
    });
  }

  return insights;
}

/**
 * Analyze location patterns (fishing areas)
 */
function analyzeLocationPatterns(catches: CatchRecord[], speciesName?: string): FishingInsight[] {
  const insights: FishingInsight[] = [];
  
  const catchesWithLocation = catches.filter(c => c.rectangle_code);
  
  if (catchesWithLocation.length < 3) return insights;

  // Count rectangles
  const rectangleCounts: Record<string, number> = {};
  catchesWithLocation.forEach(c => {
    const key = c.rectangle_code as string;
    rectangleCounts[key] = (rectangleCounts[key] || 0) + 1;
  });

  const mostCommon = Object.entries(rectangleCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (!mostCommon) return insights;

  const [rectangle, count] = mostCommon;
  const percentage = Math.round((count / catchesWithLocation.length) * 100);
  const species = speciesName || 'fish';

  if (percentage > 50) {
    insights.push({
      type: 'location',
      title: 'Hot Spot Identified!',
      message: `${percentage}% of your ${species} catches are from area ${rectangle}. This is your proven spot!`,
      confidence: 'high',
      icon: '📍',
      actionable: true,
    });
  } else {
    insights.push({
      type: 'location',
      title: 'Promising Area Spotted',
      message: `${percentage}% of your ${species} catches are from area ${rectangle}. Keep this location in your rotation.`,
      confidence: 'medium',
      icon: '📍',
      actionable: true,
    });
  }

  return insights;
}

/**
 * Analyze timing patterns (seasonal trends)
 */
function analyzeTimingPatterns(catches: CatchRecord[], speciesName?: string): FishingInsight[] {
  const insights: FishingInsight[] = [];

  if (catches.length < 5) return insights;

  // Analyze by month/season
  const monthCounts: Record<string, number> = {};
  catches.forEach(c => {
    const month = new Date(c.catch_date).getMonth();
    const season = getSeasonName(month);
    monthCounts[season] = (monthCounts[season] || 0) + 1;
  });

  const mostCommon = Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (!mostCommon) return insights;

  const [season, count] = mostCommon;
  const percentage = Math.round((count / catches.length) * 100);
  const species = speciesName || 'fish';

  if (percentage > 40) {
    insights.push({
      type: 'timing',
      title: `${season} Fishing Peak`,
      message: `${percentage}% of your ${species} catches are in ${season}. Plan trips around this season!`,
      confidence: 'medium',
      icon: getSeasonEmoji(season),
      actionable: true,
    });
  }

  return insights;
}

/**
 * Get season name from month
 */
function getSeasonName(month: number): string {
  if (month >= 2 && month <= 4) return 'Spring';
  if (month >= 5 && month <= 7) return 'Summer';
  if (month >= 8 && month <= 10) return 'Fall';
  return 'Winter';
}

/**
 * Get emoji for season
 */
function getSeasonEmoji(season: string): string {
  const emojis: Record<string, string> = {
    Spring: '🌸',
    Summer: '☀️',
    Fall: '🍂',
    Winter: '❄️',
  };
  return emojis[season] || '📅';
}

/**
 * Generate insight for a single species
 */
export async function generateSpeciesInsight(
  userId: string,
  speciesName: string
): Promise<FishingInsight | null> {
  const insights = await generateFishingInsights(userId, speciesName);
  
  // Return the highest confidence insight
  return insights.length > 0 ? insights[0] : null;
}

/**
 * Generate general fishing tips (no user data needed)
 */
export function getGeneralTips(speciesName: string): FishingInsight[] {
  const tips: Record<string, FishingInsight> = {
    'Bass': {
      type: 'pattern',
      title: 'Bass Hunting Tips',
      message: 'Bass love structure! Look for rocky areas, drop-offs, and underwater obstacles. Dawn and dusk are prime times.',
      confidence: 'medium',
      icon: '🐟',
      actionable: true,
    },
    'Mackerel': {
      type: 'pattern',
      title: 'Mackerel Migration',
      message: 'Mackerel are pelagic and follow baitfish schools. Look for diving birds and surface activity. They prefer 15-25m depth.',
      confidence: 'medium',
      icon: '🐟',
      actionable: true,
    },
    'Pollock': {
      type: 'pattern',
      title: 'Pollock Preferences',
      message: 'Pollock hang near wrecks and reefs. They like deeper water (30-100m) and are active year-round. Use shiny lures!',
      confidence: 'medium',
      icon: '🐟',
      actionable: true,
    },
  };

  return tips[speciesName] ? [tips[speciesName]] : [];
}