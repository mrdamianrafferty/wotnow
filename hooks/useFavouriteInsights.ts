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

  // Create stable reference based on actual ID content, not array reference
  const idsKey = useMemo(() => {
    const unique = Array.from(new Set(ids)).filter((value) => value.trim().length > 0).sort();
    return unique.join(',');
  }, [ids]);

  const uniqueIds = useMemo(() => {
    if (!idsKey) return [];
    return idsKey.split(',');
  }, [idsKey]);

  useEffect(() => {
    if (uniqueIds.length === 0) {
      // Only update state if it's actually different
      setInsights((prev) => prev.length === 0 ? prev : []);
      setSource((prev) => prev === 'none' ? prev : 'none');
      setError((prev) => prev === null ? prev : null);
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
      setInsights((prev) => prev.length === 0 ? prev : []);
      setSource((prev) => prev === 'fallback' ? prev : 'fallback');
      setError((prev) => prev === 'Failed to load favourite insights' ? prev : 'Failed to load favourite insights');
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
    // Use idsKey instead of uniqueIds to prevent infinite loops from array reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return {
    insights,
    loading,
    error,
    source,
  };
}
