import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../../../lib/grow/server/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { bedId } = req.query;

  if (typeof bedId !== 'string' || bedId.length === 0) {
    return res.status(400).json({ error: 'bedId is required' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  const { plantingId, targetBedId } = req.body ?? {};

  if (!plantingId || !targetBedId) {
    return res.status(400).json({ error: 'plantingId and targetBedId are required' });
  }

  if (targetBedId === bedId) {
    return res.status(400).json({ error: 'Cannot move to the same bed' });
  }

  // Verify source bed ownership
  const { data: sourceBed, error: srcErr } = await supabase
    .from('grow_garden_beds')
    .select('id')
    .eq('id', bedId)
    .eq('user_id', userId)
    .single();

  if (srcErr || !sourceBed) {
    return res.status(404).json({ error: 'Source bed not found' });
  }

  // Verify target bed ownership
  const { data: targetBed, error: tgtErr } = await supabase
    .from('grow_garden_beds')
    .select('id')
    .eq('id', targetBedId)
    .eq('user_id', userId)
    .single();

  if (tgtErr || !targetBed) {
    return res.status(404).json({ error: 'Target bed not found' });
  }

  // Verify planting exists and is active
  const { data: planting, error: plantingErr } = await supabase
    .from('grow_bed_plantings')
    .select('id, plant_id, quantity')
    .eq('id', plantingId)
    .eq('bed_id', bedId)
    .is('removed_at', null)
    .single();

  if (plantingErr || !planting) {
    return res.status(404).json({ error: 'Planting not found or already removed' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Set removed_at on source planting (preserves history)
  const { error: removeErr } = await supabase
    .from('grow_bed_plantings')
    .update({ removed_at: today })
    .eq('id', plantingId);

  if (removeErr) {
    return res.status(500).json({ error: 'Failed to remove from source bed' });
  }

  // Insert new planting in target bed
  const { data: newPlanting, error: insertErr } = await supabase
    .from('grow_bed_plantings')
    .insert({
      bed_id: targetBedId,
      plant_id: planting.plant_id,
      quantity: planting.quantity,
      planted_at: today,
    })
    .select('id')
    .single();

  if (insertErr || !newPlanting) {
    return res.status(500).json({ error: 'Failed to add to target bed' });
  }

  return res.status(200).json({ success: true, newPlantingId: newPlanting.id });
}
