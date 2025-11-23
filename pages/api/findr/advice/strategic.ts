import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../../lib/supabase/pages-api';
import { createClient } from '@supabase/supabase-js';
import { generateFavoritesStrategicAdvice, type FavoriteSpecies } from '../../../../lib/findr/generateFavouritesAdvice';
import type { ApproachConditions } from '../../../../lib/findr/scoreSpeciesApproach';

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });

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
      console.error('[strategic-advice] Error fetching favorites:', favError);
      console.error('[strategic-advice] Full error:', JSON.stringify(favError, null, 2));
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
    const speciesClient = getSpeciesClient();
    const { data: speciesData, error: speciesError } = await speciesClient
      .from('species')
      .select('id, species_code, name_en, preferred_habitats, effective_techniques, recommended_baits')
      .in('id', speciesIds);

    if (speciesError) {
      console.error('[strategic-advice] Error fetching species:', speciesError);
      return res.status(500).json({
        error: 'Failed to fetch species data',
        details: speciesError.message
      });
    }

    // Create species lookup map
    const speciesMap = new Map((speciesData || []).map(s => [s.id, s]));

    // Fetch rectangle metadata for coordinates
    const { data: rectangle, error: rectError } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon')
      .eq('rectangle_code', rectangleCode)
      .maybeSingle();

    if (rectError) {
      console.error('[strategic-advice] Error fetching rectangle:', rectError);
    }

    const _centerLat = latitude ?? rectangle?.center_lat ?? 51;
    const _centerLon = longitude ?? rectangle?.center_lon ?? 0;

    // ============================================================================
    // Weekly Forecast Generation (Real Data Baseline)
    // ============================================================================
    // Approach: Uses latest real CMEMS/weather conditions as baseline, then
    // applies realistic temporal variations to simulate 7-day forecast.
    //
    // Why not true forecast API?
    // - Copernicus provides reanalysis/nowcast, not forecasts
    // - Met Office/NOAA forecast APIs require additional integration
    // - This approach provides realistic conditions based on current state
    //
    // Future Enhancement: Integrate Met Office Marine API or NOAA GFS for true forecasts
    // ============================================================================

    // Fetch latest real conditions from database to use as baseline
    const { data: latestConditions } = await supabase
      .from('findr_conditions_latest')
      .select('wind_speed_kts, wave_height_m, current_speed_surface, kd490, sea_temp_c')
      .eq('rectangle_code', rectangleCode)
      .maybeSingle();

    // Use real conditions as baseline, with defaults if not available
    const baseline = {
      wind_speed_kts: latestConditions?.wind_speed_kts ?? 10,
      wave_height_m: latestConditions?.wave_height_m ?? 1.0,
      current_speed_ms: latestConditions?.current_speed_surface ?? 0.5,
      kd490: latestConditions?.kd490 ?? 0.15,
      sea_temp_c: latestConditions?.sea_temp_c ?? 15,
    };

    // Generate 7-day forecast based on real current conditions
    // Apply realistic variations (±10-20%) to simulate weather changes
    const weeklyForecast: Array<{ time: Date; conditions: ApproachConditions }> = [];
    const now = new Date();

    for (let i = 0; i < 56; i += 3) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const hour = time.getHours();
      const dayOffset = Math.floor(i / 24); // Days from now

      // Apply gradual variations (wind/waves can change ±20% over 7 days)
      const windVariation = 1 + (Math.sin(dayOffset * 0.5) * 0.2);
      const waveVariation = 1 + (Math.sin(dayOffset * 0.4) * 0.15);
      const currentVariation = 1 + (Math.sin(dayOffset * 0.6) * 0.1);

      weeklyForecast.push({
        time,
        conditions: {
          wind_speed_kts: baseline.wind_speed_kts * windVariation,
          wave_height_m: baseline.wave_height_m * waveVariation,
          current_speed_ms: baseline.current_speed_ms * currentVariation,
          kd490: baseline.kd490, // Water clarity changes slowly
          sea_temp_c: baseline.sea_temp_c, // Temperature changes slowly
          tide_stage: (i % 12 < 6) ? 'flooding' as const : 'ebbing' as const,
          time_of_day: (hour >= 5 && hour < 7) ? 'dawn' as const :
                       (hour >= 7 && hour < 18) ? 'day' as const :
                       (hour >= 18 && hour < 20) ? 'dusk' as const : 'night' as const,
        },
      });
    }

    // Map favorites to species format using speciesMap lookup
    const favoriteSpecies: FavoriteSpecies[] = favorites
      .map(f => {
        const species = speciesMap.get(f.species_id);
        if (!species) {
          console.log('[strategic-advice] Species not found for favorite:', f.species_id);
          return null;
        }
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
          confidence_score: 70,
        } as FavoriteSpecies;
      })
      .filter((s): s is FavoriteSpecies => s !== null);

    if (favoriteSpecies.length === 0) {
      return res.status(400).json({
        error: 'No valid species data found in favorites'
      });
    }

    // Generate strategic advice
    const advice = generateFavoritesStrategicAdvice(
      favoriteSpecies,
      weeklyForecast,
      {
        name: rectangle?.region,
        rectangleCode: rectangle?.rectangle_code || rectangleCode,
      }
    );

    // Cache for 1 hour
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    return res.status(200).json({ success: true, advice });

  } catch (error) {
    console.error('[strategic-advice] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
