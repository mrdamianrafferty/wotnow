'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { TideInfo } from '../components/findr/TideConditions';
import type { FreshnessLevel } from '@/lib/offline/storage';
import { Capacitor } from '@capacitor/core';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Check if running on native platform
const isNativePlatform = typeof window !== 'undefined' && Capacitor.isNativePlatform();

// Check network status (returns true for server-side rendering)
async function checkNetworkStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  // First check browser's online status
  if (!navigator.onLine) return false;

  // On native platform, use Capacitor Network plugin for more accurate status
  if (isNativePlatform) {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      return status.connected;
    } catch {
      // Fall back to navigator.onLine
    }
  }

  return navigator.onLine;
}

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
  isOffline?: boolean;
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
  // Offline-related fields
  isOffline?: boolean;
  isFromCache?: boolean;
  cacheTimestamp?: number;
  freshness?: FreshnessLevel;
}

const DEFAULT_LANGUAGE = 'en';

async function fetchPredictions(params: {
  rectangleCode: string;
  predictionDate?: string;
  language: string;
  latitude?: number;
  longitude?: number;
}): Promise<PredictionResponse> {
  const date = params.predictionDate || new Date().toISOString().split('T')[0];

  // Check network status FIRST - skip network requests entirely when offline
  const isOnline = await checkNetworkStatus();
  const isOffline = !isOnline;

  if (isOffline) {
    console.log('[useFishingPredictions] Device is OFFLINE, loading from cache only');
  }

  // On native platform, try SQLite cache first (faster than network)
  if (isNativePlatform) {
    try {
      const { findrSync } = await import('@/lib/offline/findrSync');
      const { predictions: rawPredictions, fromCache } = await findrSync.getPredictions(
        params.rectangleCode,
        date,
        params.language
      );

      // Filter out predictions with 0% confidence (stale cache from before confidence_percent fix)
      const predictions = rawPredictions.filter(p => p.confidence > 0);
      if (rawPredictions.length > predictions.length) {
        console.log('[useFishingPredictions] Filtered out', rawPredictions.length - predictions.length, 'stale predictions with 0% confidence');
      }

      // If ALL predictions were stale (0%), skip cache and fetch from network
      if (rawPredictions.length > 0 && predictions.length === 0) {
        console.log('[useFishingPredictions] All cached predictions were stale, fetching from network');
        // Fall through to network fetch below
      } else if (predictions.length > 0) {
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

        // If from cache AND online, trigger background refresh
        // Skip background refresh when offline to avoid unnecessary network errors
        if (fromCache && !isOffline) {
          fetchAndCacheFromNetwork(params, date, false).catch(() => {
            // Silently ignore background refresh errors
          });
        }

        return {
          rectangleCode: params.rectangleCode,
          predictionDate: date,
          language: params.language,
          predictions: mappedPredictions,
          isOffline,
          isFromCache: fromCache,
          cacheTimestamp: fromCache ? Date.now() : undefined,
          freshness: fromCache ? 'stale' : 'fresh',
        };
      }
    } catch (sqliteError) {
      console.warn('[useFishingPredictions] SQLite cache check failed:', sqliteError);
    }
  }

  // When offline and not on native platform, try IndexedDB cache before giving up
  if (isOffline) {
    console.log('[useFishingPredictions] Offline - trying IndexedDB cache...');
    try {
      const { getStorage } = await import('@/lib/offline/storage');
      const storage = getStorage();
      const cached = await storage.getPrediction(params.rectangleCode, date);

      if (cached) {
        console.log('[useFishingPredictions] Loaded from offline IndexedDB cache');
        const cachedData = cached.data as PredictionResponse;
        return {
          ...cachedData,
          isOffline: true,
          isFromCache: true,
          cacheTimestamp: cached.timestamp,
          freshness: cached.freshness,
        };
      }
    } catch (cacheError) {
      console.warn('[useFishingPredictions] IndexedDB cache check failed:', cacheError);
    }

    // No cache available while offline
    throw new Error('No cached predictions available. Please connect to the internet to load fishing predictions.');
  }

  // Fetch from network (standard path - only when online)
  return fetchAndCacheFromNetwork(params, date, isOffline);
}

