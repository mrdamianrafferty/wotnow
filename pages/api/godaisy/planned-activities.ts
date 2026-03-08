/**
 * Go Daisy+ Planned Activities API
 *
 * CRUD endpoints for planned activities journal.
 * Requires Go Daisy+ subscription.
 *
 * GET  - List user's planned activities (optional ?from=&to= date filters)
 * POST - Create a new planned activity
 * PUT  - Update an existing planned activity (requires ?id= param)
 * DELETE - Delete a planned activity (requires ?id= param)
 *
 * @route /api/godaisy/planned-activities
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAuthenticatedUser(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await authClient.auth.getUser(authHeader.substring(7));
  if (error || !user) return null;
  return user;
}

async function checkPlusTier(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data } = await supabase
    .from('profiles')
    .select('godaisy_subscription_tier')
    .eq('id', userId)
    .single();

  return data?.godaisy_subscription_tier === 'plus';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify Plus subscription
  const isPlus = await checkPlusTier(user.id);
  if (!isPlus) {
    return res.status(403).json({ error: 'Go Daisy+ subscription required' });
  }

  // Use anon client (RLS handles row-level security)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: req.headers.authorization! },
    },
  });

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, supabase);
    case 'POST':
      return handlePost(req, res, supabase, user.id);
    case 'PUT':
      return handlePut(req, res, supabase);
    case 'DELETE':
      return handleDelete(req, res, supabase);
    default:
      res.setHeader('Allow', 'GET, POST, PUT, DELETE');
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { from, to } = req.query;

  let query = supabase
    .from('godaisy_planned_activities')
    .select('*')
    .order('planned_date', { ascending: false })
    .limit(100);

  if (typeof from === 'string') {
    query = query.gte('planned_date', from);
  }
  if (typeof to === 'string') {
    query = query.lte('planned_date', to);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[planned-activities] GET error:', error);
    return res.status(500).json({ error: 'Failed to fetch planned activities' });
  }

  return res.status(200).json({ activities: data });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string
) {
  const { activity_key, planned_date, location_name, location_lat, location_lon, notes, weather_snapshot } = req.body;

  if (!activity_key || !planned_date) {
    return res.status(400).json({ error: 'activity_key and planned_date are required' });
  }

  const { data, error } = await supabase
    .from('godaisy_planned_activities')
    .insert({
      user_id: userId,
      activity_key,
      planned_date,
      location_name: location_name || null,
      location_lat: location_lat || null,
      location_lon: location_lon || null,
      notes: notes || null,
      weather_snapshot: weather_snapshot || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[planned-activities] POST error:', error);
    return res.status(500).json({ error: 'Failed to create planned activity' });
  }

  return res.status(201).json({ activity: data });
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'id query parameter required' });
  }

  const { status, notes, rating, completed_at } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  if (rating !== undefined) updates.rating = rating;
  if (completed_at !== undefined) updates.completed_at = completed_at;

  const { data, error } = await supabase
    .from('godaisy_planned_activities')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[planned-activities] PUT error:', error);
    return res.status(500).json({ error: 'Failed to update planned activity' });
  }

  return res.status(200).json({ activity: data });
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'id query parameter required' });
  }

  const { error } = await supabase
    .from('godaisy_planned_activities')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[planned-activities] DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete planned activity' });
  }

  return res.status(200).json({ success: true });
}
