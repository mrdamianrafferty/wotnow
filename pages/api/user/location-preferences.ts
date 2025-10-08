// pages/api/user/location-preferences.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { LocationPreferences } from '../../../hooks/useLocationConsent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServerClient();

  // Check authentication
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  try {
    switch (req.method) {
      case 'GET':
        return await getLocationPreferences(supabase, userId, res);
      case 'POST':
        return await saveLocationPreferences(supabase, userId, req.body, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Location preferences API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getLocationPreferences(supabase: ReturnType<typeof getSupabaseServerClient>, userId: string, res: NextApiResponse) {
  const { data, error } = await supabase
    .from('user_location_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No preferences found - return default
      return res.status(200).json(null);
    }
    throw error;
  }

  // Transform database format to frontend format
  const preferences: LocationPreferences = {
    preferredRectangles: data.preferred_rectangles || [],
    homeRegion: data.home_region || '',
    maxDistance: data.max_distance || 50,
    shareGPS: data.share_gps || false,
    shareCourse: data.share_course || true,
    autoDetect: data.auto_detect || false,
    lastUpdated: data.updated_at || data.created_at,
    source: data.location_source || 'manual'
  };

  return res.status(200).json(preferences);
}

async function saveLocationPreferences(supabase: ReturnType<typeof getSupabaseServerClient>, userId: string, preferences: LocationPreferences, res: NextApiResponse) {
  // Transform frontend format to database format
  const dbData = {
    user_id: userId,
    preferred_rectangles: preferences.preferredRectangles,
    home_region: preferences.homeRegion,
    max_distance: preferences.maxDistance,
    share_gps: preferences.shareGPS,
    share_course: preferences.shareCourse,
    auto_detect: preferences.autoDetect,
    location_source: preferences.source,
    updated_at: new Date().toISOString()
  };

  // Use upsert to insert or update
  const { data, error } = await supabase
    .from('user_location_preferences')
    .upsert(dbData, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return res.status(200).json({ success: true, data });
}