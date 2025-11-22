/**
 * /api/findr/favourites
 * 
 * Manage user's favourite species with authentication
 * GET: Retrieve all favourites for authenticated user with full species data
 * POST: Add new favourite
 * DELETE: Remove favourite
 */

import { createServerSupabaseClient } from '../../../../lib/supabase/pages-api';
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_REST_URL = SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseServiceClient =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const supabaseAnonClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

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
  notifications_enabled: boolean;
  notification_threshold: number;
  notification_channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
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
  // Phase 1: Structured fishing content
  recommended_baits: string[] | null;
  preferred_habitats: string[] | null;
  effective_techniques: string[] | null;
  best_times: string[] | null;
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

const normalizeSpeciesCode = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
};

const normalizeSpeciesName = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeScientificName = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
};

const isLikelyUuid = (value?: string | null): boolean => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
};

const SPECIES_SELECT_COLUMNS = `
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
  recommended_baits,
  preferred_habitats,
  effective_techniques,
  best_times,
  advice
`;

const getSpeciesClient = () => {
  if (supabaseServiceClient) return supabaseServiceClient;

  if (supabaseAnonClient) return supabaseAnonClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing for species lookup');
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

async function selectSpeciesBy(
  column: keyof SpeciesRecord,
  value: string,
  logContext: Record<string, unknown>
): Promise<SpeciesRecord | null> {
  const client = getSpeciesClient();

  const { data, error } = await client
    .from('species')
    .select(SPECIES_SELECT_COLUMNS)
    .eq(column as string, value)
    .maybeSingle();

  if (error) {
    console.warn('[favourites] Species lookup failed', {
      column,
      value,
      error: error.message,
      ...logContext,
    });
    return null;
  }

  return (data as SpeciesRecord | null) ?? null;
}

async function selectSpeciesIlike(
  column: keyof SpeciesRecord,
  value: string,
  logContext: Record<string, unknown>
): Promise<SpeciesRecord | null> {
  const client = getSpeciesClient();

  const { data, error } = await client
    .from('species')
    .select(SPECIES_SELECT_COLUMNS)
    .ilike(column as string, value)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[favourites] Species lookup (ILIKE) failed', {
      column,
      value,
      error: error.message,
      ...logContext,
    });
    return null;
  }

  return (data as SpeciesRecord | null) ?? null;
}

