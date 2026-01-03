'use client';

import { useQuery } from '@tanstack/react-query';
import type { FavoritesTacticalAdvice } from '../lib/findr/generateFavouritesAdvice';
import {
  getCachedSpeciesAdvice,
  cacheTacticalAdvice,
  isTacticalAdviceStale,
} from '@/lib/offline/speciesAdviceCache';
import { useOnlineStatus } from './useOnlineStatus';

export interface UseFavoritesTacticalAdviceOptions {
  rectangleCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  enabled?: boolean;
}

export interface UseFavoritesTacticalAdviceState {
  advice: FavoritesTacticalAdvice | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  isFromCache?: boolean;
  isOffline?: boolean;
}

async function fetchTacticalAdvice(params: {
  rectangleCode: string;
  latitude?: number;
  longitude?: number;
}): Promise<FavoritesTacticalAdvice> {
  const url = new URL('/api/findr/advice/tactical', window.location.origin);
  url.searchParams.set('rectangleCode', params.rectangleCode);
  if (params.latitude !== undefined) {
    url.searchParams.set('lat', params.latitude.toString());
  }
  if (params.longitude !== undefined) {
    url.searchParams.set('lon', params.longitude.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for Supabase auth
  });

  if (!response.ok) {
    const json = await response.json();
    const errMessage = typeof json?.error === 'string'
      ? json.error
      : json?.details?.message || 'Failed to load tactical advice';
    throw new Error(errMessage);
  }

  const json = await response.json();
  return json.advice as FavoritesTacticalAdvice;
}

export function useFavoritesTacticalAdvice(
  options: UseFavoritesTacticalAdviceOptions
): UseFavoritesTacticalAdviceState {
  const {
    rectangleCode,
    latitude,
    longitude,
    enabled = true,
  } = options;

  const { isOnline } = useOnlineStatus();

  const shouldFetch = enabled && Boolean(rectangleCode);
  const queryKey = ['favorites-tactical', rectangleCode, latitude, longitude, isOnline];

  const params = rectangleCode ? {
    rectangleCode,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
  } : null;

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!params) throw new Error('No rectangle code');

      // Step 1: Check cache first
      const cached = await getCachedSpeciesAdvice(params.rectangleCode);

      if (cached?.tacticalAdvice) {
        // If offline, return cached data
        if (!isOnline) {
          console.log('[useFavoritesTacticalAdvice] Offline - using cached advice');
          return { advice: cached.tacticalAdvice, isFromCache: true };
        }

        // If cache is fresh, use it
        if (!isTacticalAdviceStale(cached)) {
          console.log('[useFavoritesTacticalAdvice] Using fresh cached advice');
          return { advice: cached.tacticalAdvice, isFromCache: true };
        }

        // Cache is stale but we're online - fetch fresh
        console.log('[useFavoritesTacticalAdvice] Cache stale, fetching fresh');
      } else if (!isOnline) {
        // No cache and offline
        console.log('[useFavoritesTacticalAdvice] Offline with no cache');
        throw new Error('No cached advice available offline');
      }

      // Step 2: Fetch from API
      try {
        const advice = await fetchTacticalAdvice(params);

        // Step 3: Cache the result
        await cacheTacticalAdvice(params.rectangleCode, advice);

        return { advice, isFromCache: false };
      } catch (error) {
        // If fetch fails but we have cached data, use it
        if (cached?.tacticalAdvice) {
          console.log('[useFavoritesTacticalAdvice] Fetch failed, using cached');
          return { advice: cached.tacticalAdvice, isFromCache: true };
        }
        throw error;
      }
    },
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes - conditions change relatively quickly
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, _error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      return failureCount < 1;
    },
    retryDelay: 1000,
  });

  const result = query.data;

  return {
    advice: result?.advice ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    reload: () => query.refetch(),
    isFromCache: result?.isFromCache,
    isOffline: !isOnline,
  };
}
