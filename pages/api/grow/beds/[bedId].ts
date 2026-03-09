import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializeBed, serializeBedPlanting, buildPlantSummary, type BedRow } from '../../../../lib/grow/server/beds';

const ALLOWED_TYPES = new Set(['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other', 'veg_patch', 'permaculture_space']);
const ALLOWED_SUN = new Set(['full_sun', 'partial_shade', 'full_shade']);
const ALLOWED_ROTATION_MODES = new Set(['rotating', 'mixed']);
const ALLOWED_DEDICATED_GROUPS = new Set(['brassica', 'legume', 'root_allium', 'solanaceae', 'cucurbit']);

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

    // Get active plantings via grow_bed_plantings junction table
    const { data: plantings, error: plantingsError } = await supabase
      .from('grow_bed_plantings')
      .select('id, bed_id, plant_id, quantity, planted_at, removed_at, harvest_data, created_at, grow_user_plants!inner(id, name, type, species_slug, variety, photo_url)')
      .eq('bed_id', bedId)
      .is('removed_at', null)
      .order('planted_at', { ascending: true });

    if (plantingsError) {
      console.error('[grow] Failed to load plantings for bed', bedId, plantingsError);
    }

    const plantingRows = (plantings as any[] || []); // eslint-disable-line @typescript-eslint/no-explicit-any
    const serializedPlantings = plantingRows.map(serializeBedPlanting);
    const summary = buildPlantSummary(plantingRows);

    // Get historical (removed) plantings
    const { data: historyRows, error: historyError } = await supabase
      .from('grow_bed_plantings')
      .select('id, bed_id, plant_id, quantity, planted_at, removed_at, harvest_data, created_at, grow_user_plants!inner(id, name, type, species_slug, variety, photo_url)')
      .eq('bed_id', bedId)
      .not('removed_at', 'is', null)
      .order('removed_at', { ascending: false })
      .limit(50);

    if (historyError) {
      console.error('[grow] Failed to load history for bed', bedId, historyError);
    }

    const history = (historyRows as any[] || []).map(serializeBedPlanting); // eslint-disable-line @typescript-eslint/no-explicit-any

    return res.status(200).json({
      bed: serializeBed(bed as BedRow, serializedPlantings.length, summary),
      plantings: serializedPlantings,
      history,
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
  const { name, type, color, notes, sunExposure, soilType, sizeLabel, sortOrder, rotationMode, dedicatedGroup } = req.body ?? {};

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
  if (typeof rotationMode === 'string' && ALLOWED_ROTATION_MODES.has(rotationMode)) {
    updates.rotation_mode = rotationMode;
  } else if (rotationMode === null) {
    updates.rotation_mode = null;
  }
  if (typeof dedicatedGroup === 'string' && ALLOWED_DEDICATED_GROUPS.has(dedicatedGroup)) {
    updates.dedicated_group = dedicatedGroup;
  } else if (dedicatedGroup === null) {
    updates.dedicated_group = null;
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

  // Get plant count from grow_bed_plantings (active only)
  const { count: plantCount } = await supabase
    .from('grow_bed_plantings')
    .select('id', { count: 'exact', head: true })
    .eq('bed_id', bedId)
    .is('removed_at', null);

  return res.status(200).json({ bed: serializeBed(data as BedRow, plantCount ?? 0) });
}
