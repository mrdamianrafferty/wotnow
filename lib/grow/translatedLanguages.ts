/**
 * Which languages a species is actually readable in.
 *
 * ONE ANSWER, TWO CALLERS. The sitemap advertises hreflang alternates and the
 * page renders its own `<HreflangLinks>`; hreflang has to be reciprocal, so if
 * those two disagree about which languages exist, Google discounts the
 * annotation and believes neither. They therefore ask the same function.
 *
 * "Readable" means the description and the advice are both in the cache — the
 * same test `pages/grow/[lang]/species/[slug].tsx` applies before deciding
 * whether a crawler gets a page or a 503. A species with no advice needs only
 * its description; a species with neither is readable in every language,
 * because there is nothing to translate.
 *
 * @module lib/grow/translatedLanguages
 */

import { GROW_TRANSLATED_PATH_CODES, type GrowPathCode } from './i18n';

export interface SpeciesText {
  slug: string;
  description: string | null;
  advice: string | null;
}

/**
 * A source string paired with the language it is wanted in.
 *
 * A plain string, not a template-literal type. The clever version bought
 * nothing the callers could use and made the separator part of the type, which
 * is a detail no caller should have to match.
 */
export type TranslationKey = string;

/** The separator is a character no species description will contain. */
export const cacheKey = (text: string, lang: string): TranslationKey =>
  text + '\u0000' + lang;

/**
 * Split source texts into batches a PostgREST `.in()` filter can actually carry.
 *
 * BY LENGTH, NOT BY COUNT. A fixed count is a bug waiting for longer strings:
 * forty species descriptions at about 690 characters each makes a 27,000
 * character query URL, and PostgREST answers a truncated filter without
 * complaining. The symptom was a sitemap advertising 635 hreflang alternates
 * where the database said 790 — no error, no log line, and nothing to notice
 * unless somebody counted both.
 *
 * 6,000 characters is comfortably inside the usual 8k request-line limits with
 * room for the rest of the query.
 */
export function batchByLength(texts: readonly string[], budget = 6000): string[][] {
  const out: string[][] = [];
  let batch: string[] = [];
  let size = 0;
  for (const t of texts) {
    // A single string over budget still has to go somewhere — on its own, so
    // one long description cannot silently drop out of the results.
    if (batch.length && size + t.length > budget) {
      out.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(t);
    size += t.length;
  }
  if (batch.length) out.push(batch);
  return out;
}

export async function translatedLanguagesFor(
  species: readonly SpeciesText[],
  lookup: (texts: string[]) => Promise<Set<TranslationKey>>,
): Promise<Map<string, GrowPathCode[]>> {
  const texts = [...new Set(
    species.flatMap((s) => [s.description, s.advice]).filter((t): t is string => Boolean(t && t.trim())),
  )];

  const have = texts.length ? await lookup(texts) : new Set<TranslationKey>();

  const out = new Map<string, GrowPathCode[]>();
  for (const s of species) {
    const description = s.description?.trim() || '';
    const advice = s.advice?.trim() || '';
    const langs = GROW_TRANSLATED_PATH_CODES.filter((lang) => {
      // Nothing to translate is not the same as nothing translated: a species
      // with no prose reads identically in every language.
      const descOk = !description || have.has(cacheKey(description, lang));
      const adviceOk = !advice || have.has(cacheKey(advice, lang));
      return descOk && adviceOk;
    });
    out.set(s.slug, langs as GrowPathCode[]);
  }
  return out;
}
