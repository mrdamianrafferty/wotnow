'use client';

import { useQuery } from '@tanstack/react-query';

export interface Use7DayPredictionsOptions {
  rectangleCode?: string | null;
  startDate?: string; // ISO date string (YYYY-MM-DD)
  language?: string;
  enabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Use7DayPredictionsState {
  // Map of species_code -> array of 7 daily confidence scores [day0, day1, ..., day6]
  forecastsBySpecies: Map<string, number[]>;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface SevenDayResponse {
  success: boolean;
  rectangleCode: string;
  startDate: string;
  forecasts: Record<string, number[]>;
  error?: string;
}

const DEFAULT_LANGUAGE = 'en';

/**
 * Fetch 7-day predictions using the optimized batch endpoint
 * This makes a SINGLE API call instead of 7 separate calls
 */
async function fetch7DayPredictions(params: {
  rectangleCode: string;
  startDate: string;
  language: string;
}): Promise<Map<string, number[]>> {
  const { rectangleCode, startDate, language } = params;

  // Use the optimized 7-day endpoint
  const apiUrl = typeof window !== 'undefined' &&
    (window.location.hostname === 'fishfindr.eu' || window.location.hostname.includes('godaisy.io'))
    ? `${window.location.protocol}//${window.location.host}/api/findr/predictions/7-day`
    : '/api/findr/predictions/7-day';

  const url = new URL(apiUrl, window.location.origin);
  url.searchParams.set('rectangle', rectangleCode);
  url.searchParams.set('startDate', startDate);
  url.searchParams.set('language', language);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.warn(`[use7DayPredictions] Failed to fetch 7-day predictions: ${response.status}`);
    return new Map();
  }

  const json: SevenDayResponse = await response.json();
  
  if (!json.success) {
    console.warn(`[use7DayPredictions] API error: ${json.error}`);
    return new Map();
  }

  // Convert object to Map
  const forecastMap = new Map<string, number[]>();
  for (const [speciesCode, scores] of Object.entries(json.forecasts)) {
    forecastMap.set(speciesCode, scores);
  }

  return forecastMap;
}

export function use7DayFishingPredictions(options: Use7DayPredictionsOptions): Use7DayPredictionsState {
  const {
    rectangleCode,
    startDate,
    language = DEFAULT_LANGUAGE,
    enabled = true,
    // latitude and longitude are kept for API compatibility but not used by the optimized endpoint
  } = options;

  const today = new Date().toISOString().split('T')[0];
  const effectiveStartDate = startDate || today;

  const {
    data: forecastsBySpecies,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['fishingPredictions7Day', rectangleCode, effectiveStartDate, language],
    queryFn: async () => {
      if (!rectangleCode) {
        return new Map<string, number[]>();
      }

      return fetch7DayPredictions({
        rectangleCode,
        startDate: effectiveStartDate,
        language,
      });
    },
    enabled: Boolean(enabled && rectangleCode),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour (formerly cacheTime)
    retry: 2,
  });

  return {
    forecastsBySpecies: forecastsBySpecies || new Map(),
    loading: isLoading,
    error: error ? (error as Error).message : null,
    reload: () => { void refetch(); },
  };
}
