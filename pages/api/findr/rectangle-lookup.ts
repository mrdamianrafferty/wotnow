import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

interface RectangleLookupResponse {
  rectangleCode: string;
  region: string;
  centerLat: number;
  centerLon: number;
  distance?: number; // Distance in km if not exact match
}

/**
 * Find the ICES rectangle that contains or is nearest to the given coordinates
 * 
 * Query params:
 * - lat: Latitude (-90 to 90)
 * - lon: Longitude (-180 to 180)
 * 
 * Returns:
 * - rectangleCode: ICES rectangle code (e.g., "21D8")
 * - region: Human-readable region name
 * - centerLat/centerLon: Rectangle center coordinates
 * - distance: Distance from input point to rectangle center (if not exact match)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RectangleLookupResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Invalid coordinates. Provide ?lat=X&lon=Y' });
  }

  if (lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude must be between -90 and 90' });
  }

  if (lon < -180 || lon > 180) {
    return res.status(400).json({ error: 'Longitude must be between -180 and 180' });
  }

  try {
    const supabase = getSupabaseServerClient();

    // Try to find rectangle that contains the exact point
    // ICES rectangles are 0.5° lat × 1° lon (or 1° × 2° in some areas)
    const { data: exact, error: exactError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon, lat_south, lat_north, lon_west, lon_east')
      .lte('lat_south', lat)
      .gte('lat_north', lat)
      .lte('lon_west', lon)
      .gte('lon_east', lon)
      .limit(1)
      .maybeSingle();

    if (exact && !exactError) {
      return res.status(200).json({
        rectangleCode: exact.rectangle_code,
        region: exact.region || exact.rectangle_code,
        centerLat: Number(exact.center_lat),
        centerLon: Number(exact.center_lon),
        distance: 0,
      });
    }

    // If no exact match, find nearest rectangle by center distance
    // Get all coastal rectangles (limit to reasonable number)
    const { data: all, error: allError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon')
      .eq('is_coastal', true)
      .limit(200);

    if (allError || !all || all.length === 0) {
      console.error('[rectangle-lookup] Failed to load rectangles:', allError);
      return res.status(500).json({ error: 'Failed to find fishing areas' });
    }

    // Calculate haversine distance to each rectangle center
    const distances = all
      .map((rect) => {
        const rectLat = Number(rect.center_lat);
        const rectLon = Number(rect.center_lon);

        if (!Number.isFinite(rectLat) || !Number.isFinite(rectLon)) {
          return null;
        }

        const distance = haversineDistance(lat, lon, rectLat, rectLon);

        return {
          rectangleCode: rect.rectangle_code,
          region: rect.region || rect.rectangle_code,
          centerLat: rectLat,
          centerLon: rectLon,
          distance,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.distance - b.distance);

    if (distances.length === 0) {
      return res.status(404).json({ error: 'No fishing areas found near this location' });
    }

    const nearest = distances[0];

    // If distance > 1000km, this is not a European location - reject it
    // This prevents San Francisco from mapping to Scotland (37G6, 7763km away)
    if (nearest.distance > 1000) {
      console.log('[rectangle-lookup] Location too far from any ICES rectangle:', {
        lat,
        lon,
        nearest: nearest.rectangleCode,
        distance: nearest.distance,
      });
      return res.status(404).json({ error: 'No ICES fishing areas near this location. This appears to be outside European waters.' });
    }

    // If distance > 100km, warn that it's far from rectangle center
    if (nearest.distance > 100) {
      console.warn('[rectangle-lookup] Somewhat far from rectangle center:', {
        lat,
        lon,
        nearest: nearest.rectangleCode,
        distance: nearest.distance,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(nearest);
  } catch (error) {
    console.error('[rectangle-lookup] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
