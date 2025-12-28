import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  cacheWeather,
  getCachedWeather,
  isWeatherStale,
  getWeatherCacheAge,
} from '@/lib/offline/weatherCache';

/**
 * Hook to fetch live marine weather data from multiple sources with priority fallback:
 * 1. MET Norway (preferred - free, high quality)
 * 2. Open-Meteo (fallback - free)
 * 3. Stormglass (last resort - paid, quota limited)
 * 
 * This provides real-time wave, wind, and marine forecasts.
 * DO NOT store this data in Supabase - it changes hourly.
 * 
 * Supabase should only store:
 * - Marine bio indicators (chlorophyll, oxygen, nutrients) - changes daily
 * - Water temperature from Copernicus - changes daily
 * - Tide times - changes daily
 */

export type MarineWeatherSource = 'met' | 'openmeteo' | 'stormglass' | 'fallback';

export interface TideForecast {
  timeISO: string;
  type: 'HIGH' | 'LOW';
  height: number;
}

export interface MarineCurrentConditions {
  waveHeightM: number | null;
  waveDirectionDeg: number | null;
  wavePeriodS: number | null;
  windSpeedMS: number | null;
  windDirectionDeg: number | null;
  seaTemperatureC: number | null;
  timestamp: string;
}

export interface MarineHourlyForecast {
  time: string;
  waveHeightM: number;
  windSpeedMS: number;
  seaTemperatureC: number;
  waveDirectionDeg?: number | null;
  wavePeriodS?: number | null;
  windDirectionDeg?: number | null;
  airTempC?: number | null;
  weatherIcon?: string | null;
  precipMM?: number | null;
  precipProbability?: number | null;
}

export interface MarineDailyForecast {
  label: string;
  dateLabel: string;
  waveHeightM: number;
  seaTemperatureC: number;
  windSpeedMS: number;
  windDirectionDeg?: number | null;
  icon?: string | null;
  minTempC?: number | null;
  maxTempC?: number | null;
  precipMM?: number | null;
  precipProbability?: number | null;
  fishingScore: number;
  summary: string;
}

export interface UseFindrMarineWeatherState {
  current: MarineCurrentConditions | null;
  hourly: MarineHourlyForecast[];
  daily: MarineDailyForecast[];
  tides: TideForecast[];
  loading: boolean;
  error: string | null;
  source: MarineWeatherSource;
  reload: () => void;
  updatedAt: string | null;
  // Offline cache indicators
  isFromCache?: boolean;
  cacheAge?: string;
}

/** Cached marine weather data structure */
interface CachedMarineWeather {
  current: MarineCurrentConditions | null;
  hourly: MarineHourlyForecast[];
  daily: MarineDailyForecast[];
  tides: TideForecast[];
  source: MarineWeatherSource;
}

/**
 * Fetch live marine weather for a specific location
 * @param lat Latitude (should be rectangle center, not 4dp rounded)
 * @param lon Longitude (should be rectangle center, not 4dp rounded)
 * @returns Marine weather state with current, hourly, and daily forecasts
 */
