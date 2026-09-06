/**
 * Dynamic Sitemap Generator
 *
 * Generates XML sitemaps dynamically based on the requesting domain.
 * Includes static pages and dynamically fetched content (species for Findr).
 *
 * Access at: /api/sitemap.xml
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildHreflangLinks, GROW_TRANSLATED_PATH_CODES, type GrowPathCode } from '../../lib/grow/i18n';
import { translatedLanguagesFor, cacheKey } from '../../lib/grow/translatedLanguages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface HreflangAlternate {
  hreflang: string;
  href: string;
}

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: HreflangAlternate[];
}

/**
 * Get the base URL based on the request host
 */
function getBaseUrl(req: NextApiRequest): string {
  const host = req.headers.host || 'godaisy.io';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/**
 * Determine which app based on host
 */
function getAppType(host: string): 'findr' | 'godaisy' | 'grow' {
  if (host.includes('fishfindr') || host.includes('findr')) return 'findr';
  if (host.includes('grow')) return 'grow';
  return 'godaisy';
}

/**
 * Generate Go Daisy sitemap URLs
 */
function getGoDaisyUrls(baseUrl: string): SitemapUrl[] {
  const today = new Date().toISOString().split('T')[0];

  // Static, hand-crafted pages
  const staticUrls: SitemapUrl[] = [
    // Homepage serves the public marketing landing page to non-authed visitors
    // and the app to logged-in users. Highest priority.
    { loc: baseUrl, lastmod: today, changefreq: 'daily', priority: 1.0 },

    // Full FAQ — rich SEO surface for "does Go Daisy cover X?" queries
    { loc: `${baseUrl}/faq`, lastmod: today, changefreq: 'weekly', priority: 0.9 },

    // App pages — keep in the sitemap but ensure each has proper SEO meta
    { loc: `${baseUrl}/weather`, lastmod: today, changefreq: 'hourly', priority: 0.8 },
    { loc: `${baseUrl}/activities`, lastmod: today, changefreq: 'daily', priority: 0.8 },

    // Android tester recruitment landing page
    { loc: `${baseUrl}/android-testers`, lastmod: today, changefreq: 'weekly', priority: 0.6 },

    // NOTE: /settings and /login deliberately omitted (have noindex meta)
  ];

  // Programmatic SEO pages — one per (activity, location) combo from the
  // curated SEO dataset. See data/seoLocations.ts.
  // We import lazily to avoid pulling activity data into the sitemap build
  // for the other apps (Findr, Grow Daisy) which share this sitemap endpoint.
  let programmaticUrls: SitemapUrl[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAllSeoPagePaths } = require('../../data/seoLocations');
    const slugifyActivity = (id: string) => id.replace(/_/g, '-');
    programmaticUrls = getAllSeoPagePaths().map(
      ({ activity, location }: { activity: string; location: string }) => ({
        loc: `${baseUrl}/${slugifyActivity(activity)}/${location}`,
        lastmod: today,
        changefreq: 'daily' as const,
        priority: 0.7,
      })
    );
  } catch (err) {
    // Programmatic SEO data not present — fine, just skip these URLs.
    console.warn('Programmatic SEO paths unavailable for sitemap:', err);
  }

  return [...staticUrls, ...programmaticUrls];
}

/**
 * Generate Findr sitemap URLs (includes dynamic species pages)
 */
async function getFindrUrls(baseUrl: string): Promise<SitemapUrl[]> {
  const today = new Date().toISOString().split('T')[0];

  const staticUrls: SitemapUrl[] = [
    { loc: baseUrl, lastmod: today, changefreq: 'daily', priority: 1.0 },
    { loc: `${baseUrl}/findr`, lastmod: today, changefreq: 'hourly', priority: 1.0 },
    { loc: `${baseUrl}/findr/favourites`, lastmod: today, changefreq: 'daily', priority: 0.7 },
    { loc: `${baseUrl}/findr/catch-log`, lastmod: today, changefreq: 'daily', priority: 0.7 },
    { loc: `${baseUrl}/findr/settings`, lastmod: today, changefreq: 'monthly', priority: 0.3 },
    { loc: `${baseUrl}/login`, lastmod: today, changefreq: 'monthly', priority: 0.2 },
  ];

  // Fetch species for dynamic pages
  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: species } = await supabase
        .from('species')
        .select('slug, updated_at')
        .order('slug');

      if (species) {
        const speciesUrls: SitemapUrl[] = species.map((s) => ({
          loc: `${baseUrl}/findr/species/${s.slug}`,
          lastmod: s.updated_at ? new Date(s.updated_at).toISOString().split('T')[0] : today,
          changefreq: 'weekly' as const,
          priority: 0.6,
        }));
        return [...staticUrls, ...speciesUrls];
      }
    } catch (error) {
      console.error('[Sitemap] Failed to fetch species:', error);
    }
  }

  return staticUrls;
}

