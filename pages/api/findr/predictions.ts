import type { PostgrestError } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

interface PredictionRequestBody {
  rectangleCode?: string;
  predictionDate?: string;
  language?: string;
  bypassCache?: boolean; // Debug flag to skip cache
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
  name_fr: string | null;
  name_es: string | null;
  name_de: string | null;
  name_it: string | null;
  name_pt: string | null;
  playful_bio_en: string | null;
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
    const { data, error } = await supabase
      .from(CACHE_TABLE)
      .select('*')
      .eq('rectangle_code', rectangleCode)
      .eq('prediction_date', predictionDate)
      .eq('language', language)
      .order('fetched_at', { ascending: false })
      .limit(1)
    .maybeSingle<CachedPredictionRow>();

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

  const defined = candidates
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => [key, (value as string).trim()] as const);

  if (defined.length === 0) {
    return null;
  }

  return Object.fromEntries(defined) as LocalizedNameMap;
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

  for (const prediction of predictions) {
    if (!prediction || typeof prediction !== 'object') continue;
    const record = prediction as Record<string, JsonValue>;
    const codeCandidate =
      firstString(record.species_code) ||
      firstString(record.speciesCode) ||
      firstString(record.species_id) ||
      firstString(record.speciesId);
    const normalizedCode = normalizeSpeciesCode(codeCandidate);
    if (normalizedCode) {
      speciesCodes.add(normalizedCode);
    }

    const scientificCandidate =
      firstString(record.scientific_name) ||
      firstString(record.species_scientific_name) ||
      firstString(record.binomial_name) ||
      firstString(record.latin_name);
    const normalizedScientific = normalizeScientificName(scientificCandidate);
    if (normalizedScientific) {
      scientificNames.add(normalizedScientific);
    }
  }

  if (speciesCodes.size === 0 && scientificNames.size === 0) {
    return predictions;
  }

  const localizationRows: SpeciesLocalizationRow[] = [];

  if (speciesCodes.size > 0) {
    const { data, error } = await supabase
      .from('species')
      .select('species_code, scientific_name, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en')
      .in('species_code', Array.from(speciesCodes));

    if (error) {
      console.warn('[findr] Failed to load localized names by species code', error.message);
    } else if (data) {
      localizationRows.push(...data);
    }
  }

  const mappedScientific = new Set(
    localizationRows
      .map((row) => normalizeScientificName(row.scientific_name))
      .filter((name): name is string => Boolean(name))
  );

  const remainingScientific = Array.from(scientificNames).filter(
    (name) => !mappedScientific.has(name)
  );

  if (remainingScientific.length > 0) {
    const { data, error } = await supabase
      .from('species')
      .select('species_code, scientific_name, name_fr, name_es, name_de, name_it, name_pt, playful_bio_en')
      .in('scientific_name', remainingScientific);

    if (error) {
      console.warn('[findr] Failed to load localized names by scientific name', error.message);
    } else if (data) {
      localizationRows.push(...data);
    }
  }

  if (localizationRows.length === 0) {
    return predictions;
  }

  const byCode = new Map<string, SpeciesLocalizationRow>();
  const byScientific = new Map<string, SpeciesLocalizationRow>();

  for (const row of localizationRows) {
    const code = normalizeSpeciesCode(row.species_code);
    if (code && !byCode.has(code)) {
      byCode.set(code, row);
    }
    const scientific = normalizeScientificName(row.scientific_name);
    if (scientific && !byScientific.has(scientific)) {
      byScientific.set(scientific, row);
    }
  }

  return predictions.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;

    const original = entry as Record<string, JsonValue>;
    const result: Record<string, JsonValue> = { ...original };

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

    let match: SpeciesLocalizationRow | undefined;
    if (normalizedCode && byCode.has(normalizedCode)) {
      match = byCode.get(normalizedCode);
    } else if (normalizedScientific && byScientific.has(normalizedScientific)) {
      match = byScientific.get(normalizedScientific);
    }

    if (!match) {
      return result;
    }

    const localizedNames = buildLocalizedNamePayload(match);
    if (localizedNames) {
      result.localized_names = localizedNames as unknown as JsonValue;
    }

    if (!result.scientific_name && match.scientific_name) {
      result.scientific_name = match.scientific_name as unknown as JsonValue;
    }

    if (!result.species_scientific_name && match.scientific_name) {
      result.species_scientific_name = match.scientific_name as unknown as JsonValue;
    }

    // Add playful bio from Supabase if available
    if (match.playful_bio_en && typeof match.playful_bio_en === 'string' && match.playful_bio_en.trim().length > 0) {
      result.playful_bio = match.playful_bio_en.trim() as unknown as JsonValue;
    }

    return result;
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
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
  const predictionDate = validateDate(body.predictionDate) ?? new Date().toISOString().slice(0, 10);
  const language = body.language?.trim() || 'en';
  const bypassCache = Boolean(body.bypassCache);

  if (!rectangleCode) {
    return res.status(400).json({ error: 'rectangleCode is required' });
  }

  // Skip cache if bypass flag is set
  const cached = bypassCache ? { data: null, source: null } : await readCachedPredictions({ rectangleCode, predictionDate, language });

  if (cached.data) {
    const cacheControl = 's-maxage=600, stale-while-revalidate=1800';
    res.setHeader('Cache-Control', cacheControl);
    const enriched = await augmentPredictionsWithLocalizedNames(cached.data);
    return res.status(200).json({
      rectangleCode,
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
    rectangle_code_input: rectangleCode,
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
    // Fetch rectangle region info for the response metadata
    const { data: rectangleData } = await supabase
      .from('ices_rectangles')
      .select('region')
      .eq('rectangle_code', rectangleCode)
      .single();
    
    console.log('[Findr API] Fetched rectangle data:', { rectangleCode, region: rectangleData?.region });
    
    // Add timeout to the RPC call for Vercel
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('RPC timeout after 25 seconds')), 25000)
    );

    console.log('[Findr API] About to call RPC with params:', {
      target_rectangle: rectangleCode,
      target_date: predictionDate,
    });

    // Phase 10: Use new function with environmental data
    // NOTE: Function signature uses target_rectangle and target_date, not p_rectangle_code and p_date
    const rpcPromise = supabase.rpc('get_environmental_predictions_basic', {
      target_rectangle: rectangleCode,
      target_date: predictionDate,
    });

    const { data, error: rpcError } = await Promise.race([
      rpcPromise, 
      timeoutPromise
    ]) as { data: unknown; error: PostgrestError | null };

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

    const enriched = await augmentPredictionsWithLocalizedNames(data);

    void writeCachedPredictions({ rectangleCode, predictionDate, language, payload: enriched });

    return res.status(200).json({
      rectangleCode,
      predictionDate,
      language,
      predictions: Array.isArray(enriched) ? enriched : [],
      metadata: {
        cacheControl,
        requestedAt: new Date().toISOString(),
        source: 'live' as const,
        region: rectangleData?.region || null,
      },
    });
  } catch (error) {
    console.error('Findr predictions RPC error', error);
    return res.status(500).json({ error: 'Unexpected server error', details: (error as Error).message });
  }
}

