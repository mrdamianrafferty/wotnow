// utils/issPasses.ts
// Client/server-safe helpers that call the /api/iss-next-night-pass route

export type NightWindow = { start: Date; end: Date };
export type VisibleIssPass = {
  risetime: Date;
  endtime: Date;
  durationSec: number;
  // Optional: bounds of the night window as Dates for UI/debugging
  nightWindow?: { start: Date; end: Date };
  source?: "n2yo" | "prediction";
  mag?: number;
  direction?: string;
  maxEl?: number;
};

export type GetOpts = {
  darknessBufferSec?: number;
  baseUrl?: string; // override for server-side calls (e.g., NEXT_PUBLIC_BASE_URL)
  sunsetISO?: string; // optional ISO string for sunset time
  nextSunriseISO?: string; // optional ISO string for next sunrise time
};

/**
 * Fetch next visible ISS pass during night using our API route.
 * Works in both client and server contexts.
 */
export async function getBestLookUpTimes(
  lat: number,
  lon: number,
  opts: GetOpts = {}
): Promise<VisibleIssPass[]> {
  const {
    darknessBufferSec = 1800,
    baseUrl,
    sunsetISO,
    nextSunriseISO
  } = opts;

  let url = `${baseUrl ?? ""}/api/iss-next-night-pass?lat=${lat}&lon=${lon}`;
  
  // Add optional parameters if provided
  if (sunsetISO) url += `&sunsetISO=${encodeURIComponent(sunsetISO)}`;
  if (nextSunriseISO) url += `&nextSunriseISO=${encodeURIComponent(nextSunriseISO)}`;
  if (darknessBufferSec) url += `&darknessBufferSec=${darknessBufferSec}`;
  
  url = url.replace(/\/$/, "");
  
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`ISS API error: ${res.status}`);
  
  const json = await res.json();
  if (!json.ok || !json.pass) return [];
  
  // Convert the API response to our expected format
  const pass = json.pass;
  const risetime = new Date(pass.risetime);
  const endtime = new Date(risetime.getTime() + (pass.duration * 1000));
  
  return [{
    risetime,
    endtime,
    durationSec: pass.duration,
    nightWindow: json.sunset && json.nextSunrise 
      ? { start: new Date(json.sunset), end: new Date(json.nextSunrise) }
      : undefined,
    source: "n2yo",
    mag: pass.mag,
    direction: pass.direction,
    maxEl: pass.maxEl
  }];
}

/**
 * Alias for getBestLookUpTimes for backwards compatibility
 * @deprecated Use getBestLookUpTimes instead
 */
export async function getNightIssPasses(
  lat: number,
  lon: number,
  opts: GetOpts = {}
): Promise<VisibleIssPass[]> {
  return getBestLookUpTimes(lat, lon, opts);
}

// Backwards-compat type alias for older code that expected an OpenWeatherDaily type
export type OpenWeatherDaily = { dt: number; sunrise: number; sunset: number };