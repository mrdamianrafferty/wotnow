/**
 * /api/findr/species/regional
 *
 * Get all species available in a given ICES rectangle or grid cell
 * Uses comprehensive species_regional_availability table
 * Falls back to community catches if no data available
 *
 * Query params:
 *  - icesSquare: ICES rectangle code (e.g., "31F1") OR grid cell ID (e.g., "G025_N51W002")
 *  - month: Optional month filter (1-12) for seasonal availability
 *  - minScore: Optional minimum availability score filter (0.0-1.0, default 0.3)
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface AvailabilityRecord {
  species_code: string;
  availability_score: string;
  is_primary_habitat: boolean;
  confidence: string;
  catch_count: number;
  data_source: string;
}

interface RegionalSpeciesResponse {
  success: boolean;
  regionId: string;
  regionType: 'ices' | 'grid';
  month?: number;
  species: Array<{
    id: string;
    code: string;
    commonName: string;
    scientificName?: string;
    imageUrl?: string;
    availabilityScore: number;
    isPrimaryHabitat: boolean;
    confidence: number;
    catchCount: number;
    dataSource: string;
    lastCatchAt?: string;
  }>;
  dataSource: string;
  note?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegionalSpeciesResponse | { error: string; details?: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { icesSquare, month, minScore } = req.query;

    if (!icesSquare || typeof icesSquare !== 'string') {
      return res.status(400).json({ error: 'icesSquare parameter is required' });
    }

    // Parse optional parameters
    const monthFilter = month && typeof month === 'string' ? parseInt(month, 10) : undefined;
    const minScoreFilter = minScore && typeof minScore === 'string' ? parseFloat(minScore) : 0.3;

    if (monthFilter && (monthFilter < 1 || monthFilter > 12)) {
      return res.status(400).json({ error: 'month must be between 1 and 12' });
    }

    // Determine region type (ICES rectangle or grid cell)
    const regionType = icesSquare.startsWith('G025_') ? 'grid' : 'ices';

    // PRIMARY: Query species_regional_availability table using helper function
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('get_regional_species', {
        p_region_type: regionType,
        p_region_id: icesSquare,
        p_month: monthFilter || null,
        p_min_score: minScoreFilter
      });

    if (availabilityError) {
      console.warn('[regional-species] Availability query failed:', availabilityError);
    }

    // If we have availability data, enrich with species details
    if (availabilityData && availabilityData.length > 0) {
      const speciesCodes = availabilityData.map((r: AvailabilityRecord) => r.species_code);

      // Fetch full species details
      const { data: speciesDetails, error: speciesError } = await supabase
        .from('species')
        .select('species_code, name_en, scientific_name, slug')
        .in('species_code', speciesCodes);

      if (speciesError) {
        console.error('[regional-species] Species details query failed:', speciesError);
      }

      // Create species lookup map
      const speciesMap = new Map(
        speciesDetails?.map(s => [
          s.species_code,
          {
            commonName: s.name_en,
            scientificName: s.scientific_name,
            imageUrl: s.slug ? `/PNGS/${s.slug}.png` : undefined
          }
        ]) || []
      );

      // Combine availability data with species details
      const enrichedSpecies = availabilityData.map((avail: AvailabilityRecord) => {
        const details = speciesMap.get(avail.species_code) || {
          commonName: avail.species_code,
          scientificName: undefined,
          imageUrl: undefined
        };

        return {
          id: avail.species_code,
          code: avail.species_code,
          commonName: details.commonName,
          scientificName: details.scientificName,
          imageUrl: details.imageUrl,
          availabilityScore: parseFloat(avail.availability_score),
          isPrimaryHabitat: avail.is_primary_habitat,
          confidence: parseFloat(avail.confidence),
          catchCount: avail.catch_count,
          dataSource: avail.data_source,
          lastCatchAt: undefined // Could add this if needed
        };
      });

      return res.status(200).json({
        success: true,
        regionId: icesSquare,
        regionType,
        month: monthFilter,
        species: enrichedSpecies,
        dataSource: 'species_regional_availability',
        note: 'Comprehensive species availability data with catch validation'
      });
    }

    // FALLBACK: Use community catch history (last 90 days) if no availability data
    console.log('[regional-species] No availability data, falling back to catch history');

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: recentCatches, error: catchError } = await supabase
      .from('findr_catch_entries')
      .select('species_id, species_common_name, scientific_name')
      .eq('rectangle_code', icesSquare)
      .gte('caught_at', ninetyDaysAgo.toISOString());

    if (catchError) {
      console.error('[regional-species] Catch history query failed:', catchError);
      return res.status(500).json({
        error: 'Failed to fetch regional species',
        details: catchError.message
      });
    }

    if (!recentCatches || recentCatches.length === 0) {
      // No data at all for this region
      return res.status(200).json({
        success: true,
        regionId: icesSquare,
        regionType,
        species: [],
        dataSource: 'none',
        note: 'No species data available for this region yet. Be the first to log a catch!'
      });
    }

    // Aggregate catch history by species
    const catchMap = new Map<string, {
      id: string;
      commonName: string;
      scientificName?: string;
      catchCount: number;
    }>();

    recentCatches.forEach(catch_ => {
      const key = catch_.species_id;
      if (catchMap.has(key)) {
        catchMap.get(key)!.catchCount++;
      } else {
        catchMap.set(key, {
          id: catch_.species_id,
          commonName: catch_.species_common_name,
          scientificName: catch_.scientific_name || undefined,
          catchCount: 1
        });
      }
    });

    // Convert to response format
    const fallbackSpecies = Array.from(catchMap.values())
      .sort((a, b) => b.catchCount - a.catchCount)
      .map(sp => ({
        id: sp.id,
        code: sp.id,
        commonName: sp.commonName,
        scientificName: sp.scientificName,
        imageUrl: undefined,
        availabilityScore: 0.5, // Placeholder
        isPrimaryHabitat: false,
        confidence: 0.3, // Low confidence without validation
        catchCount: sp.catchCount,
        dataSource: 'catch_history_fallback',
        lastCatchAt: undefined
      }));

    return res.status(200).json({
      success: true,
      regionId: icesSquare,
      regionType,
      species: fallbackSpecies,
      dataSource: 'community_catches_fallback',
      note: 'Species list from recent catches. Comprehensive data coming soon.'
    });

  } catch (error) {
    console.error('[regional-species] API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
