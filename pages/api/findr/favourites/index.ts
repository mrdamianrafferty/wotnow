/**
 * /api/findr/favourites
 * 
 * Manage user's favourite species with authentication
 * GET: Retrieve all favourites for authenticated user with full species data
 * POST: Add new favourite
 * DELETE: Remove favourite
 */

import { createServerSupabaseClient } from '../../../../lib/supabase/pages-api';
import type { NextApiRequest, NextApiResponse } from 'next';

const SUPABASE_REST_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Match YOUR actual species table structure (for documentation)
interface _SpeciesRow {
  id: string;
  species_code: string;
  scientific_name: string;
  name_en: string;
  name_es: string | null;
  name_fr: string | null;
  name_de: string | null;
  name_it: string | null;
  name_pt: string | null;
  typical_gear: string[];
  eating_quality: number;
  min_depth: number;
  max_depth: number;
  wind_sensitivity: string;
  temperature_sensitivity: string;
  pressure_sensitivity: string;
  tide_sensitivity: string;
  conservation_status: string | null;
  fun_fact: string | null;
  advice: Array<{
    type: string;
    regions: string;
    best_time: string;
    edibility_10: string;
    tide_sensitivity: string;
    effect_of_weather: string;
    effect_of_temperature: string;
    typical_distance_depth: string;
    favourite_baits_and_natural_diet: string;
    restrictions_notes: string;
    fun_fact?: string;
    conservation_status?: string;
    trusted_authority_rules?: string;
  }>;
}

interface PredictionResponse {
  species_code?: string;
  species_id?: string;
  confidence?: number;
  confidence_percent?: number;
  headline?: string;
  rationale?: string;
  weather_summary?: string;
}

interface FavouriteRecord {
  id: string;
  species_id: string;
  added_at: string;
  last_checked: string;
}

interface SpeciesRecord {
  id: string;
  species_code: string;
  scientific_name: string;
  name_en: string;
  name_es: string | null;
  name_fr: string | null;
  name_de: string | null;
  name_it: string | null;
  name_pt: string | null;
  typical_gear: string[];
  eating_quality: number;
  min_depth: number;
  max_depth: number;
  wind_sensitivity: string;
  temperature_sensitivity: string;
  pressure_sensitivity: string;
  tide_sensitivity: string;
  conservation_status: string | null;
  fun_fact: string | null;
  advice: Array<{
    type: string;
    regions: string;
    best_time: string;
    edibility_10: string;
    tide_sensitivity: string;
    effect_of_weather: string;
    effect_of_temperature: string;
    typical_distance_depth: string;
    favourite_baits_and_natural_diet: string;
    restrictions_notes: string;
    fun_fact?: string;
    conservation_status?: string;
    trusted_authority_rules?: string;
  }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get authenticated user
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const userId = session.user.id;

  switch (req.method) {
    case 'GET':
      try {
        // Get user's location/rectangle from query params
        const rectangleCode = req.query.rectangleCode as string | undefined;

        // Fetch user's favourites first (without JOIN since species_id is TEXT, not FK)
        const { data: favourites, error: favError } = await supabase
          .from('user_favourites')
          .select('id, species_id, added_at, last_checked')
          .eq('user_id', userId)
          .order('added_at', { ascending: false });

        if (favError) {
          console.error('Supabase error fetching favourites:', favError);
          throw favError;
        }

        if (!favourites || favourites.length === 0) {
          return res.status(200).json({ success: true, favourites: [] });
        }

        // Get unique species IDs
        const typedFavourites = favourites as FavouriteRecord[];
        const speciesIds = [...new Set(typedFavourites.map(f => f.species_id))];

        // Fetch species data separately
        const { data: speciesData, error: speciesError } = await supabase
          .from('species')
          .select(`
            id,
            species_code,
            scientific_name,
            name_en,
            name_es,
            name_fr,
            name_de,
            name_it,
            name_pt,
            typical_gear,
            eating_quality,
            min_depth,
            max_depth,
            wind_sensitivity,
            temperature_sensitivity,
            pressure_sensitivity,
            tide_sensitivity,
            conservation_status,
            fun_fact,
            advice
          `)
          .in('id', speciesIds);

        if (speciesError) {
          console.error('Supabase error fetching species:', speciesError);
          throw speciesError;
        }

        // Create species lookup map
        const typedSpeciesData = (speciesData || []) as SpeciesRecord[];
        const speciesMap = new Map(
          typedSpeciesData.map(s => [s.id, s])
        );

        // Extract species codes for live prediction lookup
        const speciesCodes = typedSpeciesData
          .map(s => s.species_code?.toUpperCase())
          .filter(Boolean) as string[];

        // Fetch live confidence scores using get_fishing_predictions RPC
        const liveScores = rectangleCode 
          ? await getLiveConfidenceScores(rectangleCode, speciesCodes)
          : new Map();

        // Build response with live confidence scores
        const favouritesWithConfidence = typedFavourites.map((fav) => {
          const species = speciesMap.get(fav.species_id);
          
          // Skip if species not found (shouldn't happen)
          if (!species) {
            console.warn(`Species not found for id: ${fav.species_id}`);
            return null;
          }
          
          const speciesCode = species.species_code.toUpperCase();
          
          // Use live prediction if available, otherwise default to 50
          const liveData = liveScores.get(speciesCode);
          const confidence = liveData?.confidence ?? 50;
          const forecast = liveData?.forecast ?? Array(7).fill(50);

          return {
            id: fav.id,
            speciesId: species.id,
            speciesCode: species.species_code,
            name: species.name_en,
            scientificName: species.scientific_name,
            image: `/images/fish/${species.species_code.toLowerCase()}.jpg`,
            confidence,
            addedAt: fav.added_at,
            lastChecked: fav.last_checked,
            stats: {
              catches: 0, // TODO: Query from user_catches table
              lastCaught: null
            },
            currentConditions: {
              temperature: 12, // TODO: From weather API
              windSpeed: 10,
              tideState: 'rising',
              waveHeight: 0.5
            },
            forecast,
            advice: species.advice,
            eatingQuality: species.eating_quality,
            funFact: species.fun_fact,
            conservationStatus: species.conservation_status
          };
        }).filter(Boolean); // Remove any nulls

        return res.status(200).json({ success: true, favourites: favouritesWithConfidence });
      } catch (error: unknown) {
        console.error('Error fetching favourites:', error);
        return res.status(500).json({ error: 'Failed to fetch favourites', details: error instanceof Error ? error.message : 'Unknown error' });
      }

    case 'POST':
      try {
        const { speciesId } = req.body;

        if (!speciesId) {
          return res.status(400).json({ error: 'speciesId required' });
        }

        // Verify species exists
        const { data: species, error: speciesError } = await supabase
          .from('species')
          .select('id, species_code, name_en')
          .eq('id', speciesId)
          .single();

        if (speciesError || !species) {
          return res.status(404).json({ error: 'Species not found' });
        }

        // Add to favourites
        const { data, error } = await supabase
          .from('user_favourites')
          .insert({
            user_id: userId,
            species_id: speciesId
          })
          .select()
          .single();

        if (error) {
          // Handle duplicate (already favourited)
          if (error.code === '23505') {
            return res.status(409).json({ error: 'Species already favourited' });
          }
          throw error;
        }

        return res.status(201).json({
          success: true,
          favourite: {
            id: data.id,
            speciesId: species.id,
            speciesCode: species.species_code,
            name: species.name_en,
            addedAt: data.added_at
          }
        });
      } catch (error: unknown) {
        console.error('Error adding favourite:', error);
        return res.status(500).json({ error: 'Failed to add favourite', details: error instanceof Error ? error.message : 'Unknown error' });
      }

    case 'DELETE':
      try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Favourite ID required' });
        }

