"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type LocationSource = 'manual' | 'gps' | 'ip' | 'unknown';

/**
 * Represents the active fishing location used across both Findr and Go Daisy surfaces.
 * In the future we may extend this into a collection to support multiple saved locations.
 */
export interface UnifiedLocationRecord {
  lat: number | null;
  lon: number | null;
  rectangleCode: string | null;
  rectangleRegion: string | null;
  rectangleLabel: string | null;
  source: LocationSource;
  accuracy: number | null;
  updatedAt: string;
  pendingSync?: boolean;
}

export interface UpdateLocationInput {
  coordinates?: { lat: number; lon: number };
  rectangleCode?: string | null;
  rectangleRegion?: string | null;
  rectangleLabel?: string | null;
  source?: LocationSource;
  accuracy?: number | null;
  resolveRectangle?: boolean;
}

interface UnifiedLocationContextValue {
  location: UnifiedLocationRecord | null;
  loading: boolean;
  syncing: boolean;
  lastError: string | null;
  updateLocation: (input: UpdateLocationInput) => Promise<UnifiedLocationRecord | null>;
  clearLocation: () => Promise<void>;
  refreshRemote: () => Promise<void>;
}

const UnifiedLocationContext = createContext<UnifiedLocationContextValue | null>(null);

const STORAGE_KEY = 'findr.location';

function readStoredLocation(): UnifiedLocationRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnifiedLocationRecord;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      lat: typeof parsed.lat === 'number' ? parsed.lat : null,
      lon: typeof parsed.lon === 'number' ? parsed.lon : null,
      rectangleCode: typeof parsed.rectangleCode === 'string' ? parsed.rectangleCode : null,
      rectangleRegion: typeof parsed.rectangleRegion === 'string' ? parsed.rectangleRegion : null,
      rectangleLabel: typeof parsed.rectangleLabel === 'string' ? parsed.rectangleLabel : null,
      source: parsed.source ?? 'unknown',
      accuracy: typeof parsed.accuracy === 'number' ? parsed.accuracy : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      pendingSync: Boolean(parsed.pendingSync),
    };
  } catch (error) {
    console.warn('[UnifiedLocation] Failed to read stored location', error);
    return null;
  }
}

function persistLocation(record: UnifiedLocationRecord | null) {
  if (typeof window === 'undefined') return;
  if (!record) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (error) {
    console.warn('[UnifiedLocation] Failed to persist location', error);
  }
}

async function fetchRectangleMetadata(lat: number, lon: number) {
  try {
    const query = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    const res = await fetch(`/api/findr/rectangle-lookup?${query.toString()}`);
    if (!res.ok) {
      const msg = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(msg?.error || `Rectangle lookup failed (${res.status})`);
    }
    return (await res.json()) as {
      rectangleCode: string;
      region: string;
      centerLat: number;
      centerLon: number;
      distance?: number;
    };
  } catch (error) {
    console.warn('[UnifiedLocation] Failed to resolve rectangle metadata', error);
    throw error;
  }
}

type RemoteUpsertResult =
  | { ok: true; location: UnifiedLocationRecord | null }
  | { ok: false; reason: 'unauthorized' };

