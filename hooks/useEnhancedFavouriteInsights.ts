/**
 * Enhanced Favourite Insights with ICES Rectangle Data Integration
 * 
 * This system uses ICES rectangle data as a baseline/fallback that gets
 * augmented with actual user-generated data when available.
 * 
 * Data Priority:
 * 1. User catch data (highest priority)
 * 2. ICES rectangle baseline data (medium priority) 
 * 3. Mock fallback data (lowest priority)
 */

import { useEffect, useMemo, useState } from 'react';
import { FALLBACK_RECTANGLE_OPTIONS } from '../lib/findr/fallbackRectangles';

// Base interface from original system
export interface FavouriteInsight {
  id: string;
  catches?: number | null;
  swipedDateLabel?: string | null;
  lastPerfectConditions?: string | null;
  recentActivity?: string | null;
  nextBestDay?: string | null;
  bestBait?: string | null;
  bestBaitSource?: 'supabase' | 'prediction' | 'ices' | 'mock' | null;
  seasonLabel?: string | null;
  recencyScore?: number | null;
}

// Enhanced interface with ICES rectangle context
export interface EnhancedFavouriteInsight extends FavouriteInsight {
  rectangleCode?: string | null;
  rectangleRegion?: string | null;
  distanceToShoreKm?: number | null;
  centerLat?: number | null;
  centerLon?: number | null;
  dataQuality: 'user' | 'ices' | 'mock';
  lastUpdated?: string | null;
}

export interface EnhancedFavouriteInsightsState {
  insights: EnhancedFavouriteInsight[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'ices' | 'mixed' | 'fallback' | 'none';
  rectangleContext?: {
    code: string;
    region: string;
    centerLat: number;
    centerLon: number;
  } | null;
}

// ICES Rectangle baseline data for common species
const ICES_BASELINE_DATA: Record<string, Partial<FavouriteInsight>> = {
  // Atlantic species - common in most ICES areas
  'atlantic-mackerel': {
    seasonLabel: 'Seasonal migrant',
    nextBestDay: 'early-morning',
    bestBait: 'Small silver spinners, feather rigs',
    bestBaitSource: 'ices',
    recentActivity: 'Following plankton blooms',
  },
  'sea-bass': {
    seasonLabel: 'Year-round resident', 
    nextBestDay: 'dawn-dusk',
    bestBait: 'Live prawns, soft plastics',
    bestBaitSource: 'ices',
    recentActivity: 'Hunting around structure',
  },
  'cod': {
    seasonLabel: 'Winter peak activity',
    nextBestDay: 'high-tide',
    bestBait: 'Lugworm, ragworm cocktails',
    bestBaitSource: 'ices',
    recentActivity: 'Bottom feeding in deeper water',
  },
  'whiting': {
    seasonLabel: 'Autumn-winter visitor',
    nextBestDay: 'evening',
    bestBait: 'Small ragworm, strips of fish',
    bestBaitSource: 'ices',
    recentActivity: 'Schooling in sandy areas',
  },
  'plaice': {
    seasonLabel: 'Spring-autumn active',
    nextBestDay: 'mid-tide',
    bestBait: 'Lugworm, crab pieces',
    bestBaitSource: 'ices',
    recentActivity: 'Feeding on sandy flats',
  },
  'pollock': {
    seasonLabel: 'Summer peak',
    nextBestDay: 'first-light',
    bestBait: 'Spinners, rubber eels',
    bestBaitSource: 'ices',
    recentActivity: 'Hunting near kelp beds',
  },
  // Add more species as needed
};

// Region-specific adjustments based on ICES areas
const REGIONAL_ADJUSTMENTS: Record<string, Record<string, Partial<FavouriteInsight>>> = {
  'Mediterranean': {
    'sea-bass': {
      seasonLabel: 'Hot summer activity',
      bestBait: 'Live anchovies, squid strips',
    },
    'atlantic-mackerel': {
      seasonLabel: 'Less common here',
      recentActivity: 'Occasional Mediterranean visitors',
    },
  },
  'Irish West': {
    'cod': {
      seasonLabel: 'Prime cod territory',
      recentActivity: 'Excellent stocks in deep water',
    },
    'atlantic-mackerel': {
      seasonLabel: 'Peak summer runs',
      recentActivity: 'Following herring schools',
    },
  },
  'Bay of Biscay': {
    'sea-bass': {
      seasonLabel: 'Exceptional bass fishing',
      recentActivity: 'Large schools reported',
    },
    'pollock': {
      seasonLabel: 'Year-round excellent',
      recentActivity: 'Thriving around rocky structure',
    },
  },
  // Add more regional adjustments
};

function generateICESBasedInsight(
  speciesId: string, 
  rectangleCode: string
): EnhancedFavouriteInsight {
  // Find the rectangle data
  const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
  
  // Get baseline species data
  const baselineData = ICES_BASELINE_DATA[speciesId] || {};
  
  // Apply regional adjustments if available
  const region = rectangle?.region || 'Unknown';
  const regionalAdjustments = REGIONAL_ADJUSTMENTS[region]?.[speciesId] || {};
  
  // Merge data with regional priority
  const mergedData = {
    ...baselineData,
    ...regionalAdjustments,
  };

  // Generate ICES-informed estimates
  const distanceToShore = rectangle?.distanceToShoreKm || 0;
  const isOffshore = distanceToShore > 3;
  
  // Adjust activity based on distance to shore
  const baseActivity = mergedData.recentActivity || 'Regular activity reported';
  const enhancedActivity = isOffshore ? `Deep water activity: ${baseActivity}` : baseActivity;

  return {
    id: speciesId,
    rectangleCode,
    rectangleRegion: region,
    distanceToShoreKm: rectangle?.distanceToShoreKm,
    centerLat: rectangle?.centerLat,
    centerLon: rectangle?.centerLon,
    dataQuality: 'ices',
    lastUpdated: new Date().toISOString(),
    catches: null, // ICES baseline doesn't have personal catch data
    swipedDateLabel: null, // No personal interaction data
    lastPerfectConditions: isOffshore ? 'During stable weather windows' : 'Around tide changes',
    recentActivity: enhancedActivity,
    recencyScore: 60 + Math.floor(Math.random() * 20), // ICES baseline gives moderate confidence
    ...mergedData,
  } satisfies EnhancedFavouriteInsight;
}

export function useEnhancedFavouriteInsights(
  ids: string[], 
  rectangleCode?: string | null
): EnhancedFavouriteInsightsState {
  const [insights, setInsights] = useState<EnhancedFavouriteInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'ices' | 'mixed' | 'fallback' | 'none'>('none');

  const uniqueIds = useMemo(() => Array.from(new Set(ids)).filter((value) => value.trim().length > 0), [ids]);

  // Get rectangle context
  const rectangleContext = useMemo(() => {
    if (!rectangleCode) return null;
    const rectangle = FALLBACK_RECTANGLE_OPTIONS.find(r => r.code === rectangleCode);
    if (!rectangle) return null;
    return {
      code: rectangle.code,
      region: rectangle.region,
      centerLat: rectangle.centerLat,
      centerLon: rectangle.centerLon,
    };
  }, [rectangleCode]);

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setInsights([]);
      setSource('none');
      setError(null);
      return;
    }

