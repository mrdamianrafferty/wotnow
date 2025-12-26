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
      const rectangles = require('./lib/findr/rectangles.js');
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

    // Fetch coastal rectangles ordered by priority and proximity
    const { data: rects, error } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code,priority_level,is_coastal,is_coastal_fishing_zone,has_copernicus_coverage,bio_data_available,updated_at,distance_to_shore_km')
      .eq('is_coastal', true)
      .order('priority_level', { ascending: false })
      .limit(2000);

    if (error || !rects) {
      console.warn('[next-sitemap] Supabase fetch failed, falling back to static rectangles list', error);
      const rectangles = require('./lib/findr/rectangles.js');
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

    return paths;
  },
};
