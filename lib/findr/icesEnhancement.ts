/**
 * Migration utility to replace mock data with ICES rectangle baseline data
 * 
 * This utility helps transition from the current mock data system to the new
 * ICES rectangle baseline approach while maintaining backward compatibility.
 */

import { FALLBACK_RECTANGLE_OPTIONS } from './fallbackRectangles';

// Define proper types instead of any
interface CardData {
  image?: {
    src?: string;
    thumb?: string;
    mobile?: string;
    alt?: string;
  };
  summary?: string;
  confidence?: number;
}

interface ExistingEntry {
  id: string;
  name: string;
  card?: CardData;
  image?: CardData['image'];
}

interface InsightData {
  swipedDateLabel?: string | null;
  catches?: number | null;
}

// Interface for the enhanced favourite entry with ICES context
export interface ICESEnhancedFavouriteEntry {
  id: string;
  name: string;
  confidence: number | null;
  
  // Original card data
  card?: CardData;
  image?: CardData['image'];
  
  // Enhanced with ICES rectangle context
  rectangleCode?: string | null;
  rectangleRegion?: string | null;
  distanceToShoreKm?: number | null;
  
  // Baseline data source indicator
  baselineSource: 'user' | 'ices' | 'mock';
  
  // Enhanced metrics with ICES baseline
  season: string;
  lastPerfectConditions: string;
  swipedDate: string | null;
  catches: number | null;
  recentActivity: string;
  nextBestDay: string;
  bestBait: string;
  bestBaitSource: 'prediction' | 'ices' | 'mock' | 'supabase';
  isMockOnly: boolean;
  isICESEnhanced: boolean;
  
  // ICES-derived confidence scoring
  locationConfidence: number; // 0-100 based on ICES area fishing potential
  seasonalConfidence: number; // 0-100 based on species seasonal patterns
  recencyScore: number;
}

/**
 * Enhanced activity descriptions based on ICES area characteristics
 */
const ICES_ACTIVITY_PATTERNS: Record<string, string[]> = {
  'offshore': [
    'Following deep-water currents',
    'Tracking commercial vessel activity',
    'Concentrating around seamounts',
    'Moving with temperature layers',
    'Following plankton concentrations',
  ],
  'coastal': [
    'Hunting in tidal channels',
    'Following baitfish schools',
    'Using structure for ambush points',
    'Feeding during tide changes',
    'Sheltering in deeper pools',
  ],
  'bay': [
    'Patrolling shallow feeding areas',
    'Using pier and marina structure',
    'Following warming water masses',
    'Concentrating near river mouths',
    'Active during calm conditions',
  ],
  'deep_water': [
    'Cruising bottom contours',
    'Following thermal layers',
    'Concentrated around drop-offs',
    'Moving with deep currents',
    'Active during stable weather',
  ]
};

/**
 * Generate ICES-informed bait recommendations based on location characteristics
 */
function generateICESBaitRecommendation(
  rectangleCode: string, 
  speciesId: string
): { bait: string; source: 'ices' } {
  const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
  const isOffshore = (rectangle?.distanceToShoreKm || 0) > 3;
  const region = rectangle?.region || 'Unknown';
  
  // Base bait recommendations by species
  const speciesBaits: Record<string, { offshore: string; coastal: string }> = {
    'atlantic-mackerel': {
      offshore: 'Small silver spinners, feather rigs',
      coastal: 'Strip baits, small spoons'
    },
    'sea-bass': {
      offshore: 'Live mackerel, large soft plastics',
      coastal: 'Live prawns, crab pieces'
    },
    'cod': {
      offshore: 'Large fish baits, heavy jigs',
      coastal: 'Lugworm cocktails, ragworm'
    },
    'pollock': {
      offshore: 'Rubber eels, large spinners',
      coastal: 'Ragworm on light tackle'
    },
    'whiting': {
      offshore: 'Small fish strips, light jigs',
      coastal: 'Ragworm, small crab pieces'
    },
    'plaice': {
      offshore: 'Large lugworm, squid strips',
      coastal: 'Fresh lugworm, crab'
    }
  };

  const baitOptions = speciesBaits[speciesId];
  if (!baitOptions) {
    return {
      bait: isOffshore ? 'Large baits for deep water' : 'Local bait shop recommendations',
      source: 'ices'
    };
  }

  // Regional adjustments
  let recommendedBait = isOffshore ? baitOptions.offshore : baitOptions.coastal;
  
  if (region.includes('Mediterranean')) {
    recommendedBait = recommendedBait.replace('lugworm', 'anchovies').replace('ragworm', 'sardine strips');
  } else if (region.includes('Irish')) {
    recommendedBait = `${recommendedBait} (excellent local stocks)`;
  }

  return {
    bait: recommendedBait,
    source: 'ices'
  };
}

/**
 * Generate ICES-informed activity description
 */
function generateICESActivity(rectangleCode: string, speciesId: string): string {
  const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
  const distanceToShore = rectangle?.distanceToShoreKm || 0;
  
  let activityType: keyof typeof ICES_ACTIVITY_PATTERNS;
  if (distanceToShore > 5) {
    activityType = 'deep_water';
  } else if (distanceToShore > 2) {
    activityType = 'offshore';
  } else if (distanceToShore > 0.5) {
    activityType = 'coastal';
  } else {
    activityType = 'bay';
  }
  
  const patterns = ICES_ACTIVITY_PATTERNS[activityType];
  const hash = speciesId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return patterns[hash % patterns.length];
}

/**
 * Calculate location-based confidence score
 */
