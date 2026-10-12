// lib/translation/autoTranslate.ts

/**
 * Automatic translation system using DeepL with multi-level caching.
 * 
 * This module provides translation services throughout the application.
 * Translations are cached aggressively to minimize API costs and maximize performance.
 * 
 * ⚠️ SERVER-SIDE ONLY - Do not import this module in client-side code.
 * Use clientTranslate.ts for client-side translation needs.
 * 
 * Usage:
 *   const translated = await autoTranslate('Sea Bass', 'es');
 *   // Returns: 'Lubina'
 */

// Ensure this module is only used on the server
if (typeof window !== 'undefined') {
  throw new Error('autoTranslate.ts is server-side only. Use clientTranslate.ts for client-side translations.');
}

import * as deepl from 'deepl-node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { reserveChars, settleReservation, releaseReservation, prefixThatFits } from './deepl-budget';
import { normalizeQuotes } from './normalizeQuotes';

/**
 * The translation cache could not be READ. That is not a miss: treating it as one
 * sends strings that are already stored to DeepL and pays for them again. Callers
 * show English and spend nothing.
 */
class TranslationCacheUnavailableError extends Error {}

// In-memory cache stores translations for the duration of the Node.js process
// This provides instant lookups without hitting the database
const memoryCache = new Map<string, string>();

// How many DeepL calls to have in flight at once from the batch path.
const DEEPL_BATCH_CONCURRENCY = 5;

// Manual override cache keeps high-priority translations available without re-querying
const MANUAL_OVERRIDE_TTL_MS = 5 * 60 * 1000; // 5 minutes
type ManualOverrideCacheEntry = { value: string | null; expiresAt: number };
const manualOverrideCache = new Map<string, ManualOverrideCacheEntry>();

// DeepL translator instance - initialized lazily when first needed
let translator: deepl.Translator | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Get or initialize the DeepL translator instance.
 * Throws an error if the API key is not configured.
 */
function getTranslator(): deepl.Translator {
  if (!translator) {
    const apiKey = process.env.DEEPL_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        'DEEPL_API_KEY is not configured in environment variables. ' +
        'Please add it to your .env.local file.'
      );
    }
    
    // Initialize the DeepL SDK with your API key
    translator = new deepl.Translator(apiKey);
  }
  
  return translator;
}

/**
 * Lazily create a Supabase client that can access privileged tables.
 */
function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase admin credentials are missing for translation service.');
    }

    supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  return supabaseAdminClient;
}

/**
 * DeepL language code mapping.
 * Some languages have regional variants that DeepL distinguishes.
 * For example, Portuguese has PT-PT (Portugal) and PT-BR (Brazil).
 */
const DEEPL_LANGUAGE_MAP: Record<string, deepl.TargetLanguageCode> = {
  en: 'en-GB',     // British English
  es: 'es',        // Spanish
  fr: 'fr',        // French
  pt: 'pt-PT',     // Portuguese (Portugal) - you could use 'pt-BR' for Brazilian
  de: 'de',        // German
  it: 'it',        // Italian
  nl: 'nl',        // Dutch
  pl: 'pl',        // Polish
  sv: 'sv',        // Swedish
  tr: 'tr',        // Turkish
  ru: 'ru',        // Russian
  ja: 'ja',        // Japanese
  zh: 'zh',        // Chinese (simplified)
};

/**
 * Generate a cache key from source text and target language.
 * Normalizes whitespace to improve cache hit rates.
 */
function getCacheKey(text: string, targetLang: string): string {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const normalizedLang = targetLang.toLowerCase();
  return `${normalizedLang}:${normalizedText}`;
}

/**
 * Generate a hash of source text to detect content changes.
 * When you update English source text, the hash changes and signals
 * that translations may be stale.
 */
function hashText(text: string): string {
  return crypto
    .createHash('sha256')
    .update(text.trim())
    .digest('hex')
    .substring(0, 16);
}

