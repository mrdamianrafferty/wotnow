import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../../lib/supabase/pages-api';
import { createClient } from '@supabase/supabase-js';
import { generateFavoritesTacticalAdvice, type FavoriteSpecies } from '../../../../lib/findr/generateFavouritesAdvice';
import { getTideStage, getTimeOfDay } from '../../../../lib/findr/conditionHelpers';
import type { ApproachConditions } from '../../../../lib/findr/scoreSpeciesApproach';
import type { TideExtreme } from '../../../../lib/findr/conditionHelpers';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSpeciesClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase configuration missing for species lookup');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[tactical-advice] ========== ENDPOINT CALLED ==========');
  console.log('[tactical-advice] Query params:', req.query);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    console.log('[tactical-advice] Supabase client created');

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rectangleCode = Array.isArray(req.query.rectangleCode)
      ? req.query.rectangleCode[0]
      : req.query.rectangleCode as string | undefined;

    const latitude = req.query.lat ? parseFloat(Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat) : null;
    const longitude = req.query.lon ? parseFloat(Array.isArray(req.query.lon) ? req.query.lon[0] : req.query.lon) : null;

    if (!rectangleCode) {
      return res.status(400).json({ error: 'Missing rectangleCode parameter' });
    }

    // Fetch user's favorites (just IDs)
    const { data: favorites, error: favError } = await supabase
      .from('user_favourites')
      .select('id, species_id')
      .eq('user_id', user.id);

    if (favError) {
      console.error('[tactical-advice] Error fetching favorites:', favError);
      return res.status(500).json({
        error: 'Failed to fetch favorites',
        details: favError.message
      });
    }

    if (!favorites || favorites.length === 0) {
      return res.status(400).json({
        error: 'No favorites found. Please add some favorite species first.'
      });
    }

    // Fetch species data separately (Supabase joins don't work reliably)
    // Use service role client to bypass RLS policies on species table
    const speciesIds = favorites.map(f => f.species_id);
    console.log('[tactical-advice] Looking up species for IDs:', speciesIds.length, 'favorites');
    console.log('[tactical-advice] First 3 IDs:', speciesIds.slice(0, 3));

    const speciesClient = getSpeciesClient();
    const { data: speciesData, error: speciesError } = await speciesClient
      .from('species')
      .select('id, species_code, name_en, preferred_habitats, effective_techniques, recommended_baits')
      .in('id', speciesIds);

    console.log('[tactical-advice] Species query returned:', speciesData?.length || 0, 'results');
    if (speciesData && speciesData.length > 0) {
      console.log('[tactical-advice] First species:', speciesData[0]);
    }

    if (speciesError) {
      console.error('[tactical-advice] Error fetching species:', speciesError);
      return res.status(500).json({
        error: 'Failed to fetch species data',
        details: speciesError.message
      });
    }

    // Create species lookup map
    const speciesMap = new Map((speciesData || []).map(s => [s.id, s]));
    console.log('[tactical-advice] Species map size:', speciesMap.size);

    // Fetch latest conditions for the rectangle
    const { data: conditions, error: condError } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', rectangleCode)
      .maybeSingle();

    if (condError) {
      console.error('[tactical-advice] Error fetching conditions:', condError);
      return res.status(500).json({ error: 'Failed to fetch conditions' });
    }

    if (!conditions) {
      return res.status(404).json({
        error: 'No environmental data available for this location'
      });
    }

    // Fetch rectangle metadata
    const { data: rectangle, error: rectError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon')
      .eq('rectangle_code', rectangleCode)
      .maybeSingle();

    if (rectError) {
      console.error('[tactical-advice] Error fetching rectangle:', rectError);
    }

    // Get tides - fetch from next_high_tide_iso and next_low_tide_iso from conditions
    const tideData: TideExtreme[] = [];
    if (conditions.next_high_tide_iso) {
      tideData.push({
        time: conditions.next_high_tide_iso,
        type: 'high',
        height: 0, // Height not currently stored
      });
    }
    if (conditions.next_low_tide_iso) {
      tideData.push({
        time: conditions.next_low_tide_iso,
        type: 'low',
        height: 0,
      });
    }

    // Build enriched conditions
    const enrichedConditions: ApproachConditions = {
      wind_speed_kts: typeof conditions.wind_speed_kts === 'number' ? conditions.wind_speed_kts :
                      typeof conditions.wind_speed_kts === 'string' ? parseFloat(conditions.wind_speed_kts) : 0,
      wave_height_m: typeof conditions.wave_height_m === 'number' ? conditions.wave_height_m :
                     typeof conditions.wave_height_m === 'string' ? parseFloat(conditions.wave_height_m) : 0,
      current_speed_ms: typeof conditions.current_speed_ms === 'number' ? conditions.current_speed_ms :
                        typeof conditions.current_speed_ms === 'string' ? parseFloat(conditions.current_speed_ms) : 0,
      kd490: typeof conditions.kd490 === 'number' ? conditions.kd490 :
             typeof conditions.kd490 === 'string' ? parseFloat(conditions.kd490) : 0.15,
      sea_temp_c: typeof conditions.sea_temp_c === 'number' ? conditions.sea_temp_c :
                  typeof conditions.sea_temp_c === 'string' ? parseFloat(conditions.sea_temp_c) : 15,
      tide_stage: getTideStage(tideData),
      time_of_day: getTimeOfDay(
        latitude ?? rectangle?.center_lat ?? 51,
        longitude ?? rectangle?.center_lon ?? 0
      ),
    };

    // Map favorites to species format using speciesMap lookup
    console.log('[tactical-advice] Mapping favorites to species format...');
    const favoriteSpecies: FavoriteSpecies[] = favorites
      .map(f => {
        const species = speciesMap.get(f.species_id);
        if (!species) {
          console.log('[tactical-advice] Species not found for favorite:', f.species_id);
          return null;
        }
        console.log('[tactical-advice] Mapping species:', species.name_en);
        return {
          species_code: species.species_code || '',
          name_en: species.name_en || 'Unknown',
          preferred_habitats: Array.isArray(species.preferred_habitats)
            ? species.preferred_habitats
            : [],
          effective_techniques: Array.isArray(species.effective_techniques)
            ? species.effective_techniques
            : [],
          recommended_baits: Array.isArray(species.recommended_baits)
            ? species.recommended_baits
            : undefined,
          confidence_score: 70, // Default confidence - could be enhanced with prediction data
        } as FavoriteSpecies;
      })
      .filter((s): s is FavoriteSpecies => s !== null);

    console.log('[tactical-advice] Mapped species count:', favoriteSpecies.length);

    if (favoriteSpecies.length === 0) {
      console.error('[tactical-advice] No species passed the filter!');
      console.error('[tactical-advice] Raw favorites:', JSON.stringify(favorites, null, 2));
      return res.status(400).json({
        error: 'No valid species data found in favorites',
        debug: {
          favoritesCount: favorites.length,
          firstFavorite: favorites[0]
        }
      });
    }

    // Generate tactical advice
    const advice = generateFavoritesTacticalAdvice(
      favoriteSpecies,
      enrichedConditions,
      tideData,
      {
        name: rectangle?.region,
        rectangleCode: rectangle?.rectangle_code || rectangleCode,
        lat: latitude ?? rectangle?.center_lat ?? 0,
        lon: longitude ?? rectangle?.center_lon ?? 0,
      }
    );

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ success: true, advice });

  } catch (error) {
    console.error('[tactical-advice] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
