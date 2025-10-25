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
};