/**
 * Generate Grow Daisy sitemap URLs
 */
/**
 * `set` selects which document this is:
 *   undefined  everything, as before — used when no index is requested
 *   'core'     the English canonicals and static pages, with hreflang alternates
 *   a lang     that language's species URLs as their own `<loc>` entries
 *
 * A translated URL therefore appears twice across the set: as an alternate on
 * the English entry, and as a `<loc>` in its own language's child. That is the
 * ordinary shape for hreflang — the alternate declares the relationship, the
 * `<loc>` gets it crawled and counted.
 */
async function getGrowDaisyUrls(baseUrl: string, set?: string): Promise<SitemapUrl[]> {
  const today = new Date().toISOString().split('T')[0];

  // Helper to attach hreflang alternates to a Grow page URL
  /*
   * `available` is omitted for the static Grow pages on purpose: those exist in
   * every language whether or not anybody has visited them — it is only the
   * species prose that is translated on demand and can therefore be missing.
   */
  const withAlternates = (
    path: string,
    url: SitemapUrl,
    available?: readonly GrowPathCode[],
  ): SitemapUrl => ({
    ...url,
    alternates: buildHreflangLinks(path, available),
  });

  const staticUrls: SitemapUrl[] = [
    withAlternates('/grow', { loc: `${baseUrl}/grow`, lastmod: today, changefreq: 'daily', priority: 1.0 }),
    withAlternates('/grow/species', { loc: `${baseUrl}/grow/species`, lastmod: today, changefreq: 'weekly', priority: 0.8 }),
    withAlternates('/grow/tasks', { loc: `${baseUrl}/grow/tasks`, lastmod: today, changefreq: 'daily', priority: 0.8 }),
    withAlternates('/grow/plan', { loc: `${baseUrl}/grow/plan`, lastmod: today, changefreq: 'weekly', priority: 0.7 }),
    withAlternates('/grow/garden', { loc: `${baseUrl}/grow/garden`, lastmod: today, changefreq: 'weekly', priority: 0.7 }),
    withAlternates('/grow/settings', { loc: `${baseUrl}/grow/settings`, lastmod: today, changefreq: 'monthly', priority: 0.3 }),
    { loc: `${baseUrl}/login`, lastmod: today, changefreq: 'monthly', priority: 0.2 },
  ];

  // Add language-specific static pages (no English prefix needed — handled by alternates above)
  for (const lang of GROW_TRANSLATED_PATH_CODES) {
    staticUrls.push(
      { loc: `${baseUrl}/grow/${lang}`, lastmod: today, changefreq: 'daily', priority: 0.8 },
    );
  }

  // Add species pages from the database
  let speciesUrls: SitemapUrl[] = [];
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Sitemap] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL — species omitted');
    } else {
      const client = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await client
        .from('plant_species')
        .select('slug, date_modified, description, advice')
        .order('slug', { ascending: true })
        .limit(5000);

      if (error) {
        console.error('[Sitemap] Supabase species query error:', error);
      } else if (data) {
        /*
         * ADVERTISE ONLY THE LANGUAGES THAT EXIST.
         *
         * This used to attach alternates for all seven regardless. Google
         * follows hreflang alternates, those pages translate on demand, and a
         * crawl of the full set costs about 1.03 million DeepL characters
         * against a 500,000 a month allowance — which is how September was
         * spent in two days.
         *
         * Narrowing to what is cached means a page Google is told about is warm
         * by definition, and the set grows a language at a time as
         * `scripts/species-backfill.mjs` completes one. That is the batching:
         * the unit is the language, and it arrives finished.
         */
        const translated = await translatedLanguagesFor(
          data as Array<{ slug: string; description: string | null; advice: string | null }>,
          async () => {
            /*
             * READ THE WHOLE CACHE, DO NOT ASK ABOUT EACH STRING.
             *
             * The first version filtered by `source_text` in batches. Forty
             * descriptions at ~690 characters makes a 27,000 character query
             * URL and PostgREST answers a truncated filter without complaining;
             * shrinking the batch just traded that for ~90 sequential round
             * trips, of which some quietly failed and the counts moved between
             * runs. Both failures look identical from outside — fewer hreflang
             * alternates — and neither logs anything.
             *
             * The whole table is a few thousand rows. Paging through it is two
             * or three queries with no filter to truncate and nothing to drop.
             */
            const have = new Set<string>();
            const PAGE = 1000;
            for (let from = 0; ; from += PAGE) {
              const { data: rows, error: cacheError } = await client
                .from('translation_cache')
                .select('source_text, target_language')
                .range(from, from + PAGE - 1);
              if (cacheError) {
                console.error('[Sitemap] translation_cache query error:', cacheError);
                break;
              }
              for (const row of rows ?? []) have.add(cacheKey(row.source_text, row.target_language));
              if (!rows || rows.length < PAGE) break;
            }
            return have;
          },
        );

        speciesUrls = data.map((row: { slug: string; date_modified: string | null }) => {
          const enPath = `/grow/species/${row.slug}`;
          return withAlternates(enPath, {
            loc: `${baseUrl}${enPath}`,
            lastmod: row.date_modified ?? today,
            // MONTHLY, not weekly. withAlternates() attaches hreflang links to
            // all seven other languages, so each species here advertises eight
            // URLs — 450 species become 3,150 localised pages. Those pages
            // translate on demand in pages/grow/[lang]/species/[slug].tsx, so a
            // full crawl of every language costs roughly 1.03 million DeepL
            // characters against a 500,000/month allowance. A warm cache makes
            // re-crawls free; it is the re-crawl *rate* that decides how often
            // we pay for a cold one. Species descriptions change rarely, and
            // lastmod already tells crawlers when one actually did.
            changefreq: 'monthly',
            priority: 0.8,
          }, translated.get(row.slug) ?? []);
        });
      }
    }
  } catch (e) {
    console.error('[Sitemap] Species query threw:', e);
  }

  if (set && set !== 'core') {
    /*
     * One language's own URLs. Only the species it is actually readable in —
     * the same `translated` map the alternates come from, so a URL is never
     * listed here without its alternate existing on the English entry, and
     * never advertised at all before its text is cached.
     */
    return speciesUrls
      .filter((u) => u.alternates?.some((a) => a.hreflang === set))
      .map((u) => {
        const alt = u.alternates?.find((a) => a.hreflang === set);
        return {
          loc: alt?.href ?? u.loc,
          ...(u.lastmod ? { lastmod: u.lastmod } : {}),
          changefreq: u.changefreq,
          priority: u.priority,
          // No alternates on the child entries: the relationship is declared
          // once, on the English canonical, and repeating it here is noise.
        };
      });
  }

  return [...staticUrls, ...speciesUrls];
}

