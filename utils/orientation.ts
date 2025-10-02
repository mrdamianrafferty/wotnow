/**
 * computeSimulatedOrientation
 * Returns a stable, deterministic bearing (0–359) derived from lat/lon.
 * Placeholder until real coastline analysis is implemented.
 * Interpreted as the beach’s seaward-facing normal.
 */
// ---- Orientation cache helpers (safe in browser, no-op on server) ----
const ORIENT_CACHE_KEY = 'wotnow.coast.orientation.v1';

// Guard for browser localStorage
const hasLocalStorage = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

import { roundCoord } from './coordinatePrecision';

/** Read cached orientation synchronously if available */
const getCachedOrientation = (lat?: number | null, lon?: number | null): number | undefined => {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon) || !hasLocalStorage()) return undefined;
  try {
    const raw = window.localStorage.getItem(ORIENT_CACHE_KEY);
    if (!raw) return undefined;
    const items: Array<{ lat: number; lon: number; orientation: number; updatedAt: number }>= JSON.parse(raw);
    const rLat = roundCoord(lat as number);
    const rLon = roundCoord(lon as number);
    const hit = items.find(i => i.lat === rLat && i.lon === rLon);
    return isFiniteNumber(hit?.orientation) ? norm360(hit!.orientation) : undefined;
  } catch {
    return undefined;
  }
};

