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

interface RecordBlankTripRequest {
  rectangle_code: string;
  started_at: string; // ISO timestamp
  ended_at?: string; // ISO timestamp
  target_species_ids: string[]; // What user was trying to catch
  bait_used?: string;
  habitat_type?: string;
  method?: 'shore' | 'boat' | 'kayak';
  notes?: string;
  followed_findr_advice: boolean;
  environmental_conditions?: EnvironmentalConditions;
  outcome?: 'blank' | 'conditions_poor' | 'equipment_issue';
}

/**
 * API Route: Record Blank Trip
 * 
 * Logs unsuccessful fishing sessions where no fish were caught.
 * This data is valuable for validation as it shows when predictions failed
 * or when conditions weren't as good as expected.
 * 
 * POST /api/findr/record-blank-trip
 * - Links to recent prediction impressions if user was following Findr advice
 * - Records environmental conditions at time of fishing
 * - Creates special catch entry with is_blank_trip = true
 * - Provides encouraging messaging to frame as valuable contribution
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract and verify user authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.warn('[Record Blank Trip] Auth verification failed:', authError?.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    // Validate request body
    const {
      rectangle_code,
      started_at,
      ended_at,
      target_species_ids,
      bait_used,
      habitat_type,
      method,
      notes,
      followed_findr_advice,
      environmental_conditions,
      outcome = 'blank'
    }: RecordBlankTripRequest = req.body;

    if (!rectangle_code || !started_at || !Array.isArray(target_species_ids) || 
        typeof followed_findr_advice !== 'boolean') {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['rectangle_code', 'started_at', 'target_species_ids', 'followed_findr_advice']
      });
    }

    // Find recent prediction impression to link this blank trip to (if user was following advice)
    let linkedImpressionId: string | null = null;

    if (followed_findr_advice) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: recentImpressions, error: impressionError } = await supabase
        .from('findr_prediction_impressions')
        .select('id, ranked_species, viewed_at')
        .eq('user_id', user.id)
        .eq('rectangle_code', rectangle_code)
        .gte('viewed_at', twentyFourHoursAgo)
        .order('viewed_at', { ascending: false })
        .limit(1);

      if (impressionError) {
        console.warn('[Record Blank Trip] Failed to query impressions:', impressionError);
      } else if (recentImpressions && recentImpressions.length > 0) {
        linkedImpressionId = recentImpressions[0].id;
        console.info('[Record Blank Trip] Linked to prediction impression', {
          impression_id: linkedImpressionId,
          target_species: target_species_ids
        });
      }
    }

    // Create catch entry with is_blank_trip = true
    const blankTripEntry = {
      user_id: user.id,
      species_id: 'BLANK',
      species_common_name: 'No catch',
      scientific_name: null,
      rectangle_code,
      prediction_impression_id: linkedImpressionId,
      caught_at: started_at, // Use session start time as the "catch" time
      logged_at: new Date().toISOString(),
      quantity: 0,
      size_category: null,
      weight_kg: null,
      length_cm: null,
      bait_used: bait_used || null,
      method: method || null,
      habitat_type: habitat_type || null,
      depth_range: null,
      notes: notes || null,
      photo_urls: null,
      followed_findr_advice,
      used_recommended_bait: false, // N/A for blank trips
      used_recommended_habitat: false, // N/A for blank trips
      is_blank_trip: true,
      environmental_conditions: environmental_conditions || null
    };

    const { data: insertedTrip, error: insertError } = await supabase
      .from('findr_catch_entries')
      .insert(blankTripEntry)
      .select(`
        id,
        caught_at,
        logged_at,
        rectangle_code,
        bait_used,
        habitat_type,
        notes,
        followed_findr_advice,
        environmental_conditions
      `)
      .single();

    if (insertError) {
      console.error('[Record Blank Trip] Insert failed:', insertError);
      return res.status(500).json({ error: 'Failed to record blank trip' });
    }

    // Also create a fishing session record for better session tracking
    if (target_species_ids.length > 0) {
      const sessionData = {
        user_id: user.id,
        rectangle_code,
        prediction_impression_id: linkedImpressionId,
        started_at,
        ended_at: ended_at || new Date().toISOString(),
        target_species_ids,
        outcome,
        notes: notes || null
      };

      const { error: sessionError } = await supabase
        .from('findr_fishing_sessions')
        .insert(sessionData);

      if (sessionError) {
        console.warn('[Record Blank Trip] Session insert failed:', sessionError);
        // Don't fail the request if session creation fails
      }
    }

    console.info('[Record Blank Trip] Successfully recorded', {
      trip_id: insertedTrip.id,
      user_id: user.id,
      rectangle_code,
      target_species: target_species_ids,
      followed_advice: followed_findr_advice,
      linked_impression: linkedImpressionId
    });

    res.status(201).json({
      success: true,
      trip: {
        id: insertedTrip.id,
        caught_at: insertedTrip.caught_at,
        logged_at: insertedTrip.logged_at,
        rectangle_code: insertedTrip.rectangle_code,
        bait_used: insertedTrip.bait_used,
        habitat_type: insertedTrip.habitat_type,
        notes: insertedTrip.notes,
        followed_findr_advice: insertedTrip.followed_findr_advice,
        environmental_conditions: insertedTrip.environmental_conditions,
        target_species: target_species_ids,
        outcome,
        prediction_linked: !!linkedImpressionId
      },
      message: 'Thanks for logging this session. Data from challenging conditions helps us improve predictions for everyone.'
    });

  } catch (error) {
    console.error('[Record Blank Trip] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}