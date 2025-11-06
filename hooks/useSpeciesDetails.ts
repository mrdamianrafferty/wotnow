'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TechniqueInfo, BaitInfo, SubstrateInfo } from '../lib/findr/mapPrediction';

interface AdviceInfo {
  shore?: {
    regions?: string;
    best_time?: string;
    tide_sensitivity?: string;
    baits_diet?: string;
    temperature_effect?: string;
    weather_effect?: string;
    distance_depth?: string;
    restrictions?: string;
    authority?: string;
  };
  boat?: {
    regions?: string;
    best_time?: string;
    tide_sensitivity?: string;
    baits_diet?: string;
    temperature_effect?: string;
    weather_effect?: string;
    distance_depth?: string;
    restrictions?: string;
    authority?: string;
  };
}

export interface SpeciesDetails {
  species_id: string;
  species_code: string;
  name_en: string;
  scientific_name: string | null;
  inaturalist_url: string | null;
  techniques: TechniqueInfo[];
  bait: BaitInfo[];
  substrates: SubstrateInfo | null;
  advice: AdviceInfo | null;
  eating_quality: number | null;
  conservation_status: string | null;
  fun_fact: string | null;
  min_depth: number | null;
  max_depth: number | null;
  guild: string | null;
  species_badges: string[] | null;
  recommended_baits: string[] | null;
  temp_opt_c: number[] | null;
}

interface UseSpeciesDetailsOptions {
  speciesId?: string | null;
  speciesCode?: string | null;
  enabled?: boolean;
}

interface UseSpeciesDetailsState {
  details: SpeciesDetails | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSpeciesDetails(options: UseSpeciesDetailsOptions): UseSpeciesDetailsState {
  const { speciesId, speciesCode, enabled = true } = options;
  const [details, setDetails] = useState<SpeciesDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!enabled || (!speciesId && !speciesCode)) {
      setDetails(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (speciesId) {
        params.append('species_id', speciesId);
      } else if (speciesCode) {
        params.append('species_code', speciesCode);
      }

      const response = await fetch(`/api/findr/species-details?${params.toString()}`);
      
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || 'Failed to load species details');
      }

      const data = await response.json();
      setDetails(data);
      setError(null);
    } catch (err) {
      console.error('[useSpeciesDetails] Error:', err);
      setError((err as Error).message || 'Unexpected error loading species details');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [speciesId, speciesCode, enabled]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  return {
    details,
    loading,
    error,
    reload: fetchDetails,
  };
}
