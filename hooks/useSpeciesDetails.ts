'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TechniqueInfo, BaitInfo, SubstrateInfo } from '../lib/findr/mapPrediction';
import type { SeasonalityCurve, SeasonalityProfile } from '@/types/findrSeasonality';

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
  seasonalityProfile: SeasonalityProfile | null;
  isSeasonal: boolean;
  regionCode: string | null;
  seasonalityCurve: SeasonalityCurve | null;
}

interface UseSpeciesDetailsOptions {
  speciesId?: string | null;
  speciesCode?: string | null;
  regionCode?: string | null;
  rectangleCode?: string | null;
  enabled?: boolean;
}

interface UseSpeciesDetailsState {
  details: SpeciesDetails | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useSpeciesDetails(options: UseSpeciesDetailsOptions): UseSpeciesDetailsState {
  const { speciesId, speciesCode, regionCode, rectangleCode, enabled = true } = options;
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
      const normalisedRegionCode = typeof regionCode === 'string'
        ? regionCode.trim().toUpperCase()
        : null;

      if (normalisedRegionCode && /^[A-Z]{2,6}$/u.test(normalisedRegionCode)) {
        params.append('region_code', normalisedRegionCode);
      } else if (rectangleCode) {
        params.append('rectangle_code', rectangleCode);
      }

      const url = `/api/findr/species-details?${params.toString()}`;
      console.log('[useSpeciesDetails] Fetching:', url, {
        speciesId,
        speciesCode,
        regionCode: normalisedRegionCode,
        rectangleCode
      });

    const response = await fetch(url);

      if (!response.ok) {
        const json = await response.json();
        console.error('[useSpeciesDetails] API error:', {
          status: response.status,
          error: json.error,
          url,
          speciesId,
          speciesCode
        });
        throw new Error(json.error || 'Failed to load species details');
      }

      const raw = (await response.json()) as Partial<SpeciesDetails> & Record<string, unknown>;
      const normalised: SpeciesDetails = {
        ...(raw as SpeciesDetails),
        seasonalityProfile: (raw?.seasonalityProfile ?? (raw as Record<string, unknown>)?.seasonality_profile ?? null) as SeasonalityProfile | null,
        isSeasonal: Boolean(raw?.isSeasonal ?? (raw as Record<string, unknown>)?.is_seasonal ?? false),
        regionCode: typeof raw?.regionCode === 'string'
          ? raw.regionCode
          : typeof (raw as Record<string, unknown>)?.region_code === 'string'
            ? String((raw as Record<string, unknown>).region_code)
            : regionCode ?? null,
        seasonalityCurve: (raw?.seasonalityCurve ?? (raw as Record<string, unknown>)?.seasonality_curve ?? null) as SeasonalityCurve | null,
      };

      setDetails(normalised);
      setError(null);
    } catch (err) {
      console.error('[useSpeciesDetails] Error:', err);
      setError((err as Error).message || 'Unexpected error loading species details');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [speciesId, speciesCode, regionCode, rectangleCode, enabled]);

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
