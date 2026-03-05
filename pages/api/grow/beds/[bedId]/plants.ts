import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../../lib/grow/server/auth';

type Assignment = { plantId: string; quantity: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { bedId } = req.query;

  if (typeof bedId !== 'string' || bedId.length === 0) {
    return res.status(400).json({ error: 'bedId is required' });
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  // Verify bed ownership
  const { data: bed, error: bedError } = await supabase
    .from('grow_garden_beds')
    .select('id')
    .eq('id', bedId)
    .eq('user_id', userId)
    .single();

  if (bedError || !bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  if (req.method === 'POST') {
    // Accept new { assignments } format or legacy { plantIds } format
    let assignments: Assignment[];
    const body = req.body ?? {};

    if (Array.isArray(body.assignments) && body.assignments.length > 0) {
      assignments = body.assignments.map((a: { plantId?: string; quantity?: number }) => ({
        plantId: a.plantId,
        quantity: typeof a.quantity === 'number' && a.quantity >= 1 ? Math.floor(a.quantity) : 1,
      }));
    } else if (Array.isArray(body.plantIds) && body.plantIds.length > 0) {
      // Backward compat: convert plantIds to assignments with quantity=1
      assignments = body.plantIds.map((id: string) => ({ plantId: id, quantity: 1 }));
    } else {
      return res.status(400).json({ error: 'assignments array (or legacy plantIds) is required' });
    }

    const plantIds = assignments.map(a => a.plantId);

    // Validate all plantIds belong to the user
    const { data: plants, error: plantsError } = await supabase
      .from('grow_user_plants')
      .select('id')
      .in('id', plantIds)
      .eq('user_id', userId);

    if (plantsError || !plants) {
      return res.status(500).json({ error: 'Failed to validate plants' });
    }

    const validIdSet = new Set(plants.map(p => p.id));
    const validAssignments = assignments.filter(a => validIdSet.has(a.plantId));
    if (validAssignments.length === 0) {
      return res.status(400).json({ error: 'No valid plant IDs found' });
    }

    // Check for existing active plantings to avoid duplicates / update quantity
    const { data: existing } = await supabase
      .from('grow_bed_plantings')
      .select('id, plant_id, quantity')
      .eq('bed_id', bedId)
      .in('plant_id', validAssignments.map(a => a.plantId))
      .is('removed_at', null);

    const existingMap = new Map((existing || []).map(e => [e.plant_id, e]));

    const toInsert: { bed_id: string; plant_id: string; quantity: number; planted_at: string }[] = [];
    const toUpdate: { id: string; quantity: number }[] = [];

    for (const a of validAssignments) {
      const ex = existingMap.get(a.plantId);
      if (ex) {
        // Already assigned — update quantity
        toUpdate.push({ id: ex.id, quantity: a.quantity });
      } else {
        toInsert.push({
          bed_id: bedId,
          plant_id: a.plantId,
          quantity: a.quantity,
          planted_at: new Date().toISOString().split('T')[0],
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('grow_bed_plantings')
        .insert(toInsert);

      if (insertError) {
        console.error('[grow] Failed to insert plantings', insertError);
        return res.status(500).json({ error: 'Failed to assign plants' });
      }
    }

    // Update quantities for existing plantings
    for (const u of toUpdate) {
      await supabase
        .from('grow_bed_plantings')
        .update({ quantity: u.quantity })
        .eq('id', u.id);
    }

    return res.status(200).json({ success: true, assignedCount: validAssignments.length });
  }

  // DELETE: Unassign plants from bed
  const { plantIds } = req.body ?? {};

  if (!Array.isArray(plantIds) || plantIds.length === 0) {
    return res.status(400).json({ error: 'plantIds array is required' });
  }

  // Validate all plantIds belong to the user
  const { data: plants, error: plantsError } = await supabase
    .from('grow_user_plants')
    .select('id')
    .in('id', plantIds)
    .eq('user_id', userId);

  if (plantsError || !plants) {
    return res.status(500).json({ error: 'Failed to validate plants' });
  }

  const validIds = plants.map(p => p.id);
  if (validIds.length === 0) {
    return res.status(400).json({ error: 'No valid plant IDs found' });
  }

  // Set removed_at on active planting records
  const today = new Date().toISOString().split('T')[0];
  const { error: historyError } = await supabase
    .from('grow_bed_plantings')
    .update({ removed_at: today })
    .eq('bed_id', bedId)
    .in('plant_id', validIds)
    .is('removed_at', null);

  if (historyError) {
    console.error('[grow] Failed to remove plantings', historyError);
    return res.status(500).json({ error: 'Failed to unassign plants' });
  }

  return res.status(200).json({ success: true, removedCount: validIds.length });
}
