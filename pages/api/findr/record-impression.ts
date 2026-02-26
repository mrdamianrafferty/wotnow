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

interface RankedSpecies {
  species_id: string;
  species_name: string;
  rank: number;
  confidence: number;
  urgency: 'high' | 'medium' | 'low';
}

interface EnvironmentalSnapshot {
  sea_temp?: number;
  tide_phase?: string;
  wind_speed?: number;
  wave_height?: number;
  salinity?: number;
  chlorophyll?: number;
  dissolved_oxygen?: number;
  [key: string]: string | number | undefined;
}

interface RecordImpressionRequest {
  rectangle_code: string;
  prediction_date: string;
  ranked_species: RankedSpecies[];
  environmental_snapshot?: EnvironmentalSnapshot;
  urgency_level: 'high' | 'medium' | 'low';
  source?: string;
}

/**
 * API Route: Record Prediction Impression
 * 
 * Automatically called when users view fishing predictions to track what was shown.
 * This creates the historical context that catches can later link back to for validation.
 * 
 * POST /api/findr/record-impression
 * - Validates user authentication via Supabase Auth
 * - Records prediction state in findr_prediction_impressions table
 * - Includes rate limiting to prevent duplicate impressions
 * - Returns impression ID for potential future catch linkage
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Verify user session with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('[Record Impression] Auth verification failed:', authError?.message || 'User is null');
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: authError?.message || 'User verification returned null'
      });
    }

    // Validate request body
    const {
      rectangle_code,
      prediction_date,
      ranked_species,
      environmental_snapshot,
      urgency_level,
      source = 'findr-api-v1'
    }: RecordImpressionRequest = req.body;

    console.log('[Record Impression] Request data:', {
      rectangle_code,
      prediction_date,
      ranked_species_count: Array.isArray(ranked_species) ? ranked_species.length : 'not array',
      urgency_level,
      user_id: user.id
    });

    if (!rectangle_code || !prediction_date || !ranked_species || !urgency_level) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['rectangle_code', 'prediction_date', 'ranked_species', 'urgency_level'],
        received: { rectangle_code, prediction_date, has_ranked_species: !!ranked_species, urgency_level }
      });
    }

    // Validate species data format
    if (!Array.isArray(ranked_species) || ranked_species.length === 0) {
      return res.status(400).json({ error: 'ranked_species must be a non-empty array' });
    }

    for (const species of ranked_species) {
      if (!species.species_id || !species.species_name || typeof species.rank !== 'number' || typeof species.confidence !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid species format',
          expected: { species_id: 'string', species_name: 'string', rank: 'number', confidence: 'number' }
        });
      }
    }

    // Rate limiting: Check for recent impressions to prevent duplicates
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: recentImpressions, error: checkError } = await supabase
      .from('findr_prediction_impressions')
      .select('id')
      .eq('user_id', user.id)
      .eq('rectangle_code', rectangle_code)
      .gte('viewed_at', fiveMinutesAgo);

    if (checkError) {
      console.error('[Record Impression] Recent impression check failed:', checkError);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (recentImpressions && recentImpressions.length > 0) {
      console.info('[Record Impression] Skipping duplicate impression within 5 minutes', {
        user_id: user.id,
        rectangle_code,
        recent_count: recentImpressions.length
      });
      return res.status(200).json({ 
        success: true, 
        skipped: true,
        message: 'Duplicate impression within rate limit window' 
      });
    }

    // Create impression record
    const impressionData = {
      user_id: user.id,
      rectangle_code,
      prediction_date,
      ranked_species,
      environmental_snapshot: environmental_snapshot || null,
      urgency_level,
      source,
      viewed_at: new Date().toISOString()
    };

    const { data: impression, error: insertError } = await supabase
      .from('findr_prediction_impressions')
      .insert(impressionData)
      .select('id, created_at')
      .single();

    if (insertError) {
      console.error('[Record Impression] Insert failed:', insertError);
      return res.status(500).json({
        error: 'Failed to record impression',
        details: insertError.message,
        code: insertError.code
      });
    }

    console.info('[Record Impression] Successfully recorded', {
      impression_id: impression.id,
      user_id: user.id,
      rectangle_code,
      species_count: ranked_species.length,
      urgency_level
    });

    res.status(201).json({
      success: true,
      impression_id: impression.id,
      created_at: impression.created_at
    });

  } catch (error) {
    console.error('[Record Impression] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}