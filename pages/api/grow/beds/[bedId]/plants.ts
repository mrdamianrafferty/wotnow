import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../../lib/grow/server/auth';

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

  if (req.method === 'POST') {
    // Assign plants to bed: update bed_id + insert planting history
    const { error: updateError } = await supabase
      .from('grow_user_plants')
      .update({ bed_id: bedId })
      .in('id', validIds)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[grow] Failed to assign plants to bed', bedId, updateError);
      return res.status(500).json({ error: 'Failed to assign plants' });
    }

    // Insert planting history records
    const historyRows = validIds.map(plantId => ({
      bed_id: bedId,
      plant_id: plantId,
      planted_at: new Date().toISOString().split('T')[0],
    }));

    const { error: historyError } = await supabase
      .from('grow_bed_plantings')
      .insert(historyRows);

    if (historyError) {
      // Non-fatal: plants are assigned but history didn't save
      console.warn('[grow] Failed to record planting history', historyError);
    }

    return res.status(200).json({ success: true, assignedCount: validIds.length });
  }

  // DELETE: Unassign plants from bed
  const { error: updateError } = await supabase
    .from('grow_user_plants')
    .update({ bed_id: null })
    .in('id', validIds)
    .eq('user_id', userId)
    .eq('bed_id', bedId);

  if (updateError) {
    console.error('[grow] Failed to unassign plants from bed', bedId, updateError);
    return res.status(500).json({ error: 'Failed to unassign plants' });
  }

  // Set removed_at on history records
  const today = new Date().toISOString().split('T')[0];
  const { error: historyError } = await supabase
    .from('grow_bed_plantings')
    .update({ removed_at: today })
    .eq('bed_id', bedId)
    .in('plant_id', validIds)
    .is('removed_at', null);

  if (historyError) {
    console.warn('[grow] Failed to update planting history', historyError);
  }

  return res.status(200).json({ success: true, removedCount: validIds.length });
}