        // Delete (RLS ensures user can only delete their own)
        const { error } = await supabase
          .from('user_favourites')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) throw error;

        return res.status(200).json({ success: true });
      } catch (error: unknown) {
        console.error('Error deleting favourite:', error);
        return res.status(500).json({ error: 'Failed to delete favourite', details: error instanceof Error ? error.message : 'Unknown error' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Helper: Get live confidence scores from get_fishing_predictions RPC
async function getLiveConfidenceScores(
  rectangleCode: string,
  speciesCodes: string[]
): Promise<Map<string, { confidence: number; forecast: number[] }>> {
  const results = new Map<string, { confidence: number; forecast: number[] }>();

  // If no location, return empty results
  if (!rectangleCode || !SUPABASE_REST_URL || !SUPABASE_ANON_KEY) {
    console.warn('[favourites] Missing rectangle code or Supabase config, returning empty predictions');
    return results;
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const rpcUrl = `${SUPABASE_REST_URL.replace(/\/?$/, '')}/rest/v1/rpc/get_fishing_predictions`;

    // Fetch today's predictions
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        rectangle_code_input: rectangleCode,
        prediction_date_input: today,
        user_language: 'en',
      }),
    });

    if (!response.ok) {
      console.warn('[favourites] Failed to fetch predictions:', response.statusText);
      return results;
    }

    const predictions = await response.json() as PredictionResponse[];

    // Map predictions by species code
    for (const pred of predictions) {
      const code = pred.species_code?.toUpperCase();
      if (!code || !speciesCodes.includes(code)) continue;

      const confidence = pred.confidence ?? pred.confidence_percent ?? 50;

      results.set(code, {
        confidence,
        forecast: await get7DayForecast(rectangleCode, code),
      });
    }

    return results;
  } catch (error) {
    console.error('[favourites] Error fetching live predictions:', error);
    return results;
  }
}

// Helper: Get 7-day forecast for a species
async function get7DayForecast(rectangleCode: string, speciesCode: string): Promise<number[]> {
  const forecast: number[] = [];

  try {
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().slice(0, 10);

      const rpcUrl = `${SUPABASE_REST_URL!.replace(/\/?$/, '')}/rest/v1/rpc/get_fishing_predictions`;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          rectangle_code_input: rectangleCode,
          prediction_date_input: dateStr,
          user_language: 'en',
        }),
      });

      if (!response.ok) {
        forecast.push(50); // Default if request fails
        continue;
      }

      const predictions = await response.json() as PredictionResponse[];
      const match = predictions.find(p => p.species_code?.toUpperCase() === speciesCode.toUpperCase());
      
      forecast.push(match?.confidence ?? match?.confidence_percent ?? 50);
    }
  } catch (error) {
    console.error('[favourites] Error fetching 7-day forecast:', error);
    // Fill remaining days with default
    while (forecast.length < 7) {
      forecast.push(50);
    }
  }

  return forecast;
}
