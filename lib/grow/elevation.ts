/**
Elevation Utilities

Helpers for fetching and storing elevation data from Google Maps Elevation API.
Elevation is used to improve climate zone detection (especially for mountain zones).
 */

/**
Bucket coordinates to a fixed number of decimal places for cache stability.
This helps reduce API calls by grouping nearby coordinates.

@param value - Coordinate value (latitude or longitude)
@param decimals - Number of decimal places (default: 2 ≈ 1km precision)
@returns Bucketed coordinate value
 */
export function bucketCoord(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
Round elevation to nearest 10m for storage stability and honest precision.
GPS elevation and API results can be noisy, so we round to avoid false precision.

@param rawElevation - Raw elevation in meters
@returns Rounded elevation in meters (nearest 10m)
 */
export function roundElevationForStorage(rawElevation: number): number {
  return Math.round(rawElevation / 10) * 10;
}

/**
Fetch elevation from Google Maps Elevation API.
Requires GOOGLE_MAPS_API_KEY environment variable.

@param lat - Latitude
@param lon - Longitude
@returns Elevation in meters (rounded to nearest 10m), or null if error
 */
export async function getElevationFromGoogle(
  lat: number,
  lon: number
): Promise<number | null> {
  // Try server-only key first, fall back to public key
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error('❌ GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set - cannot fetch elevation');
    return null;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  url.searchParams.set('locations', `${lat},${lon}`);
  url.searchParams.set('key', key);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error('❌ Elevation API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json() as {
      results?: { elevation: number }[];
      status?: string;
      error_message?: string;
    };

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('⚠️ Elevation API non-OK response:', data.status, data.error_message);
      return null;
    }

    const rawElevation = data.results[0].elevation;
    const rounded = roundElevationForStorage(rawElevation);
    
    console.log(`✅ Elevation fetched: ${rawElevation.toFixed(1)}m → ${rounded}m (rounded)`);
    return rounded;
  } catch (error: unknown) {
    // ⚠️ FIX NEEDED: Replace 'any' with 'unknown'
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Elevation API fetch error:', message);
    return null;
  }
}

/**
Get cached bucketed key for coordinate pair.
Use this to check if elevation has already been fetched for nearby coordinates.

@param lat - Latitude
@param lon - Longitude
@returns Cache key string
 */
export function getElevationCacheKey(lat: number, lon: number): string {
  const bucketedLat = bucketCoord(lat);
  const bucketedLon = bucketCoord(lon);
  return `elevation:${bucketedLat},${bucketedLon}`;
}
