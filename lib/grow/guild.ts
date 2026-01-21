/**
 * Permaculture Guild System
 *
 * Fetches guild data from Supabase database:
 * - guild_blueprint: 84 guild definitions with focal plants
 * - guild_blueprint_member: 2,431 companion plant relationships
 * - plant_function: 117 plant role definitions
 * - plant_species: Plant names and categories
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database row types
interface GuildBlueprintRow {
  id: string;
  focal_slug: string;
  climate_zone_code: string;
  name: string;
  description: string | null;
  is_default: boolean;
}

interface GuildMemberRow {
  blueprint_id: string;
  plant_slug: string;
  role: string;
  rank_in_role: number | null;
  notes: string | null;
}

interface PlantSpeciesRow {
  slug: string;
  name: string;
  category: string | null;
}

// =============================================================================
// TYPES
// =============================================================================

export interface PermacultureRole {
  code: string;
  name: string;
  description: string;
  icon: string;
  tips?: string[];
}

export interface GuildBlueprint {
  guild_id: string;
  guild_name: string;
  guild_description?: string;
  focal_common_name: string;
  focal_slug: string;
  focal_category?: string;
  climate_zones: string[];
  member_count: number;
}

export interface GuildCompanion {
  guildId: string;
  guildName: string;
  guildDescription?: string;
  focalName: string;
  focalSlug: string;
  focalCategory?: string;
  climateZoneCode?: string;
  companionName: string;
  companionSlug: string;
  companionCategory?: string;
  role: string;
  roleDisplay?: string;
  roleDescription?: string;
  benefits?: string[];
  notes?: string;
  rankInRole?: number;
}

// =============================================================================
// ROLE CATALOG (Display info for permaculture roles)
// =============================================================================

const ROLE_CATALOG: Record<string, PermacultureRole> = {
  nitrogen_fixer: {
    code: 'nitrogen_fixer',
    name: 'Nitrogen Fixer',
    description: 'Improves soil fertility by pulling nitrogen from the air and storing it in the soil.',
    icon: '🟢',
    tips: ['Prune lightly each season to encourage vigorous regrowth.'],
  },
  dynamic_accumulator: {
    code: 'dynamic_accumulator',
    name: 'Dynamic Accumulator',
    description: 'Deep rooted plants that mine minerals and make them available to neighboring species.',
    icon: '⚗️',
  },
  groundcover: {
    code: 'groundcover',
    name: 'Living Groundcover',
    description: 'Spreads across the soil surface to retain moisture and suppress weeds.',
    icon: '🪴',
  },
  pollinator: {
    code: 'pollinator',
    name: 'Pollinator Magnet',
    description: 'Attracts bees and beneficial insects that boost yields and ecosystem health.',
    icon: '🐝',
  },
  pest_repellent: {
    code: 'pest_repellent',
    name: 'Pest Repellent',
    description: 'Scents or compounds deter common pests from focusing on your focal crop.',
    icon: '🛡️',
  },
  pest_deterrent: {
    code: 'pest_deterrent',
    name: 'Pest Deterrent',
    description: 'Confuses or repels pests through scent, appearance, or chemical compounds.',
    icon: '🚫',
  },
  support_species: {
    code: 'support_species',
    name: 'Structural Support',
    description: 'Provides structural benefits such as shade, wind protection, or trellising.',
    icon: '🌳',
  },
  beneficial_insect_attractor: {
    code: 'beneficial_insect_attractor',
    name: 'Beneficial Insect Magnet',
    description: 'Feeds the predators that keep pest populations in check.',
    icon: '🦟',
  },
  biomass: {
    code: 'biomass',
    name: 'Biomass Builder',
    description: 'Fast growing plants ideal for chop-and-drop mulch cycles.',
    icon: '🍃',
  },
  vine_layer: {
    code: 'vine_layer',
    name: 'Vine Layer',
    description: 'Climbing species that take advantage of vertical space.',
    icon: '🪢',
  },
  ground_worker: {
    code: 'ground_worker',
    name: 'Ground Worker',
    description: 'Root specialists that aerate soil and cycle nutrients.',
    icon: '🪱',
  },
  hedgerow: {
    code: 'hedgerow',
    name: 'Hedgerow',
    description: 'Edge species that provide windbreaks, wildlife corridors, and boundary definition.',
    icon: '🌿',
  },
  shade_tree: {
    code: 'shade_tree',
    name: 'Shade Provider',
    description: 'Canopy layer that creates beneficial microclimates for understory plants.',
    icon: '🌲',
  },
};

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(url, key);
}

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

/**
 * Get available guild blueprints for a climate zone
 */
export async function getAvailableGuildBlueprints(climateZone: string): Promise<GuildBlueprint[]> {
  const supabase = getSupabaseClient();
  const normalizedZone = climateZone.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

  // Fetch blueprints for this climate zone
  const { data: blueprints, error: blueprintError } = await supabase
    .from('guild_blueprint')
    .select(`
      id,
      focal_slug,
      climate_zone_code,
      name,
      description,
      is_default
    `)
    .eq('climate_zone_code', normalizedZone);

  if (blueprintError) {
    console.error('[guild] Failed to fetch blueprints:', blueprintError);
    return [];
  }

  if (!blueprints || blueprints.length === 0) {
    // Try without climate zone filter as fallback
    const { data: allBlueprints, error: allError } = await supabase
      .from('guild_blueprint')
      .select('id, focal_slug, climate_zone_code, name, description, is_default')
      .limit(20);

    if (allError || !allBlueprints) {
      console.error('[guild] No blueprints found for zone:', normalizedZone);
      return [];
    }

    // Use general blueprints
    return await enrichBlueprints(supabase, allBlueprints);
  }

  return await enrichBlueprints(supabase, blueprints);
}

