import type { PostgrestError } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { queryEMODnetBathymetry, queryEMODnetSubstrate } from '../../../lib/findr/enrichCatchData';
import { fetchMetNoLocationForecast, fetchWorldTides } from '../../../lib/services/weatherService';
import { queryWithTiming, timedParallelQueries } from '../../../lib/supabase/queryWithTiming';
import { calculateTidePhase, type TideExtreme } from '../../../lib/tides/calculateTidePhase';
import { rateLimiter, RateLimitError, addRateLimitHeaders } from '../../../lib/utils/rate-limiter';

interface PredictionRequestBody {
  rectangleCode?: string;
  predictionDate?: string;
  language?: string;
  bypassCache?: boolean; // Debug flag to skip cache
  latitude?: number; // Optional user latitude for substrate/depth scoring
  longitude?: number; // Optional user longitude for substrate/depth scoring
  regionCode?: string; // Optional explicit NA region code for region-aware overrides
}

const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const CACHE_TABLE = 'findr_prediction_sessions';
const CACHE_TTL_MS = 1000 * 60 * 60 * 3; // 3 hours

interface CachedPredictionRow {
  rectangle_code: string;
  prediction_date: string;
  language: string;
  payload: unknown;
  fetched_at: string;
  expires_at?: string | null;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

interface SpeciesLocalizationRow {
  species_code: string | null;
  scientific_name: string | null;
  name_en: string | null;
  name_fr: string | null;
  name_es: string | null;
  name_de: string | null;
  name_it: string | null;
  name_pt: string | null;
  playful_bio_en: string | null;
  slug: string | null;
  aliases: string[] | null;
}

type LocalizedNameMap = Partial<Record<'fr' | 'es' | 'de' | 'it' | 'pt', string>>;

function validateDate(input?: string): string | null {
  if (!input) return null;
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDatePattern.test(input)) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return input;
}

function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === '42703';
}

async function readCachedPredictions(params: {
  rectangleCode: string;
  predictionDate: string;
  language: string;
}) {
  let supabase;

  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.warn('[findr] Supabase server client unavailable for prediction cache', (error as Error).message);
    return { data: null as unknown, source: null as string | null };
  }

  const { rectangleCode, predictionDate, language } = params;

  try {
    // **OPTIMIZATION 2: Add performance timing to cache reads**
    const result = await queryWithTiming(
      async () => {
        const { data, error } = await supabase
          .from(CACHE_TABLE)
          .select('*')
          .eq('rectangle_code', rectangleCode)
          .eq('prediction_date', predictionDate)
          .eq('language', language)
          .order('fetched_at', { ascending: false })
          .limit(1)
          .maybeSingle<CachedPredictionRow>();
        return { data, error };
      },
      'cache_read_predictions'
    );

    const { data, error } = result;

    if (error) {
      if (isMissingRelationError(error)) {
        console.warn('[findr] Prediction cache table missing; continuing without cache');
        return { data: null, source: null };
      }

      console.error('[findr] Failed to read prediction cache', error);
      // Don't let cache errors block the API - return null to force fresh fetch
      return { data: null, source: null };
    }

    if (!data) {
      return { data: null, source: null };
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : null;
    const now = Date.now();

    if (expiresAt && expiresAt <= now) {
      console.log('[Findr Cache] Cache expired:', { rectangleCode, predictionDate, expiresAt: new Date(expiresAt), now: new Date(now) });
      return { data: null, source: null };
    }

    console.log('[Findr Cache] Returning cached data:', {
      rectangleCode,
      predictionDate,
      language,
      payloadType: Array.isArray(data.payload) ? 'array' : typeof data.payload,
      payloadLength: Array.isArray(data.payload) ? data.payload.length : 'N/A',
    });

    return { data: data.payload, source: 'cache' as const };
  } catch (cacheError) {
    console.warn('[findr] Cache read failed, bypassing cache:', (cacheError as Error).message);
    return { data: null, source: null };
  }
}

async function writeCachedPredictions(params: {
  rectangleCode: string;
  predictionDate: string;
  language: string;
  payload: unknown;
}) {
  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.warn('[findr] Supabase server client unavailable; skipping prediction cache write', (error as Error).message);
    return;
  }

  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  const fetchedAt = new Date().toISOString();

  try {
    const { error } = await supabase.from(CACHE_TABLE).upsert(
      {
        rectangle_code: params.rectangleCode,
        prediction_date: params.predictionDate,
        language: params.language,
        payload: params.payload,
        fetched_at: fetchedAt,
        expires_at: expiresAt,
      },
      {
        onConflict: 'rectangle_code,prediction_date,language',
      }
    );

    if (error) {
      if (isMissingRelationError(error)) {
        console.warn('[findr] Prediction cache table missing during write');
        return;
      }
      console.error('[findr] Failed to cache predictions', error);
    }
  } catch (cacheError) {
    console.warn('[findr] Cache write failed, continuing without cache:', (cacheError as Error).message);
  }
}

function firstString(value: JsonValue | unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parsed = firstString(entry as JsonValue);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const entry of Object.values(value as Record<string, JsonValue>)) {
      const parsed = firstString(entry);
      if (parsed) return parsed;
    }
  }
  return null;
}

