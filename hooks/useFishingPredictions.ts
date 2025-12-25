'use client';

import { useQuery } from '@tanstack/react-query';
import type { TideInfo } from '../components/findr/TideConditions';
import type { FreshnessLevel } from '@/lib/offline/storage';
import { Capacitor } from '@capacitor/core';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Check if running on native platform
const isNativePlatform = typeof window !== 'undefined' && Capacitor.isNativePlatform();

export interface FishingPrediction {
  [key: string]: JsonValue | undefined;
  species_id?: string;
  species_common_name?: string;
  confidence_percent?: number; // Primary confidence field from API
  confidence?: number;         // Legacy/fallback confidence field
  bite_score?: number;
  bio_band_score?: number;
  temp_score?: number;
  tide_score?: number;
  substrate_score?: number;
  depth_score?: number;
  light_score?: number;
  habitat_bonus?: number;
  lunar_score?: number;
  weather_score?: number;
  freshness_score?: number;
  completeness_score?: number;
  moon_phase?: string;
  moon_illumination?: number;
  biogeographic_regions?: JsonValue;
  rationale?: JsonValue;
}

export interface UseFishingPredictionsOptions {
  rectangleCode?: string | null;
  predictionDate?: string | null;
  language?: string;
  enabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UseFishingPredictionsState {
  predictions: FishingPrediction[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
  region?: string | null;
  tideInfo?: TideInfo | null;
  reload: () => void;
  // Offline-related fields
  isFromCache?: boolean;
  cacheTimestamp?: number;
  freshness?: FreshnessLevel;
}

interface PredictionResponse {
  rectangleCode: string;
  predictionDate: string;
  language: string;
  predictions: FishingPrediction[];
  metadata?: {
    requestedAt?: string;
    region?: string | null;
    conditions?: {
      tide?: TideInfo | null;
      weather?: {
        windSpeedMS: number | null;
        pressureHPA: number | null;
      };
    };
  };
}

const DEFAULT_LANGUAGE = 'en';

async function fetchPredictions(params: {
  rectangleCode: string;
  predictionDate?: string;
  language: string;
  latitude?: number;
  longitude?: number;
}): Promise<PredictionResponse & { isFromCache?: boolean; cacheTimestamp?: number; freshness?: FreshnessLevel }> {
  const date = params.predictionDate || new Date().toISOString().split('T')[0];

  // On native platform, try SQLite cache first (faster than network)
  if (isNativePlatform) {
    try {
      const { findrSync } = await import('@/lib/offline/findrSync');
      const { predictions, fromCache } = await findrSync.getPredictions(
        params.rectangleCode,
        date,
        params.language
      );

      if (predictions.length > 0) {
        console.log('[useFishingPredictions] Loaded ' + predictions.length + ' predictions from SQLite cache');

        // Enrich predictions with species data from SQLite
        const { species: allSpecies } = await findrSync.getSpecies();
        const speciesMap = new Map(allSpecies.map(s => [s.speciesCode, s]));

        // Map offline predictions to API format with species data
        const mappedPredictions: FishingPrediction[] = predictions.map(p => {
          const species = speciesMap.get(p.speciesCode);
          return {
            species_id: p.speciesCode,
            species_code: p.speciesCode,
            species_name: species?.nameEn || undefined,
            name_en: species?.nameEn || undefined,
            scientific_name: species?.scientificName || undefined,
            species_scientific_name: species?.scientificName || undefined,
            playful_bio: species?.playfulBio || undefined,
            slug: species?.slug || undefined,
            confidence_percent: p.confidence, // Primary field expected by parseConfidence
            confidence: p.confidence,         // Fallback field
            bite_score: p.biteScore,
            temp_score: p.tempScore,
            tide_score: p.tideScore,
            light_score: p.lightScore,
            lunar_score: p.lunarScore,
            habitat_bonus: p.habitatBonus,
            rationale: p.rationale,
            best_times: p.bestTimes,
          };
        });

        // If from cache, also trigger background refresh
        if (fromCache) {
          fetchAndCacheFromNetwork(params, date).catch(() => {
            // Silently ignore background refresh errors
          });
        }

        return {
          rectangleCode: params.rectangleCode,
          predictionDate: date,
          language: params.language,
          predictions: mappedPredictions,
          isFromCache: fromCache,
          cacheTimestamp: fromCache ? Date.now() : undefined,
          freshness: fromCache ? 'stale' : 'fresh',
        };
      }
    } catch (sqliteError) {
      console.warn('[useFishingPredictions] SQLite cache check failed:', sqliteError);
    }
  }

  // Fetch from network (standard path)
  return fetchAndCacheFromNetwork(params, date);
}

async function fetchAndCacheFromNetwork(params: {
  rectangleCode: string;
  predictionDate?: string;
  language: string;
  latitude?: number;
  longitude?: number;
}, date: string): Promise<PredictionResponse & { isFromCache?: boolean; cacheTimestamp?: number; freshness?: FreshnessLevel }> {
  // Try network fetch first
  try {
    // Use absolute URL for fishfindr.eu and godaisy.io to avoid redirect issues
    const apiUrl = typeof window !== 'undefined' &&
      (window.location.hostname === 'fishfindr.eu' || window.location.hostname.includes('godaisy.io'))
      ? `${window.location.protocol}//${window.location.host}/api/findr/predictions`
      : '/api/findr/predictions';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const json = await response.json();
      const errMessage = typeof json?.error === 'string'
        ? json.error
        : json?.details?.message || 'Failed to load fishing predictions';
      console.error('[useFishingPredictions] API error:', {
        status: response.status,
        error: json?.error,
        details: json?.details,
        fullResponse: json,
      });
      throw new Error(errMessage);
    }

    const json = await response.json();
    const typed = json as PredictionResponse;

    // Cache successful response to SQLite (native) or IndexedDB (web)
    try {
      if (isNativePlatform) {
        // Cache to SQLite on native
        const { findrDb } = await import('@/lib/offline/findrDatabase');
        const offlinePredictions = typed.predictions.map(p => ({
          id: `${params.rectangleCode}-${date}-${p.species_id || p.species_code}`,
          rectangleCode: params.rectangleCode,
          predictionDate: date,
          language: params.language,
          speciesCode: (p.species_code || p.species_id || '') as string,
          confidence: (p.confidence_percent ?? p.confidence ?? 0) as number,
          biteScore: p.bite_score as number | undefined,
          tempScore: p.temp_score as number | undefined,
          tideScore: p.tide_score as number | undefined,
          lightScore: p.light_score as number | undefined,
          lunarScore: p.lunar_score as number | undefined,
          habitatBonus: p.habitat_bonus as number | undefined,
          rationale: p.rationale as string | undefined,
          bestTimes: p.best_times as string[] | undefined,
        }));
        await findrDb.predictions.cache(params.rectangleCode, date, params.language, offlinePredictions);
      } else {
        // Cache to IndexedDB on web
        const { getStorage } = await import('@/lib/offline/storage');
        const storage = getStorage();
        await storage.cachePrediction({
          rectangleCode: params.rectangleCode,
          date,
          data: typed,
        });
      }
    } catch (_cacheError) {
      // Silently ignore cache errors
    }

    return typed;
  } catch (networkError) {
    // Network fetch failed - try offline cache
    console.log('[useFishingPredictions] Network fetch failed, trying offline cache...');

    try {
      const { getStorage } = await import('@/lib/offline/storage');
      const storage = getStorage();
      const cached = await storage.getPrediction(params.rectangleCode, date);

      if (cached) {
        console.log('[useFishingPredictions] Loaded from offline cache:', {
          rectangleCode: params.rectangleCode,
          date,
          freshness: cached.freshness,
          age: Date.now() - cached.timestamp,
        });

        const cachedData = cached.data as PredictionResponse;
        return {
          ...cachedData,
          isFromCache: true,
          cacheTimestamp: cached.timestamp,
          freshness: cached.freshness,
        };
      }
    } catch (cacheError) {
      console.warn('[useFishingPredictions] Failed to load from cache:', cacheError);
    }

    // No cache available - re-throw network error
    throw networkError;
  }
}

export function useFishingPredictions(options: UseFishingPredictionsOptions): UseFishingPredictionsState {
  const {
    rectangleCode,
    predictionDate,
    language = DEFAULT_LANGUAGE,
    enabled = true,
    latitude,
    longitude
  } = options;

  // Build query key and params
  const shouldFetch = enabled && Boolean(rectangleCode);
  const queryKey = ['predictions', rectangleCode, predictionDate, language, latitude, longitude];

  const params = rectangleCode ? {
    rectangleCode,
    predictionDate: predictionDate || undefined,
    language,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
  } : null;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchPredictions(params!),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 30, // 30 minutes - data is relatively fresh
    gcTime: 1000 * 60 * 60 * 3, // 3 hours - matches backend cache TTL
    refetchOnWindowFocus: false, // Don't refetch on window focus (marine data changes slowly)
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retry
  });

  return {
    predictions: query.data?.predictions ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    lastUpdated: query.data?.metadata?.requestedAt,
    region: query.data?.metadata?.region,
    tideInfo: query.data?.metadata?.conditions?.tide ?? null,
    reload: () => query.refetch(),
    // Offline-related fields
    isFromCache: query.data?.isFromCache,
    cacheTimestamp: query.data?.cacheTimestamp,
    freshness: query.data?.freshness,
  };
}
