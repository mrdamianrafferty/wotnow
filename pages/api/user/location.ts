import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import type { UnifiedLocationRecord } from '../../../context/UnifiedLocationContext';

type ApiResponse =
  | { location: UnifiedLocationRecord | null }
  | { error: string };

const ALLOWED_SOURCES = new Set(['manual', 'gps', 'ip']);

function parseUnifiedLocation(row: Record<string, unknown> | null): UnifiedLocationRecord | null {
  if (!row) return null;

  const coordinates = (row.home_coordinates as Record<string, unknown> | null) ?? null;
  const lat = typeof coordinates?.lat === 'number' ? coordinates.lat : null;
  const lon = typeof coordinates?.lon === 'number' ? coordinates.lon : null;
  const rectangleCode =
    typeof coordinates?.rectangleCode === 'string'
      ? (coordinates.rectangleCode as string)
      : Array.isArray(row.preferred_rectangles) && typeof row.preferred_rectangles[0] === 'string'
        ? (row.preferred_rectangles[0] as string)
        : null;
  const rectangleRegion =
    typeof coordinates?.rectangleRegion === 'string'
      ? (coordinates.rectangleRegion as string)
      : (row.home_region as string | null) ??
        (row.home_place_name as string | null) ??
        null;
  const rectangleLabel =
    typeof coordinates?.rectangleLabel === 'string'
      ? (coordinates.rectangleLabel as string)
      : (row.home_location_name as string | null) ??
        (rectangleCode && rectangleRegion ? `${rectangleCode} - ${rectangleRegion}` : null);

  const accuracy =
    typeof coordinates?.accuracy === 'number'
      ? (coordinates.accuracy as number)
      : null;
  const source =
    typeof row.location_source === 'string' && ALLOWED_SOURCES.has(row.location_source)
      ? (row.location_source as UnifiedLocationRecord['source'])
      : 'manual';

  if (lat === null && lon === null && !rectangleCode && !rectangleLabel) {
    return null;
  }

  return {
    lat,
    lon,
    rectangleCode,
    rectangleRegion,
    rectangleLabel,
    source,
    accuracy,
    updatedAt: typeof row.updated_at === 'string'
      ? row.updated_at
      : new Date().toISOString(),
  };
}

function buildHomeCoordinatesPayload(record: UnifiedLocationRecord | null) {
  if (!record || record.lat == null || record.lon == null) return null;
  return {
    lat: record.lat,
    lon: record.lon,
    accuracy: record.accuracy,
    rectangleCode: record.rectangleCode,
    rectangleRegion: record.rectangleRegion,
    rectangleLabel: record.rectangleLabel,
    updatedAt: record.updatedAt,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const supabase = getSupabaseServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[user/location] Failed to read auth session', sessionError);
    res.status(500).json({ error: 'Unable to verify authentication status' });
    return;
  }

  const userId = session?.user?.id ?? null;

  if (!userId) {
    // Treat unauthenticated callers as empty location.
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ location: null });
      return;
    }
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  switch (req.method) {
    case 'GET': {
      res.setHeader('Cache-Control', 'no-store');
      const { data, error } = await supabase
        .from('user_location_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[user/location] GET failed', error);
        res.status(500).json({ error: 'Failed to load saved location' });
        return;
      }

      res.status(200).json({
        location: parseUnifiedLocation(data as Record<string, unknown> | null),
      });
      return;
    }

    case 'POST': {
      res.setHeader('Cache-Control', 'no-store');
      const record = req.body as UnifiedLocationRecord | null;
      if (!record) {
        res.status(400).json({ error: 'Missing location payload' });
        return;
      }

      const { data: existing, error: existingError } = await supabase
        .from('user_location_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[user/location] POST fetch existing failed', existingError);
        res.status(500).json({ error: 'Failed to persist location (read stage)' });
        return;
      }

      const existingRow = existing as Record<string, unknown> | null;
      const existingRectangles = Array.isArray(existingRow?.preferred_rectangles)
        ? (existingRow?.preferred_rectangles as string[])
        : [];
      const preferredSet = new Set(existingRectangles);
      if (record.rectangleCode) {
        preferredSet.add(record.rectangleCode);
      }

      const payload = {
        home_coordinates: buildHomeCoordinatesPayload(record),
        home_region: record.rectangleRegion ?? (existingRow?.home_region as string | null) ?? null,
        home_place_name: record.rectangleRegion ?? (existingRow?.home_place_name as string | null) ?? null,
        home_location_name: record.rectangleLabel ?? (existingRow?.home_location_name as string | null) ?? null,
        preferred_rectangles: Array.from(preferredSet),
        location_source: ALLOWED_SOURCES.has(record.source) ? record.source : 'manual',
        updated_at: new Date().toISOString(),
      };

      if (existingRow) {
        const { error: updateError } = await supabase
          .from('user_location_preferences')
          .update(payload)
          .eq('user_id', userId);

        if (updateError) {
          console.error('[user/location] POST update failed', updateError);
          res.status(500).json({ error: 'Failed to update saved location' });
          return;
        }
      } else {
        const insertPayload = {
          user_id: userId,
          ...payload,
        };

        const { error: insertError } = await supabase
          .from('user_location_preferences')
          .insert(insertPayload);

        if (insertError) {
          console.error('[user/location] POST insert failed', insertError);
          res.status(500).json({ error: 'Failed to create saved location' });
          return;
        }
      }

      res.status(200).json({ location: record });
      return;
    }

    case 'DELETE': {
      res.setHeader('Cache-Control', 'no-store');
      const { data: existing, error } = await supabase
        .from('user_location_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[user/location] DELETE read failed', error);
        res.status(500).json({ error: 'Failed to clear saved location' });
        return;
      }

      if (!existing) {
        res.status(204).end();
        return;
      }

      const clearPayload = {
        home_coordinates: null,
        home_region: null,
        home_place_name: null,
        home_location_name: null,
        updated_at: new Date().toISOString(),
      };

      const { error: clearError } = await supabase
        .from('user_location_preferences')
        .update(clearPayload)
        .eq('user_id', userId);

      if (clearError) {
        console.error('[user/location] DELETE update failed', clearError);
        res.status(500).json({ error: 'Failed to clear saved location' });
        return;
      }

      res.status(204).end();
      return;
    }

    default: {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
  }
}
