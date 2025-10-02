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
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// In-memory cache stores translations for the duration of the Node.js process
// This provides instant lookups without hitting the database
const memoryCache = new Map<string, string>();

// DeepL translator instance - initialized lazily when first needed
let translator: deepl.Translator | null = null;

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
 */
async function checkDatabaseCache(
  text: string,
  targetLang: string
): Promise<{ translation: string; source: string } | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('translation_cache')
      .select('translated_text, translation_source')
      .eq('source_text', text.trim())
      .eq('target_language', targetLang.toLowerCase())
      .order('translation_source', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Record that this translation was accessed (fire and forget)
    supabase
      .from('translation_cache')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('source_text', text.trim())
      .eq('target_language', targetLang.toLowerCase());

    return {
      translation: data.translated_text,
      source: data.translation_source,
    };
  } catch (error) {
    console.error('Database cache lookup failed:', error);
    return null;
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const hasFishingTerms = hasFishingTerminology(sourceText);
    const contentHash = hashText(sourceText);

    await supabase.from('translation_cache').upsert(
      {
        source_text: sourceText.trim(),
        target_language: targetLang.toLowerCase(),
        translated_text: translatedText,
        translation_source: 'auto',
        source_content_hash: contentHash,
        needs_review: hasFishingTerms,
        has_fishing_terminology: hasFishingTerms,
        access_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      {
        onConflict: 'source_text,target_language',
      }
    );
  } catch (error) {
    console.error('Failed to store translation in cache:', error);
    // Don't throw - the translation still works even if caching fails
  }
}

/**
 * Translate text using the DeepL API.
 * Returns the original text if translation fails, ensuring graceful degradation.
 */
async function translateWithDeepL(
  text: string,
  targetLang: string
): Promise<string> {
  try {
    const translator = getTranslator();
    const deeplLangCode = DEEPL_LANGUAGE_MAP[targetLang.toLowerCase()];

    if (!deeplLangCode) {
      console.warn(`Language ${targetLang} not supported by DeepL`);
      return text;
    }

    const result = await translator.translateText(
      text,
      null, // Auto-detect source language
      deeplLangCode,
      {
        preserveFormatting: true,
        formality: 'default',
      }
    );

    return result.text;
  } catch (error) {
    console.error('DeepL translation failed:', error);
    return text; // Return original text if translation fails
  }
}

/**
 * Main translation function.
 * Checks memory cache, then database cache, then calls DeepL API as fallback.
 * 
 * @param text - Source text in English
 * @param targetLang - Target language code (es, fr, pt, de, it, etc.)
 * @returns Translated text, or original text if translation is not possible
 */
export async function autoTranslate(
  text: string,
  targetLang: string
): Promise<string> {
  // Return immediately if text is empty or target is English
  if (!text || !text.trim() || targetLang.toLowerCase() === 'en') {
    return text;
  }

  // Check in-memory cache (fastest)
  const cacheKey = getCacheKey(text, targetLang);
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached) {
    return memoryCached;
  }

  // Check database cache (fast)
  const dbCached = await checkDatabaseCache(text, targetLang);
  if (dbCached) {
    memoryCache.set(cacheKey, dbCached.translation);
    return dbCached.translation;
  }

  // Fall back to DeepL API (slow, costs money)
  const translated = await translateWithDeepL(text, targetLang);

  // Store in both caches for future use
  memoryCache.set(cacheKey, translated);
  await storeDatabaseCache(text, targetLang, translated);

  return translated;
}

/**
 * Translate multiple strings at once.
 * More efficient than calling autoTranslate repeatedly.
 */
export async function autoTranslateBatch(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  return Promise.all(texts.map((text) => autoTranslate(text, targetLang)));
}