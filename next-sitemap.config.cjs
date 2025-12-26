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
  // Additional dynamic paths for Findr rectangles and dates
  additionalPaths: async (config) => {
    const rectangles = require('./lib/findr/rectangles.js');
    const today = new Date();
    const dates = [];
    // Generate today + next 6 days (weekly coverage)
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
  },
};
