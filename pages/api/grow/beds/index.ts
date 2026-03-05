import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../../lib/grow/server/auth';
import { serializeBed, buildPlantSummary, buildLastActivity, nextBedColor, type BedRow, type BedStatus, type PlantingSummaryRow } from '../../../../lib/grow/server/beds';
import { getSupabaseServerClient } from '../../../../lib/supabase/serverClient';
import { getTierLimits, isOverLimit, type GrowSubscriptionTier } from '../../../../lib/grow/subscription';

const ALLOWED_TYPES = new Set(['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other']);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET,POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  if (req.method === 'GET') {
    const { data: beds, error } = await supabase
      .from('grow_garden_beds')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('[grow] Failed to load beds for user', userId, error);
      return res.status(500).json({ error: 'Failed to load beds' });
    }

    // Get planting details per bed (active only) — names + quantities for summary
    const bedIds = (beds as BedRow[]).map(b => b.id);
    const plantCounts: Record<string, number> = {};
    const plantSummaries: Record<string, string> = {};
    const lastActivities: Record<string, string | null> = {};

    if (bedIds.length > 0) {
      const { data: plantings, error: plantingsError } = await supabase
        .from('grow_bed_plantings')
        .select('bed_id, quantity, planted_at, grow_user_plants!inner(name)')
        .in('bed_id', bedIds)
        .is('removed_at', null);

      if (!plantingsError && plantings) {
        const byBed: Record<string, PlantingSummaryRow[]> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of plantings as any[]) {
          if (row.bed_id) {
            plantCounts[row.bed_id] = (plantCounts[row.bed_id] || 0) + 1;
            // Supabase !inner returns the related row as an object (not array) for to-one joins
            const normalized: PlantingSummaryRow = {
              bed_id: row.bed_id,
              quantity: row.quantity,
              planted_at: row.planted_at,
              grow_user_plants: row.grow_user_plants,
            };
            (byBed[row.bed_id] ??= []).push(normalized);
          }
        }
        for (const [bedId, rows] of Object.entries(byBed)) {
          plantSummaries[bedId] = buildPlantSummary(rows);
          lastActivities[bedId] = buildLastActivity(rows);
        }
      }
    }

    // Compute bedStatus using species maturity data (single query for all active species)
    const bedStatuses: Record<string, BedStatus> = {};
    const plantingsByBedWithDates: Record<string, { plantedAt: string; speciesSlug: string | null }[]> = {};

    if (bedIds.length > 0) {
      // Fetch plantings with species slug for maturity lookup
      const { data: plantingsWithSlug } = await supabase
        .from('grow_bed_plantings')
        .select('bed_id, planted_at, grow_user_plants!inner(species_slug)')
        .in('bed_id', bedIds)
        .is('removed_at', null);

      if (plantingsWithSlug) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of plantingsWithSlug as any[]) {
          if (row.bed_id) {
            (plantingsByBedWithDates[row.bed_id] ??= []).push({
              plantedAt: row.planted_at,
              speciesSlug: row.grow_user_plants?.species_slug ?? null,
            });
          }
        }

        // Collect all unique species slugs
        const allSlugs = new Set<string>();
        for (const rows of Object.values(plantingsByBedWithDates)) {
          for (const r of rows) {
            if (r.speciesSlug) allSlugs.add(r.speciesSlug);
          }
        }

        // Single query for maturity data
        if (allSlugs.size > 0) {
          const serviceClient = getSupabaseServerClient();
          const { data: speciesData } = await serviceClient
            .from('plant_species')
            .select('slug, days_to_maturity_min, days_to_maturity_max')
            .in('slug', [...allSlugs]);

          const maturityMap = new Map<string, { min: number | null; max: number | null }>();
          if (speciesData) {
            for (const s of speciesData) {
              maturityMap.set(s.slug, {
                min: s.days_to_maturity_min,
                max: s.days_to_maturity_max,
              });
            }
          }

          // Compute status per bed — highest-priority status wins
          for (const [bedId, rows] of Object.entries(plantingsByBedWithDates)) {
            let hasReady = false;
            let hasApproaching = false;
            for (const row of rows) {
              if (!row.speciesSlug) continue;
              const mat = maturityMap.get(row.speciesSlug);
              if (!mat || (mat.min == null && mat.max == null)) continue;

              const min = mat.min ?? mat.max!;
              const max = mat.max ?? mat.min!;
              const midpoint = (min + max) / 2;
              const daysSincePlanted = Math.floor(
                (Date.now() - new Date(row.plantedAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              const progress = daysSincePlanted / midpoint;

              if (progress >= 0.85) {
                hasReady = true;
                break;
              } else if (progress >= 0.65) {
                hasApproaching = true;
              }
            }
            bedStatuses[bedId] = hasReady ? 'ready_to_harvest' : hasApproaching ? 'approaching_harvest' : 'healthy';
          }
        }
      }
    }

    // Default empty beds
    for (const bed of (beds as BedRow[])) {
      if (!(bed.id in bedStatuses)) {
        bedStatuses[bed.id] = (plantCounts[bed.id] || 0) === 0 ? 'empty' : 'healthy';
      }
    }

    const serialized = (beds as BedRow[]).map(b =>
      serializeBed(b, plantCounts[b.id] || 0, plantSummaries[b.id] || '', lastActivities[b.id] ?? null, bedStatuses[b.id])
    );

    return res.status(200).json({ beds: serialized });
  }

  // POST: Create a new bed

  // Get subscription tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('grow_subscription_tier')
    .eq('id', userId)
    .single();

  const userTier = (profile?.grow_subscription_tier as GrowSubscriptionTier) || 'seed';

  // Check bed limit
  const { count, error: countError } = await supabase
    .from('grow_garden_beds')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    console.error('[grow] Failed to count beds for user', userId, countError);
  } else if (count !== null && isOverLimit(userTier, 'maxBeds', count)) {
    const limits = getTierLimits(userTier);
    return res.status(403).json({
      error: 'Bed limit reached',
      message: `You've reached your limit of ${limits.maxBeds} beds. Upgrade to create more.`,
      currentCount: count,
      limit: limits.maxBeds,
      tier: userTier,
      upgradeUrl: '/grow/premium',
    });
  }

  const { name, type } = req.body ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  if (!type || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: 'type must be one of: raised_bed, container, in_ground, greenhouse, polytunnel, other' });
  }

  const color = nextBedColor(count ?? 0);
  const sortOrder = (count ?? 0);

  const { data, error } = await supabase
    .from('grow_garden_beds')
    .insert({
      user_id: userId,
      name: String(name).trim(),
      type,
      color,
      sort_order: sortOrder,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[grow] Failed to create bed for user', userId, error);
    return res.status(500).json({ error: 'Failed to create bed' });
  }

  return res.status(201).json({ bed: serializeBed(data as BedRow, 0) });
}
