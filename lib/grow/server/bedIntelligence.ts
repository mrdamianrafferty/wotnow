import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ROTATION_GROUP_LABELS,
  ROTATION_GROUP_FRIENDLY,
  type RotationGroup,
  type RotationWarning,
  type CompanionSets,
  type SuccessionPrompt,
  type QuickFillSuggestion,
} from '../bedIntelligenceTypes';

const ROTATION_YEARS = 3;

// Supabase join result shapes
interface PlantingWithSpecies {
  planted_at: string;
  removed_at: string | null;
  grow_user_plants: { species_slug: string | null; name?: string };
}

interface RemovedPlantingRow {
  removed_at: string | null;
  grow_user_plants: { name: string; species_slug: string | null };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ============================================================================
// Rotation Warnings
// ============================================================================

export async function getRotationWarnings(
  serviceClient: SupabaseClient,
  userClient: SupabaseClient,
  bedId: string,
  currentYear: number,
): Promise<RotationWarning[]> {
  // Only consider REMOVED plantings — active crops should not warn against themselves
  const { data: plantings, error } = await userClient
    .from('grow_bed_plantings')
    .select('planted_at, removed_at, grow_user_plants!inner(species_slug)')
    .eq('bed_id', bedId)
    .not('removed_at', 'is', null);

  if (error || !plantings || plantings.length === 0) return [];

  // Collect unique species slugs
  const rows = plantings as unknown as PlantingWithSpecies[];
  const slugs = [
    ...new Set(
      rows
        .map((p) => p.grow_user_plants?.species_slug)
        .filter(Boolean) as string[]
    ),
  ];

  if (slugs.length === 0) return [];

  // Look up rotation groups from plant_species (service client bypasses RLS)
  const { data: speciesRows } = await serviceClient
    .from('plant_species')
    .select('slug, rotation_group')
    .in('slug', slugs)
    .not('rotation_group', 'is', null);

  if (!speciesRows || speciesRows.length === 0) return [];

  const slugToGroup = new Map<string, RotationGroup>();
  for (const s of speciesRows) {
    if (s.rotation_group) slugToGroup.set(s.slug, s.rotation_group as RotationGroup);
  }

  // Group plantings by rotation group, track max year
  const groupMaxYear = new Map<RotationGroup, number>();

  for (const p of rows) {
    const slug = p.grow_user_plants?.species_slug;
    if (!slug) continue;
    const group = slugToGroup.get(slug);
    if (!group || group === 'permanent' || group === 'non_rotating') continue;

    // Use the year the crop was removed — that's when the bed was last occupied by this group
    const year = new Date(p.removed_at || p.planted_at).getFullYear();
    const existing = groupMaxYear.get(group);
    if (!existing || year > existing) {
      groupMaxYear.set(group, year);
    }
  }

  // Generate warnings for groups planted within the rotation window
  const warnings: RotationWarning[] = [];

  for (const [group, lastYear] of groupMaxYear) {
    const avoidUntil = lastYear + ROTATION_YEARS;
    if (currentYear < avoidUntil) {
      const friendly = ROTATION_GROUP_FRIENDLY[group];
      const label = friendly?.label || ROTATION_GROUP_LABELS[group] || group;
      const followWith = friendly?.followWith;

      // Positive framing: tell the user what TO plant, not just what to avoid
      let message: string;
      if (followWith) {
        message = `${label} were in this bed in ${lastYear}. This year, try planting ${followWith} for a healthier crop.`;
      } else {
        message = `${label} were in this bed in ${lastYear} — best to rotate until ${avoidUntil}.`;
      }

      warnings.push({
        rotationGroup: group,
        groupLabel: label,
        lastPlantedYear: lastYear,
        avoidUntilYear: avoidUntil,
        message,
      });
    }
  }

  return warnings;
}

// ============================================================================
// Companion Sets
// ============================================================================

export async function getCompanionSets(
  serviceClient: SupabaseClient,
  activeSlugs: string[],
): Promise<CompanionSets> {
  if (activeSlugs.length === 0) {
    return { goodCompanions: [], badCompanions: [] };
  }

  const { data: speciesRows } = await serviceClient
    .from('plant_species')
    .select('companions_with, companions_avoid')
    .in('slug', activeSlugs);

  if (!speciesRows || speciesRows.length === 0) {
    return { goodCompanions: [], badCompanions: [] };
  }

  const good = new Set<string>();
  const bad = new Set<string>();

  for (const row of speciesRows) {
    if (Array.isArray(row.companions_with)) {
      for (const slug of row.companions_with) good.add(slug);
    }
    if (Array.isArray(row.companions_avoid)) {
      for (const slug of row.companions_avoid) bad.add(slug);
    }
  }

  return {
    goodCompanions: [...good],
    badCompanions: [...bad],
  };
}

// ============================================================================
// Succession Prompts
// ============================================================================

export async function getSuccessionPrompts(
  serviceClient: SupabaseClient,
  userClient: SupabaseClient,
  bedId: string,
  climateZone: string | null,
  currentDayOfYear: number,
): Promise<SuccessionPrompt[]> {
  if (!climateZone) return [];

  // Find recently removed plantings (within last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().split('T')[0];

  const { data: removed, error } = await userClient
    .from('grow_bed_plantings')
    .select('removed_at, grow_user_plants!inner(name, species_slug)')
    .eq('bed_id', bedId)
    .not('removed_at', 'is', null)
    .gte('removed_at', cutoff);

  if (error || !removed || removed.length === 0) return [];

  // Find species with active sow_outdoor or transplant windows now
  const { data: calendar } = await serviceClient
    .from('grow_planting_calendar')
    .select('plant_slug, plant_common_name, window_type')
    .eq('climate_zone_code', climateZone)
    .in('window_type', ['sow_outdoor', 'transplant'])
    .lte('start_day_of_year', currentDayOfYear)
    .gte('end_day_of_year', currentDayOfYear);

  if (!calendar || calendar.length === 0) return [];

  const prompts: SuccessionPrompt[] = [];
  const removedRows = removed as unknown as RemovedPlantingRow[];

  // Deduplicate by plant name, keeping the most recent removal per species
  const seen = new Map<string, RemovedPlantingRow>();
  for (const r of removedRows) {
    const name = r.grow_user_plants?.name;
    if (!name) continue;
    const existing = seen.get(name);
    if (!existing || new Date(r.removed_at!) > new Date(existing.removed_at!)) {
      seen.set(name, r);
    }
  }
  const dedupedRows = [...seen.values()];

  for (const r of dedupedRows) {
    const plantName = r.grow_user_plants?.name;
    if (!plantName) continue;

    const removedDate = new Date(r.removed_at!);
    const monthName = MONTH_NAMES[removedDate.getMonth()];

    // Pick up to 3 suggestions from the calendar
    const suggestions = calendar.slice(0, 3).map((c) => ({
      speciesSlug: c.plant_slug,
      speciesName: c.plant_common_name || c.plant_slug,
      windowType: c.window_type,
    }));

    prompts.push({
      removedPlantName: plantName,
      removedMonth: monthName,
      suggestions,
    });
  }

  return prompts;
}

// ============================================================================
// Quick Fill Suggestions
// ============================================================================

const SUN_MAP: Record<string, string[]> = {
  full_sun: ['Full sun', 'full sun', 'Full Sun'],
  partial_shade: ['Part shade', 'part shade', 'Partial Shade', 'partial shade', 'Part Sun/Part Shade'],
  full_shade: ['Full shade', 'full shade', 'Shade', 'shade'],
};

const WINDOW_LABELS: Record<string, string> = {
  sow_outdoor: 'Sow outdoors now',
  sow_indoor: 'Sow indoors now',
  transplant: 'Transplant now',
};

export async function getQuickFillSuggestions(
  serviceClient: SupabaseClient,
  sunExposure: string | null,
  climateZone: string | null,
  currentDayOfYear: number,
): Promise<QuickFillSuggestion[] | null> {
  if (!climateZone) return null;

  // Find species with active planting windows in this climate zone
  const { data: calendar } = await serviceClient
    .from('grow_planting_calendar')
    .select('plant_slug, plant_common_name, window_type')
    .eq('climate_zone_code', climateZone)
    .in('window_type', ['sow_outdoor', 'sow_indoor', 'transplant'])
    .lte('start_day_of_year', currentDayOfYear)
    .gte('end_day_of_year', currentDayOfYear)
    .limit(30);

  if (!calendar || calendar.length === 0) return null;

  const slugs = [...new Set(calendar.map((c) => c.plant_slug))];

  // Get species details for sun filtering and category
  const { data: species } = await serviceClient
    .from('plant_species')
    .select('slug, name, category, sun_requirements')
    .in('slug', slugs);

  if (!species || species.length === 0) return null;

  const speciesMap = new Map(species.map((s) => [s.slug, s]));

  // Build suggestions, filtering by sun if the bed has sun_exposure set
  const sunValues = sunExposure ? SUN_MAP[sunExposure] : null;

  const seen = new Set<string>();
  const suggestions: QuickFillSuggestion[] = [];

  for (const c of calendar) {
    if (seen.has(c.plant_slug)) continue;
    const sp = speciesMap.get(c.plant_slug);
    if (!sp) continue;

    // Filter by sun compatibility
    if (sunValues && sp.sun_requirements) {
      const matches = sunValues.some((v) =>
        sp.sun_requirements!.toLowerCase().includes(v.toLowerCase())
      );
      if (!matches) continue;
    }

    seen.add(c.plant_slug);

    const windowLabel = WINDOW_LABELS[c.window_type] || c.window_type;
    const sunNote = sp.sun_requirements ? ` in ${sp.sun_requirements.toLowerCase()}` : '';

    suggestions.push({
      speciesSlug: c.plant_slug,
      speciesName: sp.name || c.plant_common_name || c.plant_slug,
      category: sp.category ?? null,
      reason: `${windowLabel}${sunNote}`,
    });

    if (suggestions.length >= 6) break;
  }

  return suggestions.length > 0 ? suggestions : null;
}
