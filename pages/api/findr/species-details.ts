import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import type { SeasonalityCurve, SeasonalityProfile } from '@/types/findrSeasonality';

interface TechniqueData {
  technique_id: number;
  technique_code: string;
  technique_name: string;
  effectiveness: number;
  notes: string | null;
  beginner_tips: string | null;
}

interface BaitData {
  bait_id: number;
  bait_name: string;
  effectiveness: number;
  notes: string | null;
}

interface SubstrateData {
  name_en: string;
  has_sand: boolean;
  has_gravel: boolean;
  has_rock: boolean;
  has_mud: boolean;
  has_mixed: boolean;
}

interface AdviceData {
  shore?: {
    regions?: string;
    best_time?: string;
    tide_sensitivity?: string;
    baits_diet?: string;
    temperature_effect?: string;
    weather_effect?: string;
    distance_depth?: string;
    restrictions?: string;
    authority?: string;
  };
  boat?: {
    regions?: string;
    best_time?: string;
    tide_sensitivity?: string;
    baits_diet?: string;
    temperature_effect?: string;
    weather_effect?: string;
    distance_depth?: string;
    restrictions?: string;
    authority?: string;
  };
}

interface SpeciesDetailResponse {
  species_id: string;
  species_code: string;
  name_en: string;
  scientific_name: string | null;
  inaturalist_url: string | null;
  techniques: TechniqueData[];
  bait: BaitData[];
  substrates: SubstrateData | null;
  advice: AdviceData | null;
  eating_quality: number | null;
  conservation_status: string | null;
  fun_fact: string | null;
  min_depth: number | null;
  max_depth: number | null;
  guild: string | null;
  species_badges: string[] | null;
  recommended_baits: string[] | null;
  temp_opt_c: number[] | null;
  seasonalityProfile: SeasonalityProfile | null;
  isSeasonal: boolean;
  regionCode: string | null;
  seasonalityCurve: SeasonalityCurve | null;
}

function parseMonthArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      const numberValue = typeof entry === 'number' ? entry : Number(entry);
      return Number.isFinite(numberValue) ? Number(numberValue) : null;
    })
    .filter((entry): entry is number => entry != null && entry >= 1 && entry <= 12);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { species_id, species_code, region_code, rectangle_code } = req.query;

  if (!species_id && !species_code) {
    return res.status(400).json({
      error: 'Missing required parameter: species_id or species_code'
    });
  }

  // Validate species_id is a UUID, not a species code
  const isValidUUID = typeof species_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(species_id);
  const useSpeciesId = isValidUUID;

  try {
    const supabase = getSupabaseServerClient();

    let resolvedRegionCode: string | null = null;
    if (typeof region_code === 'string' && region_code.trim().length > 0) {
      resolvedRegionCode = region_code.trim().toUpperCase();
    } else if (typeof rectangle_code === 'string' && rectangle_code.trim().length > 0) {
      const { data: rectangleRow, error: rectangleError } = await supabase
        .from('ices_rectangles')
        .select('region')
        .eq('rectangle_code', rectangle_code.trim().toUpperCase())
        .maybeSingle();

      if (rectangleError) {
        console.warn('[species-details] Failed to resolve region for rectangle', rectangle_code, rectangleError.message);
      }

      if (rectangleRow?.region) {
        resolvedRegionCode = rectangleRow.region;
      }
    }

    // Build the base query
    let query = supabase
      .from('species')
      .select(`
        id,
        species_code,
        name_en,
        scientific_name,
        inaturalist_url,
        advice,
        eating_quality,
        conservation_status,
        fun_fact,
        min_depth,
        max_depth,
        guild,
        species_badges,
        recommended_baits,
        temp_opt_c,
        seasonality_profile,
        is_seasonal,
        peak_months,
        good_months,
        possible_months
      `)
      .limit(1);

    // Filter by either species_id (if valid UUID) or species_code
    if (useSpeciesId) {
      query = query.eq('id', species_id);
    } else if (species_code) {
      query = query.eq('species_code', species_code);
    } else {
      // species_id was provided but it's not a valid UUID, treat it as a code
      query = query.eq('species_code', species_id);
    }

    const { data: speciesData, error: speciesError } = await query.single();

    if (speciesError || !speciesData) {
      console.error('[species-details] Species not found:', speciesError);
      return res.status(404).json({ error: 'Species not found' });
    }

    let seasonalityCurve: SeasonalityCurve | null = null;
    if (resolvedRegionCode) {
      const { data: seasonalityData, error: seasonalityError } = await supabase
        .from('species_region_seasonality')
        .select('peak_months, good_months, possible_months, availability_multiplier, source, source_confidence')
        .eq('species_id', speciesData.id)
        .eq('region_code', resolvedRegionCode)
        .limit(1)
        .maybeSingle();

      if (seasonalityError) {
        console.warn('[species-details] Error fetching seasonality curve:', seasonalityError.message);
      }

      if (seasonalityData) {
        seasonalityCurve = {
          peak_months: parseMonthArray(seasonalityData.peak_months),
          good_months: parseMonthArray(seasonalityData.good_months),
          possible_months: parseMonthArray(seasonalityData.possible_months),
          availability_multiplier: typeof seasonalityData.availability_multiplier === 'number'
            ? seasonalityData.availability_multiplier
            : Number.isFinite(Number(seasonalityData.availability_multiplier))
              ? Number(seasonalityData.availability_multiplier)
              : null,
          source: typeof seasonalityData.source === 'string' ? seasonalityData.source : null,
          source_confidence: typeof seasonalityData.source_confidence === 'number'
            ? seasonalityData.source_confidence
            : Number.isFinite(Number(seasonalityData.source_confidence))
              ? Number(seasonalityData.source_confidence)
              : null,
        } satisfies SeasonalityCurve;
      }
    }

    if (!seasonalityCurve) {
      const fallbackPeakMonths = parseMonthArray((speciesData as Record<string, unknown>).peak_months);
      const fallbackGoodMonths = parseMonthArray((speciesData as Record<string, unknown>).good_months);
      const fallbackPossibleMonths = parseMonthArray((speciesData as Record<string, unknown>).possible_months);

      const hasFallbackCurve =
        fallbackPeakMonths.length > 0 ||
        fallbackGoodMonths.length > 0 ||
        fallbackPossibleMonths.length > 0;

      if (hasFallbackCurve) {
        seasonalityCurve = {
          peak_months: fallbackPeakMonths,
          good_months: fallbackGoodMonths,
          possible_months: fallbackPossibleMonths,
          availability_multiplier: null,
          source: 'species_baseline',
          source_confidence: null,
        } satisfies SeasonalityCurve;

        if (!resolvedRegionCode) {
          resolvedRegionCode = 'GLOBAL';
        }
      }
    }

    // Fetch techniques for this species
    const { data: techniquesData, error: techniquesError } = await supabase
      .from('species_technique')
      .select(`
        technique_id,
        effectiveness,
        notes,
        beginner_tips,
        technique!inner (
          id,
          technique_code,
          name_en
        )
      `)
      .eq('species_id', speciesData.id)
      .order('effectiveness', { ascending: false });

    if (techniquesError) {
      console.error('[species-details] Error fetching techniques:', techniquesError);
    }

    // Fetch bait for this species
    const { data: baitData, error: baitError } = await supabase
      .from('species_bait')
      .select(`
        bait_id,
        effectiveness,
        notes,
        bait!inner (
          id,
          name_en
        )
      `)
      .eq('species_id', speciesData.id)
      .order('effectiveness', { ascending: false });

    if (baitError) {
      console.error('[species-details] Error fetching bait:', baitError);
    }

    // Fetch substrates for this species
    const { data: substratesData, error: substratesError } = await supabase
      .from('species_substrates')
      .select(`
        name_en,
        has_sand,
        has_gravel,
        has_rock,
        has_mud,
        has_mixed
      `)
      .eq('id', speciesData.id)
      .single();

    if (substratesError) {
      console.error('[species-details] Error fetching substrates:', substratesError);
    }

    // Format the response
    const techniques: TechniqueData[] = (techniquesData || []).map((t) => {
      const techniqueData = Array.isArray(t.technique) ? t.technique[0] : t.technique;
      return {
        technique_id: t.technique_id,
        technique_code: techniqueData?.technique_code || '',
        technique_name: techniqueData?.name_en || '',
        effectiveness: t.effectiveness,
        notes: t.notes,
        beginner_tips: t.beginner_tips,
      };
    });

    const bait: BaitData[] = (baitData || []).map((b) => {
      const baitInfo = Array.isArray(b.bait) ? b.bait[0] : b.bait;
      return {
        bait_id: b.bait_id,
        bait_name: baitInfo?.name_en || '',
        effectiveness: b.effectiveness,
        notes: b.notes,
      };
    });

    const response: SpeciesDetailResponse = {
      species_id: speciesData.id,
      species_code: speciesData.species_code,
      name_en: speciesData.name_en,
      scientific_name: speciesData.scientific_name,
      inaturalist_url: speciesData.inaturalist_url,
      techniques,
      bait,
      substrates: substratesData || null,
      advice: speciesData.advice || null,
      eating_quality: speciesData.eating_quality || null,
      conservation_status: speciesData.conservation_status || null,
      fun_fact: speciesData.fun_fact || null,
      min_depth: speciesData.min_depth || null,
      max_depth: speciesData.max_depth || null,
      guild: speciesData.guild || null,
      species_badges: speciesData.species_badges || null,
      recommended_baits: speciesData.recommended_baits || null,
      temp_opt_c: speciesData.temp_opt_c || null,
      seasonalityProfile: (speciesData.seasonality_profile as SeasonalityProfile | null) ?? null,
      isSeasonal: Boolean(speciesData.is_seasonal),
      regionCode: resolvedRegionCode,
      seasonalityCurve,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('[species-details] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