function setManualOverrideCache(
  text: string,
  targetLang: string,
  value: string | null
) {
  const cacheKey = getCacheKey(text, targetLang);
  manualOverrideCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + MANUAL_OVERRIDE_TTL_MS,
  });

  if (value) {
    memoryCache.set(cacheKey, value);
  } else {
    memoryCache.delete(cacheKey);
  }
}

function getCachedManualOverride(
  text: string,
  targetLang: string
): string | null | undefined {
  const cacheKey = getCacheKey(text, targetLang);
  const cached = manualOverrideCache.get(cacheKey);

  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt > Date.now()) {
    return cached.value;
  }

  manualOverrideCache.delete(cacheKey);
  return undefined;
}

async function checkManualOverride(
  text: string,
  targetLang: string
): Promise<string | null> {
  const cached = getCachedManualOverride(text, targetLang);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('translation_overrides')
      .select('translated_text')
      .eq('source_text', text.trim())
      .eq('target_language', targetLang.toLowerCase())
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setManualOverrideCache(text, targetLang, null);
      return null;
    }

    setManualOverrideCache(text, targetLang, data.translated_text);
    return data.translated_text;
  } catch (error) {
    console.error('Manual override lookup failed:', error);
    // Cache miss briefly to avoid repeated errors
    manualOverrideCache.set(getCacheKey(text, targetLang), {
      value: null,
      expiresAt: Date.now() + MANUAL_OVERRIDE_TTL_MS / 2,
    });
    return null;
  }
}

async function checkManualOverridesBatch(
  texts: string[],
  targetLang: string
): Promise<Map<string, string>> {
  const overrides = new Map<string, string>();
  const textsNeedingLookup: string[] = [];

  for (const text of texts) {
    const trimmed = text.trim();
    const cached = getCachedManualOverride(text, targetLang);
    if (cached === undefined) {
      textsNeedingLookup.push(trimmed);
    } else if (cached) {
      overrides.set(trimmed, cached);
    }
  }

  if (textsNeedingLookup.length === 0) {
    return overrides;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('translation_overrides')
      .select('source_text, translated_text')
      .in('source_text', textsNeedingLookup)
      .eq('target_language', targetLang.toLowerCase())
      .eq('is_active', true);

    if (data && !error) {
      for (const row of data) {
        setManualOverrideCache(row.source_text, targetLang, row.translated_text);
        overrides.set(row.source_text, row.translated_text);
      }
    }

    // Cache misses to avoid repeated lookups
    const foundTexts = new Set(data?.map(row => row.source_text) ?? []);
    for (const text of textsNeedingLookup) {
      if (!foundTexts.has(text)) {
        setManualOverrideCache(text, targetLang, null);
      }
    }
  } catch (error) {
    console.error('Manual override batch lookup failed:', error);
  }

  return overrides;
}

/**
 * Detect fishing-specific terminology that might need manual review.
 * DeepL sometimes mistranslates specialized fishing vocabulary.
 */
