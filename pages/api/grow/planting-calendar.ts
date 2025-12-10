import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../../../lib/grow/server/auth';
import { inferGardeningClimateZone } from '../../../lib/grow/climate';

interface CalendarWindow {
  plantSlug: string;
  plantName: string | null;
  taskCode: string;
  taskName: string | null;
  notes: string | null;
  startMonth: number;
  startWeek: number;
  endMonth: number;
  endWeek: number;
  offsetWeeks: number;
  altitudeWeeks: number;
  zoneWeeks: number;
  source: 'adjusted' | 'default';
}

interface CalendarResponseBody {
  climateZone: string | null;
  altitudeMeters: number | null;
  altitudeWeeks: number;
  windows: CalendarWindow[];
  fallbackToDefault: boolean;
}

const WEEKS_PER_MONTH = 4;
const MONTHS_PER_YEAR = 12;
const TOTAL_WEEKS = WEEKS_PER_MONTH * MONTHS_PER_YEAR;

type DefaultCalendarRow = {
  plant_slug: string;
  task_code: string;
  start_month: number;
  start_week: number;
  end_month: number;
  end_week: number;
  notes: string | null;
};

type SpeciesRow = {
  slug: string;
  name: string | null;
};

type TaskTypeRow = {
  code: string;
  name: string | null;
};

type OffsetRow = {
  task_code: string;
  week_offset: number;
};

function calculateAltitudeWeekOffset(altitude: number | null): number {
  if (typeof altitude !== 'number' || Number.isNaN(altitude)) {
    return 0;
  }

  if (altitude >= 1200) {
    return 3;
  }
  if (altitude >= 800) {
    return 2;
  }
  if (altitude >= 400) {
    return 1;
  }
  if (altitude <= -100) {
    return -1;
  }

  return 0;
}

function clampWeekIndex(index: number): number {
  if (index < 0) {
    return 0;
  }
  if (index >= TOTAL_WEEKS) {
    return TOTAL_WEEKS - 1;
  }
  return index;
}

function toWeekIndex(month: number, week: number): number {
  const normalizedMonth = Math.min(Math.max(month, 1), MONTHS_PER_YEAR);
  const normalizedWeek = Math.min(Math.max(week, 1), WEEKS_PER_MONTH);
  return (normalizedMonth - 1) * WEEKS_PER_MONTH + (normalizedWeek - 1);
}

function fromWeekIndex(index: number): { month: number; week: number } {
  const clamped = clampWeekIndex(index);
  const month = Math.floor(clamped / WEEKS_PER_MONTH) + 1;
  const week = (clamped % WEEKS_PER_MONTH) + 1;
  return { month, week };
}

function adjustWindow(row: DefaultCalendarRow, offsetWeeks: number) {
  const startIndex = toWeekIndex(row.start_month, row.start_week);
  const endIndex = toWeekIndex(row.end_month, row.end_week);

  const adjustedStart = fromWeekIndex(startIndex + offsetWeeks);
  const adjustedEnd = fromWeekIndex(endIndex + offsetWeeks);

  return {
    start: adjustedStart,
    end: adjustedEnd,
  };
}

async function fetchDefaultCalendar(supabase: SupabaseClient): Promise<DefaultCalendarRow[]> {
  const { data, error } = await supabase
    .from('plant_task_calendar_default')
    .select('plant_slug, task_code, start_month, start_week, end_month, end_week, notes');

  if (error) {
    throw new Error(error.message || 'Failed to load default planting calendar');
  }

  return (data ?? []) as DefaultCalendarRow[];
}

