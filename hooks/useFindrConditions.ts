import { useCallback, useEffect, useMemo, useState } from 'react';
import { FALLBACK_CONDITIONS, type FallbackConditionPayload } from '../lib/findr/fallbackConditions';

export type ConditionsSource = 'supabase' | 'fallback';

interface ApiResponse extends FallbackConditionPayload {
  source?: ConditionsSource;
}

export interface UseFindrConditionsState {
  data: FallbackConditionPayload;
  loading: boolean;
  error: string | null;
  source: ConditionsSource;
  reload: () => void;
}

export function useFindrConditions(rectangleCode?: string | null): UseFindrConditionsState {
  const [data, setData] = useState<FallbackConditionPayload>(FALLBACK_CONDITIONS);
  const [source, setSource] = useState<ConditionsSource>('fallback');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const safeCode = rectangleCode?.trim();
    if (!safeCode) {
      setData(FALLBACK_CONDITIONS);
      setSource('fallback');
      setError(null);
      setLoading(false);
      return;
    }

  const controller = new AbortController();
  const rectangleCodeSafe = safeCode;
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
  const res = await fetch(`/api/findr/conditions?rectangleCode=${encodeURIComponent(rectangleCodeSafe)}`, {
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
        console.error('[Findr Conditions] Failed to load live conditions, falling back to static payload', {
          rectangleCode: rectangleCodeSafe,
          message: (err as Error).message,
        });
        setData(FALLBACK_CONDITIONS);
        setSource('fallback');
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
  }, [rectangleCode, reloadCount]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      source,
      reload,
    }),
    [data, loading, error, source, reload]
  );
}
