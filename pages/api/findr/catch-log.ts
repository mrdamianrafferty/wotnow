import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface EnvironmentalConditions {
  sea_temp?: number;
  tide_phase?: string;
  wind_speed?: number;
  wave_height?: number;
  salinity?: number;
  chlorophyll?: number;
  dissolved_oxygen?: number;
  ph?: number;
  [key: string]: string | number | undefined;
}

interface CreateCatchRequest {
  species_id: string;
  species_common_name: string;
  scientific_name?: string;
  rectangle_code: string;
  caught_at: string; // ISO timestamp
  quantity: number;
  size_category: 'small' | 'average' | 'large' | 'mixed';
  weight_kg?: number;
  length_cm?: number;
  bait_used: string;
  method?: 'shore' | 'boat' | 'kayak';
  habitat_type?: string;
  depth_range?: 'shallow_water' | 'deep_water';
  notes?: string;
  photo_urls?: string[];
  followed_findr_advice: boolean;
  environmental_conditions?: EnvironmentalConditions;
}

interface CatchResponse {
  id: string;
  species_common_name: string;
  caught_at: string;
  logged_at: string;
  rectangle_code: string;
  quantity: number;
  size_category: string;
  bait_used: string;
  habitat_type?: string;
  notes?: string;
  followed_findr_advice: boolean;
  used_recommended_bait: boolean;
  used_recommended_habitat: boolean;
  prediction_matched: boolean;
  environmental_conditions?: EnvironmentalConditions;
}

/**
 * API Route: Catch Log Management
 * 
 * Handles both creating new catch entries and retrieving user's catch history.
 * Automatically links catches to recent prediction impressions for validation analysis.
 * 
 * POST /api/findr/catch-log - Create new catch entry
 * GET /api/findr/catch-log - Retrieve user's catch history (paginated)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract and verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('[Catch Log] Auth verification failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    if (req.method === 'GET') {
      return handleGetCatches(req, res, user.id);
    } else if (req.method === 'POST') {
      return handleCreateCatch(req, res, user.id);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('[Catch Log] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/findr/catch-log
 * Retrieves user's catch history with optional filtering and pagination
 */
async function handleGetCatches(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { 
    limit = '50', 
    offset = '0', 
    species_id, 
    rectangle_code,
    start_date,
    end_date 
  } = req.query;

  try {
    let query = supabase
      .from('findr_catch_entries')
      .select(`
        id,
        species_id,
        species_common_name,
        scientific_name,
        rectangle_code,
        caught_at,
        logged_at,
        quantity,
        size_category,
        weight_kg,
        length_cm,
        bait_used,
        method,
        habitat_type,
        depth_range,
        notes,
        photo_urls,
        followed_findr_advice,
        used_recommended_bait,
        used_recommended_habitat,
        is_blank_trip,
        environmental_conditions,
        prediction_impression_id
      `)
      .eq('user_id', userId)
      .order('caught_at', { ascending: false });

    // Apply filters
    if (species_id) {
      query = query.eq('species_id', species_id);
    }
    if (rectangle_code) {
      query = query.eq('rectangle_code', rectangle_code);
    }
    if (start_date) {
      query = query.gte('caught_at', start_date);
    }
    if (end_date) {
      query = query.lte('caught_at', end_date);
    }

    // Apply pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data: catches, error: fetchError } = await query;

    if (fetchError) {
      console.error('[Catch Log GET] Fetch failed:', fetchError);
      return res.status(500).json({ error: 'Failed to retrieve catches' });
    }

    // Transform data for response
    const response: CatchResponse[] = catches.map(catchEntry => ({
      id: catchEntry.id,
      species_common_name: catchEntry.species_common_name,
      caught_at: catchEntry.caught_at,
      logged_at: catchEntry.logged_at,
      rectangle_code: catchEntry.rectangle_code,
      quantity: catchEntry.quantity,
      size_category: catchEntry.size_category,
      bait_used: catchEntry.bait_used,
      habitat_type: catchEntry.habitat_type,
      notes: catchEntry.notes,
      followed_findr_advice: catchEntry.followed_findr_advice,
      used_recommended_bait: catchEntry.used_recommended_bait || false,
      used_recommended_habitat: catchEntry.used_recommended_habitat || false,
      prediction_matched: !!catchEntry.prediction_impression_id,
      environmental_conditions: catchEntry.environmental_conditions
    }));

    console.info('[Catch Log GET] Retrieved catches', {
      user_id: userId,
      count: catches.length,
      filters: { species_id, rectangle_code, start_date, end_date }
    });

    res.status(200).json({
      success: true,
      catches: response,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        has_more: catches.length === limitNum
      }
    });

  } catch (error) {
    console.error('[Catch Log GET] Error:', error);
    res.status(500).json({ error: 'Failed to retrieve catches' });
  }
}

/**
 * POST /api/findr/catch-log
 * Creates a new catch entry with automatic prediction linkage and validation calculations
 */
