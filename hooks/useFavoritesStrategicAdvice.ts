'use client';

import { useQuery } from '@tanstack/react-query';
import type { FavoritesStrategicAdvice } from '../lib/findr/generateFavouritesAdvice';

export interface UseFavoritesStrategicAdviceOptions {
  rectangleCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  enabled?: boolean;
}

export interface UseFavoritesStrategicAdviceState {
  advice: FavoritesStrategicAdvice | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

async function fetchStrategicAdvice(params: {
  rectangleCode: string;
  latitude?: number;
  longitude?: number;
}): Promise<FavoritesStrategicAdvice> {
  const url = new URL('/api/findr/advice/strategic', window.location.origin);
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
      : json?.details?.message || 'Failed to load strategic advice';
    throw new Error(errMessage);
  }

  const json = await response.json();
  return json.advice as FavoritesStrategicAdvice;
}

export function useFavoritesStrategicAdvice(
  options: UseFavoritesStrategicAdviceOptions
): UseFavoritesStrategicAdviceState {
  const {
    rectangleCode,
    latitude,
    longitude,
    enabled = true,
  } = options;

  const shouldFetch = enabled && Boolean(rectangleCode);
  const queryKey = ['favorites-strategic', rectangleCode, latitude, longitude];

  const params = rectangleCode ? {
    rectangleCode,
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
  } : null;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchStrategicAdvice(params!),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 60, // 1 hour - weekly forecast changes slowly
    gcTime: 1000 * 60 * 60 * 3, // 3 hours
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
