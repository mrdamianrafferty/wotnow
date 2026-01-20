/**
 * /api/grow/outcomes/harvest
 *
 * API endpoint for managing harvest outcomes.
 *
 * GET: Retrieve user's harvest outcomes
 * POST: Record a new harvest outcome
 *
 * @module pages/api/grow/outcomes/harvest
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface HarvestOutcomeRequest {
  plantId: string;
  harvestDate?: string;
  quantityValue?: number;
  quantityUnit?: string;
  qualityRating?: number;
  qualityNotes?: string;
  metExpectations?: 'exceeded' | 'met' | 'below' | 'failed';
  daysFromPlanting?: number;
  photoUrls?: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user from authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const accessToken = authHeader.substring(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const userId = user.id;

  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const plantId = req.query.plantId as string;

      let query = supabase
        .from('grow_harvest_outcomes')
        .select('*')
        .eq('user_id', userId)
        .order('harvest_date', { ascending: false })
        .limit(limit);

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[HarvestOutcomes] Error fetching:', error);
        return res.status(500).json({ error: 'Failed to fetch harvest outcomes' });
      }

      return res.status(200).json({ outcomes: data || [] });
    } catch (error) {
      console.error('[HarvestOutcomes] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    const body = req.body as HarvestOutcomeRequest;

    if (!body.plantId) {
      return res.status(400).json({ error: 'plantId is required' });
    }

    try {
      const { data, error } = await supabase
        .from('grow_harvest_outcomes')
        .insert({
          user_id: userId,
          plant_id: body.plantId,
          harvest_date: body.harvestDate || new Date().toISOString().split('T')[0],
          quantity_value: body.quantityValue,
          quantity_unit: body.quantityUnit,
          quality_rating: body.qualityRating,
          quality_notes: body.qualityNotes,
          met_expectations: body.metExpectations,
          days_from_planting: body.daysFromPlanting,
          photo_urls: body.photoUrls,
        })
        .select()
        .single();

      if (error) {
        console.error('[HarvestOutcomes] Error inserting:', error);
        return res.status(500).json({ error: 'Failed to record harvest outcome' });
      }

      return res.status(201).json({ outcome: data });
    } catch (error) {
      console.error('[HarvestOutcomes] Exception:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