function normalizeSpeciesCode(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

function normalizeScientificName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function buildLocalizedNamePayload(row: SpeciesLocalizationRow): LocalizedNameMap | null {
  const candidates: [keyof LocalizedNameMap, string | null][] = [
    ['fr', row.name_fr],
    ['es', row.name_es],
    ['de', row.name_de],
    ['it', row.name_it],
    ['pt', row.name_pt],
  ];

  // Filter out null/empty values AND English fallbacks (where localized name = English name)
  const defined = candidates
    .filter(([, value]) => {
      if (typeof value !== 'string' || value.trim().length === 0) return false;
      // Exclude if the localized name is identical to English (case-insensitive)
      if (row.name_en && value.trim().toLowerCase() === row.name_en.trim().toLowerCase()) return false;
      return true;
    })
    .map(([key, value]) => [key, (value as string).trim()] as const);

  if (defined.length === 0) {
    return null;
  }

  return Object.fromEntries(defined) as LocalizedNameMap;
}

// --- Offline country + NA region inference (no external API) ---
function inferCountryISOFromLatLon(lat: number, lon: number): 'US' | 'CA' | 'MX' | null {
  const normalizedLon = ((lon + 180) % 360 + 360) % 360 - 180;

  const inCONUS = lat >= 24 && lat <= 49 && normalizedLon >= -125 && normalizedLon <= -66;
  const inAlaska = lat >= 51 && lat <= 72 && normalizedLon >= -170 && normalizedLon <= -129;
  const inHawaii = lat >= 18 && lat <= 23 && normalizedLon >= -161 && normalizedLon <= -154;
  const inPuertoRico = lat >= 17.5 && lat <= 18.6 && normalizedLon >= -67.5 && normalizedLon <= -65.2;
  if (inCONUS || inAlaska || inHawaii || inPuertoRico) return 'US';

  const inCanada = lat >= 42 && lat <= 84 && normalizedLon >= -141 && normalizedLon <= -52;
  if (inCanada) return 'CA';

  const inMexico = lat >= 14 && lat <= 33 && normalizedLon >= -118 && normalizedLon <= -86;
  if (inMexico) return 'MX';

  return null;
}

function mapNARegionCode(
  lat: number,
  lon: number,
  country: 'US' | 'CA' | 'MX'
): 'us_pac' | 'us_atl' | 'gom' | 'ca_pac' | 'ca_atl' | 'mx_pac' {
  const normalizedLon = ((lon + 180) % 360 + 360) % 360 - 180;

  if (country === 'US') {
    const inHawaii = lat >= 18 && lat <= 23 && normalizedLon >= -161 && normalizedLon <= -154;
    const inAlaska = lat >= 51 && lat <= 72 && normalizedLon >= -170 && normalizedLon <= -129;
    if (inHawaii || inAlaska) return 'us_pac';

    const inGulfBand = lat >= 18 && lat <= 31.5 && normalizedLon >= -98 && normalizedLon <= -80;
    const westOfDivide = normalizedLon <= -100;

    if (inGulfBand) return 'gom';
    if (westOfDivide) return 'us_pac';
    return 'us_atl';
  }

  if (country === 'CA') {
    const pacific = normalizedLon <= -124 && lat >= 48;
    return pacific ? 'ca_pac' : 'ca_atl';
  }

  const pacificMX = normalizedLon <= -105;
  return pacificMX ? 'mx_pac' : 'gom';
}

async function augmentPredictionsWithLocalizedNames(predictions: unknown): Promise<unknown> {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return predictions;
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.warn('[findr] Unable to load Supabase client for localized names', (error as Error).message);
    return predictions;
  }

  const speciesCodes = new Set<string>();
  const scientificNames = new Set<string>();
  const commonNames = new Set<string>();

  for (const prediction of predictions) {
    if (!prediction || typeof prediction !== 'object') continue;
    const record = prediction as Record<string, JsonValue>;
    
    // Collect species_code
    const codeCandidate =
      firstString(record.species_code) ||
      firstString(record.speciesCode) ||
      firstString(record.species_id) ||
      firstString(record.speciesId);
    const normalizedCode = normalizeSpeciesCode(codeCandidate);
    if (normalizedCode) {
      speciesCodes.add(normalizedCode);
    }

    // Collect scientific_name
    const scientificCandidate =
      firstString(record.scientific_name) ||
      firstString(record.species_scientific_name) ||
      firstString(record.binomial_name) ||
      firstString(record.latin_name);
    const normalizedScientific = normalizeScientificName(scientificCandidate);
    if (normalizedScientific) {
      scientificNames.add(normalizedScientific);
    }

    // Collect name_en (common name) - this is critical!
    const commonNameCandidate =
      firstString(record.name_en) ||
      firstString(record.species_name) ||
      firstString(record.common_name);
    if (commonNameCandidate) {
      commonNames.add(commonNameCandidate);
    }
  }

  if (speciesCodes.size === 0 && scientificNames.size === 0 && commonNames.size === 0) {
    return predictions;
  }

  // **OPTIMIZATION: Batch all localization lookups into parallel queries**
  // Instead of 3 sequential queries (by code, by scientific name, by common name),
  // run them in parallel and deduplicate
  const localizationRows: SpeciesLocalizationRow[] = [];

  try {
    // Fetch by species_code, scientific_name, and name_en in parallel
    const [codeResults, scientificResults, commonResults] = await Promise.all([
      speciesCodes.size > 0
        ? supabase
            .from('species')
            .select('species_code, scientific_name, name_en, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en, slug, aliases')
            .in('species_code', Array.from(speciesCodes))
        : Promise.resolve({ data: null, error: null }),
      scientificNames.size > 0
        ? supabase
            .from('species')
            .select('species_code, scientific_name, name_en, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en, slug, aliases')
            .in('scientific_name', Array.from(scientificNames))
        : Promise.resolve({ data: null, error: null }),
      commonNames.size > 0
        ? supabase
            .from('species')
            .select('species_code, scientific_name, name_en, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en, slug, aliases')
            .in('name_en', Array.from(commonNames))
        : Promise.resolve({ data: null, error: null }),
    ]);

    // Combine results and deduplicate by species_code
    const seen = new Set<string>();
    for (const result of [codeResults, scientificResults, commonResults]) {
      if (result.data) {
        for (const row of result.data) {
          if (row.species_code && !seen.has(row.species_code)) {
            localizationRows.push(row);
            seen.add(row.species_code);
          }
        }
      }
      if (result.error) {
        console.warn('[findr] Localization query error:', result.error.message);
      }
    }

    console.log('[findr] Batched localization query completed:', {
      totalRows: localizationRows.length,
      queriesRun: 3,
      parallelExecution: true
    });
  } catch (error) {
    console.warn('[findr] Localization batch query failed:', (error as Error).message);
  }

  if (localizationRows.length === 0) {
    return predictions;
  }

  const byCode = new Map<string, SpeciesLocalizationRow>();
  const byScientific = new Map<string, SpeciesLocalizationRow>();
  const byCommonName = new Map<string, SpeciesLocalizationRow>();

  for (const row of localizationRows) {
    const code = normalizeSpeciesCode(row.species_code);
    if (code && !byCode.has(code)) {
      byCode.set(code, row);
    }
    const scientific = normalizeScientificName(row.scientific_name);
    if (scientific && !byScientific.has(scientific)) {
      byScientific.set(scientific, row);
    }
    if (row.name_en && !byCommonName.has(row.name_en)) {
      byCommonName.set(row.name_en, row);
    }
  }

  return predictions.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;

    const original = entry as Record<string, JsonValue>;
    const result: Record<string, JsonValue> = { ...original };

    // Transform playful_bio_en from database function to playful_bio for frontend
    if (!result.playful_bio && original.playful_bio_en && typeof original.playful_bio_en === 'string' && original.playful_bio_en.trim().length > 0) {
      result.playful_bio = original.playful_bio_en.trim() as unknown as JsonValue;
    }

    const normalizedCode = normalizeSpeciesCode(
      firstString(original.species_code) ||
        firstString(original.speciesCode) ||
        firstString(original.species_id) ||
        firstString(original.speciesId)
    );

    const normalizedScientific = normalizeScientificName(
      firstString(original.scientific_name) ||
        firstString(original.species_scientific_name) ||
        firstString(original.binomial_name) ||
        firstString(original.latin_name)
    );

    const commonName = 
      firstString(original.name_en) ||
      firstString(original.species_name) ||
      firstString(original.common_name);

    let match: SpeciesLocalizationRow | undefined;
    if (normalizedCode && byCode.has(normalizedCode)) {
      match = byCode.get(normalizedCode);
    } else if (normalizedScientific && byScientific.has(normalizedScientific)) {
      match = byScientific.get(normalizedScientific);
    } else if (commonName && byCommonName.has(commonName)) {
      match = byCommonName.get(commonName);
    }

    if (!match) {
      return result;
    }

    const localizedNames = buildLocalizedNamePayload(match);
    if (localizedNames) {
      result.localized_names = localizedNames as unknown as JsonValue;
    }

    // Populate name_en if missing (critical for avoiding "Unidentified species")
    if (!result.name_en && match.name_en) {
      result.name_en = match.name_en as unknown as JsonValue;
    }

    if (!result.species_name && match.name_en) {
      result.species_name = match.name_en as unknown as JsonValue;
    }

    if (!result.scientific_name && match.scientific_name) {
      result.scientific_name = match.scientific_name as unknown as JsonValue;
    }

    if (!result.species_scientific_name && match.scientific_name) {
      result.species_scientific_name = match.scientific_name as unknown as JsonValue;
    }

    // Populate species_code if missing
    if (!result.species_code && match.species_code) {
      result.species_code = match.species_code as unknown as JsonValue;
    }

    // Add playful bio from Supabase if available (fallback if not in database function)
    if (!result.playful_bio && match.playful_bio_en && typeof match.playful_bio_en === 'string' && match.playful_bio_en.trim().length > 0) {
      result.playful_bio = match.playful_bio_en.trim() as unknown as JsonValue;
    }

    // Add slug from species schema migration (Phase 4 API-layer enrichment)
    if (!result.slug && match.slug) {
      result.slug = match.slug as unknown as JsonValue;
    }

    // Add aliases from species schema migration (Phase 4 API-layer enrichment)
    if (!result.aliases && match.aliases && Array.isArray(match.aliases) && match.aliases.length > 0) {
      result.aliases = match.aliases as unknown as JsonValue;
    }

    return result;
  });
}

