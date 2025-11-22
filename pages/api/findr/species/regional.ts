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

const MAX_MIN_RESULTS = 200;
const DEFAULT_TARGET_RESULTS = 50;

const BIOREGION_LABELS: Record<string, string> = {
  NE_Atlantic: 'North-East Atlantic',
  Mediterranean: 'Mediterranean Sea',
  NW_Atlantic: 'North-West Atlantic',
  NE_Pacific: 'North-East Pacific',
  Gulf_of_Alaska: 'Gulf of Alaska',
  Gulf_of_Mexico: 'Gulf of Mexico',
  Caribbean: 'Caribbean Sea',
  Hawaii: 'Hawaii',
  Sea_of_Cortez: 'Sea of Cortez',
  US_Atlantic: 'US Atlantic Shelf',
};

interface SpeciesRow {
  species_code: string;
  name_en: string | null;
  scientific_name: string | null;
  slug: string | null;
}

interface BioregionalFallbackResult {
  species: RegionalSpeciesResponse['species'];
  regionCodes: string[];
}

interface AvailabilityRecord {
  species_code: string;
  availability_score: string;
  is_primary_habitat: boolean;
  confidence: string;
  catch_count: number;
  data_source: string;
}

function mapRectangleToBioregions(icesSquare: string): string[] {
  const code = (icesSquare || '').trim().toUpperCase();
  if (!code) return [];

  if (code.startsWith('G')) {
    const gridRegions = mapGridCellToBioregions(code);
    if (gridRegions.length > 0) {
      return gridRegions;
    }
  }

  const prefixMatch = code.match(/^(\d{2})/);
  if (!prefixMatch) {
    return [];
  }

  const prefix = parseInt(prefixMatch[1], 10);
  if (prefix >= 7 && prefix <= 8) return ['Mediterranean'];
  if (prefix >= 20 && prefix <= 65) return ['NE_Atlantic'];
  if (prefix >= 70 && prefix <= 76) return ['NW_Atlantic'];
  if (prefix >= 77 && prefix <= 85) return ['NE_Pacific'];
  if (prefix >= 86 && prefix <= 88) return ['Gulf_of_Alaska'];
  if (prefix >= 90 && prefix <= 94) return ['Gulf_of_Mexico'];
  if (prefix >= 95 && prefix <= 97) return ['Caribbean'];
  if (prefix === 98) return ['Hawaii'];
  if (prefix >= 10 && prefix <= 19) return ['Sea_of_Cortez'];
  return ['NE_Atlantic'];
}

function mapGridCellToBioregions(code: string): string[] {
  const latMatch = code.match(/([NS])(\d{2})/i);
  const lonMatch = code.match(/([EW])(\d{3})/i) ?? code.match(/([EW])(\d{2})/i);

  if (!latMatch || !lonMatch) return [];

  const latHemisphere = latMatch[1].toUpperCase();
  const lonHemisphere = lonMatch[1].toUpperCase();
  const latSign = latHemisphere === 'S' ? -1 : 1;
  const lonSign = lonHemisphere === 'W' ? -1 : 1;
  const lat = latSign * parseInt(latMatch[2], 10);
  const lon = lonSign * parseInt(lonMatch[2], 10);

  return mapLatLonToBioregions(lat, lon);
}

function mapLatLonToBioregions(lat: number, lon: number): string[] {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

  if (lon >= 130 && lon <= 160 && lat >= 10 && lat <= 35) return ['Hawaii'];
  if (lon >= -118 && lon <= -104 && lat >= 20 && lat <= 32) return ['Sea_of_Cortez'];
  if (lon >= -95 && lon <= -75 && lat >= 18 && lat <= 32) return ['Gulf_of_Mexico'];
  if (lon >= -85 && lon <= -60 && lat >= 10 && lat <= 25) return ['Caribbean'];
  if (lon >= -85 && lon <= -70 && lat >= 24 && lat <= 38) return ['US_Atlantic'];
  if (lon >= -100 && lon <= -50 && lat >= 30 && lat <= 60) return ['NW_Atlantic'];
  if (lon >= -150 && lon <= -110 && lat >= 25 && lat <= 60) return ['NE_Pacific'];
  if (lon >= -170 && lon <= -140 && lat >= 45 && lat <= 65) return ['Gulf_of_Alaska'];
  if (lon >= -10 && lon <= 40 && lat >= 30 && lat <= 45) return ['Mediterranean'];
  if (lon >= -30 && lon <= 40 && lat >= 20 && lat <= 75) return ['NE_Atlantic'];
  return ['NE_Atlantic'];
}

function humanizeRegionList(codes: string[]): string {
  if (!codes.length) return '';
  const labels = codes.map(code => BIOREGION_LABELS[code] || code);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  const last = labels.pop();
  return `${labels.join(', ')}, and ${last}`;
}