/** Write orientation to cache (browser only). Safe to call on server (no-op). */
export const setOrientationCache = (lat: number, lon: number, orientation: number): void => {
  if (!hasLocalStorage() || !isFiniteNumber(lat) || !isFiniteNumber(lon) || !isFiniteNumber(orientation)) return;
  try {
    const raw = window.localStorage.getItem(ORIENT_CACHE_KEY);
    const items: Array<{ lat: number; lon: number; orientation: number; updatedAt: number }> = raw ? JSON.parse(raw) : [];
    const rLat = roundCoord(lat);
    const rLon = roundCoord(lon);
    const entry = { lat: rLat, lon: rLon, orientation: norm360(orientation), updatedAt: Date.now() };
    const idx = items.findIndex(i => i.lat === rLat && i.lon === rLon);
    if (idx >= 0) items[idx] = entry; else items.push(entry);
    window.localStorage.setItem(ORIENT_CACHE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
};

// Simple in-memory cache for server/runtime sessions
const memCache = new Map<string, number>();
const memKey = (lat: number, lon: number) => `${roundCoord(lat)}:${roundCoord(lon)}`;

export const computeSimulatedOrientation = (lat: number, lon: number): number => {
  // Derive a pseudo-bearing from position; deterministic for any lat/lon
  const angleDeg = (Math.atan2(lon, lat) * 180) / Math.PI;
  const bearing = (angleDeg + 360) % 360;
  // Snap to nearest 5° for nicer, stable values
  return (Math.round(bearing / 5) * 5) % 360;
};

const snap5 = (deg: number) => (Math.round(norm360(deg) / 5) * 5) % 360;

/** Normalise any degree value to 0–359 */
export const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

/** Signed smallest angular difference in degrees, range [-180, 180] */
export const signedDelta = (fromDeg: number, toDeg: number): number => {
  const d = norm360(fromDeg - toDeg);
  return d > 180 ? d - 360 : d;
};

/**
 * Classify wind relative to the beach orientation.
 * beachOrientation: bearing the beach faces out to sea (0–359)
 * windFromDeg: meteorological degrees (direction the wind is FROM, 0–359)
 */
export type WindRelative =
  | 'onshore'
  | 'side-onshore'
  | 'cross-shore'
  | 'side-offshore'
  | 'offshore';

export const classifyWindRelative = (
  beachOrientation: number,
  windFromDeg: number
): WindRelative => {
  const diff = signedDelta(windFromDeg, beachOrientation); // -180..180
  const abs = Math.abs(diff);

  // Thresholds (tune to taste)
  if (abs <= 35) return 'onshore';
  if (abs >= 145) return 'offshore';
  if (abs >= 65 && abs <= 115) return 'cross-shore';

  // Side-on vs side-off decided by whether the wind has an onshore component
  // cos(diff) > 0 => onshore component; < 0 => offshore component
  return Math.cos((diff * Math.PI) / 180) > 0 ? 'side-onshore' : 'side-offshore';
};

/**
 * Convenience score for suitability (-1 to +1) based on on/offshore component.
 * +1 = pure onshore, -1 = pure offshore, ~0 = pure cross-shore.
 */
export const onshoreComponentScore = (
  beachOrientation: number,
  windFromDeg: number
): number => {
  const diff = signedDelta(windFromDeg, beachOrientation);
  // Cosine projects wind onto the shore-normal axis.
  // Optionally soften extremes with a power curve.
  return Math.cos((Math.abs(diff) * Math.PI) / 180);
};

/** Simple type to explain where an orientation value came from */
export type OrientationSource = 'meta' | 'computed' | 'none';

/** Type guard for numbers that are not NaN/undefined/null */
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Fetch real coastline-based orientation from your API (Overpass-backed). */
const fetchOSMOrientation = async (
  lat?: number | null,
  lon?: number | null,
  opts?: { endpoint?: string; timeoutMs?: number }
): Promise<number | undefined> => {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return undefined;
  const endpoint = opts?.endpoint || '/api/osm-orientation';
  const timeoutMs = opts?.timeoutMs ?? 8000;

  // Server and browser both support global fetch in modern runtimes
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  if (controller) timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const qs = new URLSearchParams({ lat: String(lat), lon: String(lon) }).toString();
    const res = await fetch(`${endpoint}?${qs}`, { signal: controller?.signal });
    if (!res.ok) return undefined;
    const data = (await res.json().catch(() => undefined)) as { orientation?: number } | undefined;
    const o = data && isFiniteNumber(data.orientation) ? snap5(data.orientation as number) : undefined;
    return o;
  } catch {
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

/**
 * Resolve a beach orientation using (in order):
 *  1) An explicit beachOrientation (meta), if present
 *  2) A deterministic computed value from lat/lon (placeholder)
 *  3) None (undefined)
 *
 * Returns the orientation (0–359) and the source used. Optionally logs.
 */
export const resolveBeachOrientation = (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    log?: (label: string, data?: Record<string, unknown>) => void;
  }
): { orientation: number | undefined; source: OrientationSource } => {
  const { beachOrientation, lat, lon, log } = args;

  if (isFiniteNumber(beachOrientation)) {
    const o = norm360(beachOrientation as number);
    log?.('resolveBeachOrientation', { source: 'meta', orientation: o });
    return { orientation: o, source: 'meta' };
  }

  // NEW: try cached real value synchronously (browser) before simulating
  const cached = getCachedOrientation(lat, lon);
  if (isFiniteNumber(cached)) {
    const o = norm360(cached as number);
    log?.('resolveBeachOrientation', { source: 'computed', orientation: o, lat, lon, via: 'cache' });
    return { orientation: o, source: 'computed' };
  }

  if (isFiniteNumber(lat) && isFiniteNumber(lon)) {
    const o = computeSimulatedOrientation(lat as number, lon as number);
    log?.('resolveBeachOrientation', { source: 'computed', orientation: o, lat, lon, via: 'simulated' });
    return { orientation: o, source: 'computed' };
  }

  log?.('resolveBeachOrientation', { source: 'none' });
  return { orientation: undefined, source: 'none' };
};

/** Async resolver that prefers real OSM orientation; falls back to cache/simulated. */
export const resolveBeachOrientationAsync = async (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    log?: (label: string, data?: Record<string, unknown>) => void;
    endpoint?: string; // allow overriding API path
  }
): Promise<{ orientation: number | undefined; source: OrientationSource }> => {
  // First, try the sync resolver which covers explicit meta + cache + simulated
  const base = resolveBeachOrientation(args);
  if (base.source === 'meta') return base; // explicit wins

  // If we already have a cached/simulated value but want to try OSM, attempt fetch
  const { lat, lon, log } = args;
  if (!isFiniteNumber(lat) || !isFiniteNumber(lon)) return base;

  // In-memory cache check (server/runtime)
  const key = memKey(lat as number, lon as number);
  if (memCache.has(key)) {
    const o = memCache.get(key)!;
    log?.('resolveBeachOrientationAsync', { source: 'computed', orientation: o, lat, lon, via: 'mem' });
    return { orientation: o, source: 'computed' };
  }

  const fetched = await fetchOSMOrientation(lat as number, lon as number, { endpoint: args.endpoint });
  if (isFiniteNumber(fetched)) {
    const o = snap5(fetched as number);
    memCache.set(key, o);
    setOrientationCache(lat as number, lon as number, o);
    log?.('resolveBeachOrientationAsync', { source: 'computed', orientation: o, lat, lon, via: 'osm' });
    return { orientation: o, source: 'computed' };
  }

  // Fall back to whatever the sync resolver produced
  log?.('resolveBeachOrientationAsync', { source: base.source, orientation: base.orientation, lat, lon, via: 'fallback' });
  return base;
};

/**
 * Convenience helper: classify wind relative to the beach using
 * resolveBeachOrientation as a fallback.
 */
export const classifyRelativeWindWithFallback = (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    windFromDeg?: number | null; // meteorological degrees (wind FROM)
    log?: (label: string, data?: Record<string, unknown>) => void;
  }
): {
  windRelative: WindRelative | undefined;
  orientation: number | undefined;
  orientationSource: OrientationSource;
} => {
  const { windFromDeg, log, ...rest } = args;
  const { orientation, source } = resolveBeachOrientation({ ...rest, log });

  if (!isFiniteNumber(windFromDeg) || !isFiniteNumber(orientation)) {
    log?.('classifyRelativeWindWithFallback', {
      windRelative: undefined,
      orientation,
      orientationSource: source,
      windFromDeg,
    });
    return { windRelative: undefined, orientation, orientationSource: source };
  }

  const windRelative = classifyWindRelative(orientation as number, windFromDeg as number);
  log?.('classifyRelativeWindWithFallback', {
    windRelative,
    orientation,
    orientationSource: source,
    windFromDeg,
  });
  return { windRelative, orientation, orientationSource: source };
};

/** Async counterpart that uses resolveBeachOrientationAsync */
export const classifyRelativeWindWithFallbackAsync = async (
  args: {
    beachOrientation?: number | null;
    lat?: number | null;
    lon?: number | null;
    windFromDeg?: number | null;
    log?: (label: string, data?: Record<string, unknown>) => void;
    endpoint?: string;
  }
): Promise<{
  windRelative: WindRelative | undefined;
  orientation: number | undefined;
  orientationSource: OrientationSource;
}> => {
  const { windFromDeg, log, endpoint, ...rest } = args;
  const { orientation, source } = await resolveBeachOrientationAsync({ ...rest, endpoint, log });

  if (!isFiniteNumber(windFromDeg) || !isFiniteNumber(orientation)) {
    log?.('classifyRelativeWindWithFallbackAsync', {
      windRelative: undefined,
      orientation,
      orientationSource: source,
      windFromDeg,
    });
    return { windRelative: undefined, orientation, orientationSource: source };
  }

  const windRelative = classifyWindRelative(orientation as number, windFromDeg as number);
  log?.('classifyRelativeWindWithFallbackAsync', {
    windRelative,
    orientation,
    orientationSource: source,
    windFromDeg,
  });
  return { windRelative, orientation, orientationSource: source };
};