async function upsertRemoteLocation(record: UnifiedLocationRecord): Promise<RemoteUpsertResult> {
  const res = await fetch('/api/user/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });

  if (res.status === 401) {
    return { ok: false, reason: 'unauthorized' };
  }

  if (!res.ok) {
    const message = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(message?.error || `Remote location write failed (${res.status})`);
  }

  const payload = (await res.json().catch(() => ({}))) as { location?: UnifiedLocationRecord | null };
  return {
    ok: true,
    location: payload?.location ?? null,
  };
}

async function loadRemoteLocation(): Promise<UnifiedLocationRecord | null> {
  try {
    const res = await fetch('/api/user/location', { method: 'GET' });
    if (res.status === 401) {
      return null;
    }

    if (!res.ok) {
      return null;
    }
    const payload = (await res.json()) as { location?: UnifiedLocationRecord | null } | UnifiedLocationRecord | null;
    if (payload === null) return null;
    if ('location' in (payload as Record<string, unknown>)) {
      const candidate = (payload as { location?: UnifiedLocationRecord | null }).location ?? null;
      if (!candidate) return null;
      return candidate;
    }
    return payload as UnifiedLocationRecord;
  } catch (error) {
    console.warn('[UnifiedLocation] Remote lookup failed', error);
    return null;
  }
}

export function UnifiedLocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<UnifiedLocationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  // NOTE: Go Daisy currently keeps separate home/coastal waypoints inside UserPreferencesContext.
  // When we converge the two flows this provider can expose named slots or a collection.

  useEffect(() => {
    if (hasLoaded.current) return;
    const stored = readStoredLocation();
    if (stored) {
      setLocation(stored);
    }

    hasLoaded.current = true;
    setLoading(false);

    // Resolve remote copy asynchronously (do not block hydration)
    void (async () => {
      const remote = await loadRemoteLocation();
      if (remote) {
        setLocation(remote);
        persistLocation(remote);
      }
    })();
  }, []);

  const refreshRemote = useCallback(async () => {
    const remote = await loadRemoteLocation();
    if (remote) {
      setLocation(remote);
      persistLocation(remote);
    }
  }, []);

  const clearLocation = useCallback(async () => {
    setLocation(null);
    persistLocation(null);
    setLastError(null);
    try {
      await fetch('/api/user/location', { method: 'DELETE' });
    } catch (error) {
      console.warn('[UnifiedLocation] Remote clear failed', error);
    }
  }, []);

  const updateLocation = useCallback(
    async (input: UpdateLocationInput): Promise<UnifiedLocationRecord | null> => {
      if (!input.coordinates && !location?.lat && !location?.lon) {
        setLastError('Cannot update location without coordinates');
        return null;
      }

      setSyncing(true);
      setLastError(null);

      try {
        let nextLat = input.coordinates?.lat ?? location?.lat ?? null;
        let nextLon = input.coordinates?.lon ?? location?.lon ?? null;
        let nextRectangleCode = input.rectangleCode ?? location?.rectangleCode ?? null;
        let nextRectangleRegion = input.rectangleRegion ?? location?.rectangleRegion ?? null;
        let nextRectangleLabel = input.rectangleLabel ?? location?.rectangleLabel ?? null;

        // Only resolve ICES rectangle if explicitly requested (for European waters)
        // For non-European waters, allow locations without rectangleCode
        if (input.resolveRectangle && nextLat != null && nextLon != null) {
          try {
            const metadata = await fetchRectangleMetadata(nextLat, nextLon);
            nextRectangleCode = metadata.rectangleCode;
            nextRectangleRegion = metadata.region;
            if (!nextRectangleLabel) {
              nextRectangleLabel = `${metadata.rectangleCode} - ${metadata.region}`;
            }
            // Align coordinates with rectangle anchor for consistency (European waters only)
            nextLat = metadata.centerLat;
            nextLon = metadata.centerLon;
          } catch (_resolveError) {
            // Rectangle resolution failed (likely non-European location)
            // Keep original coordinates and continue without rectangleCode
            console.info('[UnifiedLocation] Rectangle resolution unavailable, using raw coordinates');
          }
        }

        const record: UnifiedLocationRecord = {
          lat: nextLat,
          lon: nextLon,
          rectangleCode: nextRectangleCode ?? null,
          rectangleRegion: nextRectangleRegion ?? null,
          rectangleLabel: nextRectangleLabel ?? null,
          source: input.source ?? location?.source ?? 'unknown',
          accuracy: input.accuracy ?? location?.accuracy ?? null,
          updatedAt: new Date().toISOString(),
        };

        // Optimistic local update
        const optimistic: UnifiedLocationRecord = { ...record, pendingSync: true };
        setLocation(optimistic);
        persistLocation(optimistic);

        try {
          const remoteResult = await upsertRemoteLocation(record);
          if (remoteResult.ok) {
            const remoteRecord = remoteResult.location ?? record;
            const synced: UnifiedLocationRecord = { ...remoteRecord, pendingSync: false };
            setLocation(synced);
            persistLocation(synced);
            return synced;
          }

          // Unauthorized: keep optimistic record but report info
          setLastError('Sign in to sync your location across devices.');
          return optimistic;
        } catch (error) {
          console.warn('[UnifiedLocation] Remote sync failed', error);
          setLastError((error as Error).message);
          const failed: UnifiedLocationRecord = { ...record, pendingSync: true };
          setLocation(failed);
          persistLocation(failed);
          return failed;
        }
      } finally {
        setSyncing(false);
      }
    },
    [location]
  );

  const value = useMemo<UnifiedLocationContextValue>(
    () => ({
      location,
      loading,
      syncing,
      lastError,
      updateLocation,
      clearLocation,
      refreshRemote,
    }),
    [clearLocation, lastError, location, loading, refreshRemote, syncing, updateLocation]
  );

  return (
    <UnifiedLocationContext.Provider value={value}>
      {children}
    </UnifiedLocationContext.Provider>
  );
}

export function useUnifiedLocation(): UnifiedLocationContextValue {
  const ctx = useContext(UnifiedLocationContext);
  if (!ctx) {
    throw new Error('useUnifiedLocation must be used within a UnifiedLocationProvider');
  }
  return ctx;
}
