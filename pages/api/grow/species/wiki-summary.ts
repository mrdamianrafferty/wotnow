import type { NextApiRequest, NextApiResponse } from 'next';
import { getWikipediaSummary, getWikipediaSummaryByScientificName, type WikiSummaryInfo } from '@/lib/grow/wikipediaLicense';

export interface WikiSummaryResponse {
  success: boolean;
  summary?: {
    extract: string;
    pageUrl: string;
    attribution: string;
    language: string;
    thumbnailUrl?: string;
  };
  error?: string;
}

/**
 * GET /api/grow/species/wiki-summary
 * Fetches Wikipedia summary for a species
 * 
 * Query params:
 *   - scientificName: Scientific name to search (e.g., "Rosa gallica")
 *   - wikiUrl: Direct Wikipedia URL (alternative to scientificName)
 *   - preferEnglish: Whether to prefer English Wikipedia (default: true)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WikiSummaryResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { scientificName, wikiUrl, preferEnglish } = req.query;

  if (!scientificName && !wikiUrl) {
    return res.status(400).json({ 
      success: false, 
      error: 'Either scientificName or wikiUrl is required' 
    });
  }

  try {
    let summary: WikiSummaryInfo | null = null;

    if (wikiUrl && typeof wikiUrl === 'string') {
      // Fetch from specific Wikipedia URL
      summary = await getWikipediaSummary(wikiUrl);
    } else if (scientificName && typeof scientificName === 'string') {
      // Search by scientific name across multiple Wikipedia languages
      const preferEn = preferEnglish !== 'false';
      summary = await getWikipediaSummaryByScientificName(scientificName, preferEn);
    }

    if (!summary || !summary.extract) {
      return res.status(404).json({ 
        success: false, 
        error: 'No Wikipedia article found for this species' 
      });
    }

    // Cache for 24 hours - Wikipedia content doesn't change frequently
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');

    return res.status(200).json({
      success: true,
      summary: {
        extract: summary.extract,
        pageUrl: summary.pageUrl,
        attribution: summary.attribution,
        language: summary.language,
        thumbnailUrl: summary.thumbnailUrl,
      },
    });
  } catch (error) {
    console.error('[wiki-summary] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Wikipedia summary' 
    });
  }
}
