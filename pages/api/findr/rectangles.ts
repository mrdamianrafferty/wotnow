import type { PostgrestError } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

interface RectangleRow {
  id?: string | null;
  rectangle_code?: string | null;
  region?: string | null;
  center_lat?: number | string | null;
  center_lon?: number | string | null;
  distance_to_shore_km?: number | string | null;
  is_coastal?: boolean | null;
}

export interface RectangleOptionResponse {
  code: string;
  label: string;
  region: string;
  centerLat: number;
  centerLon: number;
  distanceToShoreKm?: number;
}

function normaliseNumber(input: number | string | null | undefined): number | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = Number.parseFloat(input);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function mapRowToOption(row: RectangleRow): RectangleOptionResponse | null {
  const code = row.rectangle_code?.trim();
  const centerLat = normaliseNumber(row.center_lat);
  const centerLon = normaliseNumber(row.center_lon);

  if (!code || centerLat === undefined || centerLon === undefined) {
    return null;
  }

  const region = row.region?.trim() || 'Unknown region';
  const distanceToShoreKm = normaliseNumber(row.distance_to_shore_km);

  return {
    code,
    label: region,
    region,
    centerLat,
    centerLon,
    distanceToShoreKm: distanceToShoreKm ?? undefined,
  };
}

interface RectangleSource {
  table: string;
  supportsCoastalFilter: boolean;
}

const RECTANGLE_SOURCES: RectangleSource[] = [
  { table: 'findr_rectangles', supportsCoastalFilter: true },
  { table: 'ices_rectangles', supportsCoastalFilter: true },
];

function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === '42703';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseServerClient();
    const includeNonCoastal = req.query.includeNonCoastal === 'true';

    let lastError: PostgrestError | null = null;

    for (const source of RECTANGLE_SOURCES) {
      const query = supabase
        .from(source.table)
        .select('rectangle_code, region, center_lat, center_lon, distance_to_shore_km, is_coastal')
        .order('rectangle_code', { ascending: true })
        .limit(600);

      if (!includeNonCoastal && source.supportsCoastalFilter) {
        query.eq('is_coastal', true);
      }

      const { data, error } = await query;

      if (error) {
        lastError = error;

        if (isMissingRelationError(error)) {
          console.warn(`[findr] Rectangle source ${source.table} missing, falling back`, error.message);
          continue;
        }

        console.error(`[findr] Failed to load rectangles from ${source.table}`, error);
        continue;
      }

      const options = (data ?? [])
        .map(mapRowToOption)
        .filter((item): item is RectangleOptionResponse => item !== null)
        .sort((a, b) => a.code.localeCompare(b.code, 'en'));

      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=43200');
      return res.status(200).json({ options, count: options.length, source: source.table });
    }

    if (lastError) {
      return res.status(502).json({
        error: 'Failed to load rectangle options',
        details: lastError.message,
        code: lastError.code,
      });
    }

    return res.status(502).json({
      error: 'No rectangle data sources available',
    });
  } catch (error) {
    console.error('[findr] Unexpected rectangles API error', error);
    return res.status(500).json({ error: 'Unexpected server error', details: (error as Error).message });
  }
}