async function resolveSpeciesRecord(params: {
  speciesId?: string | null;
  speciesCode?: string | null;
  speciesName?: string | null;
  scientificName?: string | null;
  userId: string;
}): Promise<SpeciesRecord | null> {
  const { speciesId, speciesCode, speciesName, scientificName, userId } = params;
  const logContext = { userId, speciesId, speciesCode, speciesName, scientificName };

  if (speciesId && isLikelyUuid(speciesId)) {
    const record = await selectSpeciesBy('id', speciesId.trim(), logContext);
    if (record) return record;
  }

  const codeCandidates = new Set<string>();
  const normalizedIdAsCode = normalizeSpeciesCode(speciesId);
  const normalizedCode = normalizeSpeciesCode(speciesCode);
  if (normalizedIdAsCode) codeCandidates.add(normalizedIdAsCode);
  if (normalizedCode) codeCandidates.add(normalizedCode);

  for (const code of codeCandidates) {
    const record = await selectSpeciesBy('species_code', code, logContext);
    if (record) return record;
  }

  const normalizedScientific = normalizeScientificName(scientificName);
  if (normalizedScientific) {
    const record = await selectSpeciesIlike('scientific_name', `%${normalizedScientific}%`, logContext);
    if (record) return record;
  }

  const normalizedName = normalizeSpeciesName(speciesName);
  if (normalizedName) {
    const record = await selectSpeciesIlike('name_en', `%${normalizedName}%`, logContext);
    if (record) return record;
  }

  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create authenticated Supabase client
  const supabase = createServerSupabaseClient({ req, res });
  
  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized - Please sign in' });
  }

  const userId = user.id;

  switch (req.method) {
    case 'GET':
      try {
        // Get user's location/rectangle from query params
        const rectangleCode = req.query.rectangleCode as string | undefined;

        // Fetch user's favourites first (without JOIN since species_id is TEXT, not FK)
        const { data: favourites, error: favError } = await supabase
          .from('user_favourites')
          .select('id, species_id, added_at, last_checked, notifications_enabled, notification_threshold, notification_channels')
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
        const speciesClient = getSpeciesClient();

        const { data: speciesData, error: speciesError } = await speciesClient
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
            recommended_baits,
            preferred_habitats,
            effective_techniques,
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

        // Track orphaned favourites for cleanup
        const orphanedFavouriteIds: string[] = [];

        // Build response with live confidence scores
        const favouritesWithConfidence = typedFavourites.map((fav) => {
          const species = speciesMap.get(fav.species_id);

          // Skip if species not found (orphaned favourite from deleted species)
          if (!species) {
            orphanedFavouriteIds.push(fav.id);
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
            notificationsEnabled: fav.notifications_enabled,
            notificationThreshold: fav.notification_threshold,
            notificationChannels: fav.notification_channels,
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
            // Phase 1: Structured fishing content
            recommendedBaits: species.recommended_baits,
            preferredHabitats: species.preferred_habitats,
            effectiveTechniques: species.effective_techniques,
            best_times: species.best_times,
            advice: species.advice,
            eatingQuality: species.eating_quality,
            funFact: species.fun_fact,
            conservationStatus: species.conservation_status
          };
        }).filter(Boolean); // Remove any nulls

        // Clean up orphaned favourites (species no longer exist)
        if (orphanedFavouriteIds.length > 0) {
          console.log(`[Favourites] Cleaning up ${orphanedFavouriteIds.length} orphaned favourites for user ${userId}`);
          await supabase
            .from('user_favourites')
            .delete()
            .in('id', orphanedFavouriteIds);
        }

        return res.status(200).json({ success: true, favourites: favouritesWithConfidence });
      } catch (error: unknown) {
        console.error('Error fetching favourites:', error);
        return res.status(500).json({ error: 'Failed to fetch favourites', details: error instanceof Error ? error.message : 'Unknown error' });
      }

    case 'POST':
      try {
        const rawSpeciesId =
          typeof req.body?.speciesId === 'string' ? req.body.speciesId.trim() : '';
        const rawSpeciesCodeInput =
          typeof req.body?.speciesCode === 'string' ? req.body.speciesCode.trim() : '';
        const speciesNameHint =
          typeof req.body?.speciesName === 'string' ? req.body.speciesName.trim() : '';
        const scientificNameHint =
          typeof req.body?.scientificName === 'string' ? req.body.scientificName.trim() : '';

        if (!rawSpeciesId && !rawSpeciesCodeInput && !speciesNameHint && !scientificNameHint) {
          return res.status(400).json({ error: 'speciesId, speciesCode or speciesName required' });
        }

        const species = await resolveSpeciesRecord({
          speciesId: rawSpeciesId || null,
          speciesCode: rawSpeciesCodeInput || null,
          speciesName: speciesNameHint || null,
          scientificName: scientificNameHint || null,
          userId,
        });

        if (!species) {
          console.warn('[favourites] Species not found during favourite add', {
            userId,
            rawSpeciesId,
            rawSpeciesCode: rawSpeciesCodeInput,
            speciesNameHint,
          });
          return res.status(404).json({ error: 'Species not found' });
        }

        const { data, error } = await supabase
          .from('user_favourites')
          .insert({
            user_id: userId,
            species_id: species.id,
            notifications_enabled: true, // Auto-enable notifications when favoriting
            notification_threshold: 85, // Default threshold for hot bite alerts (85%+)
            notification_channels: { email: true, push: false, sms: false }, // Default to email notifications
          })
          .select()
          .single();

        if (error) {
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
            addedAt: data.added_at,
          },
        });
      } catch (error: unknown) {
        console.error('Error adding favourite:', error);
        return res
          .status(500)
          .json({
            error: 'Failed to add favourite',
            details: error instanceof Error ? error.message : 'Unknown error',
          });
      }

    case 'DELETE':
      try {
        const { id, speciesId: speciesIdQuery } = req.query;

        const normalizedId = typeof id === 'string' ? id.trim() : '';
        const normalizedSpeciesId =
          typeof speciesIdQuery === 'string' ? speciesIdQuery.trim() : '';

        if (!normalizedId && !normalizedSpeciesId) {
          return res.status(400).json({ error: 'Favourite identifier required' });
        }

        let lastError: Error | null = null;

        if (normalizedId) {
          const { error, count } = await supabase
            .from('user_favourites')
            .delete({ count: 'exact' })
            .eq('id', normalizedId)
            .eq('user_id', userId);

          if (error) {
            lastError = error;
          } else if ((count ?? 0) > 0) {
            return res.status(200).json({ success: true });
          }
        }

        if (normalizedSpeciesId) {
          // Check if speciesId is a UUID or a species_code
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedSpeciesId);

          let actualSpeciesId = normalizedSpeciesId;
          let legacySpeciesCode: string | null = null;

          // If it's not a UUID, remember the uppercase code for legacy rows and try resolving the real species.id
          if (!isValidUUID) {
            legacySpeciesCode = normalizedSpeciesId.toUpperCase();
            if (supabaseServiceClient) {
              const { data: speciesData } = await supabaseServiceClient
                .from('species')
                .select('id')
                .eq('species_code', legacySpeciesCode)
                .single();

              if (speciesData?.id) {
                actualSpeciesId = speciesData.id;
              }
            }
          }

          const deleteBySpeciesId = async (speciesId: string) => {
            const { error, count } = await supabase
              .from('user_favourites')
              .delete({ count: 'exact' })
              .eq('species_id', speciesId)
              .eq('user_id', userId);

            if (error) {
              lastError = error;
              return false;
            }

            return (count ?? 0) > 0;
          };

          if (await deleteBySpeciesId(actualSpeciesId)) {
            return res.status(200).json({ success: true });
          }

          if (legacySpeciesCode && legacySpeciesCode !== actualSpeciesId) {
            if (await deleteBySpeciesId(legacySpeciesCode)) {
              return res.status(200).json({ success: true });
            }
          }
        }

        if (lastError) {
          throw lastError;
        }

        return res.status(404).json({ error: 'Favourite not found' });

      } catch (error: unknown) {
        console.error('Error deleting favourite:', error);
        return res.status(500).json({ error: 'Failed to delete favourite', details: error instanceof Error ? error.message : 'Unknown error' });
      }

    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Helper: Get live confidence scores from get_fishing_predictions RPC
