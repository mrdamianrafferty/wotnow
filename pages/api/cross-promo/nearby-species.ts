/**
 * GET /api/cross-promo/nearby-species
 *
 * Server-side proxy that chains two of Findr's public endpoints to answer
 * "what should I be targeting near this location":
 *   1. /api/findr/rectangle-lookup — snaps lat/lon to Findr's grid cell id
 *      (pure math, no DB query)
 *   2. /api/findr/species/regional — species available in that grid cell,
 *      ranked by availability score (falls back to bioregional baseline
 *      species when there's no direct local telemetry yet — Findr says so
 *      explicitly via `note`, which this proxy passes through unchanged)
 *
 * Used by the "species to target near you" cross-promo card on the sea
 * fishing (shore/boat) activity cards — see
 * components/cross-promo/NearbySpeciesCard.tsx and its usage in
 * pages/activities.tsx.
 *
 * A server-side proxy rather than two direct client-side fetches because
 * neither Findr endpoint sends CORS headers for cross-origin browser
 * requests.
 *
 * Query params: lat, lon (required)
 * Returns: { species: NearbySpeciesResult[], note?: string } — always 200,
 * even on upstream failure (empty species array), so the card can fall
 * back to a generic Findr link rather than a broken UI.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

const FINDR_BASE_URL = 'https://fishfindr.eu';
const FETCH_TIMEOUT_MS = 5000;
const TOP_N = 3;

export interface NearbySpeciesResult {
  commonName: string;
  scientificName?: string;
  /** UTM-tagged link — deep link to the species page when Findr returns a
      slug, otherwise a generic species-index link. */
  url: string;
}

interface RectangleLookupResponse {
  rectangleCode?: string;
}

interface RegionalSpeciesItem {
  commonName?: string;
  scientificName?: string;
  slug?: string;
  availabilityScore?: number;
}

interface RegionalSpeciesResponse {
  species?: RegionalSpeciesItem[];
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

function speciesUrl(slug: string | undefined): string {
  const base = slug
    ? `${FINDR_BASE_URL}/findr/species/${encodeURIComponent(slug)}`
    : `${FINDR_BASE_URL}/findr/species`;
  return `${base}?utm_source=go_daisy&utm_medium=cross_promo&utm_content=activity_page`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ species: NearbySpeciesResult[]; note?: string } | { error: string }>
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

  try {
    const rectRes = await fetchWithTimeout(
      `${FINDR_BASE_URL}/api/findr/rectangle-lookup?lat=${lat}&lon=${lon}`,
      FETCH_TIMEOUT_MS,
    );
    if (!rectRes.ok) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).json({ species: [] });
    }
    const rect = (await rectRes.json()) as RectangleLookupResponse;
    if (!rect.rectangleCode) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).json({ species: [] });
    }

    const month = new Date().getMonth() + 1;
    const params = new URLSearchParams({
      icesSquare: rect.rectangleCode,
      month: String(month),
      minScore: '0.2',
      minResults: String(TOP_N),
    });
    const speciesRes = await fetchWithTimeout(
      `${FINDR_BASE_URL}/api/findr/species/regional?${params.toString()}`,
      FETCH_TIMEOUT_MS,
    );
    if (!speciesRes.ok) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).json({ species: [] });
    }

    const data = (await speciesRes.json()) as RegionalSpeciesResponse;
    const top = (data.species ?? [])
      .filter((s) => s.commonName)
      .sort((a, b) => (b.availabilityScore ?? 0) - (a.availabilityScore ?? 0))
      .slice(0, TOP_N)
      .map((s) => ({
        commonName: s.commonName as string,
        scientificName: s.scientificName,
        url: speciesUrl(s.slug),
      }));

    res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
    return res.status(200).json({ species: top });
  } catch (err) {
    console.warn('[nearby-species] Could not reach Findr:', err instanceof Error ? err.message : err);
    // Fail open — the card falls back to a generic Findr link, never a broken UI.
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({ species: [] });
  }
}
