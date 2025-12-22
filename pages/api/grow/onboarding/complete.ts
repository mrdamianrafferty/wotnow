import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface UserPreferences {
  location?: string;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  climateZone?: string;
  gardenFeatures?: string[];
  soilType?: string;
  sunExposure?: string;
  moisture?: string;
  interests?: string[];
  skillLevel?: string;
  contentDepth?: string;
}

interface CompleteOnboardingResponse {
  success: boolean;
  completedAt: string;
  preferences?: UserPreferences;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompleteOnboardingResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;
  const completedAt = new Date().toISOString();
  const payload = req.body as UserPreferences;

  // Update profiles table with onboarding completion flag
  const profileUpdate: Record<string, unknown> = {
    grow_onboarding_completed: true,
    grow_onboarding_completed_at: completedAt,
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId);

  if (profileError) {
    console.error('[grow] Failed to mark onboarding complete for user', userId, profileError);
    return res.status(500).json({ error: profileError.message || 'Failed to mark onboarding complete' });
  }

  // Upsert user preferences to grow_user_preferences table
  const preferencesPayload = {
    user_id: userId,
    location: payload.location || null,
    latitude: payload.latitude || null,
    longitude: payload.longitude || null,
    elevation: payload.elevation || null,
    climate_zone: payload.climateZone || null,
    garden_features: payload.gardenFeatures || [],
    soil_type: payload.soilType || null,
    sun_exposure: payload.sunExposure || null,
    moisture: payload.moisture || null,
    interests: payload.interests || [],
    skill_level: payload.skillLevel || null,
    content_depth: payload.contentDepth || null,
  };

  const { error: prefsError } = await supabase
    .from('grow_user_preferences')
    .upsert(preferencesPayload, { onConflict: 'user_id' });

  if (prefsError) {
    console.error('[grow] Failed to save preferences for user', userId, prefsError);
    // Don't fail the whole request - onboarding flag was saved
    console.warn('[grow] Continuing despite preferences save failure');
  }

  return res.status(200).json({ success: true, completedAt, preferences: payload });
}