/**
 * Calculate community boost multiplier based on catch count
 * Higher catch counts = higher boost (1.0 - 1.5x)
 */
function calculateCommunityBoost(catchCount: number): number {
  if (catchCount === 0) return 1.0;
  if (catchCount <= 5) return 1.1;
  if (catchCount <= 10) return 1.2;
  if (catchCount <= 25) return 1.3;
  if (catchCount <= 50) return 1.4;
  return 1.5; // 50+ catches
}

/**
 * Merge environmental predictions with regional availability data
 * Species with catch data get boosted confidence and metadata
 */
async function mergeWithRegionalAvailability(
  predictions: unknown,
  rectangleCode: string
): Promise<unknown> {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return predictions;
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.warn('[regional_availability] Unable to load Supabase client', (error as Error).message);
    return predictions;
  }

  // Fetch regional availability data for this ICES rectangle
  const { data: regionalData, error: regionalError } = await queryWithTiming(
    async () => {
      const result = await supabase
        .from('species_regional_availability')
        .select('species_code, availability_score, confidence, catch_count, last_catch_at, data_source, is_primary_habitat')
        .eq('region_type', 'ices')
        .eq('region_id', rectangleCode);
      return result;
    },
    'fetch_regional_availability'
  );

  if (regionalError) {
    console.warn('[regional_availability] Query error:', regionalError.message);
    return predictions;
  }

  if (!regionalData || regionalData.length === 0) {
    console.log('[regional_availability] No regional availability data for rectangle:', rectangleCode);
    // Return predictions with default metadata (all environmental)
    return predictions.map(pred => {
      if (!pred || typeof pred !== 'object') return pred;
      return {
        ...pred,
        data_source: 'environmental',
        catch_count: 0,
        community_boost: 1.0,
      };
    });
  }

  // Build lookup map by species_code
  const regionalMap = new Map<string, typeof regionalData[0]>();
  for (const row of regionalData) {
    if (row.species_code) {
      regionalMap.set(row.species_code.toUpperCase(), row);
    }
  }

  console.log('[regional_availability] Found regional data for', regionalMap.size, 'species in rectangle:', rectangleCode);

  // Merge predictions with regional data
  const merged = predictions.map((pred) => {
    if (!pred || typeof pred !== 'object') return pred;
    const record = pred as Record<string, JsonValue>;

    // Extract species code
    const speciesCode =
      firstString(record.species_code) ||
      firstString(record.speciesCode) ||
      firstString(record.species_id) ||
      firstString(record.speciesId);

    if (!speciesCode) {
      // No species code - return with environmental defaults
      return {
        ...record,
        data_source: 'environmental',
        catch_count: 0,
        community_boost: 1.0,
      };
    }

    const regional = regionalMap.get(speciesCode.toUpperCase());

    if (!regional) {
      // No regional data - use environmental matching
      return {
        ...record,
        data_source: 'environmental',
        catch_count: 0,
        community_boost: 1.0,
      };
    }

    // Check if this has catch-validated data
    const hasCatchData = regional.catch_count > 0;

    if (hasCatchData) {
      // Use catch-validated data with community boost
      const communityBoost = calculateCommunityBoost(regional.catch_count);

      return {
        ...record,
        // Override confidence with catch-validated confidence
        confidence: regional.confidence,
        // Add regional availability score
        availability_score: regional.availability_score,
        // Mark as catch-validated
        data_source: 'catch_validated',
        // Add catch metadata
        catch_count: regional.catch_count,
        last_catch_at: regional.last_catch_at,
        community_boost: communityBoost,
        is_primary_habitat: regional.is_primary_habitat,
      };
    } else {
      // Has regional data but no catches - blend environmental + baseline regional
      // Keep environmental confidence but add regional metadata
      return {
        ...record,
        data_source: 'environmental',
        catch_count: 0,
        community_boost: 1.0,
        // Optionally add regional availability score as supplementary info
        regional_availability_score: regional.availability_score,
        regional_confidence: regional.confidence,
      };
    }
  });

  const dataSourceCounts = merged.reduce<{ catch_validated: number; environmental: number }>((acc, entry) => {
    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, JsonValue>;
      const dataSource = record.data_source;

      if (typeof dataSource === 'string') {
        if (dataSource === 'catch_validated') {
          acc.catch_validated += 1;
        } else if (dataSource === 'environmental') {
          acc.environmental += 1;
        }
      }
    }

    return acc;
  }, { catch_validated: 0, environmental: 0 });

  console.log('[regional_availability] Merged predictions:', {
    total: merged.length,
    catch_validated: dataSourceCounts.catch_validated,
    environmental: dataSourceCounts.environmental,
  });

  return merged;
}