function buildResponseNote(options: {
  hasPrimaryData: boolean;
  usedBioregionalFallback: boolean;
  bioregionCodes: string[];
  usedCatchHistoryFallback: boolean;
}): string | undefined {
  const parts: string[] = [];

  if (!options.hasPrimaryData) {
    parts.push('We have not recorded direct availability readings for this exact rectangle yet.');
  }

  if (options.usedBioregionalFallback) {
    const labelText = humanizeRegionList(options.bioregionCodes);
    if (labelText) {
      parts.push(`Filled with ${labelText} baseline species while we gather fresh local telemetry.`);
    } else {
      parts.push('Filled with nearby bioregional baseline species while we gather fresh local telemetry.');
    }
  }

  if (options.usedCatchHistoryFallback) {
    parts.push('Recent community catches round out the list.');
  }

  return parts.length ? parts.join(' ') : undefined;
}

async function fetchCatchHistorySpecies(icesSquare: string) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: recentCatches, error: catchError } = await supabase
    .from('findr_catch_entries')
    .select('species_id, species_common_name, scientific_name')
    .eq('rectangle_code', icesSquare)
    .gte('caught_at', ninetyDaysAgo.toISOString());

  if (catchError) {
    throw catchError;
  }

  if (!recentCatches || recentCatches.length === 0) {
    return [];
  }

  const catchMap = new Map<string, {
    id: string;
    commonName: string;
    scientificName?: string;
    catchCount: number;
  }>();

  recentCatches.forEach(catch_ => {
    const key = catch_.species_id;
    if (!key) return;
    if (catchMap.has(key)) {
      catchMap.get(key)!.catchCount++;
    } else {
      catchMap.set(key, {
        id: catch_.species_id,
        commonName: catch_.species_common_name,
        scientificName: catch_.scientific_name || undefined,
        catchCount: 1,
      });
    }
  });

  return Array.from(catchMap.values())
    .sort((a, b) => b.catchCount - a.catchCount)
    .map(sp => ({
      id: sp.id,
      code: sp.id,
      commonName: sp.commonName,
      scientificName: sp.scientificName,
      imageUrl: undefined,
      availabilityScore: 0.5,
      isPrimaryHabitat: false,
      confidence: 0.3,
      catchCount: sp.catchCount,
      dataSource: 'catch_history_fallback',
      lastCatchAt: undefined,
    }));
}

function buildBioregionalSuggestion(row: SpeciesRow, rank: number) {
  const baseAvailability = 0.34;
  const baseConfidence = 0.45;
  const availabilityScore = Math.max(0.05, baseAvailability - rank * 0.004);
  const confidence = Math.max(0.05, baseConfidence - rank * 0.006);

  return {
    id: row.species_code,
    code: row.species_code,
    commonName: row.name_en || row.species_code,
    scientificName: row.scientific_name || undefined,
    imageUrl: row.slug ? `/PNGS/${row.slug}.png` : undefined,
    availabilityScore: Number(availabilityScore.toFixed(3)),
    isPrimaryHabitat: false,
    confidence: Number(confidence.toFixed(3)),
    catchCount: 0,
    dataSource: 'bioregional_fallback',
    lastCatchAt: undefined,
  } satisfies RegionalSpeciesResponse['species'][number];
}

