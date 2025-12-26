/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://godaisy.io',
  generateRobotsTxt: false, // We already have robots.txt
  generateIndexSitemap: false, // We don't need a sitemap index for small sites
  exclude: [
    '/api/*',
    '/demo/*',
    '/test/*',
    '/_next/*',
    '/findr/demo/*',
    '/findr/*-demo',
    '/findr/*-auth',
    '/findr/*-old',
    '/findr/info-old',
    '/findr/findr-info-page',
    '/interests-old',
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/demo/', '/test/', '/_next/'],
      },
    ],
  },
  // Transform function to customize URLs
  transform: async (config, path) => {
    // Set priorities based on page importance
    let priority = 0.7; // default
    let changefreq = 'weekly'; // default

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/activities') {
      priority = 0.9;
      changefreq = 'daily';
    } else if (path.startsWith('/findr')) {
      priority = 0.8;
      changefreq = 'weekly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
  // Additional dynamic paths for Findr rectangles and dates (Supabase-backed)
  additionalPaths: async (config) => {
    // THIS RUNS AT BUILD TIME. Use a Supabase Service Role key only in CI/build environment.
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Fallback to static rectangles list if env vars missing
      const rectModule = require('./lib/findr/rectangles.js');
      const rectangles = Array.isArray(rectModule) ? rectModule : rectModule?.default || rectModule;
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
      const paths = [];
      rectangles.forEach((code) => {
        dates.forEach((date) => {
          paths.push({ loc: `/findr/${code}/${date}`, changefreq: 'daily', priority: 0.6 });
        });
      });
      return paths;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      // Ensure we don't leak telemetry and keep timeouts reasonable during build
      auth: { persistSession: false },
    });

    // Build-time file cache to avoid repeated Supabase calls during sitemap generation
    const fs = require('fs');
    const path = require('path');
    const CACHE_FILE = path.join(process.cwd(), '.next', 'sitemap-cache.json');
    const CACHE_TTL_MS = Number(process.env.FINDR_SITEMAP_CACHE_TTL_MS || 1000 * 60 * 60 * 6); // default 6 hours

    // Try to read cached rectangles if available and not expired
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        const age = Date.now() - (parsed.__fetched_at || 0);
        if (age > 0 && age < CACHE_TTL_MS && Array.isArray(parsed.rects)) {
          const rects = parsed.rects;
          const today = new Date();
          function isoDate(d) { return d.toISOString().slice(0,10); }
          return rects.flatMap((r) => {
            const priority = (r.priority_level ?? 0) >= 3 ? 0.85 : (r.priority_level ?? 0) >= 1 ? 0.7 : 0.45;
            const days = (r.priority_level ?? 0) >= 3 ? 30 : 7;
            const changefreq = (r.priority_level ?? 0) >= 3 ? 'daily' : 'weekly';
            const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString();
            return Array.from({ length: days }).map((_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() + i);
              return { loc: `/findr/${r.rectangle_code}/${isoDate(d)}`, changefreq, priority, lastmod };
            });
          });
        }
      }
    } catch (cacheReadErr) {
      console.warn('[next-sitemap] Failed to read sitemap cache, continuing to fetch from Supabase', cacheReadErr);
    }

    // Fetch coastal rectangles ordered by priority and proximity
    const { data: rects, error } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code,priority_level,is_coastal,is_coastal_fishing_zone,has_copernicus_coverage,bio_data_available,updated_at,distance_to_shore_km')
      .eq('is_coastal', true)
      .order('priority_level', { ascending: false })
      .limit(2000);

    if (error || !rects) {
      console.warn('[next-sitemap] Supabase fetch failed, falling back to static rectangles list', error);
      const rectModule = require('./lib/findr/rectangles.js');
      const rectangles = Array.isArray(rectModule) ? rectModule : rectModule?.default || rectModule;
      return rectangles.slice(0, 300).flatMap((code) => {
        const today = new Date();
        return Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          return { loc: `/findr/${code}/${d.toISOString().slice(0, 10)}`, changefreq: 'daily', priority: 0.6 };
        });
      });
    }

    const today = new Date();
    function isoDate(d) { return d.toISOString().slice(0,10); }

    const paths = [];
    rects.forEach((r) => {
      const priority = (r.priority_level ?? 0) >= 3 ? 0.85 : (r.priority_level ?? 0) >= 1 ? 0.7 : 0.45;
      const days = (r.priority_level ?? 0) >= 3 ? 30 : 7;
      const changefreq = (r.priority_level ?? 0) >= 3 ? 'daily' : 'weekly';
      const lastmod = r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString();

      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        paths.push({ loc: `/findr/${r.rectangle_code}/${isoDate(d)}`, changefreq, priority, lastmod });
      }
    });

    // Persist fetched rectangles to build cache for future runs
    try {
      const fs = require('fs');
      const path = require('path');
      const CACHE_FILE = path.join(process.cwd(), '.next', 'sitemap-cache.json');
      const payload = { __fetched_at: Date.now(), rects };
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(payload), 'utf8');
    } catch (cacheWriteErr) {
      console.warn('[next-sitemap] Failed to write sitemap cache', cacheWriteErr);
    }

    return paths;
  },
};
