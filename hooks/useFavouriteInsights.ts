import { useEffect, useMemo, useState } from 'react';

export interface FavouriteInsight {
  id: string;
  catches?: number | null;
  swipedDateLabel?: string | null;
  lastPerfectConditions?: string | null;
  recentActivity?: string | null;
  nextBestDay?: string | null;
  bestBait?: string | null;
  bestBaitSource?: 'supabase' | 'prediction' | 'mock' | null;
  seasonLabel?: string | null;
  recencyScore?: number | null;
}

export interface FavouriteInsightsState {
  insights: FavouriteInsight[];
  loading: boolean;
  error: string | null;
  source: 'supabase' | 'none' | 'fallback';
}

interface _ApiResponse {
  insights?: FavouriteInsight[];
  source?: 'supabase' | 'fallback' | null;
}

export function useFavouriteInsights(ids: string[]): FavouriteInsightsState {
  const [insights, setInsights] = useState<FavouriteInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'none' | 'fallback'>('none');

  const uniqueIds = useMemo(() => Array.from(new Set(ids)).filter((value) => value.trim().length > 0), [ids]);

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setInsights([]);
      setSource('none');
      setError(null);
      return;
    }

    let _active = true;
    const controller = new AbortController();

    async function fetchInsights() {
      setLoading(true);
      setError(null);

      // TODO: Disable API calls until findr auth is implemented
      // This prevents 502 errors when backend services aren't running
      console.info('[useFavouriteInsights] Skipping API call - findr authentication not yet implemented');
      setInsights([]);
      setSource('fallback');
      setError('Failed to load favourite insights');
      setLoading(false);
      return;

      // Original API call code (disabled until auth is ready)
      /*

      try {
        const response = await fetch('/api/findr/favourites-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: uniqueIds }),
          signal: controller.signal,
        });

        if (!active) return;

        if (response.status === 204) {
          setInsights([]);
          setSource('none');
          setError(null);
          return;
        }

        const payload = (await response.json()) as ApiResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload?.error || 'Failed to load favourite insights');
        }

        setInsights(Array.isArray(payload.insights) ? payload.insights : []);
        setSource(payload.source ?? 'none');
        setError(null);
      } catch (fetchError) {
        if (!active || (fetchError as Error).name === 'AbortError') {
          return;
        }
        setInsights([]);
        setSource('fallback');
        setError((fetchError as Error).message || 'Unable to load favourite insights');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
      */
    }

    void fetchInsights();

    return () => {
      _active = false;
      controller.abort();
    };
  }, [uniqueIds]);

  return {
    insights,
    loading,
    error,
    source,
  };
}