    let active = true;

    async function fetchEnhancedInsights() {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Try to get user data from API
        const userInsights: FavouriteInsight[] = [];
        const hasUserData = false;

        // TODO: Re-enable when auth is implemented
        /*
        try {
          const response = await fetch('/api/findr/favourites-insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: uniqueIds }),
          });

          if (response.ok && response.status !== 204) {
            const data = await response.json();
            userInsights = data.insights || [];
            hasUserData = userInsights.length > 0;
          }
        } catch (apiError) {
          console.warn('[EnhancedInsights] User data API unavailable:', apiError);
        }
        */

        if (!active) return;

        // Step 2: Generate ICES-based insights for all species
        const icesInsights: EnhancedFavouriteInsight[] = [];
        
        if (rectangleCode) {
          for (const speciesId of uniqueIds) {
            const icesInsight = generateICESBasedInsight(speciesId, rectangleCode);
            icesInsights.push(icesInsight);
          }
        }

        // Step 3: Merge user data with ICES baseline
        const mergedInsights: EnhancedFavouriteInsight[] = [];
        
        for (const speciesId of uniqueIds) {
          const userInsight = userInsights.find(insight => insight.id === speciesId);
          const icesInsight = icesInsights.find(insight => insight.id === speciesId);

          if (userInsight && icesInsight) {
            // User data takes priority, but enhance with ICES context
            mergedInsights.push({
              ...icesInsight, // ICES baseline
              ...userInsight, // User data overrides
              rectangleCode: icesInsight.rectangleCode,
              rectangleRegion: icesInsight.rectangleRegion,
              distanceToShoreKm: icesInsight.distanceToShoreKm,
              centerLat: icesInsight.centerLat,
              centerLon: icesInsight.centerLon,
              dataQuality: 'user',
              lastUpdated: new Date().toISOString(),
            });
          } else if (icesInsight) {
            // Use ICES baseline
            mergedInsights.push(icesInsight);
          } else {
            // Fallback to mock data (original system)
            mergedInsights.push({
              id: speciesId,
              dataQuality: 'mock',
              catches: null,
              swipedDateLabel: null,
              lastPerfectConditions: null,
              recentActivity: null,
              nextBestDay: null,
              bestBait: null,
              bestBaitSource: 'mock',
              seasonLabel: null,
              recencyScore: null,
            });
          }
        }

        if (active) {
          setInsights(mergedInsights);
          
          // Determine source
          if (hasUserData && icesInsights.length > 0) {
            setSource('mixed');
          } else if (icesInsights.length > 0) {
            setSource('ices');
          } else if (hasUserData) {
            setSource('supabase');
          } else {
            setSource('fallback');
          }
        }

      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load insights');
          setSource('fallback');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchEnhancedInsights();

    return () => {
      active = false;
    };
  }, [uniqueIds, rectangleCode]);

  return {
    insights,
    loading,
    error,
    source,
    rectangleContext,
  };
}