async function fetchAndCacheFromNetwork(params: {
  rectangleCode: string;
  predictionDate?: string;
  language: string;
  latitude?: number;
  longitude?: number;
}, date: string, _isOffline: boolean): Promise<PredictionResponse> {
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

        // Also cache to Preferences for offline shell access
        // Include richer data for better offline experience
        try {
          const { Preferences } = await import('@capacitor/preferences');
          const cacheData = {
            rectangleCode: params.rectangleCode,
            date,
            cachedAt: new Date().toISOString(),
            region: typed.metadata?.region || null,
            predictions: typed.predictions.slice(0, 20).map(p => ({
              species_code: p.species_code || p.species_id || '',
              species_common_name: p.species_common_name || p.name_en || 'Unknown',
              species_scientific_name: p.species_scientific_name || p.scientific_name || '',
              slug: p.slug || '',
              guild: p.guild || '',
              confidence: p.confidence_percent ?? p.confidence ?? 0,
              bite_score: p.bite_score,
              temp_score: p.temp_score,
              tide_score: p.tide_score,
              light_score: p.light_score,
              lunar_score: p.lunar_score,
              best_times: p.best_times || [],
              playful_bio: p.playful_bio || '',
            })),
          };
          await Preferences.set({
            key: 'findr_offline_predictions',
            value: JSON.stringify(cacheData),
          });
          console.log('[useFishingPredictions] Cached to Preferences for offline shell:', cacheData.predictions.length, 'predictions');
        } catch (prefError) {
          console.warn('[useFishingPredictions] Failed to cache to Preferences:', prefError);
        }
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

    return {
      ...typed,
      isOffline: false,
      isFromCache: false,
      freshness: 'fresh' as FreshnessLevel,
    };
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
          isOffline: true, // Network failed, so we're effectively offline
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

  // Track real-time online/offline status
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also check Capacitor Network plugin on native
    if (isNativePlatform) {
      import('@capacitor/network').then(({ Network }) => {
        Network.getStatus().then(status => setIsOnline(status.connected));
        Network.addListener('networkStatusChange', status => {
          setIsOnline(status.connected);
        });
      }).catch(() => {
        // Ignore if Network plugin unavailable
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  // Pre-load species images for offline access (runs once per new predictions)
  const preloadedRef = useRef<string | null>(null);
  useEffect(() => {
    const predictions = query.data?.predictions;
    if (!predictions || predictions.length === 0) return;

    // Create a key from first 5 species to detect new predictions
    const predictionKey = predictions
      .slice(0, 5)
      .map(p => p.species_id || p.species_code)
      .join('-');

    // Skip if already preloaded these predictions
    if (preloadedRef.current === predictionKey) return;
    preloadedRef.current = predictionKey;

    // Pre-load images in background (non-blocking)
    void (async () => {
      try {
        const { preloadTopSpeciesImages } = await import('@/lib/findr/offlineImages');
        const formattedPredictions = predictions.map(p => ({
          speciesCode: (p.species_id || p.species_code) as string,
        }));
        // Cache ALL species images for this rectangle (typically 40-60 species, ~2-3MB)
        await preloadTopSpeciesImages(formattedPredictions, formattedPredictions.length);
      } catch (e) {
        // Silently ignore pre-loading errors
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useFishingPredictions] Image preload failed:', e);
        }
      }
    })();
  }, [query.data?.predictions]);

  // Pre-cache 7-day forecast for offline access (runs once per rectangle)
  const preCacheRef = useRef<string | null>(null);
  useEffect(() => {
    // Only trigger pre-caching when we have fresh predictions (not from cache)
    if (!rectangleCode || query.data?.isFromCache || query.isLoading) return;
    if (!query.data?.predictions || query.data.predictions.length === 0) return;

    // Skip if already pre-cached for this rectangle
    if (preCacheRef.current === rectangleCode) return;
    preCacheRef.current = rectangleCode;

    // Pre-cache in background with a delay to not compete with initial load
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { preCachePredictions } = await import('@/lib/findr/preCachePredictions');
          await preCachePredictions(
            rectangleCode,
            latitude ?? undefined,
            longitude ?? undefined,
            language
          );
        } catch (e) {
          // Silently ignore pre-caching errors
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useFishingPredictions] 7-day forecast pre-cache failed:', e);
          }
        }
      })();
    }, 2000); // Wait 2 seconds before starting pre-cache

    return () => clearTimeout(timer);
  }, [rectangleCode, query.data?.isFromCache, query.data?.predictions, query.isLoading, latitude, longitude, language]);

  // Determine offline status: use real-time status OR data-level offline flag
  const isOffline = !isOnline || query.data?.isOffline;

  return {
    predictions: query.data?.predictions ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    lastUpdated: query.data?.metadata?.requestedAt,
    region: query.data?.metadata?.region,
    tideInfo: query.data?.metadata?.conditions?.tide ?? null,
    reload: () => query.refetch(),
    // Offline-related fields
    isOffline,
    isFromCache: query.data?.isFromCache,
    cacheTimestamp: query.data?.cacheTimestamp,
    freshness: query.data?.freshness,
  };
}