async function handleCreateCatch(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const catchData: CreateCatchRequest = req.body;

  // Validate required fields
  if (!catchData.species_id || !catchData.species_common_name || !catchData.rectangle_code || 
      !catchData.caught_at || !catchData.bait_used || typeof catchData.quantity !== 'number' ||
      typeof catchData.followed_findr_advice !== 'boolean') {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['species_id', 'species_common_name', 'rectangle_code', 'caught_at', 'bait_used', 'quantity', 'followed_findr_advice']
    });
  }

  try {
    // Step 1: Find recent prediction impression to link this catch to
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentImpressions, error: impressionError } = await supabase
      .from('findr_prediction_impressions')
      .select('id, ranked_species, viewed_at')
      .eq('user_id', userId)
      .eq('rectangle_code', catchData.rectangle_code)
      .gte('viewed_at', twentyFourHoursAgo)
      .order('viewed_at', { ascending: false })
      .limit(1);

    if (impressionError) {
      console.warn('[Catch Log POST] Failed to query impressions:', impressionError);
    }

    let linkedImpressionId: string | null = null;
    let usedRecommendedBait = false;
    let usedRecommendedHabitat = false;

    // Step 2: If we found a recent impression, link the catch and calculate validation fields
    if (recentImpressions && recentImpressions.length > 0) {
      linkedImpressionId = recentImpressions[0].id;
      
      // Extract bait recommendations from the ranked species
      const rankedSpecies = recentImpressions[0].ranked_species as Array<{
        species_id: string;
        bait_suggestions?: string[];
        habitat?: string;
      }>;

      // Find this species in the predictions
      const speciesPrediction = rankedSpecies.find(s => s.species_id === catchData.species_id);
      
      if (speciesPrediction) {
        // Check if used bait was recommended
        if (speciesPrediction.bait_suggestions) {
          usedRecommendedBait = speciesPrediction.bait_suggestions
            .some(bait => bait.toLowerCase().includes(catchData.bait_used.toLowerCase()) ||
                          catchData.bait_used.toLowerCase().includes(bait.toLowerCase()));
        }

        // Check if habitat matches recommendations
        if (speciesPrediction.habitat && catchData.habitat_type) {
          usedRecommendedHabitat = speciesPrediction.habitat.toLowerCase()
            .includes(catchData.habitat_type.toLowerCase()) ||
            catchData.habitat_type.toLowerCase().includes(speciesPrediction.habitat.toLowerCase());
        }
      }

      console.info('[Catch Log POST] Linked to prediction impression', {
        impression_id: linkedImpressionId,
        species_matched: !!speciesPrediction,
        used_recommended_bait: usedRecommendedBait,
        used_recommended_habitat: usedRecommendedHabitat
      });
    }

    // Step 3: Create the catch entry
    const newCatch = {
      user_id: userId,
      species_id: catchData.species_id,
      species_common_name: catchData.species_common_name,
      scientific_name: catchData.scientific_name || null,
      rectangle_code: catchData.rectangle_code,
      prediction_impression_id: linkedImpressionId,
      caught_at: catchData.caught_at,
      logged_at: new Date().toISOString(),
      quantity: catchData.quantity,
      size_category: catchData.size_category,
      weight_kg: catchData.weight_kg || null,
      length_cm: catchData.length_cm || null,
      bait_used: catchData.bait_used,
      method: catchData.method || null,
      habitat_type: catchData.habitat_type || null,
      depth_range: catchData.depth_range || null,
      notes: catchData.notes || null,
      photo_urls: catchData.photo_urls || null,
      followed_findr_advice: catchData.followed_findr_advice,
      used_recommended_bait: usedRecommendedBait,
      used_recommended_habitat: usedRecommendedHabitat,
      is_blank_trip: false,
      environmental_conditions: catchData.environmental_conditions || null
    };

    const { data: insertedCatch, error: insertError } = await supabase
      .from('findr_catch_entries')
      .insert(newCatch)
      .select(`
        id,
        species_common_name,
        caught_at,
        logged_at,
        rectangle_code,
        quantity,
        size_category,
        bait_used,
        habitat_type,
        notes,
        followed_findr_advice,
        used_recommended_bait,
        used_recommended_habitat,
        environmental_conditions
      `)
      .single();

    if (insertError) {
      console.error('[Catch Log POST] Insert failed:', insertError);
      return res.status(500).json({ error: 'Failed to create catch entry' });
    }

    console.info('[Catch Log POST] Successfully created catch', {
      catch_id: insertedCatch.id,
      user_id: userId,
      species: catchData.species_common_name,
      rectangle: catchData.rectangle_code,
      linked_impression: linkedImpressionId,
      followed_advice: catchData.followed_findr_advice
    });

    const response: CatchResponse = {
      id: insertedCatch.id,
      species_common_name: insertedCatch.species_common_name,
      caught_at: insertedCatch.caught_at,
      logged_at: insertedCatch.logged_at,
      rectangle_code: insertedCatch.rectangle_code,
      quantity: insertedCatch.quantity,
      size_category: insertedCatch.size_category,
      bait_used: insertedCatch.bait_used,
      habitat_type: insertedCatch.habitat_type,
      notes: insertedCatch.notes,
      followed_findr_advice: insertedCatch.followed_findr_advice,
      used_recommended_bait: insertedCatch.used_recommended_bait,
      used_recommended_habitat: insertedCatch.used_recommended_habitat,
      prediction_matched: !!linkedImpressionId,
      environmental_conditions: insertedCatch.environmental_conditions
    };

    res.status(201).json({
      success: true,
      catch: response
    });

  } catch (error) {
    console.error('[Catch Log POST] Error:', error);
    res.status(500).json({ error: 'Failed to create catch entry' });
  }
}