import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '../../../lib/supabase/pages-api';
import type { UnifiedLocationRecord } from '../../../context/UnifiedLocationContext';
import type { SavedLocation, LocationSlot } from '../../../types/multiLocation';
import { fromLegacyFormat } from '../../../types/multiLocation';
import {
  parseLocationsArray,
  toLegacyFormat,
  buildLegacyHomeCoordinatesPayload,
  type DatabaseRow,
} from '../../../lib/multiLocation/apiHelpers';

type ApiResponse =
  | { location: UnifiedLocationRecord | null }
  | { locations: SavedLocation[]; activeLocationId: string | null }
  | { error: string };

const ALLOWED_SOURCES = new Set(['manual', 'gps', 'ip']);

function _parseUnifiedLocation(row: Record<string, unknown> | null): UnifiedLocationRecord | null {
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
  const supabase = createServerSupabaseClient({ req, res });
  // Use getUser() instead of getSession() for secure server-side auth validation
  // getSession() reads from cookies which could be spoofed; getUser() validates with Supabase Auth server
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Debug logging for auth issues
  const cookieNames = Object.keys(req.cookies);
  const hasSbCookies = cookieNames.some(name => name.startsWith('sb-'));
  console.log('[user/location] Auth debug:', {
    method: req.method,
    hasCookies: cookieNames.length > 0,
    hasSupabaseCookies: hasSbCookies,
    cookieCount: cookieNames.length,
    hasUser: !!user,
    userError: userError?.message,
  });

  if (userError && userError.message !== 'Auth session missing!') {
    console.error('[user/location] Failed to verify user', userError);
    res.status(500).json({ error: 'Unable to verify authentication status' });
    return;
  }

  const userId = user?.id ?? null;

  if (!userId) {
    // Treat unauthenticated callers as empty location.
    if (req.method === 'GET') {
      console.log('[user/location] GET request without auth - returning null');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ location: null });
      return;
    }
    console.log('[user/location] POST request without auth - returning 401');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  switch (req.method) {
    case 'GET': {
      res.setHeader('Cache-Control', 'no-store');

      // Check if client wants new multi-location format
      const acceptMulti = req.headers['x-multi-location'] === 'true' || req.query.multiLocation === 'true';

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

      const row = data as DatabaseRow | null;

      // Return new multi-location format if requested
      if (acceptMulti) {
        let locations = row ? parseLocationsArray(row.locations) : [];
        let activeLocationId = row?.active_location_id ?? null;

        if (row && locations.length === 0) {
          const legacyRecord = toLegacyFormat(row);
          if (legacyRecord && legacyRecord.lat != null && legacyRecord.lon != null) {
            const fallbackLocation = fromLegacyFormat(legacyRecord, 'home');
            locations = [fallbackLocation];
            activeLocationId = fallbackLocation.id;
          }
        }

        res.status(200).json({
          locations,
          activeLocationId,
        });
        return;
      }

      // Return legacy format for backward compatibility
      res.status(200).json({
        location: toLegacyFormat(row),
      });
      return;
    }

    case 'POST': {
      res.setHeader('Cache-Control', 'no-store');

      // Check if this is a slot-based upsert
      const slot = req.body.slot as LocationSlot | undefined;

      if (slot) {
        // New multi-location slot-based upsert
        const locationData = req.body as {
          slot: LocationSlot;
          name?: string;
          lat: number;
          lon: number;
          rectangleCode?: string | null;
          rectangleRegion?: string | null;
          accuracy?: number | null;
          source?: string;
          metadata?: Record<string, unknown>;
        };

        // Build location object for database function
        const locationObj = {
          name: locationData.name ?? locationData.rectangleRegion ?? 'Saved Location',
          lat: locationData.lat,
          lon: locationData.lon,
          rectangleCode: locationData.rectangleCode ?? null,
          rectangleRegion: locationData.rectangleRegion ?? null,
          accuracy: locationData.accuracy ?? null,
          source: ALLOWED_SOURCES.has(locationData.source ?? '') ? locationData.source : 'manual',
          metadata: locationData.metadata,
        };

        // Call database function for latest-wins upsert
        const { data: result, error: upsertError } = await supabase.rpc('upsert_location_by_slot', {
          p_user_id: userId,
          p_slot: slot,
          p_location: locationObj,
        });

        if (upsertError) {
          console.error('[user/location] POST slot upsert failed', upsertError);
          res.status(500).json({ error: 'Failed to save location' });
          return;
        }

        // Also update legacy columns for backward compatibility
        if (slot === 'home' || slot === 'coastal') {
          const legacyPayload = buildLegacyHomeCoordinatesPayload(result as SavedLocation);

          // Get existing preferred_rectangles to update
          const { data: existingRow } = await supabase
            .from('user_location_preferences')
            .select('preferred_rectangles')
            .eq('user_id', userId)
            .maybeSingle();

          const existingRectangles = Array.isArray(existingRow?.preferred_rectangles)
            ? (existingRow?.preferred_rectangles as string[])
            : [];

          // Put new rectangle FIRST so notifications use the most recent selection
          let preferredRectangles = existingRectangles;
          if (locationData.rectangleCode) {
            preferredRectangles = [
              locationData.rectangleCode,
              ...existingRectangles.filter(r => r !== locationData.rectangleCode)
            ];
          }

          const { error: legacyError } = await supabase
            .from('user_location_preferences')
            .update({
              home_coordinates: legacyPayload,
              home_region: locationData.rectangleRegion ?? null,
              home_place_name: locationData.rectangleRegion ?? null,
              home_location_name: locationData.name ?? locationData.rectangleRegion ?? null,
              location_source: locationObj.source,
              preferred_rectangles: preferredRectangles,
            })
            .eq('user_id', userId);

          if (legacyError) {
            console.warn('[user/location] Failed to update legacy columns', legacyError);
            // Continue anyway - not critical
          }
        }

        res.status(200).json(result);
        return;
      }

      // Legacy format - UnifiedLocationRecord
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

      // Put the new rectangle FIRST so notifications use the most recent selection
      // Remove it from existing list first (if present) to avoid duplicates
      let preferredRectangles = existingRectangles;
      if (record.rectangleCode) {
        preferredRectangles = [
          record.rectangleCode,
          ...existingRectangles.filter(r => r !== record.rectangleCode)
        ];
      }

      const payload = {
        home_coordinates: buildHomeCoordinatesPayload(record),
        home_region: record.rectangleRegion ?? (existingRow?.home_region as string | null) ?? null,
        home_place_name: record.rectangleRegion ?? (existingRow?.home_place_name as string | null) ?? null,
        home_location_name: record.rectangleLabel ?? (existingRow?.home_location_name as string | null) ?? null,
        preferred_rectangles: preferredRectangles,
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

      // Also upsert to new locations array as 'home' slot for forward compatibility
      const locationObj = {
        name: record.rectangleLabel ?? record.rectangleRegion ?? 'Home Location',
        lat: record.lat ?? 0,
        lon: record.lon ?? 0,
        rectangleCode: record.rectangleCode,
        rectangleRegion: record.rectangleRegion,
        accuracy: record.accuracy,
        source: record.source,
      };

      await supabase.rpc('upsert_location_by_slot', {
        p_user_id: userId,
        p_slot: 'home',
        p_location: locationObj,
      });

      res.status(200).json({ location: record });
      return;
    }

    case 'DELETE': {
      res.setHeader('Cache-Control', 'no-store');

      // Check if deleting a specific location by ID
      const locationId = req.query.locationId as string | undefined;

      if (locationId) {
        // Delete specific location from locations array
        const { data: row, error: fetchError } = await supabase
          .from('user_location_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('[user/location] DELETE fetch failed', fetchError);
          res.status(500).json({ error: 'Failed to delete location' });
          return;
        }

        if (!row) {
          res.status(204).end();
          return;
        }

        const dbRow = row as DatabaseRow;
        const locations = parseLocationsArray(dbRow.locations);
        const updatedLocations = locations.filter((loc) => loc.id !== locationId);

        // If we deleted the active location, clear active_location_id
        const newActiveId = dbRow.active_location_id === locationId
          ? (updatedLocations[0]?.id ?? null)
          : dbRow.active_location_id;

        const { error: updateError } = await supabase
          .from('user_location_preferences')
          .update({
            locations: updatedLocations,
            active_location_id: newActiveId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[user/location] DELETE update failed', updateError);
          res.status(500).json({ error: 'Failed to delete location' });
          return;
        }

        res.status(204).end();
        return;
      }

      // Clear all locations (legacy behavior)
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
        locations: [],
        active_location_id: null,
        last_modified_slot: null,
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
