import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/server';

/**
 * Findr User Settings API
 *
 * GET: Retrieve user settings (preferences, locations, profile)
 * PATCH: Update user settings
 *
 * This endpoint aggregates data from:
 * - findr_user_preferences
 * - user_location_preferences
 * - auth.users (email)
 */

export interface FindrUserSettings {
  // Profile
  displayName: string | null;
  email: string | null;

  // Species preferences
  speciesNamingPreference: 'common' | 'scientific' | 'both';

  // Fishing style
  hasBoat: boolean;
  fishingTechniques: string[];
  favoriteHabitats: string[];

  // Locations
  homeLocation: { lat: number; lon: number; name?: string } | null;
  fishingLocation: { lat: number; lon: number; name?: string } | null;

  // Additional preferences
  preferencesJson: Record<string, unknown>;

  // Metadata
  updatedAt: string | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServerClient(req, res);

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      // Fetch user preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('findr_user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch location preferences
      const { data: locations, error: locsError } = await supabase
        .from('user_location_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.error('Error fetching preferences:', prefsError);
        return res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
      }

      if (locsError && locsError.code !== 'PGRST116') {
        console.error('Error fetching locations:', locsError);
        return res.status(500).json({ success: false, error: 'Failed to fetch locations' });
      }

      const settings: FindrUserSettings = {
        displayName: preferences?.display_name || null,
        email: user.email || null,
        speciesNamingPreference: preferences?.species_naming_preference || 'common',
        hasBoat: preferences?.has_boat || false,
        fishingTechniques: preferences?.fishing_techniques || [],
        favoriteHabitats: preferences?.favorite_habitats || [],
        homeLocation: locations?.home_lat && locations?.home_lon
          ? {
              lat: locations.home_lat,
              lon: locations.home_lon,
              name: locations.home_name || 'Home',
            }
          : null,
        fishingLocation: locations?.coast_lat && locations?.coast_lon
          ? {
              lat: locations.coast_lat,
              lon: locations.coast_lon,
              name: locations.coast_name || 'Fishing Spot',
            }
          : null,
        preferencesJson: (preferences?.preferences_json as Record<string, unknown>) || {},
        updatedAt: preferences?.updated_at || null,
      };

      return res.status(200).json({ success: true, settings });
    } catch (error) {
      console.error('Error in GET /api/findr/user-settings:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const {
        displayName,
        speciesNamingPreference,
        hasBoat,
        fishingTechniques,
        favoriteHabitats,
        homeLocation,
        fishingLocation,
        preferencesJson,
      } = req.body;

      // Update or insert findr_user_preferences
      if (
        displayName !== undefined ||
        speciesNamingPreference !== undefined ||
        hasBoat !== undefined ||
        fishingTechniques !== undefined ||
        favoriteHabitats !== undefined ||
        preferencesJson !== undefined
      ) {
        const updateData: Record<string, unknown> = {};
        if (displayName !== undefined) updateData.display_name = displayName;
        if (speciesNamingPreference !== undefined) updateData.species_naming_preference = speciesNamingPreference;
        if (hasBoat !== undefined) updateData.has_boat = hasBoat;
        if (fishingTechniques !== undefined) updateData.fishing_techniques = fishingTechniques;
        if (favoriteHabitats !== undefined) updateData.favorite_habitats = favoriteHabitats;
        if (preferencesJson !== undefined) updateData.preferences_json = preferencesJson;

        const { error: prefsError } = await supabase
          .from('findr_user_preferences')
          .upsert({
            user_id: user.id,
            ...updateData,
          }, {
            onConflict: 'user_id',
          });

        if (prefsError) {
          console.error('Error updating preferences:', prefsError);
          return res.status(500).json({ success: false, error: 'Failed to update preferences' });
        }
      }

      // Update user_location_preferences
      if (homeLocation !== undefined || fishingLocation !== undefined) {
        const locationData: Record<string, unknown> = {};
        if (homeLocation) {
          locationData.home_lat = homeLocation.lat;
          locationData.home_lon = homeLocation.lon;
          if (homeLocation.name) locationData.home_name = homeLocation.name;
        }
        if (fishingLocation) {
          locationData.coast_lat = fishingLocation.lat;
          locationData.coast_lon = fishingLocation.lon;
          if (fishingLocation.name) locationData.coast_name = fishingLocation.name;
        }

        const { error: locsError } = await supabase
          .from('user_location_preferences')
          .upsert({
            user_id: user.id,
            ...locationData,
          }, {
            onConflict: 'user_id',
          });

        if (locsError) {
          console.error('Error updating locations:', locsError);
          return res.status(500).json({ success: false, error: 'Failed to update locations' });
        }
      }

      return res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error in PATCH /api/findr/user-settings:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  // Method not allowed
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
