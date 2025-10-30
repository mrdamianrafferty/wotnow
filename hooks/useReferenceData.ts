// hooks/useReferenceData.ts
// Hook for fetching reference data from catch logs

import { useState, useEffect, useCallback } from 'react';

interface SpeciesData {
  id: string;
  code: string;
  commonName: string;
  name_en?: string;
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

interface BaitEffectivenessData {
  baitName: string;
  targetSpecies: string[];
  successRate: number;
  totalUses: number;
  bestConditions: string[];
  cost: 'low' | 'medium' | 'high';
  availability: 'common' | 'seasonal' | 'rare';
  tips: string[];
}

interface HabitatData {
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

interface ReferenceData {
  species: SpeciesData[];
  baits: BaitEffectivenessData[];
  habitats: HabitatData[];
  generated_at: string;
}

interface UseReferenceDataOptions {
  userId?: string;
  type?: 'species' | 'baits' | 'habitats' | 'all';
  autoFetch?: boolean;
}

export function useReferenceData(options: UseReferenceDataOptions = {}) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (options.userId) {
        params.append('user_id', options.userId);
      }
      
      if (options.type && options.type !== 'all') {
        params.append('type', options.type);
      }

      const response = await fetch(`/api/findr/get-reference-data?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reference data: ${response.status}`);
      }

      const result: ReferenceData = await response.json();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching reference data:', error);
    } finally {
      setLoading(false);
    }
  }, [options.userId, options.type]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchData();
    }
  }, [fetchData, options.autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook specifically for species data
 */
export function useSpeciesData(userId?: string) {
  return useReferenceData({ userId, type: 'species' });
}

/**
 * Hook specifically for bait data
 */
export function useBaitData(userId?: string) {
  return useReferenceData({ userId, type: 'baits' });
}

/**
 * Hook specifically for habitat data
 */
export function useHabitatData(userId?: string) {
  return useReferenceData({ userId, type: 'habitats' });
}