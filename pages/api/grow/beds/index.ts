import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializeBed, buildPlantSummary, nextBedColor, type BedRow, type PlantingSummaryRow } from '../../../../lib/grow/server/beds';
import { getTierLimits, isOverLimit, type GrowSubscriptionTier } from '../../../../lib/grow/subscription';

const ALLOWED_TYPES = new Set(['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    const { data: beds, error } = await supabase
      .from('grow_garden_beds')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[grow] Failed to load beds for user', userId, error);
      return res.status(500).json({ error: 'Failed to load beds' });
    }

    // Get planting details per bed (active only) — names + quantities for summary
    const bedIds = (beds as BedRow[]).map(b => b.id);
    const plantCounts: Record<string, number> = {};
    const plantSummaries: Record<string, string> = {};

    if (bedIds.length > 0) {
      const { data: plantings, error: plantingsError } = await supabase
        .from('grow_bed_plantings')
        .select('bed_id, quantity, grow_user_plants!inner(name)')
        .in('bed_id', bedIds)
        .is('removed_at', null);

      if (!plantingsError && plantings) {
        const byBed: Record<string, PlantingSummaryRow[]> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of plantings as any[]) {
          if (row.bed_id) {
            plantCounts[row.bed_id] = (plantCounts[row.bed_id] || 0) + 1;
            // Supabase !inner returns the related row as an object (not array) for to-one joins
            const normalized: PlantingSummaryRow = {
              bed_id: row.bed_id,
              quantity: row.quantity,
              grow_user_plants: row.grow_user_plants,
            };
            (byBed[row.bed_id] ??= []).push(normalized);
          }
        }
        for (const [bedId, rows] of Object.entries(byBed)) {
          plantSummaries[bedId] = buildPlantSummary(rows);
        }
      }
    }

    const serialized = (beds as BedRow[]).map(b =>
      serializeBed(b, plantCounts[b.id] || 0, plantSummaries[b.id] || '')
    );

    return res.status(200).json({ beds: serialized });
  }

  // POST: Create a new bed

  // Get subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('grow_subscription_tier')
    .eq('id', userId)
    .single();

  const userTier = (profile?.grow_subscription_tier as GrowSubscriptionTier) || 'seed';

  // Check bed limit
  const { count, error: countError } = await supabase
    .from('grow_garden_beds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    console.error('[grow] Failed to count beds for user', userId, countError);
  } else if (count !== null && isOverLimit(userTier, 'maxBeds', count)) {
    const limits = getTierLimits(userTier);
    return res.status(403).json({
      error: 'Bed limit reached',
      message: `You've reached your limit of ${limits.maxBeds} beds. Upgrade to create more.`,
      currentCount: count,
      limit: limits.maxBeds,
      tier: userTier,
      upgradeUrl: '/grow/premium',
    });
  }

  const { name, type } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (!type || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: 'type must be one of: raised_bed, container, in_ground, greenhouse, polytunnel, other' });
  }

  const color = nextBedColor(count ?? 0);
  const sortOrder = (count ?? 0);

  const { data, error } = await supabase
    .from('grow_garden_beds')
    .insert({
      user_id: userId,
      name: String(name).trim(),
      type,
      color,
      sort_order: sortOrder,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[grow] Failed to create bed for user', userId, error);
    return res.status(500).json({ error: 'Failed to create bed' });
  }

  return res.status(201).json({ bed: serializeBed(data as BedRow, 0) });
}
