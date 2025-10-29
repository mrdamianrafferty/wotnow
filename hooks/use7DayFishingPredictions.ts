'use client';

import { useQuery } from '@tanstack/react-query';
import type { FishingPrediction } from './useFishingPredictions';

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

interface PredictionResponse {
  rectangleCode: string;
  predictionDate: string;
  language: string;
  predictions: FishingPrediction[];
}

const DEFAULT_LANGUAGE = 'en';

/**
 * Fetch predictions for multiple consecutive days and extract 7-day forecasts per species
 */
async function fetch7DayPredictions(params: {
  rectangleCode: string;
  startDate: string;
  language: string;
  latitude?: number;
  longitude?: number;
}): Promise<Map<string, number[]>> {
  const { rectangleCode, startDate, language, latitude, longitude } = params;

  // Generate array of 7 consecutive dates starting from startDate
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  // Use absolute URL for fishfindr.eu and godaisy.io to avoid redirect issues
  const apiUrl = typeof window !== 'undefined' &&
    (window.location.hostname === 'fishfindr.eu' || window.location.hostname.includes('godaisy.io'))
    ? `${window.location.protocol}//${window.location.host}/api/findr/predictions`
    : '/api/findr/predictions';

  // Fetch predictions for all 7 days in parallel
  const fetchPromises = dates.map(async (predictionDate) => {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rectangleCode,
        predictionDate,
        language,
        latitude,
        longitude,
      }),
    });

    if (!response.ok) {
      console.warn(`[use7DayPredictions] Failed to fetch predictions for ${predictionDate}`);
      return { predictionDate, predictions: [] as FishingPrediction[] };
    }

    const json: PredictionResponse = await response.json();
    return { predictionDate, predictions: json.predictions || [] };
  });

  const results = await Promise.all(fetchPromises);

  // Build map of species_code -> [conf_day0, conf_day1, ..., conf_day6]
  const forecastMap = new Map<string, number[]>();

  results.forEach((result, dayIndex) => {
    result.predictions.forEach((pred) => {
      const speciesCode = pred.species_code || pred.species_id;
      if (typeof speciesCode !== 'string') return;

      // Get confidence score (prefer bite_score over confidence)
      const confidence = typeof pred.bite_score === 'number'
        ? pred.bite_score
        : typeof pred.confidence === 'number'
        ? pred.confidence
        : null;

      if (confidence === null) return;

      // Initialize array if first time seeing this species
      if (!forecastMap.has(speciesCode)) {
        forecastMap.set(speciesCode, new Array(7).fill(0));
      }

      // Set confidence for this day
      const forecast = forecastMap.get(speciesCode)!;
      forecast[dayIndex] = confidence;
    });
  });

  return forecastMap;
}

export function use7DayFishingPredictions(options: Use7DayPredictionsOptions): Use7DayPredictionsState {
  const {
    rectangleCode,
    startDate,
    language = DEFAULT_LANGUAGE,
    enabled = true,
    latitude,
    longitude,
  } = options;

  const today = new Date().toISOString().split('T')[0];
  const effectiveStartDate = startDate || today;

  const {
    data: forecastsBySpecies,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['fishingPredictions7Day', rectangleCode, effectiveStartDate, language, latitude, longitude],
    queryFn: async () => {
      if (!rectangleCode) {
        return new Map<string, number[]>();
      }

      return fetch7DayPredictions({
        rectangleCode,
        startDate: effectiveStartDate,
        language,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
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