function hasFishingTerminology(text: string): boolean {
  const fishingKeywords = [
    'ragworm', 'lugworm', 'sandeel', 'mackerel strip', 'prawn', 'shrimp',
    'structure', 'reef', 'wreck', 'mark', 'spot', 'swim', 'ground',
    'feeding', 'spawning', 'schooling', 'strike', 'bite', 'take',
    'rig', 'trace', 'leader', 'hook', 'bait', 'lure', 'jig',
    'tide', 'current', 'slack water', 'run', 'neap', 'spring tide',
  ];
  
  const lowerText = text.toLowerCase();
  return fishingKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Check database cache for an existing translation.
 * Returns the cached translation if found, or null if not cached.
 * Prioritizes manual translations over automatic ones.
 *
 * **PHASE 2.4 OPTIMIZATION: Removed ORDER BY and last_accessed_at updates**
 * - Composite index (source_text, target_language, translation_source DESC) handles ordering
 * - Skipping last_accessed_at updates reduces write load by ~90%
 * - Expected cache lookup: <5ms with index
 */
async function checkDatabaseCache(
  text: string,
  targetLang: string
): Promise<{ translation: string; source: string } | null> {
  try {
    const supabase = getSupabaseAdminClient();

    // **PHASE 2.4: Simplified query - index handles ordering, no ORDER BY needed**
    const { data, error } = await supabase
      .from('translation_cache')
      .select('translated_text, translation_source')
      // translation_cache stores source_text with curly quotes straightened (DB trigger),
      // so look it up the same way or a string like “baby kiwi” is never found.
      .eq('source_text', normalizeQuotes(text.trim()))
      .eq('target_language', targetLang.toLowerCase())
      .limit(1)
      .maybeSingle();

    if (error) throw new TranslationCacheUnavailableError(error.message);
    if (!data) {
      return null;
    }

    // **PHASE 2.4: Removed last_accessed_at update - not critical, creates unnecessary write load**
    // The translation works the same without tracking access times

    return {
      translation: data.translated_text,
      source: data.translation_source,
    };
  } catch (error) {
    console.error('Database cache lookup failed:', error);
    throw error instanceof TranslationCacheUnavailableError
      ? error
      : new TranslationCacheUnavailableError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Store a new translation in the database cache.
 * Automatically flags translations with fishing terminology for review.
 */
async function storeDatabaseCache(
  sourceText: string,
  targetLang: string,
  translatedText: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    // A translation identical to its source is suspicious but not necessarily
    // wrong: 55-64% of this table was once the English source, written by a
    // quota-exhausted backfill, but plenty of strings legitimately survive
    // translation unchanged — "Padel" everywhere, and multi-word proper nouns
    // like "New York" in most of our languages.
    //
    // Callers no longer pass failures here at all (translateWithDeepL returns
    // null and is never cached), so anything reaching this point came back from
    // a SUCCESSFUL DeepL call. Refusing to store it would mean re-requesting the
    // same string on every view — burning the quota this change exists to
    // protect. So cache it, and flag it for review instead.
    const isPassthrough = sourceText.trim() === translatedText.trim();

    const hasFishingTerms = hasFishingTerminology(sourceText);
    const contentHash = hashText(sourceText);

    const { error: upsertError } = await supabase.from('translation_cache').upsert(
      {
        source_text: sourceText.trim(),
        target_language: targetLang.toLowerCase(),
        translated_text: translatedText,
        translation_source: 'auto',
        source_content_hash: contentHash,
        needs_review: hasFishingTerms || isPassthrough,
        has_fishing_terminology: hasFishingTerms,
        quality_issues: isPassthrough ? ['identical_to_source'] : null,
        access_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      {
        onConflict: 'source_text,target_language',
      }
    );
    // supabase-js returns PostgREST errors rather than throwing them. Unchecked,
    // a failed write is invisible and the string is paid for again next time.
    if (upsertError) {
      console.error(`FAILED to store ${targetLang} translation in cache — will be re-billed:`, upsertError.message);
    }
  } catch (error) {
    console.error('Failed to store translation in cache:', error);
    // Don't throw - the translation still works even if caching fails
  }
}

/**
 * Translate text using the DeepL API.
 * Returns the original text if translation fails, ensuring graceful degradation.
 */
async function translateWithDeepLRaw(
  text: string,
  targetLang: string
): Promise<{ text: string; billed: number } | null> {
  try {
    const translator = getTranslator();
    const deeplLangCode = DEEPL_LANGUAGE_MAP[targetLang.toLowerCase()];

    if (!deeplLangCode) {
      console.warn(`Language ${targetLang} not supported by DeepL`);
      return null;
    }

    const result = await translator.translateText(
      text,
      null, // Auto-detect source language
      deeplLangCode,
      {
        preserveFormatting: true,
        // Go Daisy addresses the reader the way a friend would. Measured across
        // the shipped UI strings, German and Spanish were already informal
        // (du / tú) while French was formal in every single string (51-0 on
        // vous). 'prefer_less' asks DeepL for the informal register and is the
        // variant that degrades quietly on languages without one (sv, tr, en),
        // rather than erroring the way bare 'less' does.
        formality: 'prefer_less',
      }
    );

    return { text: result.text, billed: result.billedCharacters ?? text.length };
  } catch (error) {
    // Return NULL, never the source text. Callers fall back to English for
    // display, but must not persist that fallback — see the note in
    // storeDatabaseCache.
    console.error('DeepL translation failed:', error);
    return null;
  }
}

/** DeepL's own account-wide usage, for the budget's ceiling. */
async function deeplAccountUsage(): Promise<{ count: number; limit: number }> {
  const usage = await getTranslator().getUsage();
  if (!usage.character) throw new Error('DeepL usage response has no character quota');
  return { count: usage.character.count, limit: usage.character.limit };
}

/**
 * One metered DeepL call. The budget (this app's monthly cap and a ceiling on the
 * whole shared account) is checked first and fails closed; a refusal returns null,
 * which every caller already treats as "show English, do not cache".
 */
async function translateWithDeepL(
  text: string,
  targetLang: string
): Promise<string | null> {
  if (!DEEPL_LANGUAGE_MAP[targetLang.toLowerCase()]) {
    console.warn(`Language ${targetLang} not supported by DeepL`);
    return null;
  }
  const reservation = await reserveChars(targetLang.toLowerCase(), text.length, deeplAccountUsage);
  if (!reservation.ok) return null;
  const result = await translateWithDeepLRaw(text, targetLang);
  if (!result) {
    await releaseReservation(reservation, targetLang.toLowerCase()); // nothing billed
    return null;
  }
  await settleReservation(reservation, targetLang.toLowerCase(), result.billed);
  return result.text;
}

/**
 * Main translation function.
 * Checks memory cache, then database cache, then calls DeepL API as fallback.
 * 
 * @param text - Source text in English
 * @param targetLang - Target language code (es, fr, pt, de, it, etc.)
 * @returns Translated text, or original text if translation is not possible
 */
/**
 * A translation, but only if it is already paid for.
 *
 * Returns `null` on a cache miss instead of calling DeepL. It exists because
 * `grow.godaisy.io/sitemap.xml` lists 3,150 translated species pages — 450
 * species across seven languages — and each one translates on demand on first
 * visit. The full matrix is roughly a million characters against a 500,000 a
 * month allowance, so a crawler working through the sitemap exhausts the month
 * in about two days. It did: 553,000 characters between the 1st and the 5th of
 * September, 88% of it on two days, spread evenly across all seven languages,
 * which is not how people browse.
 *
 * The caller decides what a miss means. For a person it means translate; for a
 * crawler it means come back later.
 */
export async function translateFromCacheOnly(
  text: string,
  targetLang: string,
): Promise<string | null> {
  if (!text || !text.trim() || targetLang.toLowerCase() === 'en') return text;

  const manualOverride = await checkManualOverride(text, targetLang);
  if (manualOverride) return manualOverride;

  const cacheKey = getCacheKey(text, targetLang);
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) return memoryCached;

  let dbCached: { translation: string; source: string } | null;
  try {
    dbCached = await checkDatabaseCache(text, targetLang);
  } catch (error) {
    if (error instanceof TranslationCacheUnavailableError) return null; // unreadable: the caller treats it as "not yet"
    throw error;
  }
  if (dbCached) {
    memoryCache.set(cacheKey, dbCached.translation);
    return dbCached.translation;
  }

  return null;
}

export async function autoTranslate(
  text: string,
  targetLang: string
): Promise<string> {
  // Return immediately if text is empty or target is English
  if (!text || !text.trim() || targetLang.toLowerCase() === 'en') {
    return text;
  }

  const manualOverride = await checkManualOverride(text, targetLang);
  if (manualOverride) {
    return manualOverride;
  }

  // Check in-memory cache (fastest)
  const cacheKey = getCacheKey(text, targetLang);
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    return memoryCached;
  }

  // Check database cache (fast). If it cannot be read that is not a miss:
  // calling DeepL would pay for a string that may already be stored.
  let dbCached: { translation: string; source: string } | null;
  try {
    dbCached = await checkDatabaseCache(text, targetLang);
  } catch (error) {
    if (error instanceof TranslationCacheUnavailableError) return text;
    throw error;
  }
  if (dbCached) {
    memoryCache.set(cacheKey, dbCached.translation);
    return dbCached.translation;
  }

  // Fall back to DeepL API (slow, costs money)
  const translated = await translateWithDeepL(text, targetLang);

  // A failed call returns null. Show English, but do NOT cache it: a cached
  // failure is permanent, because the next lookup is a cache hit and the string
  // is never retried.
  if (translated === null) {
    return text;
  }

  // Store in both caches for future use
  memoryCache.set(cacheKey, translated);
  await storeDatabaseCache(text, targetLang, translated);

  return translated;
}

/**
 * Check database cache for multiple translations at once.
 * **PHASE 2.4 OPTIMIZATION: Single query for N texts instead of N queries**
 *
 * @param texts Array of source texts
 * @param targetLang Target language code
 * @returns Map of source text to translation (only for cache hits)
 */
async function checkDatabaseCacheBatch(
  texts: string[],
  targetLang: string
): Promise<Map<string, string>> {
  if (texts.length === 0) {
    return new Map();
  }

  try {
    const supabase = getSupabaseAdminClient();

    // Normalize texts for cache lookup
    const normalizedTexts = texts.map(t => normalizeQuotes(t.trim()));

    // **PHASE 2.4: Single query with IN clause instead of N queries**
    const { data, error } = await supabase
      .from('translation_cache')
      .select('source_text, translated_text')
      .in('source_text', normalizedTexts)
      .eq('target_language', targetLang.toLowerCase());

    if (error) throw new TranslationCacheUnavailableError(error.message);
    if (!data) {
      return new Map();
    }

    // Build map of source text -> translation
    const cacheMap = new Map<string, string>();
    for (const row of data) {
      cacheMap.set(row.source_text, row.translated_text);
    }

    return cacheMap;
  } catch (error) {
    console.error('Batch database cache lookup failed:', error);
    throw error instanceof TranslationCacheUnavailableError
      ? error
      : new TranslationCacheUnavailableError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Translate multiple strings at once.
 * **PHASE 2.4 OPTIMIZATION: Batch database lookup (N queries → 1 query)**
 * More efficient than calling autoTranslate repeatedly.
 *
 * @param texts Array of source texts in English
 * @param targetLang Target language code (es, fr, pt, de, it, etc.)
 * @returns Array of translated texts in the same order
 */
export async function autoTranslateBatch(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  // Return immediately if target is English
  if (targetLang.toLowerCase() === 'en') {
    return texts;
  }

  const manualOverrides = await checkManualOverridesBatch(texts, targetLang);

  // Check in-memory cache first
  const results: (string | null)[] = texts.map((text) => {
    if (!text || !text.trim()) return text;
    const trimmed = text.trim();
    const override = manualOverrides.get(trimmed);
    if (override) {
      memoryCache.set(getCacheKey(text, targetLang), override);
      return override;
    }
    const cacheKey = getCacheKey(text, targetLang);
    return memoryCache.get(cacheKey) || null;
  });

  // Find texts that need database lookup
  const uncachedIndexes: number[] = [];
  const uncachedTexts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i] === null && texts[i]?.trim()) {
      uncachedIndexes.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  // **PHASE 2.4: Single batch database lookup instead of N queries**
  if (uncachedTexts.length > 0) {
    let dbCache: Map<string, string>;
    try {
      dbCache = await checkDatabaseCacheBatch(uncachedTexts, targetLang);
    } catch (error) {
      // Unreadable is not a miss: sending these to DeepL would re-buy strings
      // that are probably stored. Show English and spend nothing.
      if (error instanceof TranslationCacheUnavailableError) {
        return results.map((r, i) => r || texts[i]);
      }
      throw error;
    }

    // Fill in database cache hits
    for (let i = 0; i < uncachedIndexes.length; i++) {
      const idx = uncachedIndexes[i];
      const text = uncachedTexts[i];
      const cached = dbCache.get(normalizeQuotes(text.trim()));

      if (cached) {
        results[idx] = cached;
        memoryCache.set(getCacheKey(text, targetLang), cached);
        // Remove from uncached list
        uncachedIndexes[i] = -1;
      }
    }
  }

  // Translate remaining uncached texts via DeepL
  const stillUncachedIndexes = uncachedIndexes.filter(idx => idx >= 0);
  if (stillUncachedIndexes.length > 0) {
    // A string repeated in one batch is sent, and billed, once.
    const slotsByText = new Map<string, number[]>();
    for (const idx of stillUncachedIndexes) {
      const key = texts[idx].trim();
      const slots = slotsByText.get(key);
      if (slots) slots.push(idx);
      else slotsByText.set(key, [idx]);
    }
    const unique = Array.from(slotsByText.keys());
    const lang = targetLang.toLowerCase();

    // The budget covers the batch as a whole: reserve once, translate what fits
    // (front of the batch first), and show English for the rest, uncached, so it
    // is retried once there is room.
    let toSend: string[] = [];
    let reservation: Awaited<ReturnType<typeof reserveChars>> | null = null;
    if (DEEPL_LANGUAGE_MAP[lang]) {
      const lengths = unique.map((t) => t.length);
      reservation = await reserveChars(lang, lengths.reduce((a, b) => a + b, 0), deeplAccountUsage);
      let count = unique.length;
      if (!reservation.ok && reservation.room > 0) {
        count = prefixThatFits(lengths, reservation.room);
        if (count > 0) {
          reservation = await reserveChars(lang, lengths.slice(0, count).reduce((a, b) => a + b, 0), deeplAccountUsage);
        }
      }
      if (reservation.ok && count > 0) toSend = unique.slice(0, count);
    }

    if (toSend.length > 0 && reservation && reservation.ok) {
      // DeepL rate-limits on concurrency, and a 429 used to come back as the
      // English source and get cached forever — which is how the cache filled
      // with passthroughs. Send them in small waves instead of all at once.
      const translations: Array<{ text: string; billed: number } | null> = [];
      for (let i = 0; i < toSend.length; i += DEEPL_BATCH_CONCURRENCY) {
        const wave = toSend.slice(i, i + DEEPL_BATCH_CONCURRENCY);
        translations.push(...(await Promise.all(wave.map((t) => translateWithDeepLRaw(t, targetLang)))));
      }
      // Correct the reservation to what DeepL actually billed (failed calls bill nothing).
      await settleReservation(reservation, lang, translations.reduce((n, r) => n + (r ? r.billed : 0), 0));

      // Store translations in both caches
      for (let i = 0; i < toSend.length; i++) {
        const translated = translations[i];

        // null means the call failed. Fall back to English for display only —
        // caching it would make the failure permanent.
        if (translated === null) {
          continue;
        }

        for (const idx of slotsByText.get(toSend[i])!) results[idx] = translated.text;
        memoryCache.set(getCacheKey(toSend[i], targetLang), translated.text);
        await storeDatabaseCache(toSend[i], targetLang, translated.text);
      }
    }
  }

  // Return results, ensuring non-null values
  return results.map((r, i) => r || texts[i]);
}

/**
 * Allow other modules (e.g., admin endpoints) to invalidate override cache entries.
 */
export function invalidateManualOverrideCache(
  text?: string,
  targetLang?: string
): void {
  if (text && targetLang) {
    const cacheKey = getCacheKey(text, targetLang);
    manualOverrideCache.delete(cacheKey);
    memoryCache.delete(cacheKey);
    return;
  }

  manualOverrideCache.clear();
}