export function useFindrMarineWeather(
  lat?: number | null,
  lon?: number | null
): UseFindrMarineWeatherState {
  const [current, setCurrent] = useState<MarineCurrentConditions | null>(null);
  const [hourly, setHourly] = useState<MarineHourlyForecast[]>([]);
  const [daily, setDaily] = useState<MarineDailyForecast[]>([]);
  const [tides, setTides] = useState<TideForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<MarineWeatherSource>('fallback');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheAge, setCacheAge] = useState<string | undefined>(undefined);
  const initialLoadDone = useRef(false);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  const coordinates = useMemo(() => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon } as const;
  }, [lat, lon]);

  useEffect(() => {
    if (!coordinates) {
      setLoading(false);
      setError(null);
      setCurrent(null);
      setHourly([]);
      setDaily([]);
      setTides([]);
      setSource('fallback');
      setUpdatedAt(null);
      setIsFromCache(false);
      setCacheAge(undefined);
      return;
    }

    const { lat: latValue, lon: lonValue } = coordinates;
    const controller = new AbortController();
    let cancelled = false;

    async function run() {
      try {
        // Step 1: Check cache for instant display (before setting loading=true)
        if (!initialLoadDone.current) {
          const cached = getCachedWeather<CachedMarineWeather>(latValue, lonValue);
          if (cached) {
            console.log('[useFindrMarineWeather] Loaded from cache:', {
              source: cached.source,
              isStale: isWeatherStale(cached),
              age: getWeatherCacheAge(cached),
            });

            // Display cached data immediately
            setCurrent(cached.data.current);
            setHourly(cached.data.hourly);
            setDaily(cached.data.daily);
            setTides(cached.data.tides);
            setSource(cached.data.source);
            setUpdatedAt(cached.cachedAt);
            setIsFromCache(true);
            setCacheAge(getWeatherCacheAge(cached));

            // If cache is fresh enough, skip network fetch
            if (!isWeatherStale(cached)) {
              console.log('[useFindrMarineWeather] Cache is fresh, skipping network fetch');
              setLoading(false);
              initialLoadDone.current = true;
              return;
            }
            // Cache is stale - continue to fetch fresh data in background
          }
          initialLoadDone.current = true;
        }

        setLoading(true);
        setError(null);

        console.log('[useFindrMarineWeather] Fetching weather for:', { lat: latValue, lon: lonValue });

        // Add 30 second timeout to prevent hanging (increased from 15s)
        const timeoutId = setTimeout(() => {
          console.warn('[useFindrMarineWeather] Request timed out after 30s');
          controller.abort();
        }, 30000);

        const fetchStart = Date.now();
        const response = await fetch(
          `/api/findr/marine-weather?lat=${latValue}&lon=${lonValue}`,
          {
            method: 'GET',
            signal: controller.signal,
          }
        );
        const fetchDuration = Date.now() - fetchStart;

        clearTimeout(timeoutId);

        console.log('[useFindrMarineWeather] Response received:', {
          status: response.status,
          ok: response.ok,
          duration: `${fetchDuration}ms`,
        });

        if (!response.ok) {
          let errorDetail = `Marine weather request failed (${response.status})`;
          try {
            const errorBody = await response.json();
            errorDetail += `: ${errorBody.error || JSON.stringify(errorBody)}`;
          } catch {
            errorDetail += ` - Failed to parse error response`;
          }
          console.error('[useFindrMarineWeather] API error:', errorDetail);
          throw new Error(errorDetail);
        }

        const payload = await response.json();
        if (cancelled) return;

        console.log('[useFindrMarineWeather] Success:', {
          source: payload.source,
          hasCurrent: !!payload.current,
          hourlyCount: payload.hourly?.length ?? 0,
          dailyCount: payload.daily?.length ?? 0,
          tidesCount: payload.tides?.length ?? 0,
        });

        // Update state with fresh data
        setCurrent(payload.current ?? null);
        setHourly(payload.hourly ?? []);
        setDaily(payload.daily ?? []);
        setTides(payload.tides ?? []);
        setSource(payload.source ?? 'fallback');
        setUpdatedAt(new Date().toISOString());
        setError(null);
        setIsFromCache(false);
        setCacheAge(undefined);

        // Step 2: Cache successful response for offline use
        const dataToCache: CachedMarineWeather = {
          current: payload.current ?? null,
          hourly: payload.hourly ?? [],
          daily: payload.daily ?? [],
          tides: payload.tides ?? [],
          source: payload.source ?? 'fallback',
        };
        cacheWeather(latValue, lonValue, dataToCache, payload.source);
        console.log('[useFindrMarineWeather] Cached weather data for offline use');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.warn('[useFindrMarineWeather] Request aborted (timeout or component unmount)');
          return;
        }
        if (cancelled) {
          return;
        }
        console.error('[useFindrMarineWeather] Error:', {
          message: (err as Error).message,
          name: (err as Error).name,
          stack: (err as Error).stack,
        });

        // Step 3: Fall back to cached data on network failure
        const cached = getCachedWeather<CachedMarineWeather>(latValue, lonValue);
        if (cached) {
          console.log('[useFindrMarineWeather] Network failed, using cached data:', {
            age: getWeatherCacheAge(cached),
          });
          setCurrent(cached.data.current);
          setHourly(cached.data.hourly);
          setDaily(cached.data.daily);
          setTides(cached.data.tides);
          setSource(cached.data.source);
          setUpdatedAt(cached.cachedAt);
          setIsFromCache(true);
          setCacheAge(getWeatherCacheAge(cached));
          // Clear error since we have fallback data
          setError(null);
        } else {
          // No cached data available - show error
          setError((err as Error).message ?? 'Failed to load marine weather');
          setCurrent(null);
          setHourly([]);
          setDaily([]);
          setTides([]);
          setSource('fallback');
          setUpdatedAt(null);
          setIsFromCache(false);
          setCacheAge(undefined);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [coordinates, reloadCount]);

  return {
    current,
    hourly,
    daily,
    tides,
    loading,
    error,
    source,
    reload,
    updatedAt,
    isFromCache,
    cacheAge,
  };
}

export default useFindrMarineWeather;
