/**
 * /api/grow/marketplace/seeds
 *
 * API endpoint for seed swap marketplace.
 * Users can list seeds to swap and find nearby listings.
 *
 * GET: Search for seed listings (nearby or by plant)
 * POST: Create a new seed listing
 * PATCH: Update a listing
 * DELETE: Cancel a listing
 *
 * @module pages/api/grow/marketplace/seeds
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

interface CreateListingRequest {
  plantName: string;
  plantSlug?: string;
  variety?: string;
  quantity: string;
  yearHarvested?: number;
  description?: string;
  exchangeFor?: string[];
  isFree?: boolean;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  radiusKm?: number;
  photoUrls?: string[];
}

interface UpdateListingRequest {
  id: string;
  quantity?: string;
  description?: string;
  exchangeFor?: string[];
  isFree?: boolean;
  status?: 'active' | 'reserved' | 'completed' | 'cancelled';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Authenticate user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  // GET - Search seed listings
  if (req.method === 'GET') {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lon = parseFloat(req.query.lon as string);
      const radiusKm = parseFloat(req.query.radius as string) || 50;
      const plantFilter = req.query.plant as string;
      const myListings = req.query.mine === 'true';

      // If requesting own listings
      if (myListings) {
        const { data: listings, error } = await supabase
          .from('grow_seed_listings')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Seeds API] Error fetching my listings:', error);
          return res.status(500).json({ error: 'Failed to fetch listings' });
        }

        return res.status(200).json({ listings: listings || [] });
      }

      // Search nearby listings
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({
          error: 'Latitude and longitude are required for search',
        });
      }

      const { data: listings, error } = await supabase.rpc('grow_find_nearby_seeds', {
        user_lat: lat,
        user_lon: lon,
        radius_km: radiusKm,
        plant_filter: plantFilter || null,
      });

      if (error) {
        console.error('[Seeds API] Error searching:', error);
        return res.status(500).json({ error: 'Failed to search listings' });
      }

      // Filter out user's own listings from search results
      const filteredListings = (listings || []).filter(
        (l: { user_id: string }) => l.user_id !== userId
      );

      return res.status(200).json({
        listings: filteredListings,
        searchParams: { lat, lon, radiusKm, plantFilter },
      });
    } catch (error) {
      console.error('[Seeds API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Create a new listing
  if (req.method === 'POST') {
    const body = req.body as CreateListingRequest;

    if (!body.plantName || !body.quantity) {
      return res.status(400).json({
        error: 'plantName and quantity are required',
      });
    }

    try {
      // Get user's location from preferences if not provided
      let lat = body.latitude;
      let lon = body.longitude;
      let locationName = body.locationName;

      if (!lat || !lon) {
        const { data: prefs } = await supabase
          .from('grow_user_preferences')
          .select('latitude, longitude, location_name')
          .eq('user_id', userId)
          .single();

        if (prefs) {
          lat = lat || prefs.latitude;
          lon = lon || prefs.longitude;
          locationName = locationName || prefs.location_name;
        }
      }

      if (!lat || !lon) {
        return res.status(400).json({
          error: 'Location is required. Set your garden location in settings or provide coordinates.',
        });
      }

      const { data: listing, error } = await supabase
        .from('grow_seed_listings')
        .insert({
          user_id: userId,
          plant_name: body.plantName,
          plant_slug: body.plantSlug,
          variety: body.variety,
          quantity: body.quantity,
          year_harvested: body.yearHarvested,
          description: body.description,
          exchange_for: body.exchangeFor,
          is_free: body.isFree || false,
          latitude: lat,
          longitude: lon,
          location_name: locationName,
          radius_km: body.radiusKm || 50,
          photo_urls: body.photoUrls,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('[Seeds API] Error creating listing:', error);
        return res.status(500).json({ error: 'Failed to create listing' });
      }

      return res.status(201).json({
        success: true,
        listing,
      });
    } catch (error) {
      console.error('[Seeds API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH - Update a listing
  if (req.method === 'PATCH') {
    const body = req.body as UpdateListingRequest;

    if (!body.id) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }

    try {
      // Verify ownership
      const { data: existing } = await supabase
        .from('grow_seed_listings')
        .select('user_id')
        .eq('id', body.id)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this listing' });
      }

      const updates: Record<string, unknown> = {};
      if (body.quantity !== undefined) updates.quantity = body.quantity;
      if (body.description !== undefined) updates.description = body.description;
      if (body.exchangeFor !== undefined) updates.exchange_for = body.exchangeFor;
      if (body.isFree !== undefined) updates.is_free = body.isFree;
      if (body.status !== undefined) updates.status = body.status;

      const { data: listing, error } = await supabase
        .from('grow_seed_listings')
        .update(updates)
        .eq('id', body.id)
        .select()
        .single();

      if (error) {
        console.error('[Seeds API] Error updating listing:', error);
        return res.status(500).json({ error: 'Failed to update listing' });
      }

      return res.status(200).json({
        success: true,
        listing,
      });
    } catch (error) {
      console.error('[Seeds API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // DELETE - Cancel a listing
  if (req.method === 'DELETE') {
    const listingId = req.query.id as string;

    if (!listingId) {
      return res.status(400).json({ error: 'Listing ID is required' });
    }

    try {
      // Verify ownership
      const { data: existing } = await supabase
        .from('grow_seed_listings')
        .select('user_id')
        .eq('id', listingId)
        .single();

      if (!existing || existing.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this listing' });
      }

      // Soft delete by marking as cancelled
      const { error } = await supabase
        .from('grow_seed_listings')
        .update({ status: 'cancelled' })
        .eq('id', listingId);

      if (error) {
        console.error('[Seeds API] Error cancelling listing:', error);
        return res.status(500).json({ error: 'Failed to cancel listing' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Seeds API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
