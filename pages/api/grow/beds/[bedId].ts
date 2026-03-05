import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializeBed, type BedRow } from '../../../../lib/grow/server/beds';
import { serializePlant, type PlantRow } from '../../../../lib/grow/server/plants';

const ALLOWED_TYPES = new Set(['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other']);
const ALLOWED_SUN = new Set(['full_sun', 'partial_shade', 'full_shade']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { bedId } = req.query;

  if (typeof bedId !== 'string' || bedId.length === 0) {
    return res.status(400).json({ error: 'bedId is required' });
  }

  if (req.method !== 'GET' && req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET,PUT,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    const { data: bed, error } = await supabase
      .from('grow_garden_beds')
      .select('*')
      .eq('id', bedId)
      .eq('user_id', userId)
      .single();

    if (error || !bed) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    // Get plants in this bed
    const { data: plants, error: plantsError } = await supabase
      .from('grow_user_plants')
      .select('*')
      .eq('bed_id', bedId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (plantsError) {
      console.error('[grow] Failed to load plants for bed', bedId, plantsError);
    }

    const serializedPlants = (plants as PlantRow[] || []).map(serializePlant);

    return res.status(200).json({
      bed: serializeBed(bed as BedRow, serializedPlants.length),
      plants: serializedPlants,
    });
  }

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from('grow_garden_beds')
      .delete()
      .eq('id', bedId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to delete bed' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Bed not found' });
    }

    return res.status(200).json({ success: true, bed: serializeBed(data as BedRow, 0) });
  }

  // PUT: Update bed
  const { name, type, color, notes, sunExposure, soilType, sizeLabel, sortOrder } = req.body ?? {};

  const updates: Record<string, unknown> = {};

  if (typeof name === 'string' && name.trim()) {
    updates.name = name.trim();
  }
  if (typeof type === 'string' && ALLOWED_TYPES.has(type)) {
    updates.type = type;
  }
  if (typeof color === 'string') {
    updates.color = color;
  }
  if (notes !== undefined) {
    updates.notes = typeof notes === 'string' ? notes.trim() || null : null;
  }
  if (typeof sunExposure === 'string' && ALLOWED_SUN.has(sunExposure)) {
    updates.sun_exposure = sunExposure;
  } else if (sunExposure === null) {
    updates.sun_exposure = null;
  }
  if (typeof soilType === 'string') {
    updates.soil_type = soilType.trim() || null;
  } else if (soilType === null) {
    updates.soil_type = null;
  }
  if (typeof sizeLabel === 'string') {
    updates.size_label = sizeLabel.trim() || null;
  } else if (sizeLabel === null) {
    updates.size_label = null;
  }
  if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) {
    updates.sort_order = Math.max(0, Math.floor(sortOrder));
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('grow_garden_beds')
    .update(updates)
    .eq('id', bedId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update bed' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  // Get plant count for the response
  const { count: plantCount } = await supabase
    .from('grow_user_plants')
    .select('id', { count: 'exact', head: true })
    .eq('bed_id', bedId);

  return res.status(200).json({ bed: serializeBed(data as BedRow, plantCount ?? 0) });
}
