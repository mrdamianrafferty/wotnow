import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../lib/grow/server/auth';

interface UserPreferences {
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  climateZone: string | null;
  gardenFeatures: string[];
  soilType: string | null;
  sunExposure: string | null;
  moisture: string | null;
  interests: string[];
  skillLevel: string | null;
  contentDepth: string | null;
  updatedAt: string | null;
}

interface PreferencesResponse {
  preferences: UserPreferences | null;
}

// Convert snake_case DB row to camelCase
function serializePreferences(row: Record<string, unknown>): UserPreferences {
  return {
    location: row.location as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    elevation: row.elevation as number | null,
    climateZone: row.climate_zone as string | null,
    gardenFeatures: (row.garden_features as string[]) || [],
    soilType: row.soil_type as string | null,
    sunExposure: row.sun_exposure as string | null,
    moisture: row.moisture as string | null,
    interests: (row.interests as string[]) || [],
    skillLevel: row.skill_level as string | null,
    contentDepth: row.content_depth as string | null,
    updatedAt: row.updated_at as string | null,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreferencesResponse | { error: string }>
) {
  // GET - Load preferences
  if (req.method === 'GET') {
    const auth = await getAuthenticatedClient(req, res);
    if (!auth) {
      return;
    }

    const { supabase, userId } = auth;

    const { data, error } = await supabase
      .from('grow_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (user has no preferences yet)
      console.error('[grow/preferences] Failed to load:', error);
      return res.status(500).json({ error: 'Failed to load preferences' });
    }

    return res.status(200).json({
      preferences: data ? serializePreferences(data) : null,
    });
  }

  // PUT - Update preferences
  if (req.method === 'PUT') {
    const auth = await getAuthenticatedClient(req, res);
    if (!auth) {
      return;
    }

    const { supabase, userId } = auth;
    const payload = req.body as Partial<UserPreferences>;

    const preferencesPayload = {
      user_id: userId,
      location: payload.location ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      elevation: payload.elevation ?? null,
      climate_zone: payload.climateZone ?? null,
      garden_features: payload.gardenFeatures ?? [],
      soil_type: payload.soilType ?? null,
      sun_exposure: payload.sunExposure ?? null,
      moisture: payload.moisture ?? null,
      interests: payload.interests ?? [],
      skill_level: payload.skillLevel ?? null,
      content_depth: payload.contentDepth ?? null,
    };

    const { data, error } = await supabase
      .from('grow_user_preferences')
      .upsert(preferencesPayload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[grow/preferences] Failed to save:', error);
      return res.status(500).json({ error: 'Failed to save preferences' });
    }

    return res.status(200).json({
      preferences: serializePreferences(data),
    });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