/**
 * Re-rank predictions using combined confidence × community boost scoring
 */
function reRankPredictions(predictions: unknown): unknown {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return predictions;
  }

  // Sort by (confidence * community_boost) descending
  const ranked = [...predictions].sort((a, b) => {
    if (!a || typeof a !== 'object' || !b || typeof b !== 'object') return 0;

    const aRecord = a as Record<string, JsonValue>;
    const bRecord = b as Record<string, JsonValue>;

    // Handle both confidence_percent (from RPC) and confidence (from regional data)
    const aConfidence = typeof aRecord.confidence_percent === 'number'
      ? aRecord.confidence_percent
      : typeof aRecord.confidence === 'number'
        ? aRecord.confidence
        : 0;
    const bConfidence = typeof bRecord.confidence_percent === 'number'
      ? bRecord.confidence_percent
      : typeof bRecord.confidence === 'number'
        ? bRecord.confidence
        : 0;

    const aBoost = typeof aRecord.community_boost === 'number' ? aRecord.community_boost : 1.0;
    const bBoost = typeof bRecord.community_boost === 'number' ? bRecord.community_boost : 1.0;

    const aScore = aConfidence * aBoost;
    const bScore = bConfidence * bBoost;

    return bScore - aScore;
  });

  console.log('[rerank] Re-ranked predictions by confidence × community boost');

  return ranked;
}

/**
 * Apply seasonality multipliers to prediction confidence scores
 * @param preFetchedGridData - Optional pre-fetched grid data to avoid duplicate queries
 */