/**
 * The sitemap index, and one child per language.
 *
 * WHY SPLIT IT. Search Console reports coverage per submitted sitemap, so a
 * single document of everything answers "are the pages indexed" and never "is
 * French working". Splitting by language is the only way to see whether the
 * translated pages earn anything — which is the evidence needed before paying
 * for more translation, or before building the same thing for another app.
 *
 * It also makes the batching visible. `scripts/species-backfill.mjs` completes
 * one language at a time, so a language's child sitemap goes from a hundred
 * URLs to four hundred and fifty in one step, with a fresh `lastmod`. That is a
 * clean signal to a crawler, and a clean line on a graph.
 */
function generateIndexXml(baseUrl: string, langs: readonly string[], lastmod: string): string {
  const entries = ['core', ...langs]
    .map((set) => `  <sitemap>
    <loc>${baseUrl}/sitemap-${set}.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

/**
 * Generate XML sitemap from URLs, including hreflang alternates when present.
 */
function generateXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      const alternatesXml = url.alternates
        ? url.alternates.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('\n')
        : '';
      return `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
${alternatesXml}
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', ['GET', 'HEAD']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const host = req.headers.host || 'godaisy.io';
    const baseUrl = getBaseUrl(req);
    const appType = getAppType(host);

    /*
     * `?set=` names one document within the index. Grow only: the other two
     * apps have no language variants to separate, so an index would be a level
     * of indirection with one child.
     */
    const set = typeof req.query.set === 'string' ? req.query.set : undefined;

    if (appType === 'grow' && !set) {
      const xml = generateIndexXml(
        baseUrl,
        GROW_TRANSLATED_PATH_CODES,
        new Date().toISOString().split('T')[0],
      );
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'application/xml');
      return res.status(200).send(xml);
    }

    let urls: SitemapUrl[];

    switch (appType) {
      case 'findr':
        urls = await getFindrUrls(baseUrl);
        break;
      case 'grow':
        urls = await getGrowDaisyUrls(baseUrl, set);
        break;
      default:
        urls = getGoDaisyUrls(baseUrl);
    }

    const xml = generateXml(urls);

    // Cache for 1 hour, allow stale for 1 day
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}
