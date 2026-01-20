/**
 * /api/grow/marketplace/nurseries
 *
 * API endpoint for discovering local nurseries.
 * Find nurseries near the user's location with specialty filtering.
 *
 * GET: Search for nurseries by location and/or specialty
 *
 * @module pages/api/grow/marketplace/nurseries
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface NurseryResult {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  website: string | null;
  specialties: string[] | null;
  rating_avg: number | null;
  distance_km: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate user (optional for nursery search)
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    userId = user?.id || null;
  }

  try {
    // Parse query params
    let lat = parseFloat(req.query.lat as string);
    let lon = parseFloat(req.query.lon as string);
    const radiusKm = parseFloat(req.query.radius as string) || 30;
    const specialty = req.query.specialty as string;
    const limit = parseInt(req.query.limit as string) || 30;

    // If no coordinates provided and user is authenticated, try to get from preferences
    if ((!lat || !lon || isNaN(lat) || isNaN(lon)) && userId) {
      const { data: prefs } = await supabase
        .from('grow_user_preferences')
        .select('latitude, longitude')
        .eq('user_id', userId)
        .single();

      if (prefs?.latitude && prefs?.longitude) {
        lat = prefs.latitude;
        lon = prefs.longitude;
      }
    }

    // Location is required for nursery search
    if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        error: 'Location is required',
        message: 'Provide lat/lon parameters or set your garden location in settings.',
      });
    }

    // Use RPC function for efficient geospatial search
    const { data: nurseries, error } = await supabase.rpc('grow_find_nearby_nurseries', {
      user_lat: lat,
      user_lon: lon,
      radius_km: radiusKm,
      specialty_filter: specialty || null,
    });

    if (error) {
      console.error('[Nurseries API] Error searching:', error);
      return res.status(500).json({ error: 'Failed to search nurseries' });
    }

    // Limit results
    const limitedResults = (nurseries as NurseryResult[] || []).slice(0, limit);

    // Get inventory for each nursery if requested
    const includeInventory = req.query.includeInventory === 'true';
    const plantFilter = req.query.plant as string;

    if (includeInventory && limitedResults.length > 0) {
      const nurseryIds = limitedResults.map(n => n.id);

      let inventoryQuery = supabase
        .from('grow_nursery_inventory')
        .select('nursery_id, plant_name, plant_slug, category, size, price_cents, currency, in_stock')
        .in('nursery_id', nurseryIds)
        .eq('in_stock', true);

      if (plantFilter) {
        inventoryQuery = inventoryQuery.or(
          `plant_slug.ilike.%${plantFilter}%,plant_name.ilike.%${plantFilter}%`
        );
      }

      const { data: inventory } = await inventoryQuery.limit(100);

      // Group inventory by nursery
      const inventoryByNursery = new Map<string, typeof inventory>();
      for (const item of inventory || []) {
        const existing = inventoryByNursery.get(item.nursery_id) || [];
        existing.push(item);
        inventoryByNursery.set(item.nursery_id, existing);
      }

      // Attach inventory to nurseries
      const nurseriesWithInventory = limitedResults.map(n => ({
        ...n,
        inventory: inventoryByNursery.get(n.id) || [],
      }));

      return res.status(200).json({
        nurseries: nurseriesWithInventory,
        searchParams: { lat, lon, radiusKm, specialty, plantFilter },
        total: nurseriesWithInventory.length,
      });
    }

    return res.status(200).json({
      nurseries: limitedResults,
      searchParams: { lat, lon, radiusKm, specialty },
      total: limitedResults.length,
    });
  } catch (error) {
    console.error('[Nurseries API] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
