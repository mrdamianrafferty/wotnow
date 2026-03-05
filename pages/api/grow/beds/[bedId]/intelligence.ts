import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../../lib/grow/server/auth';
import { getSupabaseServerClient } from '../../../../../lib/supabase/serverClient';
import {
  getRotationWarnings,
  getCompanionSets,
  getSuccessionPrompts,
  getQuickFillSuggestions,
} from '../../../../../lib/grow/server/bedIntelligence';
import type { BedIntelligenceResponse } from '../../../../../lib/grow/bedIntelligenceTypes';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bedId } = req.query;

  if (typeof bedId !== 'string' || bedId.length === 0) {
    return res.status(400).json({ error: 'bedId is required' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase: userClient, userId } = auth;
  const serviceClient = getSupabaseServerClient();

  // Verify bed ownership and load metadata
  const { data: bed, error: bedError } = await userClient
    .from('grow_garden_beds')
    .select('id, sun_exposure')
    .eq('id', bedId)
    .eq('user_id', userId)
    .single();

  if (bedError || !bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  // Load user profile for climate zone
  const { data: profile } = await userClient
    .from('profiles')
    .select('gardening_climate_zone_code')
    .eq('id', userId)
    .maybeSingle();

  const climateZone = typeof profile?.gardening_climate_zone_code === 'string'
    ? profile.gardening_climate_zone_code
    : null;

  // Load active plantings with species slugs
  const { data: activePlantings } = await userClient
    .from('grow_bed_plantings')
    .select('grow_user_plants!inner(species_slug)')
    .eq('bed_id', bedId)
    .is('removed_at', null);

  const activeSlugs = [
    ...new Set(
      (activePlantings || [])
        .map((p: any) => p.grow_user_plants?.species_slug)
        .filter(Boolean) as string[]
    ),
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const currentDayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  ) + 1;

  const bedIsEmpty = activeSlugs.length === 0;

  // Run all intelligence queries in parallel
  const [rotationWarnings, companionSets, successionPrompts, quickFillSuggestions] =
    await Promise.all([
      getRotationWarnings(serviceClient, userClient, bedId, currentYear),
      getCompanionSets(serviceClient, activeSlugs),
      getSuccessionPrompts(serviceClient, userClient, bedId, climateZone, currentDayOfYear),
      bedIsEmpty
        ? getQuickFillSuggestions(serviceClient, bed.sun_exposure, climateZone, currentDayOfYear)
        : Promise.resolve(null),
    ]);

  const response: BedIntelligenceResponse = {
    rotationWarnings,
    companionSets,
    successionPrompts,
    quickFillSuggestions,
  };

  return res.status(200).json(response);
}
