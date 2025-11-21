'use client';

import { useQuery } from '@tanstack/react-query';
import type { FavoritesTacticalAdvice } from '../lib/findr/generateFavouritesAdvice';

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

  const shouldFetch = enabled && Boolean(rectangleCode);
  const queryKey = ['favorites-tactical', rectangleCode, latitude, longitude];

  const params = rectangleCode ? {
    rectangleCode,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
  } : null;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTacticalAdvice(params!),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 5, // 5 minutes - conditions change relatively quickly
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  });

  return {
    advice: query.data ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    reload: () => query.refetch(),
  };
}
