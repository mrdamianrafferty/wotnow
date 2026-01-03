import { useCallback, useEffect, useMemo, useState } from 'react';
import { FALLBACK_CONDITIONS, type FallbackConditionPayload } from '../lib/findr/fallbackConditions';
import {
  getCachedConditions,
  cacheConditions,
  isConditionsCacheStale,
  getConditionsCacheAge,
} from '@/lib/offline/conditionsCache';
import { useOnlineStatus } from './useOnlineStatus';

export type ConditionsSource = 'supabase' | 'fallback' | 'cache';

interface ApiResponse extends FallbackConditionPayload {
  source?: ConditionsSource;
}

export interface UseFindrConditionsState {
  data: FallbackConditionPayload;
  loading: boolean;
  error: string | null;
  source: ConditionsSource;
  reload: () => void;
  isFromCache?: boolean;
  cacheAge?: string;
  isOffline?: boolean;
}

interface UserCoordinates {
  lat: number;
  lon: number;
}

export function useFindrConditions(
  rectangleCode?: string | null,
  userCoordinates?: UserCoordinates | null
): UseFindrConditionsState {
  const [data, setData] = useState<FallbackConditionPayload>(FALLBACK_CONDITIONS);
  const [source, setSource] = useState<ConditionsSource>('fallback');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | undefined>(undefined);
  const { isOnline } = useOnlineStatus();

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const safeCode = rectangleCode?.trim();
    const hasCoords = userCoordinates?.lat && userCoordinates?.lon;

    // Only use static fallback if we have neither rectangle code NOR coordinates
    if (!safeCode && !hasCoords) {
      setData(FALLBACK_CONDITIONS);
      setSource('fallback');
      setError(null);
      setLoading(false);
      setIsFromCache(false);
      setCacheAge(undefined);
      return;
    }

  const controller = new AbortController();
  const rectangleCodeSafe = safeCode || '';
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        // Step 1: Check cache first
        if (rectangleCodeSafe) {
          const cached = await getCachedConditions(rectangleCodeSafe);

          if (cached) {
            // Show cached data immediately
            setData(cached.conditions);
            setSource('cache');
            setIsFromCache(true);
            setCacheAge(getConditionsCacheAge(cached));

            // If offline or cache is fresh, use cached data only
            if (!isOnline || !isConditionsCacheStale(cached)) {
              console.log('[useFindrConditions] Using cached conditions for', rectangleCodeSafe);
              setLoading(false);
              return;
            }

            // Cache is stale but we're online - continue to fetch fresh
            console.log('[useFindrConditions] Cache stale, fetching fresh for', rectangleCodeSafe);
          } else if (!isOnline) {
            // No cache and offline - use fallback
            console.log('[useFindrConditions] Offline with no cache, using fallback');
            setData(FALLBACK_CONDITIONS);
            setSource('fallback');
            setIsFromCache(false);
            setCacheAge(undefined);
            setLoading(false);
            return;
          }
        }

        // Step 2: Fetch from API
        // Build URL - either with rectangleCode (European) or just coordinates (worldwide)
        let url = '/api/findr/conditions';
        const params = new URLSearchParams();

        if (rectangleCodeSafe) {
          params.append('rectangleCode', rectangleCodeSafe);
        }

        if (userCoordinates?.lat && userCoordinates?.lon) {
          params.append('lat', userCoordinates.lat.toString());
          params.append('lon', userCoordinates.lon.toString());
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const res = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!active) return;

        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload?.error || `Failed to load conditions for ${rectangleCode}`);
        }

        const payload = (await res.json()) as ApiResponse;
        setData(payload);
        setSource(payload.source ?? 'fallback');
        setError(null);
        setIsFromCache(false);
        setCacheAge(undefined);

        // Step 3: Cache the result
        if (rectangleCodeSafe) {
          await cacheConditions(rectangleCodeSafe, payload);
        }

        if (payload.source !== 'supabase') {
          console.info('[Findr Conditions] Using fallback payload from API response', {
            rectangleCode: rectangleCodeSafe,
            source: payload.source,
          });
        }
      } catch (err) {
        if (!active || (err as Error).name === 'AbortError') {
          return;
        }
        console.error('[Findr Conditions] Failed to load live conditions', {
          rectangleCode: rectangleCodeSafe,
          message: (err as Error).message,
        });

        // Try to fall back to cache on network error
        if (rectangleCodeSafe) {
          const cached = await getCachedConditions(rectangleCodeSafe);
          if (cached) {
            console.log('[useFindrConditions] Network error, using cached conditions');
            setData(cached.conditions);
            setSource('cache');
            setIsFromCache(true);
            setCacheAge(getConditionsCacheAge(cached));
            setError(null);
            return;
          }
        }

        // No cache available - use static fallback
        setData(FALLBACK_CONDITIONS);
        setSource('fallback');
        setIsFromCache(false);
        setCacheAge(undefined);
        setError((err as Error).message || 'Unable to load live conditions');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [rectangleCode, reloadCount, userCoordinates?.lat, userCoordinates?.lon, isOnline]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      source,
      reload,
      isFromCache,
      cacheAge,
      isOffline: !isOnline,
    }),
    [data, loading, error, source, reload, isFromCache, cacheAge, isOnline]
  );
}