// **OPTIMIZATION: Batch all 7-day forecasts in parallel (Quick Win #3)**
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
    const rpcUrl = `${SUPABASE_REST_URL.replace(/\/?$/, '')}/rest/v1/rpc/get_fishing_predictions`;

    // **OPTIMIZATION: Fetch all 7 days in parallel instead of sequentially**
    const dayOffsets = [0, 1, 2, 3, 4, 5, 6];
    const predictionsByDay = await Promise.all(
      dayOffsets.map(async (dayOffset) => {
        try {
          const date = new Date();
          date.setDate(date.getDate() + dayOffset);
          const dateStr = date.toISOString().slice(0, 10);

          const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              rectangle_code_input: rectangleCode,
              prediction_date_input: dateStr,
              user_language: 'en',
            }),
          });

          if (!response.ok) {
            console.warn(`[favourites] Failed to fetch predictions for day ${dayOffset}:`, response.statusText);
            return [];
          }

          return await response.json() as PredictionResponse[];
        } catch (error) {
          console.error(`[favourites] Error fetching predictions for day ${dayOffset}:`, error);
          return [];
        }
      })
    );

    // Build forecast map for each species
    const forecastMap = new Map<string, number[]>();

    for (const code of speciesCodes) {
      const forecast: number[] = [];

      for (const dayPredictions of predictionsByDay) {
        const match = dayPredictions.find(p => p.species_code?.toUpperCase() === code.toUpperCase());
        forecast.push(match?.confidence ?? match?.confidence_percent ?? 50);
      }

      forecastMap.set(code, forecast);
    }

    // Use today's predictions (first day) for current confidence
    const todayPredictions = predictionsByDay[0] || [];

    for (const pred of todayPredictions) {
      const code = pred.species_code?.toUpperCase();
      if (!code || !speciesCodes.includes(code)) continue;

      const confidence = pred.confidence ?? pred.confidence_percent ?? 50;

      results.set(code, {
        confidence,
        forecast: forecastMap.get(code) || Array(7).fill(50),
      });
    }

    // Add entries for species that weren't in today's predictions
    for (const code of speciesCodes) {
      if (!results.has(code)) {
        results.set(code, {
          confidence: 50,
          forecast: forecastMap.get(code) || Array(7).fill(50),
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[favourites] Error fetching live predictions:', error);
    return results;
  }
}
