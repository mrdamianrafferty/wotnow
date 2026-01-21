import type { NextApiRequest, NextApiResponse } from 'next';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedClient } from '../../../lib/grow/server/auth';
import {
  inferGardeningClimateZone,
  getClimateZoneFrostRisk,
  isInFrostRiskPeriod,
  type ClimateZoneCode,
  type FrostRiskLevel,
} from '../../../lib/grow/climate';

type FrostTolerance = 'hardy' | 'half_hardy' | 'tender' | null;

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
  frostTolerance: FrostTolerance;
  frostProtectionNeeded: boolean;
}

interface FrostContext {
  riskLevel: FrostRiskLevel;
  inFrostPeriod: boolean;
  hasTenderPlants: boolean;
  tenderPlantSlugs: string[];
}

interface GardenContext {
  soilType: string | null;
  sunExposure: string | null;
  moisture: string | null;
  gardenFeatures: string[];
  hasGreenhouse: boolean;
  hasRaisedBeds: boolean;
  hasColdFrame: boolean;
}

interface CalendarResponseBody {
  climateZone: string | null;
  altitudeMeters: number | null;
  altitudeWeeks: number;
  windows: CalendarWindow[];
  fallbackToDefault: boolean;
  userPlantCount: number;
  filteredByUserPlants: boolean;
  frostContext: FrostContext | null;
  gardenContext: GardenContext | null;
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
  frost_tolerance: FrostTolerance;
  frost_protection_needed: boolean | null;
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
    .select('slug, name, frost_tolerance, frost_protection_needed')
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

type UserPlantRow = {
  species_slug: string | null;
  name: string | null;
  type: string | null;
};

type UserPreferencesRow = {
  soil_type: string | null;
  sun_exposure: string | null;
  moisture: string | null;
  garden_features: string[] | null;
};

async function fetchUserPreferences(supabase: SupabaseClient, userId: string): Promise<GardenContext | null> {
  const { data, error } = await supabase
    .from('grow_user_preferences')
    .select('soil_type, sun_exposure, moisture, garden_features')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[grow/planting-calendar] Failed to fetch preferences:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const prefs = data as UserPreferencesRow;
  const features = prefs.garden_features ?? [];
  const featuresLower = features.map((f) => f.toLowerCase());

  return {
    soilType: prefs.soil_type,
    sunExposure: prefs.sun_exposure,
    moisture: prefs.moisture,
    gardenFeatures: features,
    hasGreenhouse: featuresLower.some((f) => f.includes('greenhouse')),
    hasRaisedBeds: featuresLower.some((f) => f.includes('raised') || f.includes('bed')),
    hasColdFrame: featuresLower.some((f) => f.includes('cold') || f.includes('frame') || f.includes('cloche')),
  };
}

async function fetchUserPlantSlugs(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('grow_user_plants')
    .select('species_slug, name, type')
    .eq('user_id', userId);

  if (error) {
    // Don't throw - just log and return empty set (graceful degradation)
    console.warn('[grow/planting-calendar] Failed to fetch user plants:', error.message);
    return new Set();
  }

  const slugs = new Set<string>();
  const plantsNeedingLookup: { name: string; type: string | null }[] = [];

  for (const row of (data ?? []) as UserPlantRow[]) {
    if (row.species_slug) {
      slugs.add(row.species_slug);
    } else if (row.name) {
      // Collect plants that need name-based lookup
      plantsNeedingLookup.push({ name: row.name, type: row.type });
    }
  }

  // For plants without species_slug, try to match by name
  if (plantsNeedingLookup.length > 0) {
    // Fetch all species to match against (could be optimized with text search)
    const { data: speciesData, error: speciesError } = await supabase
      .from('plant_species')
      .select('slug, name');

    if (!speciesError && speciesData) {
      // Build a map of lowercase name -> slug for quick lookup
      const nameToSlug = new Map<string, string>();
      for (const species of speciesData) {
        if (species.name) {
          nameToSlug.set(species.name.toLowerCase().trim(), species.slug);
        }
      }

      // Match user plants by name
      for (const plant of plantsNeedingLookup) {
        const normalizedName = plant.name.toLowerCase().trim();

        // Direct match
        if (nameToSlug.has(normalizedName)) {
          slugs.add(nameToSlug.get(normalizedName)!);
          continue;
        }

        // Try common variations for fruit trees
        if (plant.type === 'fruit-tree' || plant.type === 'fruit') {
          const fruitSlug = nameToSlug.get(normalizedName) || nameToSlug.get(`fruit-${normalizedName}`);
          if (fruitSlug) {
            slugs.add(fruitSlug);
            continue;
          }
          // Check if any slug ends with the plant name (e.g., "fruit-pear" for "Pear")
          for (const [speciesName, slug] of nameToSlug.entries()) {
            if (slug.endsWith(`-${normalizedName}`) || speciesName === normalizedName) {
              slugs.add(slug);
              break;
            }
          }
        }

        // Try herb- prefix for herbs/ornamentals that might be herbs
        if (plant.type === 'herb' || plant.type === 'ornamental') {
          const herbSlug = nameToSlug.get(`herb-${normalizedName}`);
          if (herbSlug) {
            slugs.add(herbSlug);
          }
        }
      }
    }
  }

  return slugs;
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

    // Fetch user's plants to filter calendar
    const userPlantSlugs = await fetchUserPlantSlugs(supabase, userId);
    const hasUserPlants = userPlantSlugs.size > 0;

    // Fetch user's garden preferences
    const gardenContext = await fetchUserPreferences(supabase, userId);

    const defaults = await fetchDefaultCalendar(supabase);

    // Filter to only include plants the user actually grows
    const filteredDefaults = hasUserPlants
      ? defaults.filter((row) => userPlantSlugs.has(row.plant_slug))
      : defaults; // If no plants, show all (for discovery/onboarding)

    const speciesMap = await fetchSpeciesMetadata(supabase, filteredDefaults.map((row) => row.plant_slug));
    const taskMap = await fetchTaskMetadata(supabase, filteredDefaults.map((row) => row.task_code));

    const windows: CalendarWindow[] = filteredDefaults.map((row) => {
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
        frostTolerance: species?.frost_tolerance ?? null,
        frostProtectionNeeded: species?.frost_protection_needed ?? false,
      };
    });

    // Build frost context if we have a climate zone
    let frostContext: FrostContext | null = null;
    if (inferredZone) {
      const zoneCode = inferredZone as ClimateZoneCode;
      const tenderPlants = Array.from(speciesMap.values())
        .filter((s) => s.frost_tolerance === 'tender')
        .map((s) => s.slug);

      frostContext = {
        riskLevel: getClimateZoneFrostRisk(zoneCode),
        inFrostPeriod: isInFrostRiskPeriod(zoneCode),
        hasTenderPlants: tenderPlants.length > 0,
        tenderPlantSlugs: tenderPlants,
      };
    }

    res.status(200).json({
      climateZone: inferredZone ?? null,
      altitudeMeters: typeof elevationFromProfile === 'number' ? elevationFromProfile : null,
      altitudeWeeks,
      fallbackToDefault: zoneOffsets.size === 0,
      windows,
      userPlantCount: userPlantSlugs.size,
      filteredByUserPlants: hasUserPlants,
      frostContext,
      gardenContext,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[grow/planting-calendar] failed to build response', error);
    res.status(500).json({ error: message });
  }
}
