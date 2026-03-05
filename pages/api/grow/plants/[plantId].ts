import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializePlant, type PlantRow, type InsertPlantRow } from '../../../../lib/grow/server/plants';

const ALLOWED_HEALTH_VALUES = new Set(['excellent', 'good', 'fair', 'poor']);

function toIsoString(value?: unknown): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { plantId } = req.query;

  if (typeof plantId !== 'string' || plantId.length === 0) {
    return res.status(400).json({ error: 'plantId is required' });
  }

  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'PUT,DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  if (req.method === 'DELETE') {
    const { data, error } = await supabase
      .from('grow_user_plants')
      .delete()
      .eq('id', plantId)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to delete plant' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    return res.status(200).json({ success: true, plant: serializePlant(data as PlantRow) });
  }

  const { name, type, location, health, planted, lastWatered, notes, quantity, bedId } = req.body ?? {};

  const updates: Partial<InsertPlantRow> = {};

  if (typeof name === 'string') {
    updates.name = name.trim();
  }
  if (typeof type === 'string') {
    updates.type = type.trim();
  }
  if (typeof location === 'string') {
    updates.location = location.trim();
  }
  if (typeof health === 'string' && ALLOWED_HEALTH_VALUES.has(health)) {
    updates.health = health;
  }
  if (planted !== undefined) {
    updates.planted_at = toIsoString(planted);
  }
  if (lastWatered !== undefined) {
    updates.last_watered_at = toIsoString(lastWatered);
  }
  if (notes !== undefined) {
    updates.notes = typeof notes === 'string' ? notes : null;
  }
  if (quantity !== undefined) {
    // Accept numeric or null; coerce strings to numbers when possible
    if (quantity === null) {
      updates.quantity = null;
    } else {
      const n = Number(quantity);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        updates.quantity = Math.max(0, Math.floor(n));
      } else {
        // ignore invalid quantity values (do not treat as fatal)
      }
    }
  }

  if (bedId !== undefined) {
    updates.bed_id = typeof bedId === 'string' ? bedId : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const { data, error } = await supabase
    .from('grow_user_plants')
    .update(updates)
    .eq('id', plantId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Failed to update plant' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Plant not found' });
  }

  return res.status(200).json({ plant: serializePlant(data as PlantRow) });
}
