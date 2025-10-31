import { useMemo } from 'react';
import { useFishingPredictions } from './useFishingPredictions';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';

export interface QuickLogSpecies {
  id: string;
  code: string;
  name: string;
  scientificName?: string | null;
  thumbnail: string | null;
  confidence: number;
  biteScore: number;
  badge?: 'hot' | 'good' | null;
}

export interface UseQuickLogSpeciesOptions {
  maxSpecies?: number;
  rectangleCode?: string;
}

export interface UseQuickLogSpeciesResult {
  species: QuickLogSpecies[];
  isLoading: boolean;
  error: Error | null;
  metadata?: {
    rectangleCode?: string;
    locationName?: string;
    predictionDate?: string;
  };
}

/**
 * Hook to fetch region-specific species for quick catch logging
 *
 * Uses the predictions API to get top N species based on:
 * - Current location (latitude/longitude)
 * - Real-time environmental data (temperature, depth, substrate)
 * - Seasonal activity
 * - Confidence/bite score ranking
 *
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param options - Optional configuration
 * @returns Species list with thumbnails and confidence badges
 */
export function useQuickLogSpecies(
  latitude: number,
  longitude: number,
  options?: UseQuickLogSpeciesOptions
): UseQuickLogSpeciesResult {
  const maxSpecies = options?.maxSpecies ?? 12;

  // Fetch predictions for location
  const { predictions, loading, error } = useFishingPredictions({
    rectangleCode: options?.rectangleCode,
    latitude,
    longitude,
    predictionDate: new Date().toISOString().split('T')[0],
    language: 'en',
  });

  // Transform predictions into quick-log format
  const species: QuickLogSpecies[] = useMemo(() => {
    if (!predictions) return [];

    return predictions
  .slice(0, maxSpecies)
  .map((pred) => {
        // Get thumbnail from existing image map
        const speciesCode = pred.species_code as string;
        const imageInfo = SPECIES_IMAGE_MAP[speciesCode];

        // Determine badge based on bite score thresholds
        const biteScore = (pred.bite_score as number) ?? 0;
        let badge: 'hot' | 'good' | null = null;
        if (biteScore >= 60) {
          badge = 'hot';
        } else if (biteScore >= 45) {
          badge = 'good';
        }

        return {
          id: (pred.slug as string) || speciesCode,
          code: speciesCode,
          name: pred.name_en as string,
          scientificName: (pred.scientific_name as string | null | undefined) || null,
          thumbnail: imageInfo?.thumb || imageInfo?.image || null,
          confidence: (pred.confidence as number) ?? 0,
          biteScore: biteScore,
          badge,
        };
      });
  }, [predictions, maxSpecies]);

  return {
    species,
    isLoading: loading,
    error: error ? new Error(error) : null,
    metadata: undefined,
  };
}
