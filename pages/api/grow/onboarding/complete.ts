import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';

interface SelectedPlant {
  slug: string;
  name: string;
  type: string;
}

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
  skipped?: boolean;
  selectedPlants?: SelectedPlant[];
}

interface CompleteOnboardingResponse {
  success: boolean;
  completedAt: string;
  preferences?: UserPreferences;
  plantsAdded?: number;
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
  const isSkipped = Boolean(payload.skipped);

  // Update profiles table with onboarding completion flag
  const profileUpdate: Record<string, unknown> = {
    grow_onboarding_completed: !isSkipped,
    grow_onboarding_completed_at: completedAt,
    grow_onboarding_skipped: isSkipped,
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', userId);

  if (profileError) {
    console.error('[grow] Failed to mark onboarding complete for user', userId, profileError);
    return res.status(500).json({ error: profileError.message || 'Failed to mark onboarding complete' });
  }

  // Upsert user preferences to grow_user_preferences table (only for non-skipped completions)
  if (!isSkipped) {
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
      skill_level: null,
      content_depth: null,
    };

    const { error: prefsError } = await supabase
      .from('grow_user_preferences')
      .upsert(preferencesPayload, { onConflict: 'user_id' });

    if (prefsError) {
      console.error('[grow] Failed to save preferences for user', userId, prefsError);
      // Don't fail the whole request - onboarding flag was saved
      console.warn('[grow] Continuing despite preferences save failure');
    }
  }

  // Auto-add selected plants to the user's garden
  let plantsAdded = 0;
  const selectedPlants = Array.isArray(payload.selectedPlants) ? payload.selectedPlants : [];

  if (selectedPlants.length > 0) {
    const plantInserts = selectedPlants.map((plant) => ({
      user_id: userId,
      name: String(plant.name).trim(),
      type: String(plant.type).trim(),
      species_slug: String(plant.slug).trim(),
      health: 'good',
      source: 'onboarding-suggestion',
    }));

    const { data: insertedPlants, error: plantsError } = await supabase
      .from('grow_user_plants')
      .insert(plantInserts)
      .select('id');

    if (plantsError) {
      console.error('[grow] Failed to auto-add onboarding plants for user', userId, plantsError);
      // Don't fail the request — onboarding and preferences are already saved
      console.warn('[grow] Continuing despite plant insertion failure');
    } else {
      plantsAdded = insertedPlants?.length || 0;
      console.log(`[grow] Auto-added ${plantsAdded} plants from onboarding for user ${userId}`);
    }
  }

  return res.status(200).json({ success: true, completedAt, preferences: payload, plantsAdded });
}
