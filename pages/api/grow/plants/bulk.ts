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
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;
  const { plants } = req.body ?? {};

  if (!Array.isArray(plants) || plants.length === 0) {
    return res.status(400).json({ error: 'plants array is required' });
  }

  const rows = plants
    .map((plant: Record<string, unknown>): InsertPlantRow | null => {
      const name = typeof plant.name === 'string' ? plant.name.trim() : null;
      const type = typeof plant.type === 'string' ? plant.type.trim() : null;

      if (!name || !type) {
        return null;
      }

      const health = typeof plant.health === 'string' && ALLOWED_HEALTH_VALUES.has(plant.health)
        ? plant.health
        : 'good';

      return {
        user_id: userId,
        name,
        type,
        location: typeof plant.location === 'string' ? plant.location.trim() : null,
        health,
        planted_at: toIsoString(plant.planted),
        last_watered_at: toIsoString(plant.lastWatered),
        notes: typeof plant.notes === 'string' ? plant.notes : null,
      };
    })
    .filter((row): row is InsertPlantRow => row !== null);

  if (rows.length === 0) {
    return res.status(400).json({ error: 'No valid plants to add' });
  }

  const { data, error } = await supabase
    .from('grow_user_plants')
    .insert(rows)
    .select('*');

  if (error) {
    return res.status(500).json({ error: 'Failed to add plants' });
  }

  const serialized = (data as PlantRow[]).map(serializePlant);
  return res.status(201).json({ plants: serialized });
}
