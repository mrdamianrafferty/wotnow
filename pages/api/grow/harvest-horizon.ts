import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedClient } from '../../../lib/grow/server/auth';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { getGrowthStage } from '../../../lib/grow/growthStage';

interface HarvestHorizonItem {
  plantingId: string;
  plantName: string;
  speciesSlug: string | null;
  bedName: string;
  bedColor: string;
  plantedAt: string;
  daysRemaining: number;
  growthProgress: number;
  stageBadgeClass: string;
  stageLabel: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await getAuthenticatedClient(req, res);
  if (!auth) return;

  const { supabase, userId } = auth;

  try {
    // Fetch active plantings with bed + plant info
    const { data: plantings, error: plantingsError } = await supabase
      .from('grow_bed_plantings')
      .select('id, planted_at, bed_id, grow_user_plants!inner(name, species_slug), grow_garden_beds!inner(name, color)')
      .eq('grow_garden_beds.user_id', userId)
      .is('removed_at', null);

    if (plantingsError) {
      console.error('[grow/harvest-horizon] Failed to fetch plantings:', plantingsError);
      return res.status(500).json({ error: 'Failed to fetch plantings' });
    }

    if (!plantings || plantings.length === 0) {
      return res.status(200).json({ plants: [] });
    }

    // Collect unique species slugs for maturity data
    const allSlugs = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of plantings as any[]) {
      const slug = row.grow_user_plants?.species_slug;
      if (slug) allSlugs.add(slug);
    }

    // Fetch maturity data using service role client (species has RLS)
    const maturityMap = new Map<string, { min: number | null; max: number | null }>();
    if (allSlugs.size > 0) {
      const serviceClient = getSupabaseServerClient();
      const { data: speciesData } = await serviceClient
        .from('plant_species')
        .select('slug, days_to_maturity_min, days_to_maturity_max')
        .in('slug', [...allSlugs]);

      if (speciesData) {
        for (const s of speciesData) {
          maturityMap.set(s.slug, {
            min: s.days_to_maturity_min,
            max: s.days_to_maturity_max,
          });
        }
      }
    }

    // Compute growth stages and filter to approaching/ready/past_peak
    const items: HarvestHorizonItem[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of plantings as any[]) {
      const speciesSlug: string | null = row.grow_user_plants?.species_slug ?? null;
      if (!speciesSlug) continue;

      const mat = maturityMap.get(speciesSlug);
      if (!mat || (mat.min == null && mat.max == null)) continue;

      const stageInfo = getGrowthStage(
        row.planted_at,
        mat.min,
        mat.max,
      );
      if (!stageInfo) continue;

      // Only include progress >= 0.65 (approaching harvest onward)
      if (stageInfo.progress < 0.65) continue;

      const min = mat.min ?? mat.max!;
      const max = mat.max ?? mat.min!;
      const midpoint = (min + max) / 2;
      const daysSincePlanted = Math.floor(
        (Date.now() - new Date(row.planted_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = Math.max(0, Math.round(midpoint - daysSincePlanted));

      items.push({
        plantingId: row.id,
        plantName: row.grow_user_plants?.name ?? 'Unknown',
        speciesSlug,
        bedName: row.grow_garden_beds?.name ?? '',
        bedColor: row.grow_garden_beds?.color ?? 'slate',
        plantedAt: row.planted_at,
        daysRemaining,
        growthProgress: stageInfo.progress,
        stageBadgeClass: stageInfo.badgeClass,
        stageLabel: stageInfo.label,
      });
    }

    // Sort by days remaining ascending, take top 4
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    const top = items.slice(0, 4);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ plants: top });
  } catch (error) {
    console.error('[grow/harvest-horizon] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