async function fetchBioregionalFallback(
  icesSquare: string,
  needed: number,
  excludeCodes: Set<string>,
): Promise<BioregionalFallbackResult> {
  if (needed <= 0) {
    return { species: [], regionCodes: [] };
  }

  const regionCodes = mapRectangleToBioregions(icesSquare);
  if (regionCodes.length === 0) {
    return { species: [], regionCodes: [] };
  }

  const suggestions: RegionalSpeciesResponse['species'] = [];
  const seen = new Set(Array.from(excludeCodes).map((code) => code.toUpperCase()));

  const tryAddRows = (rows: SpeciesRow[] | null | undefined) => {
    if (!rows) return;
    for (const row of rows) {
      const code = row.species_code?.toUpperCase();
      if (!code || seen.has(code)) continue;
      suggestions.push(buildBioregionalSuggestion(row, suggestions.length));
      seen.add(code);
      if (suggestions.length >= needed) break;
    }
  };

  try {
    const { data, error } = await supabase
      .from('species')
      .select('species_code, name_en, scientific_name, slug')
      .overlaps('biogeographic_regions', regionCodes)
      .order('name_en', { ascending: true })
      .limit(needed * 3);

    if (error) {
      console.warn('[regional-species] Bioregional fallback query failed:', error);
    } else {
      tryAddRows(data);
    }
  } catch (error) {
    console.warn('[regional-species] Bioregional fallback fetch error:', error);
  }

  const remaining = needed - suggestions.length;
  if (remaining > 0) {
    try {
      const { data, error } = await supabase
        .from('species')
        .select('species_code, name_en, scientific_name, slug')
        .is('biogeographic_regions', null)
        .order('name_en', { ascending: true })
        .limit(remaining * 2);

      if (error) {
        console.warn('[regional-species] General fallback query failed:', error);
      } else {
        tryAddRows(data);
      }
    } catch (error) {
      console.warn('[regional-species] General fallback fetch error:', error);
    }
  }

  return { species: suggestions, regionCodes };
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
    const minResultsParam = Array.isArray(req.query.minResults) ? req.query.minResults[0] : req.query.minResults;
    const parsedMinResults = minResultsParam ? parseInt(minResultsParam, 10) : 0;
    const minResults = Number.isFinite(parsedMinResults)
      ? Math.max(0, Math.min(MAX_MIN_RESULTS, parsedMinResults))
      : 0;

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
    const { data: availabilityData, error: availabilityError } = await supabase.rpc('get_regional_species', {
      p_region_type: regionType,
      p_region_id: icesSquare,
      p_month: monthFilter || null,
      p_min_score: minScoreFilter,
    });

    if (availabilityError) {
      console.warn('[regional-species] Availability query failed:', availabilityError);
    }

    const targetMinResults = minResults > 0 ? minResults : DEFAULT_TARGET_RESULTS;
    const speciesList: RegionalSpeciesResponse['species'] = [];
    let usedBioregionalFallback = false;
    let usedCatchHistoryFallback = false;
    let bioregionCodesUsed: string[] = [];

    if (availabilityData && availabilityData.length > 0) {
      const speciesCodes = availabilityData.map((r: AvailabilityRecord) => r.species_code);

      const { data: speciesDetails, error: speciesError } = await supabase
        .from('species')
        .select('species_code, name_en, scientific_name, slug')
        .in('species_code', speciesCodes);

      if (speciesError) {
        console.error('[regional-species] Species details query failed:', speciesError);
      }

      const speciesMap = new Map(
        speciesDetails?.map(s => [
          s.species_code,
          {
            commonName: s.name_en,
            scientificName: s.scientific_name,
            imageUrl: s.slug ? `/PNGS/${s.slug}.png` : undefined,
          },
        ]) || [],
      );

      availabilityData.forEach((avail: AvailabilityRecord) => {
        const details = speciesMap.get(avail.species_code) || {
          commonName: avail.species_code,
          scientificName: undefined,
          imageUrl: undefined,
        };

        speciesList.push({
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
          lastCatchAt: undefined,
        });
      });
    }

    const existingCodes = new Set(
      speciesList.map(sp => sp.code?.toUpperCase()).filter(Boolean) as string[],
    );

    if (speciesList.length < targetMinResults) {
      try {
        const needed = targetMinResults - speciesList.length;
        const bioregional = await fetchBioregionalFallback(icesSquare, needed, existingCodes);
        if (bioregional.species.length > 0) {
          speciesList.push(...bioregional.species);
          usedBioregionalFallback = true;
          bioregionCodesUsed = bioregional.regionCodes;
          bioregional.species.forEach(sp => {
            if (sp.code) {
              existingCodes.add(sp.code.toUpperCase());
            }
          });
        }
      } catch (error) {
        console.warn('[regional-species] Bioregional padding failed:', error);
      }
    }

    if (speciesList.length < targetMinResults) {
      try {
        const fallbackSpecies = await fetchCatchHistorySpecies(icesSquare);
        if (fallbackSpecies.length > 0) {
          for (const fallback of fallbackSpecies) {
            const fallbackCode = fallback.code?.toUpperCase();
            if (!fallbackCode || existingCodes.has(fallbackCode)) continue;
            speciesList.push(fallback);
            existingCodes.add(fallbackCode);
            usedCatchHistoryFallback = true;
            if (speciesList.length >= targetMinResults) break;
          }
        }
      } catch (fallbackError) {
        console.warn('[regional-species] Catch history top-up failed', fallbackError);
      }
    }

    if (speciesList.length === 0) {
      return res.status(200).json({
        success: true,
        regionId: icesSquare,
        regionType,
        species: [],
        dataSource: 'none',
        note: 'No species data available for this region yet. Be the first to log a catch!'
      });
    }

    const hasPrimaryData = Boolean(availabilityData && availabilityData.length > 0);
    const responseNote = buildResponseNote({
      hasPrimaryData,
      usedBioregionalFallback,
      bioregionCodes: bioregionCodesUsed,
      usedCatchHistoryFallback,
    }) || (hasPrimaryData && !usedBioregionalFallback && !usedCatchHistoryFallback
      ? 'Comprehensive species availability data with catch validation'
      : undefined);

    const responseDataSource = (() => {
      if (hasPrimaryData) {
        if (usedBioregionalFallback && usedCatchHistoryFallback) return 'species_regional_availability+bioregional+catch_history';
        if (usedBioregionalFallback) return 'species_regional_availability+bioregional';
        if (usedCatchHistoryFallback) return 'species_regional_availability+catch_history';
        return 'species_regional_availability';
      }
      if (usedBioregionalFallback && usedCatchHistoryFallback) return 'bioregional_fallback+catch_history';
      if (usedBioregionalFallback) return 'bioregional_fallback';
      if (usedCatchHistoryFallback) return 'community_catches_fallback';
      return 'none';
    })();

    return res.status(200).json({
      success: true,
      regionId: icesSquare,
      regionType,
      month: monthFilter,
      species: speciesList,
      dataSource: responseDataSource,
      note: responseNote,
    });

  } catch (error) {
    console.error('[regional-species] API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
