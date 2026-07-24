/**
 * GET /api/cross-promo/nearby-fishery
 *
 * Server-side proxy to Rise Daisy's public "worth the drive" fishery
 * resolver (https://www.risedaisy.com/api/fishery/worth-the-drive), used by
 * the "nearest Rise Daisy fishery" cross-promo card on the fly-fishing
 * activity card (see components/cross-promo/NearbyFisheryCard.tsx and its
 * usage in pages/activities.tsx).
 *
 * This is a server-side proxy rather than a direct client fetch because
 * Rise Daisy's endpoint sends no CORS headers for cross-origin browser
 * requests — a route handler here calls it server-to-server, where CORS
 * doesn't apply, then returns just the one field the card needs.
 *
 * minScore=0 and a generous maxMinutes because this card's job is "here is
 * a real, named nearby river" (Phase 5 acceptance criteria), not "here is
 * a river fishing well today" — narrowing by score would silently hide a
 * genuine nearby venue on an average conditions day.
 *
 * Query params: lat, lon (required)
 * Returns: { fishery: NearbyFisheryResult | null } — always 200, even on
 * upstream failure, so the card can render its generic fallback link
 * rather than a broken UI.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const RISE_DAISY_WORTH_THE_DRIVE_URL = 'https://www.risedaisy.com/api/fishery/worth-the-drive';
const FETCH_TIMEOUT_MS = 5000;
const MAX_MINUTES = 180;

export interface NearbyFisheryResult {
  slug: string;
  name: string;
  region: string | null;
  drive_minutes: number | null;
  /** UTM-tagged link to the fishery's Rise Daisy page. */
  url: string;
}

interface RiseDaisyItem {
  slug?: string;
  name?: string;
  region?: string | null;
  drive_minutes?: number | null;
}

interface RiseDaisyResponse {
  fisheries?: RiseDaisyItem[];
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GoDaisy-CrossPromo/1.0 (+https://godaisy.io)' },
    });
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ fishery: NearbyFisheryResult | null } | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = parseFloat(String(req.query.lat ?? ''));
  const lon = parseFloat(String(req.query.lon ?? ''));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'lat and lon parameters required' });
  }

  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lon), // Rise Daisy's endpoint takes `lng`, not `lon`
    maxMinutes: String(MAX_MINUTES),
    minScore: '0',
    limit: '1',
  });

  try {
    const upstream = await fetchWithTimeout(`${RISE_DAISY_WORTH_THE_DRIVE_URL}?${params.toString()}`, FETCH_TIMEOUT_MS);

    if (!upstream.ok) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).json({ fishery: null });
    }

    const data = (await upstream.json()) as RiseDaisyResponse;
    const first = Array.isArray(data.fisheries) ? data.fisheries[0] : undefined;

    if (!first?.slug || !first?.name) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).json({ fishery: null });
    }

    const fishery: NearbyFisheryResult = {
      slug: first.slug,
      name: first.name,
      region: first.region ?? null,
      drive_minutes: typeof first.drive_minutes === 'number' ? first.drive_minutes : null,
      url: `https://www.risedaisy.com/fishery/${encodeURIComponent(first.slug)}?utm_source=go_daisy&utm_medium=cross_promo&utm_content=activity_page`,
    };

    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return res.status(200).json({ fishery });
  } catch (err) {
    console.warn('[nearby-fishery] Could not reach Rise Daisy worth-the-drive:', err instanceof Error ? err.message : err);
    // Fail open — the card falls back to a generic Rise Daisy link, never a broken UI.
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({ fishery: null });
  }
}
