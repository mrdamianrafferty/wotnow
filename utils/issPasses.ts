// utils/issPasses.ts
// Client/server-safe helpers that call the /api/iss-visible route
// (No OpenWeather or Open Notify code here — that lives in the API route.)

export type NightWindow = { start: Date; end: Date };
export type VisibleIssPass = {
  risetime: Date;
  endtime: Date;
  durationSec: number;
  // Optional: bounds of the night window as Dates for UI/debugging
  nightWindow?: { start: Date; end: Date };
  source?: "open-notify" | "prediction";
};

export type GetOpts = {
  maxPerNight?: number;
  minGapMinutes?: number;
  darknessBufferSec?: number;
  nights?: number; // 2..7; default 4
  baseUrl?: string; // override for server-side calls (e.g., NEXT_PUBLIC_BASE_URL)
};

/**
 * Fetch visible ISS passes (best 1–2 per night by default) using our API route.
 * Works in both client and server contexts.
 */
export async function getBestLookUpTimes(
  lat: number,
  lon: number,
  opts: GetOpts = {}
): Promise<VisibleIssPass[]> {
  const {
    maxPerNight = 2,
    minGapMinutes = 45,
    darknessBufferSec = 1800,
    nights = 4,
    baseUrl,
  } = opts;

  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    bestOnly: "true",
    maxPerNight: String(maxPerNight),
    minGapMinutes: String(minGapMinutes),
    darknessBufferSec: String(darknessBufferSec),
    nights: String(nights),
  });

  const url = `${baseUrl ?? ""}/api/iss-visible?${q.toString()}`.replace(/\/$/, "");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ISS Visible API error: ${res.status}`);
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((p: any) => ({
    risetime: new Date(p.risetimeISO),
    endtime: new Date(p.endtimeISO),
    durationSec: Number(p.durationSec) || 0,
    nightWindow: p.nightWindow
      ? { start: new Date(p.nightWindow.startISO), end: new Date(p.nightWindow.endISO) }
      : undefined,
    source: p.source,
  }));
}

/**
 * Fetch all night-time passes (not just the best) for the configured nights.
 */
export async function getNightIssPasses(
  lat: number,
  lon: number,
  opts: GetOpts = {}
): Promise<VisibleIssPass[]> {
  const { darknessBufferSec = 1800, nights = 4, baseUrl } = opts;
  const q = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    bestOnly: "false",
    darknessBufferSec: String(darknessBufferSec),
    nights: String(nights),
  });
  const url = `${baseUrl ?? ""}/api/iss-visible?${q.toString()}`.replace(/\/$/, "");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ISS Visible API error: ${res.status}`);
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((p: any) => ({
    risetime: new Date(p.risetimeISO),
    endtime: new Date(p.endtimeISO),
    durationSec: Number(p.durationSec) || 0,
    nightWindow: p.nightWindow
      ? { start: new Date(p.nightWindow.startISO), end: new Date(p.nightWindow.endISO) }
      : undefined,
    source: p.source,
  }));
}

// Backwards-compat type alias for older code that expected an OpenWeatherDaily type
export type OpenWeatherDaily = { dt: number; sunrise: number; sunset: number };

// No-op shim for old imports — maintained for compatibility only
export function buildNightWindowsFromOpenWeatherDaily(_daily: OpenWeatherDaily[], _darknessBufferSec = 1800) {
  console.warn("buildNightWindowsFromOpenWeatherDaily is deprecated. Night windows are computed in /api/iss-visible.");
  return [] as { start: Date; end: Date }[];
}