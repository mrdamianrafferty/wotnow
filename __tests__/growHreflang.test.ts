/**
 * Advertise a language only where the translation exists.
 *
 * The sitemap lists 450 English species URLs, each carrying hreflang alternates
 * to all seven languages — and Google follows alternates. Those pages translate
 * on demand, so a crawl of the full set costs about 1.03 million DeepL
 * characters against a 500,000 a month allowance. That is how September 2026
 * was spent in two days.
 *
 * Narrowing the alternates to what is cached means a page Google is told about
 * is warm by definition, and the set grows a language at a time as the backfill
 * completes one.
 */

import { buildHreflangLinks } from '@/lib/grow/i18n';
import { translatedLanguagesFor, cacheKey, batchByLength } from '@/lib/grow/translatedLanguages';

const SPECIES = [
  { slug: 'tomato', description: 'A red fruit.', advice: 'Water often.' },
  { slug: 'nettle', description: 'A stinging plant.', advice: null },
  { slug: 'moss', description: null, advice: null },
];

/** A cache holding French for everything, and Spanish only for the tomato. */
const lookup = async () => new Set([
  cacheKey('A red fruit.', 'fr'),
  cacheKey('Water often.', 'fr'),
  cacheKey('A stinging plant.', 'fr'),
  cacheKey('A red fruit.', 'es'),
  cacheKey('Water often.', 'es'),
]);

describe('which languages a species is readable in', () => {
  it('needs every field translated, not just the description', async () => {
    const m = await translatedLanguagesFor(SPECIES, lookup);

    // Spanish has the tomato's description AND advice.
    expect(m.get('tomato')).toEqual(expect.arrayContaining(['fr', 'es']));
    // The nettle's description is Spanish-less, so Spanish is not offered.
    expect(m.get('nettle')).toContain('fr');
    expect(m.get('nettle')).not.toContain('es');
  });

  it('treats a species with no prose as readable everywhere', async () => {
    const m = await translatedLanguagesFor(SPECIES, lookup);

    // Nothing to translate is not the same as nothing translated.
    expect(m.get('moss')).toEqual(expect.arrayContaining(['fr', 'es', 'de', 'it', 'pt', 'nl', 'pl']));
  });

  it('offers nothing when the cache is empty', async () => {
    const m = await translatedLanguagesFor(SPECIES, async () => new Set<string>());

    expect(m.get('tomato')).toEqual([]);
  });
});

describe('hreflang', () => {
  it('advertises only the languages passed to it', () => {
    const links = buildHreflangLinks('/grow/species/tomato', ['fr', 'es']);
    const tags = links.map((l) => l.hreflang);

    expect(tags).toEqual(expect.arrayContaining(['fr', 'es', 'en-GB', 'x-default']));
    for (const absent of ['de', 'it', 'pt', 'nl', 'pl']) expect(tags).not.toContain(absent);
  });

  it('still emits everything when no set is given', () => {
    // The static Grow pages exist in every language whether or not anyone has
    // visited them — only species prose is translated on demand.
    const tags = buildHreflangLinks('/grow/tasks').map((l) => l.hreflang);

    for (const lang of ['fr', 'de', 'es', 'it', 'pt', 'nl', 'pl']) expect(tags).toContain(lang);
  });

  it('always keeps English and x-default, whatever is narrowed away', () => {
    const tags = buildHreflangLinks('/grow/species/tomato', []).map((l) => l.hreflang);

    // A page with no translations is still a page, and still canonical.
    expect(tags).toEqual(['en-GB', 'x-default']);
  });
});

describe('batching a PostgREST filter', () => {
  it('splits on total length, not on count', () => {
    // Forty descriptions at ~690 characters makes a 27,000 character query URL.
    // PostgREST answers a truncated filter without complaining, which cost the
    // sitemap 155 alternates before anyone counted them.
    const long = Array.from({ length: 40 }, () => 'x'.repeat(690));

    for (const batch of batchByLength(long)) {
      expect(batch.join('').length).toBeLessThanOrEqual(6000 + 690);
    }
  });

  it('never drops a string that is longer than the whole budget', () => {
    const huge = 'x'.repeat(9000);
    const batches = batchByLength(['short', huge, 'also short']);

    expect(batches.flat()).toContain(huge);
    expect(batches.flat()).toHaveLength(3);
  });
});