function calculateLocationConfidence(rectangleCode: string, speciesId: string): number {
  const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
  if (!rectangle) return 50; // Default moderate confidence
  
  const region = rectangle.region;
  const distanceToShore = rectangle.distanceToShoreKm || 0;
  
  // Base confidence by species-region compatibility
  let baseConfidence = 70; // Default good confidence for ICES areas
  
  // Adjust based on species preferences
  if (speciesId.includes('bass') && distanceToShore < 2) {
    baseConfidence = 85; // Bass love coastal areas
  } else if (speciesId.includes('cod') && distanceToShore > 3) {
    baseConfidence = 90; // Cod prefer deeper water
  } else if (speciesId.includes('mackerel') && region.includes('Atlantic')) {
    baseConfidence = 95; // Mackerel excellent in Atlantic ICES areas
  } else if (speciesId.includes('plaice') && distanceToShore < 1) {
    baseConfidence = 80; // Plaice good in shallow sandy areas
  }
  
  // Regional bonuses
  if (region.includes('Irish') && !speciesId.includes('mediterranean')) {
    baseConfidence += 5; // Irish waters generally excellent
  } else if (region.includes('Mediterranean') && speciesId.includes('bass')) {
    baseConfidence += 10; // Mediterranean bass fishing is exceptional
  }
  
  return Math.min(100, Math.max(30, baseConfidence));
}

/**
 * Enhanced favourite entry generator using ICES rectangle data
 */
export function generateICESEnhancedEntry(
  id: string,
  name: string,
  rectangleCode: string | null,
  existingCard?: CardData,
  existingInsight?: InsightData
): ICESEnhancedFavouriteEntry {
  
  if (!rectangleCode) {
    // Fall back to mock system if no rectangle context
    return generateMockEnhancedEntry(id, name, existingCard, existingInsight);
  }
  
  const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
  if (!rectangle) {
    return generateMockEnhancedEntry(id, name, existingCard, existingInsight);
  }
  
  // Generate ICES-based recommendations
  const baitRec = generateICESBaitRecommendation(rectangleCode, id);
  const activity = generateICESActivity(rectangleCode, id);
  const locationConfidence = calculateLocationConfidence(rectangleCode, id);
  
  // Seasonal confidence based on current month and species
  const now = new Date();
  const month = now.getMonth(); // 0-11
  let seasonalConfidence = 70; // Default
  
  // Simple seasonal adjustments (can be enhanced with real data)
  if (id.includes('mackerel') && month >= 4 && month <= 8) {
    seasonalConfidence = 90; // Mackerel peak in summer
  } else if (id.includes('cod') && (month <= 2 || month >= 10)) {
    seasonalConfidence = 85; // Cod better in winter
  } else if (id.includes('bass') && month >= 5 && month <= 9) {
    seasonalConfidence = 80; // Bass good in warmer months
  }
  
  // Combined confidence
  const overallConfidence = Math.round((locationConfidence + seasonalConfidence) / 2);
  
  // Season label based on confidence
  let seasonLabel: string;
  if (overallConfidence >= 85) {
    seasonLabel = 'Hot right now';
  } else if (overallConfidence >= 75) {
    seasonLabel = 'In good form';
  } else if (overallConfidence >= 65) {
    seasonLabel = 'Worth a shot';
  } else {
    seasonLabel = 'Playing hard to get';
  }
  
  return {
    id,
    name,
    confidence: overallConfidence,
    card: existingCard,
    image: existingCard?.image,
    
    // ICES rectangle context
    rectangleCode,
    rectangleRegion: rectangle.region,
    distanceToShoreKm: rectangle.distanceToShoreKm,
    
    // Data source indicators
    baselineSource: 'ices',
    isICESEnhanced: true,
    isMockOnly: false,
    
    // ICES-enhanced data
    season: seasonLabel,
    lastPerfectConditions: `Good ICES area for this species`,
    swipedDate: existingInsight?.swipedDateLabel || null,
    catches: existingInsight?.catches || null,
    recentActivity: activity,
    nextBestDay: 'Variable by conditions',
    bestBait: baitRec.bait,
    bestBaitSource: 'ices',
    
    // Confidence metrics
    locationConfidence,
    seasonalConfidence,
    recencyScore: overallConfidence,
  };
}

/**
 * Fallback to mock system when ICES data not available
 */
function generateMockEnhancedEntry(
  id: string,
  name: string,
  existingCard?: CardData,
  _existingInsight?: InsightData
): ICESEnhancedFavouriteEntry {
  
  return {
    id,
    name,
    confidence: null,
    card: existingCard,
    image: existingCard?.image,
    
    // No ICES context
    rectangleCode: null,
    rectangleRegion: null,
    distanceToShoreKm: null,
    
    // Mock source indicators
    baselineSource: 'mock',
    isICESEnhanced: false,
    isMockOnly: true,
    
    // Mock data (existing system)
    season: 'Uncertain without area data',
    lastPerfectConditions: 'Unknown',
    swipedDate: null,
    catches: null,
    recentActivity: 'Select a fishing area for insights',
    nextBestDay: 'Unknown',
    bestBait: 'Check local advice',
    bestBaitSource: 'mock',
    
    // Mock confidence
    locationConfidence: 50,
    seasonalConfidence: 50,
    recencyScore: 50,
  };
}

/**
 * Utility to upgrade existing favourite entries with ICES data
 */
export function upgradeWithICESData(
  existingEntries: ExistingEntry[],
  rectangleCode: string | null
): ICESEnhancedFavouriteEntry[] {
  
  return existingEntries.map(entry => 
    generateICESEnhancedEntry(
      entry.id,
      entry.name,
      rectangleCode,
      entry.card,
      { swipedDateLabel: null, catches: null } // Convert to InsightData format
    )
  );
}