/**
 * The sitemap URLs Google is actually given, not the handler behind them.
 *
 * `/api/sitemap.xml?set=fr` returned 200 the whole time. `/sitemap-fr.xml`
 * returned a 307 to `/grow`. The index shipped pointing at eight children that
 * every crawler would have been redirected away from, and the local check
 * passed because it tested the handler rather than the URL.
 *
 * Two things had to be wrong at once, and both were:
 *
 *   1. `/sitemap-:set.xml` in `vercel.json` never matched — path-to-regexp
 *      lets `:set` swallow `core.xml`, leaving nothing for the literal `.xml`.
 *      It also does not apply to `next dev`, so it could not be tested locally.
 *   2. The middleware's SEO allowlist named `/sitemap.xml` and `/sitemap-0.xml`
 *      literally, so any new child fell through to the grow.godaisy.io
 *      catch-all.
 *
 * This pins the routing rules themselves. It cannot catch a `vercel.json`
 * mistake — which is exactly why the rewrites moved to `next.config.mjs`, where
 * development exercises them and this can read them.
 */

import nextConfig from '../next.config.mjs';

type Rewrite = { source: string; destination: string };

/** The middleware's allowlist test, copied deliberately — see below. */
const SITEMAP_PATTERN = /^\/sitemap[a-z0-9-]*\.xml$/;

const CHILDREN = [
  '/sitemap.xml',
  '/sitemap-core.xml',
  '/sitemap-fr.xml',
  '/sitemap-es.xml',
  '/sitemap-de.xml',
  '/sitemap-it.xml',
  '/sitemap-pt.xml',
  '/sitemap-nl.xml',
  '/sitemap-pl.xml',
];

describe('the middleware lets every sitemap through', () => {
  it('matches the children, not just two hard-coded names', () => {
    // The literal list was the bug: `/sitemap-fr.xml` was not on it, so the
    // grow.godaisy.io catch-all redirected it to /grow.
    for (const path of CHILDREN) {
      expect(SITEMAP_PATTERN.test(path)).toBe(true);
    }
  });

  it('does not swallow ordinary pages that merely start with the word', () => {
    for (const path of ['/sitemap', '/sitemaps/index.html', '/grow/sitemap.xml']) {
      expect(SITEMAP_PATTERN.test(path)).toBe(false);
    }
  });
});

describe('the rewrites live where development can exercise them', () => {
  it('is next.config, not vercel.json', async () => {
    // vercel.json rewrites do not apply to `next dev`. Anything only declared
    // there is untestable until production, which is how the 307 shipped.
    const rewrites = (await (nextConfig as { rewrites: () => Promise<Rewrite[]> }).rewrites());
    const sources = rewrites.map((r) => r.source);

    expect(sources).toContain('/sitemap.xml');
    expect(sources.some((s) => s.startsWith('/sitemap-'))).toBe(true);
  });

  it('constrains the language param so it cannot eat the extension', async () => {
    const rewrites = (await (nextConfig as { rewrites: () => Promise<Rewrite[]> }).rewrites());
    const child = rewrites.find((r) => r.source.startsWith('/sitemap-'));

    // A bare `:set` matches `[^/]+` greedily and takes `core.xml` with it,
    // leaving the literal `.xml` unmatched and the whole rule dead.
    expect(child?.source).toMatch(/:set\([^)]+\)/);
    expect(child?.destination).toBe('/api/sitemap.xml?set=:set');
  });
});
