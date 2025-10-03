'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export interface FishingPrediction {
  [key: string]: JsonValue | undefined;
  species_id?: string;
  species_common_name?: string;
  confidence?: number;
  rationale?: JsonValue;
}

export interface UseFishingPredictionsOptions {
  rectangleCode?: string | null;
  predictionDate?: string | null;
  language?: string;
  enabled?: boolean;
}

export interface UseFishingPredictionsState {
  predictions: FishingPrediction[] | null;
  loading: boolean;
  error: string | null;
  lastUpdated?: string;
  reload: () => void;
}

interface PredictionResponse {
  rectangleCode: string;
  predictionDate: string;
  language: string;
  predictions: FishingPrediction[];
  metadata?: {
    requestedAt?: string;
  };
}

const DEFAULT_LANGUAGE = 'en';

export function useFishingPredictions(options: UseFishingPredictionsOptions): UseFishingPredictionsState {
  const { rectangleCode, predictionDate, language = DEFAULT_LANGUAGE, enabled = true } = options;
  const [predictions, setPredictions] = useState<FishingPrediction[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  const params = useMemo(() => {
    if (!rectangleCode || !enabled) return null;
    return {
      rectangleCode,
      predictionDate: predictionDate || undefined,
      language,
    };
  }, [rectangleCode, predictionDate, language, enabled]);

  const fetchPredictions = useCallback(async () => {
    if (!params) {
      setPredictions(null);
      setError(null);
      setLastUpdated(undefined);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    try {
      // Use absolute URL for fishfindr.eu to avoid redirect issues
      const apiUrl = typeof window !== 'undefined' && window.location.hostname === 'fishfindr.eu' 
        ? 'https://www.fishfindr.eu/api/findr/predictions'
        : '/api/findr/predictions';
        
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) {
        controller.abort();
        return;
      }

      const json = await response.json();

      if (!response.ok) {
        const errMessage = typeof json?.error === 'string'
          ? json.error
          : json?.details?.message || 'Failed to load fishing predictions';
        throw new Error(errMessage);
      }

      const typed = json as PredictionResponse;
      console.log('[useFishingPredictions] Response:', {
        rectangleCode: typed.rectangleCode,
        predictionDate: typed.predictionDate,
        predictionsCount: Array.isArray(typed.predictions) ? typed.predictions.length : 0,
        firstPrediction: Array.isArray(typed.predictions) && typed.predictions.length > 0 ? typed.predictions[0] : null,
      });
      setPredictions(Array.isArray(typed.predictions) ? typed.predictions : []);
      setLastUpdated(typed.metadata?.requestedAt);
      setError(null);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }
      setError((err as Error).message || 'Unexpected error fetching fishing predictions');
      setPredictions(null);
      setLastUpdated(undefined);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    fetchPredictions();
    return () => {
      requestIdRef.current += 1;
    };
  }, [fetchPredictions]);

  return {
    predictions,
    loading,
    error,
    lastUpdated,
    reload: fetchPredictions,
  };
}
