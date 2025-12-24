import type { PostgrestError } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createPagesServerClient } from '../../../lib/supabase/pages-api';
import type { FavouriteInsight } from '../../../hooks/useFavouriteInsights';

interface FavouriteInsightsRequestBody {
  ids?: string[];
}

interface FavouriteStatsRow {
  species_id: string;
  catches_total?: number | null;
  swiped_date_label?: string | null;
  last_perfect_conditions?: string | null;
  recent_activity?: string | null;
  next_best_day?: string | null;
  preferred_bait?: string | null;
  season_label?: string | null;
  recency_score?: number | null;
}

const TABLE_NAME = 'findr_favourite_stats';

function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === '42703';
}

function normaliseRow(row: FavouriteStatsRow): FavouriteInsight | null {
  const id = row.species_id?.trim();
  if (!id) return null;

  return {
    id,
    catches: row.catches_total ?? null,
    swipedDateLabel: row.swiped_date_label ?? null,
    lastPerfectConditions: row.last_perfect_conditions ?? null,
    recentActivity: row.recent_activity ?? null,
    nextBestDay: row.next_best_day ?? null,
    bestBait: row.preferred_bait ?? null,
    bestBaitSource: row.preferred_bait ? 'supabase' : null,
    seasonLabel: row.season_label ?? null,
    recencyScore: row.recency_score ?? null,
  } satisfies FavouriteInsight;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body: FavouriteInsightsRequestBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_error) {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((value): value is string => typeof value === 'string') : [];
  const trimmedIds = ids.map((value) => value.trim()).filter((value) => value.length > 0);

  if (trimmedIds.length === 0) {
    res.status(204).end();
    return;
  }

  let supabase;
  try {
    // Use user's session so auth.uid() works in the view
    supabase = createPagesServerClient({ req, res });
  } catch (error) {
    console.warn('[findr] Supabase unavailable for favourite insights', (error as Error).message);
    res.status(200).json({ insights: [], source: 'fallback' });
    return;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      'species_id, catches_total, swiped_date_label, last_perfect_conditions, recent_activity, next_best_day, preferred_bait, season_label, recency_score'
    )
  .in('species_id', trimmedIds)
  .limit(200);

  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[findr] Favourite stats table missing; falling back to mock data');
      res.status(200).json({ insights: [], source: 'fallback' });
      return;
    }

    console.error('[findr] Error querying favourite stats', error);
    res.status(502).json({ error: 'Failed to load favourite insights', details: error.message });
    return;
  }

  const rows = (data as FavouriteStatsRow[] | null) ?? [];

  const insights = rows
    .map(normaliseRow)
    .filter((value): value is FavouriteInsight => value !== null);

  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
  res.status(200).json({ insights, source: 'supabase', count: insights.length });
}