async function fetchSpeciesMetadata(supabase: SupabaseClient, slugs: string[]): Promise<Map<string, SpeciesRow>> {
  if (slugs.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('plant_species')
    .select('slug, name')
    .in('slug', Array.from(new Set(slugs)));

  if (error) {
    throw new Error(error.message || 'Failed to load species metadata');
  }

  const map = new Map<string, SpeciesRow>();
  for (const row of (data ?? []) as SpeciesRow[]) {
    map.set(row.slug, row);
  }
  return map;
}

async function fetchTaskMetadata(supabase: SupabaseClient, taskCodes: string[]): Promise<Map<string, TaskTypeRow>> {
  if (taskCodes.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('plant_task_type')
    .select('code, name')
    .in('code', Array.from(new Set(taskCodes)));

  if (error) {
    throw new Error(error.message || 'Failed to load plant task metadata');
  }

  const map = new Map<string, TaskTypeRow>();
  for (const row of (data ?? []) as TaskTypeRow[]) {
    map.set(row.code, row);
  }
  return map;
}

async function fetchZoneOffsets(supabase: SupabaseClient, zoneCode: string | null): Promise<Map<string, number>> {
  if (!zoneCode) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('climate_zone_task_offset')
    .select('task_code, week_offset')
    .eq('zone_code', zoneCode);

  if (error) {
    throw new Error(error.message || 'Failed to load climate zone offsets');
  }

  const map = new Map<string, number>();
  for (const row of (data ?? []) as OffsetRow[]) {
    const raw = typeof row.week_offset === 'number'
      ? row.week_offset
      : Number.parseInt(String(row.week_offset), 10);
    map.set(row.task_code, Number.isFinite(raw) ? raw : 0);
  }
  return map;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CalendarResponseBody | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) {
    return;
  }

  const { supabase, userId } = auth;

  try {
    // First try to get data from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gardening_climate_zone_code, home_elevation_m, home_lat, home_lon')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message || 'Failed to load profile');
    }

    // Also check user_location_preferences for lat/lon (used by Go Daisy location system)
    let locationLat: number | null = profile?.home_lat != null ? Number(profile.home_lat) : null;
    let locationLon: number | null = profile?.home_lon != null ? Number(profile.home_lon) : null;
    
    // If no lat/lon from profile, try user_location_preferences
    if (locationLat === null || locationLon === null) {
      const { data: locationPrefs } = await supabase
        .from('user_location_preferences')
        .select('home_coordinates')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (locationPrefs?.home_coordinates) {
        const coords = locationPrefs.home_coordinates as { lat?: number; lon?: number } | null;
        if (coords?.lat != null && coords?.lon != null) {
          locationLat = coords.lat;
          locationLon = coords.lon;
        }
      }
    }

    const zoneFromProfile = typeof profile?.gardening_climate_zone_code === 'string'
      ? profile.gardening_climate_zone_code
      : null;

    const elevationFromProfile = typeof profile?.home_elevation_m === 'number'
      ? profile.home_elevation_m
      : profile?.home_elevation_m != null
        ? Number(profile.home_elevation_m)
        : null;

    const inferredZone = zoneFromProfile || (
      locationLat != null && locationLon != null
        ? inferGardeningClimateZone(locationLat, locationLon, elevationFromProfile ?? undefined)
        : null
    );

    const altitudeWeeks = calculateAltitudeWeekOffset(elevationFromProfile);
    const zoneOffsets = await fetchZoneOffsets(supabase, inferredZone);

    const defaults = await fetchDefaultCalendar(supabase);
    const speciesMap = await fetchSpeciesMetadata(supabase, defaults.map((row) => row.plant_slug));
    const taskMap = await fetchTaskMetadata(supabase, defaults.map((row) => row.task_code));

    const windows: CalendarWindow[] = defaults.map((row) => {
      const zoneWeeks = zoneOffsets.get(row.task_code) ?? 0;
      const totalOffset = zoneWeeks + altitudeWeeks;
      const { start, end } = adjustWindow(row, totalOffset);

      const species = speciesMap.get(row.plant_slug);
      const taskType = taskMap.get(row.task_code);

      return {
        plantSlug: row.plant_slug,
        plantName: species?.name ?? null,
        taskCode: row.task_code,
        taskName: taskType?.name ?? null,
        notes: row.notes ?? null,
        startMonth: start.month,
        startWeek: start.week,
        endMonth: end.month,
        endWeek: end.week,
        offsetWeeks: totalOffset,
        altitudeWeeks,
        zoneWeeks,
        source: zoneWeeks === 0 && altitudeWeeks === 0 ? 'default' : 'adjusted',
      };
    });

    res.status(200).json({
      climateZone: inferredZone ?? null,
      altitudeMeters: typeof elevationFromProfile === 'number' ? elevationFromProfile : null,
      altitudeWeeks,
      fallbackToDefault: zoneOffsets.size === 0,
      windows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[grow/planting-calendar] failed to build response', error);
    res.status(500).json({ error: message });
  }
}