/**
 * Enrich blueprints with focal plant info and member counts
 */
async function enrichBlueprints(
  supabase: SupabaseClient,
  blueprints: GuildBlueprintRow[]
): Promise<GuildBlueprint[]> {
  // Get unique focal slugs
  const focalSlugs = [...new Set(blueprints.map(b => b.focal_slug))];

  // Fetch focal plant info
  const { data: focalPlants } = await supabase
    .from('plant_species')
    .select('slug, name, category')
    .in('slug', focalSlugs) as { data: PlantSpeciesRow[] | null };

  const focalMap = new Map((focalPlants || []).map(p => [p.slug, p]));

  // Get member counts for each blueprint
  const blueprintIds = blueprints.map(b => b.id);
  const { data: memberCounts } = await supabase
    .from('guild_blueprint_member')
    .select('blueprint_id')
    .in('blueprint_id', blueprintIds) as { data: { blueprint_id: string }[] | null };

  const countMap = new Map<string, number>();
  (memberCounts || []).forEach(m => {
    countMap.set(m.blueprint_id, (countMap.get(m.blueprint_id) || 0) + 1);
  });

  return blueprints.map(bp => {
    const focal = focalMap.get(bp.focal_slug);
    return {
      guild_id: bp.id,
      guild_name: bp.name,
      guild_description: bp.description || undefined,
      focal_common_name: focal?.name || bp.focal_slug.replace(/-/g, ' '),
      focal_slug: bp.focal_slug,
      focal_category: focal?.category || undefined,
      climate_zones: [bp.climate_zone_code],
      member_count: countMap.get(bp.id) || 0,
    };
  });
}

/**
 * Get guild companions for a focal plant in a climate zone
 */
export async function getGuildCompanions(focalSlug: string, climateZone: string): Promise<GuildCompanion[]> {
  const supabase = getSupabaseClient();
  const normalizedZone = climateZone.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const normalizedSlug = focalSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Find the blueprint for this focal plant and climate zone
  const { data: blueprint, error: blueprintError } = await supabase
    .from('guild_blueprint')
    .select('id, name, description, focal_slug, climate_zone_code')
    .eq('focal_slug', normalizedSlug)
    .eq('climate_zone_code', normalizedZone)
    .single();

  if (blueprintError || !blueprint) {
    // Try without climate zone
    const { data: anyBlueprint } = await supabase
      .from('guild_blueprint')
      .select('id, name, description, focal_slug, climate_zone_code')
      .eq('focal_slug', normalizedSlug)
      .limit(1)
      .single();

    if (!anyBlueprint) {
      console.error('[guild] No blueprint found for:', normalizedSlug);
      return [];
    }

    return await fetchCompanionsForBlueprint(supabase, anyBlueprint);
  }

  return await fetchCompanionsForBlueprint(supabase, blueprint);
}

/**
 * Fetch companions for a specific blueprint
 */
async function fetchCompanionsForBlueprint(
  supabase: SupabaseClient,
  blueprint: {
    id: string;
    name: string;
    description: string | null;
    focal_slug: string;
    climate_zone_code: string;
  }
): Promise<GuildCompanion[]> {
  // Fetch members for this blueprint
  const { data: members, error: memberError } = await supabase
    .from('guild_blueprint_member')
    .select('plant_slug, role, rank_in_role, notes')
    .eq('blueprint_id', blueprint.id)
    .order('role')
    .order('rank_in_role') as { data: GuildMemberRow[] | null; error: unknown };

  if (memberError || !members) {
    console.error('[guild] Failed to fetch members:', memberError);
    return [];
  }

  // Get all plant slugs (focal + companions)
  const allSlugs = [blueprint.focal_slug, ...members.map(m => m.plant_slug)];

  // Fetch plant info
  const { data: plants } = await supabase
    .from('plant_species')
    .select('slug, name, category')
    .in('slug', allSlugs) as { data: PlantSpeciesRow[] | null };

  const plantMap = new Map((plants || []).map(p => [p.slug, p]));
  const focalPlant = plantMap.get(blueprint.focal_slug);

  return members.map(m => {
    const plant = plantMap.get(m.plant_slug);
    const roleInfo = ROLE_CATALOG[m.role];

    return {
      guildId: blueprint.id,
      guildName: blueprint.name,
      guildDescription: blueprint.description || undefined,
      focalName: focalPlant?.name || blueprint.focal_slug.replace(/-/g, ' '),
      focalSlug: blueprint.focal_slug,
      focalCategory: focalPlant?.category || undefined,
      climateZoneCode: blueprint.climate_zone_code,
      companionName: plant?.name || m.plant_slug.replace(/-/g, ' '),
      companionSlug: m.plant_slug,
      companionCategory: plant?.category || undefined,
      role: m.role,
      roleDisplay: roleInfo?.name || m.role,
      roleDescription: roleInfo?.description,
      notes: m.notes || undefined,
      rankInRole: m.rank_in_role || undefined,
    };
  });
}

/**
 * Get permaculture role info
 */
export function getPermacultureRole(roleCode: string): PermacultureRole | undefined {
  return ROLE_CATALOG[roleCode] ?? ROLE_CATALOG.pest_repellent;
}

/**
 * Get all permaculture roles
 */
export function getAllPermacultureRoles(): PermacultureRole[] {
  return Object.values(ROLE_CATALOG);
}
