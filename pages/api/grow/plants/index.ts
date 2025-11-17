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
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('grow_user_plants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[grow] Failed to load plants for user', userId, error);
      return res.status(500).json({
        error: error.message || 'Failed to load plants',
        details: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }

    const plants = (data as PlantRow[]).map(serializePlant);
    return res.status(200).json({ plants });
  }

  const { name, type, location, health, planted, lastWatered, notes } = req.body ?? {};

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  const normalizedHealth = typeof health === 'string' && ALLOWED_HEALTH_VALUES.has(health)
    ? health
    : 'good';

  const insertPayload: InsertPlantRow = {
    user_id: userId,
    name: String(name).trim(),
    type: String(type).trim(),
    location: location ? String(location).trim() : null,
    health: normalizedHealth,
    planted_at: toIsoString(planted),
    last_watered_at: toIsoString(lastWatered),
    notes: notes ? String(notes) : null,
  };

  const { data, error } = await supabase
    .from('grow_user_plants')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    console.error('[grow] Failed to add plant for user', userId, error);
    return res.status(500).json({
      error: error.message || 'Failed to add plant',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }

  return res.status(201).json({ plant: serializePlant(data as PlantRow) });
}
