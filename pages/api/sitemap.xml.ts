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
import { buildHreflangLinks, GROW_TRANSLATED_PATH_CODES } from '../../lib/grow/i18n';

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

  return [
    { loc: baseUrl, lastmod: today, changefreq: 'daily', priority: 1.0 },
    { loc: `${baseUrl}/weather`, lastmod: today, changefreq: 'hourly', priority: 0.9 },
    { loc: `${baseUrl}/activities`, lastmod: today, changefreq: 'daily', priority: 0.8 },
    { loc: `${baseUrl}/settings`, lastmod: today, changefreq: 'monthly', priority: 0.3 },
    { loc: `${baseUrl}/login`, lastmod: today, changefreq: 'monthly', priority: 0.2 },
  ];
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
async function getGrowDaisyUrls(baseUrl: string): Promise<SitemapUrl[]> {
  const today = new Date().toISOString().split('T')[0];

  // Helper to attach hreflang alternates to a Grow page URL
  const withAlternates = (path: string, url: SitemapUrl): SitemapUrl => ({
    ...url,
    alternates: buildHreflangLinks(path),
  });

  const staticUrls: SitemapUrl[] = [
    withAlternates('/grow', { loc: `${baseUrl}/grow`, lastmod: today, changefreq: 'daily', priority: 1.0 }),
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
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      const { data } = await client
        .from('plant_species')
        .select('slug, date_modified')
        .order('slug', { ascending: true })
        .limit(5000);

      if (data) {
        speciesUrls = data.map((row: { slug: string; date_modified: string | null }) => {
          const enPath = `/grow/species/${row.slug}`;
          return withAlternates(enPath, {
            loc: `${baseUrl}${enPath}`,
            lastmod: row.date_modified ?? today,
            changefreq: 'weekly',
            priority: 0.8,
          });
        });
      }
    }
  } catch {
    // Species pages are optional in the sitemap — don't fail the whole request
  }

  return [...staticUrls, ...speciesUrls];
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
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const host = req.headers.host || 'godaisy.io';
    const baseUrl = getBaseUrl(req);
    const appType = getAppType(host);

    let urls: SitemapUrl[];

    switch (appType) {
      case 'findr':
        urls = await getFindrUrls(baseUrl);
        break;
      case 'grow':
        urls = await getGrowDaisyUrls(baseUrl);
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
