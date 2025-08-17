// /src/hooks/useCoastalOrientation.ts
import { useEffect, useState } from 'react';
import { getCachedOrientation, setCachedOrientation } from '../utils/coastOrientationCache';

type Result = { orientation?: number; loading: boolean; error?: string; source: 'cache' | 'live' | 'none' };

export function useCoastalOrientation(coast?: { lat: number; lon: number }): Result {
  const [state, setState] = useState<Result>({ loading: false, source: 'none' });

  useEffect(() => {
    if (!coast?.lat || !coast?.lon) { setState({ loading: false, source: 'none' }); return; }

    const cached = getCachedOrientation(coast.lat, coast.lon);
    if (typeof cached === 'number') {
      setState({ orientation: cached, loading: false, source: 'cache' });
      return;
    }

    let cancelled = false;
    (async () => {
      setState({ loading: true, source: 'none' });
      try {
        const qs = new URLSearchParams({ lat: String(coast.lat), lon: String(coast.lon) });
        const r = await fetch(`/api/osm-orientation?${qs.toString()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (cancelled) return;
        if (typeof j.orientation === 'number') {
          setCachedOrientation(coast.lat, coast.lon, j.orientation);
          setState({ orientation: j.orientation, loading: false, source: 'live' });
        } else {
          setState({ loading: false, source: 'none', error: 'No orientation found' });
        }
      } catch (e: any) {
        if (!cancelled) setState({ loading: false, source: 'none', error: e?.message || 'Failed to fetch orientation' });
      }
    })();

    return () => { cancelled = true; };
  }, [coast?.lat, coast?.lon]);

  return state;
}