async function applySeasonalityMultipliers(
  predictions: unknown,
  userLat: number | null,
  userLon: number | null,
  rectangleData: { center_lat: number; center_lon: number } | null,
  preFetchedGridData?: { gridData: { region_code: string } | null; cellId: string } | null
): Promise<unknown> {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return predictions;
  }

  let supabase;
  try {
    supabase = getSupabaseServerClient();
  } catch (error) {
    console.warn('[seasonality] Unable to load Supabase client', (error as Error).message);
    return predictions;
  }

  // Determine lat/lon for grid lookup
  const lat = userLat ?? rectangleData?.center_lat ?? null;
  const lon = userLon ?? rectangleData?.center_lon ?? null;

  if (lat === null || lon === null) {
    console.warn('[seasonality] No lat/lon available, skipping seasonality');
    return predictions;
  }

  let cellId: string;
  let regionCode: string;

  // Use pre-fetched grid data if available (OPTIMIZATION!)
  if (preFetchedGridData?.gridData?.region_code) {
    cellId = preFetchedGridData.cellId;
    regionCode = preFetchedGridData.gridData.region_code;
    console.log('[seasonality] Using pre-fetched grid data:', { cellId, regionCode });
  } else {
    // Fallback: calculate and fetch grid data (old path)
    const latRounded = Math.floor(lat / 0.25) * 0.25;
    const lonRounded = Math.floor(lon / 0.25) * 0.25;
    const latIndex = Math.floor(latRounded + 0.5);
    const lonIndex = Math.floor(Math.abs(lonRounded) + 0.5);
    const latStr = `N${latIndex.toString().padStart(2, '0')}`;
    const lonStr = `${lon >= 0 ? 'E' : 'W'}${lonIndex.toString().padStart(3, '0')}`;
    cellId = `G025_${latStr}${lonStr}`;

    const { data: gridData, error: gridError } = await supabase
      .from('grid_025deg')
      .select('region_code')
      .eq('cell_id', cellId)
      .maybeSingle();

    if (gridError || !gridData?.region_code) {
      console.warn('[seasonality] No region found for cell', { cellId, lat, lon });
      return predictions;
    }

    regionCode = gridData.region_code;
    console.log('[seasonality] Found grid cell:', { cellId, regionCode, lat, lon });
  }

  // Extract species codes from predictions
  const speciesCodes = new Set<string>();
  for (const pred of predictions) {
    if (pred && typeof pred === 'object') {
      const record = pred as Record<string, JsonValue>;
      const code =
        firstString(record.species_code) ||
        firstString(record.speciesCode) ||
        firstString(record.species_id) ||
        firstString(record.speciesId);
      if (code) {
        speciesCodes.add(code.toUpperCase());
      }
    }
  }

  if (speciesCodes.size === 0) {
    console.warn('[seasonality] No species codes found in predictions');
    return predictions;
  }

  // Fetch seasonality multipliers for species in this cell
  const { data: availabilityData, error: availError } = await supabase
    .from('species_availability_by_grid')
    .select('species_code, availability_multiplier')
    .eq('cell_id', cellId)
    .in('species_code', Array.from(speciesCodes));

  if (availError) {
    console.warn('[seasonality] Error fetching availability', availError.message);
    return predictions;
  }

  if (!availabilityData || availabilityData.length === 0) {
    console.log('[seasonality] No availability data for these species');
    return predictions;
  }

  // Build multiplier map
  const multiplierMap = new Map<string, number>();
  for (const row of availabilityData) {
    if (row.species_code && typeof row.availability_multiplier === 'number') {
      multiplierMap.set(row.species_code.toUpperCase(), row.availability_multiplier);
    }
  }

  console.log('[seasonality] Applying multipliers:', Object.fromEntries(multiplierMap));

  // Apply multipliers to predictions
  const enhanced = predictions.map((pred) => {
    if (!pred || typeof pred !== 'object') return pred;
    const record = pred as Record<string, JsonValue>;

    const code =
      firstString(record.species_code) ||
      firstString(record.speciesCode) ||
      firstString(record.species_id) ||
      firstString(record.speciesId);

    if (!code) return pred;

    const multiplier = multiplierMap.get(code.toUpperCase());
    if (multiplier === undefined) return pred;

    // Apply multiplier to confidence score
    const confidence = typeof record.confidence === 'number' ? record.confidence : null;
    if (confidence === null) return pred;

    const adjustedConfidence = Math.max(0, Math.min(100, confidence * multiplier));

    return {
      ...record,
      confidence: adjustedConfidence,
      seasonal_multiplier: multiplier,
      original_confidence: confidence,
    };
  });

  return enhanced;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate limiting: 10 requests per minute
  try {
    await rateLimiter.check(req);
    // Add rate limit headers to response
    const status = rateLimiter.getStatus(req);
    addRateLimitHeaders(res, status);
  } catch (error) {
    if (error instanceof RateLimitError) {
      res.setHeader('Retry-After', error.retryAfter);
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter,
        limit: error.limit
      });
    }
    // Unknown error - let it propagate
    throw error;
  }

  if (!SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase anon key missing. Set SUPABASE_ANON_KEY in the environment.' });
  }

  let body: PredictionRequestBody;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch (_error) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const rectangleCode = body.rectangleCode?.trim();
  if (!rectangleCode) {
    return res.status(400).json({ error: 'rectangleCode is required' });
  }
  const predictionDate = validateDate(body.predictionDate) ?? new Date().toISOString().slice(0, 10);
  const language = body.language?.trim() || 'en';
  const bypassCache = Boolean(body.bypassCache);
  const userLat = typeof body.latitude === 'number' ? body.latitude : null;
  const userLon = typeof body.longitude === 'number' ? body.longitude : null;
  // Optional explicit NA region code for region-aware overrides (e.g., 'us_atl','gom','us_pac','ca_atl','ca_pac','mx_pac')
  const regionCode = typeof body.regionCode === 'string' && body.regionCode.trim().length > 0
    ? body.regionCode.trim().toLowerCase()
    : null;

  // Infer NA region code if not provided and lat/lon are available
  let inferredRegionCode: string | null = null;
  if (!regionCode && userLat != null && userLon != null) {
    const iso = inferCountryISOFromLatLon(userLat, userLon);
    if (iso === 'US' || iso === 'CA' || iso === 'MX') {
      inferredRegionCode = mapNARegionCode(userLat, userLon, iso);
      console.log('[Findr API] Inferred NA regionCode from lat/lon:', { iso, inferredRegionCode });
    } else {
      // Outside US/CA/MX -> treat as EU (no NA overrides)
      inferredRegionCode = null;
    }
  }

  // Use grid_025deg cell_id for Americas/global, ICES rectangles for Europe
  let useGlobalGrid = false;
  let gridCellId: string | null = null;
  if (userLat !== null && userLon !== null) {
    const iso = inferCountryISOFromLatLon(userLat, userLon);
    if (iso === 'US' || iso === 'CA' || iso === 'MX') {
      useGlobalGrid = true;
      // Here you would implement logic to resolve lat/lon to grid_025deg.cell_id
      // For now, just use a placeholder or pass lat/lon to the RPC
      gridCellId = `LAT${userLat.toFixed(2)}LON${userLon.toFixed(2)}`;
    }
  }

  // Generate cache key: use rectangleCode for Europe, gridCellId for Americas/global
  const cacheKey = useGlobalGrid ? gridCellId : rectangleCode || (userLat !== null && userLon !== null ? `LAT${userLat.toFixed(2)}LON${userLon.toFixed(2)}` : null);

  // Skip cache if bypass flag is set or no cache key
  const cached = (bypassCache || !cacheKey) ? { data: null, source: null } : await readCachedPredictions({ rectangleCode: cacheKey, predictionDate, language });

  if (cached.data) {
    const cacheControl = 's-maxage=600, stale-while-revalidate=1800';
    res.setHeader('Cache-Control', cacheControl);
    const enriched = await augmentPredictionsWithLocalizedNames(cached.data);
    return res.status(200).json({
      rectangleCode: useGlobalGrid ? gridCellId : rectangleCode,
      predictionDate,
      language,
      predictions: Array.isArray(enriched) ? enriched : [],
      metadata: {
        cacheControl,
        requestedAt: new Date().toISOString(),
        source: cached.source,
      },
    });
  }

  console.log('[Findr API] Calling RPC with params:', {
    rectangle_code_input: useGlobalGrid ? gridCellId : rectangleCode,
    prediction_date_input: predictionDate,
    user_language: language,
  });

  // Use Supabase client instead of raw fetch to call the RPC
  let supabase;
  try {
    supabase = getSupabaseServerClient();
    
    // Ensure no auth state pollution - create a fresh anonymous session
    await supabase.auth.signOut();
  } catch (error) {
    console.error('[Findr API] Failed to get Supabase client:', error);
    return res.status(500).json({ error: 'Supabase client unavailable' });
  }

  try {
    // **OPTIMIZATION 1: Parallelize rectangle and EMODnet queries**
    // Fetch all required data in parallel instead of sequentially
    const [rectangleResult, emodnetResult] = await timedParallelQueries([
      {
        name: 'fetch_rectangle_data',
        fn: async () => {
          const result = await supabase
            .from('ices_rectangles')
            .select('region, center_lat, center_lon')
            .eq('rectangle_code', rectangleCode)
            .single();
          return result;
        }
      },
      {
        name: 'fetch_emodnet_data',
        fn: async () => {
          if (userLat === null || userLon === null) {
            return { bathymetry: null, substrate: null };
          }
          try {
            const [bathymetryData, substrateData] = await Promise.all([
              queryEMODnetBathymetry(userLat, userLon),
              queryEMODnetSubstrate(userLat, userLon),
            ]);
            return { bathymetry: bathymetryData, substrate: substrateData };
          } catch (error) {
            console.warn('[Findr API] EMODnet query failed:', (error as Error).message);
            return { bathymetry: null, substrate: null };
          }
        }
      }
    ]);

    const rectangleData = (rectangleResult as { data: { region: string; center_lat: number; center_lon: number } | null })?.data;
    const { bathymetry: bathymetryData, substrate: substrateData } = emodnetResult as { 
      bathymetry: { depth_meters: number; confidence: string } | null; 
      substrate: { substrate: string; confidence: string } | null 
    };
    
    console.log('[Findr API] Fetched rectangle data:', { rectangleCode, region: rectangleData?.region });
    
    if (emodnetResult.bathymetry || emodnetResult.substrate) {
      console.log('[Findr API] EMODnet responses:', {
        depth: bathymetryData?.depth_meters,
        substrate: substrateData?.substrate,
        bathyConfidence: bathymetryData?.confidence,
        substrateConfidence: substrateData?.confidence,
      });
    }

    // Fetch current weather conditions for the rectangle center
    let currentWindSpeedMS: number | null = null;
    let currentPressureHPA: number | null = null;

    if (rectangleData?.center_lat != null && rectangleData?.center_lon != null) {
      try {
        const weatherData = await queryWithTiming(
          () => fetchMetNoLocationForecast(
            rectangleData.center_lat,
            rectangleData.center_lon,
            { signal: AbortSignal.timeout(3000) }
          ),
          'fetch_weather_forecast'
        );

        if (weatherData?.properties?.timeseries?.[0]?.data?.instant?.details) {
          const details = weatherData.properties.timeseries[0].data.instant.details;
          currentWindSpeedMS = details.wind_speed ?? null;
          currentPressureHPA = details.air_pressure_at_sea_level ?? null;

          console.log('[Findr API] Weather fetched:', {
            wind_speed_ms: currentWindSpeedMS,
            pressure_hpa: currentPressureHPA,
            location: { lat: rectangleData.center_lat, lon: rectangleData.center_lon }
          });
        }
      } catch (weatherError) {
        console.warn('[Findr API] Weather fetch failed, using neutral score:', (weatherError as Error).message);
      }
    }

    // Fetch current tide data for the rectangle center (directly via WorldTides API)
    let currentTideStage: string | null = null;
    let currentFlowSpeedMS: number | null = null;

    if (rectangleData?.center_lat != null && rectangleData?.center_lon != null) {
      try {
        const tideData = await queryWithTiming(
          async () => {
            const result = await fetchWorldTides(rectangleData.center_lat!, rectangleData.center_lon!, 7);
            return result;
          },
          'fetch_tide_data'
        );

        if (tideData && tideData.extremes && tideData.extremes.length > 0) {
          // Convert WorldTides format to TideExtreme format
          const tideExtremes: TideExtreme[] = tideData.extremes.map(e => ({
            time: e.date,
            height: e.height,
            type: e.type.toLowerCase() as 'high' | 'low'
          }));

          const tidePhase = calculateTidePhase(tideExtremes);

          if (tidePhase) {
            currentTideStage = tidePhase.stage;
            currentFlowSpeedMS = tidePhase.flowSpeedMS;

            console.log('[Findr API] Tide phase calculated:', {
              stage: currentTideStage,
              flow_speed_ms: currentFlowSpeedMS,
              current_height: tidePhase.currentHeight,
              next_extreme: tidePhase.nextExtreme,
              location: { lat: rectangleData.center_lat, lon: rectangleData.center_lon },
              source: 'worldtides_direct'
            });
          } else {
            console.warn('[Findr API] Tide phase calculation returned null (insufficient tide data)');
          }
        } else {
          console.warn('[Findr API] WorldTides returned no extremes data');
        }
      } catch (tideError) {
        console.warn('[Findr API] Tide fetch failed, using neutral tide score:', (tideError as Error).message);
      }
    }

    console.log('[Findr API] About to call RPC with params:', {
      target_rectangle: rectangleCode,
      target_date: predictionDate,
      user_lat: userLat,
      user_lon: userLon,
      user_substrate: substrateData?.substrate,
      user_depth_m: bathymetryData?.depth_meters,
      region_code: regionCode ?? inferredRegionCode,
    });

    // **OPTIMIZATION: Pre-fetch seasonality grid data in parallel with RPC**
    // Calculate grid cell_id and fetch data NOW instead of waiting until after RPC
    let gridCellIdForSeasonality: string | null = null;
    let seasonalityDataPromise: Promise<{
      gridData: { region_code: string } | null;
      speciesCodes: Set<string>;
      availabilityMap: Map<string, number>
    }> | null = null;

    const lat = userLat ?? rectangleData?.center_lat ?? null;
    const lon = userLon ?? rectangleData?.center_lon ?? null;

    if (lat !== null && lon !== null) {
      // Calculate grid cell_id (same logic as in applySeasonalityMultipliers)
      const latRounded = Math.floor(lat / 0.25) * 0.25;
      const lonRounded = Math.floor(lon / 0.25) * 0.25;
      const latIndex = Math.floor(latRounded + 0.5);
      const lonIndex = Math.floor(Math.abs(lonRounded) + 0.5);
      const latStr = `N${latIndex.toString().padStart(2, '0')}`;
      const lonStr = `${lon >= 0 ? 'E' : 'W'}${lonIndex.toString().padStart(3, '0')}`;
      gridCellIdForSeasonality = `G025_${latStr}${lonStr}`;

      console.log('[seasonality] Pre-fetching grid data for cell:', { cellId: gridCellIdForSeasonality, lat, lon });

      // Start fetching grid data in parallel (don't await yet)
      seasonalityDataPromise = (async () => {
        try {
          const { data: gridData, error: gridError } = await supabase
            .from('grid_025deg')
            .select('region_code')
            .eq('cell_id', gridCellIdForSeasonality)
            .maybeSingle();

          if (gridError || !gridData?.region_code) {
            return { gridData: null, speciesCodes: new Set<string>(), availabilityMap: new Map<string, number>() };
          }

          return { gridData, speciesCodes: new Set<string>(), availabilityMap: new Map<string, number>() };
        } catch (error) {
          console.warn('[seasonality] Grid pre-fetch failed:', (error as Error).message);
          return { gridData: null, speciesCodes: new Set<string>(), availabilityMap: new Map<string, number>() };
        }
      })();
    }

    // Use Confidence V3 with regional seasonality integration
    // Falls back to global grid function for non-ICES areas
    const targetMonth = new Date(predictionDate).getMonth() + 1; // 1-12

    const rpcCandidates: Array<{ name: string; params: Record<string, unknown> }> = [
      // PRIMARY: Confidence V3 with regional seasonality
      {
        name: 'get_fishing_confidence_v3',
        params: {
          target_rectangle: rectangleCode,
          target_date: predictionDate,
          target_month: targetMonth,
        },
      },
      // FALLBACK: Global grid-based predictions (for non-ICES areas, new as of Nov 5 2025)
      {
        name: 'get_global_fishing_predictions',
        params: {
          user_lat: userLat || rectangleData?.center_lat || null,
          user_lon: userLon || rectangleData?.center_lon || null,
          target_date: predictionDate,
          p_lang: language,
        },
      },
    ];
    
    let data: unknown = null;
    let rpcError: PostgrestError | null = null;

    for (const candidate of rpcCandidates) {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`RPC ${candidate.name} timeout after 25 seconds`)), 25000)
      );
    
      const attempt = await queryWithTiming(
        async () => {
          const rpcPromise = supabase.rpc(candidate.name, candidate.params);
          const result = await Promise.race([rpcPromise, timeoutPromise]) as { data: unknown; error: PostgrestError | null };
          return result;
        },
        `rpc_${candidate.name}`
      );
    
      data = attempt.data;
      rpcError = attempt.error;
    
      if (!rpcError) {
        console.log('[Findr API] RPC succeeded:', candidate.name, {
          dataType: Array.isArray(data) ? 'array' : typeof data,
          dataLength: Array.isArray(data) ? data.length : 'N/A',
        });
        break;
      } else {
        console.warn('[Findr API] RPC failed, will try next candidate if any:', {
          candidate: candidate.name,
          code: rpcError.code,
          message: rpcError.message,
        });
        // If function is missing (42P01 or 42883) or has type mismatch (42804), continue to next; otherwise break
        if (!(rpcError.code === '42P01' || rpcError.code === '42883' || rpcError.code === '42804')) {
          break;
        }
      }
    }
    console.log('[Findr API] RPC response via client:', {
      hasError: Boolean(rpcError),
      errorCode: rpcError?.code,
      errorMessage: rpcError?.message,
      errorDetails: rpcError?.details,
      errorHint: rpcError?.hint,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      firstItem: Array.isArray(data) && data.length > 0 ? JSON.stringify(data[0]).substring(0, 200) : null,
      region: rectangleData?.region,
    });

    if (rpcError) {
      console.error('[Findr API] RPC error details:', {
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });
      return res.status(500).json({ 
        error: 'RPC call failed', 
        details: {
          code: rpcError.code,
          message: rpcError.message,
          hint: rpcError.hint,
        }
      });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.warn('[Findr API] RPC returned no data for:', { rectangleCode, predictionDate, language });
      return res.status(200).json({
        rectangleCode,
        predictionDate,
        language,
        predictions: [],
        metadata: {
          cacheControl: 's-maxage=300, stale-while-revalidate=600', // Shorter cache for empty results
          requestedAt: new Date().toISOString(),
          source: 'live' as const,
          warning: 'No predictions available for this area and date'
        },
      });
    }

    const cacheControl = 's-maxage=900, stale-while-revalidate=3600';
    res.setHeader('Cache-Control', cacheControl);

    // **HYBRID PREDICTION SYSTEM: Merge environmental predictions with catch-validated data**
    const withRegionalData = await mergeWithRegionalAvailability(data, rectangleCode);

    // **Re-rank predictions using confidence × community boost**
    const reranked = reRankPredictions(withRegionalData);

    const enriched = await augmentPredictionsWithLocalizedNames(reranked);

    // **OPTIMIZATION: Use pre-fetched seasonality grid data**
    // Await the grid data that's been fetching in parallel
    let gridDataForSeasonality: { gridData: { region_code: string } | null; cellId: string } | null = null;
    if (seasonalityDataPromise && gridCellIdForSeasonality) {
      const seasonalityData = await seasonalityDataPromise;
      if (seasonalityData.gridData) {
        gridDataForSeasonality = {
          gridData: seasonalityData.gridData,
          cellId: gridCellIdForSeasonality,
        };
      }
    }

    // Apply seasonality multipliers to predictions (using pre-fetched data!)
    const withSeasonality = await applySeasonalityMultipliers(
      enriched,
      userLat,
      userLon,
      rectangleData,
      gridDataForSeasonality
    );

    // Cache predictions using the cache key (rectangleCode or lat/lon hash)
    if (cacheKey) {
      void writeCachedPredictions({ rectangleCode: cacheKey, predictionDate, language, payload: withSeasonality });
    }

    return res.status(200).json({
      rectangleCode,
      predictionDate,
      language,
      predictions: Array.isArray(withSeasonality) ? withSeasonality : [],
      metadata: {
        cacheControl,
        requestedAt: new Date().toISOString(),
        source: 'live' as const,
        region: rectangleData?.region || null,
        conditions: {
          tide: currentTideStage ? {
            stage: currentTideStage,
            flowSpeedMS: currentFlowSpeedMS,
          } : null,
          weather: {
            windSpeedMS: currentWindSpeedMS,
            pressureHPA: currentPressureHPA,
          },
        },
      },
    });
  } catch (error) {
    console.error('Findr predictions RPC error', error);
    return res.status(500).json({ error: 'Unexpected server error', details: (error as Error).message });
  }
}
