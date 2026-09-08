/**
 * A localised page is its own canonical.
 *
 * Search Console, 8 September 2026, `sc-domain:godaisy.io`: **296 pages**
 * excluded as "Alternative page with proper canonical tag", validation started
 * 28 July and FAILED on 22 August. Every example in the report was a
 * `/grow/{lang}/species/{slug}`.
 *
 * The head was contradicting itself. `/grow/de/species/aspen` returns 200,
 * serves "Zitterpappel" with a German description and German advice, and
 * emitted:
 *
 *     <link rel="alternate" hrefLang="de"  href=".../grow/de/species/aspen">
 *     <link rel="alternate" hrefLang="en-GB" href=".../grow/species/aspen">
 *     <link rel="canonical"                href=".../grow/species/aspen">
 *
 * hreflang says "these are equivalent alternates, index each for its locale".
 * A canonical pointing across languages says "I am a duplicate, drop me".
 * Google resolves that in favour of the canonical — which is the entire
 * report, and it was discarding real translated content to do it.
 *
 * Google's guidance is explicit: each language version self-canonicalises, and
 * the relationship between them is carried by hreflang alone.
 *
 * This test reads the source rather than rendering, because the fault was one
 * attribute in a JSX head that renders identically either way — a render test
 * would have to assert on the exact string it is protecting, and the comment
 * above it (`{/* Canonical always points to the English page *​/}`) shows the
 * mistake survived review as a deliberate-looking choice. What is worth
 * pinning is that no localised route ever hands its canonical to another URL.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { GROW_LANGUAGES, buildHreflangLinks, isValidGrowLang } from '../lib/grow/i18n';

const LOCALISED_ROUTES = [
  'pages/grow/[lang]/species/[slug].tsx',
  'pages/grow/[lang]/species/index.tsx',
];

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('a localised Grow route canonicalises to itself', () => {
  it.each(LOCALISED_ROUTES)('%s', (route) => {
    const src = read(route);
    const canonical = /rel="canonical"\s+href=\{([^}]+)\}/.exec(src);
    expect(canonical).not.toBeNull();
    // `langUrl` is the localised URL; `canonicalUrl` was the English one.
    expect(canonical![1].trim()).toBe('langUrl');
  });

  it.each(LOCALISED_ROUTES)('%s builds langUrl from the lang segment', (route) => {
    const src = read(route);
    expect(src).toMatch(/const langUrl = `https:\/\/grow\.godaisy\.io\/grow\/\$\{lang\}/);
  });
});

describe('the document language follows the URL', () => {
  const src = read('pages/_document.tsx');

  it('does not hard-code lang="en" on <Html>', () => {
    expect(src).not.toMatch(/<Html lang="en">/);
  });

  it('derives it from the resolved route params', () => {
    expect(src).toMatch(/<Html lang=\{documentLang\(/);
    expect(src).toMatch(/isValidGrowLang/);
  });

  it.each(GROW_LANGUAGES.map((l) => l.pathCode))('%s is a language the guard accepts', (code) => {
    expect(isValidGrowLang(code)).toBe(true);
  });

  it('rejects a slug that merely looks like one', () => {
    expect(isValidGrowLang('xx')).toBe(false);
    expect(isValidGrowLang('species')).toBe(false);
  });
});

describe('hreflang and the canonical agree', () => {
  /**
   * The pair has to be read together: self-canonical is only correct BECAUSE
   * the alternates are declared, and the cluster has to contain the page
   * itself or the annotation is not reciprocal and Google discards it.
   */
  it('every language variant appears in its own cluster', () => {
    for (const { pathCode } of GROW_LANGUAGES) {
      const links = buildHreflangLinks('/grow/species/aspen');
      const self = links.find((l) => l.href.includes(
        pathCode === 'en' ? '/grow/species/aspen' : `/grow/${pathCode}/species/aspen`,
      ));
      expect(self).toBeDefined();
    }
  });

  it('x-default points at the English page', () => {
    const x = buildHreflangLinks('/grow/species/aspen').find((l) => l.hreflang === 'x-default');
    expect(x?.href).toBe('https://grow.godaisy.io/grow/species/aspen');
  });
});
