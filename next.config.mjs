// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';
import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const enablePWA = process.env.NEXT_PUBLIC_ENABLE_PWA === 'true' || process.env.ENABLE_PWA === 'true';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Babel completely (SWC is used by default in Next.js 15+)
  experimental: {
    forceSwcTransforms: true,
  },

  // Exclude large packages from function bundles to stay under 250MB limit
  outputFileTracingExcludes: {
    '*': [
      'node_modules/react-icons/**/*',
      'node_modules/duckdb/**/*',
      'node_modules/@img/**/*',
      'node_modules/playwright-core/**/*',
      'node_modules/@esbuild/**/*',
      '.next/cache/**/*',  // Exclude build cache (can be 400MB+)
    ],
  },
  
  // Webpack configuration (Next.js 16 uses Turbopack by default, but we use --webpack flag
  // in package.json build script due to babel.config.cjs incompatibility with Turbopack)
  webpack: (config, { isServer, webpack, dev }) => {
    // Exclude WIP files with syntax errors
    config.module.rules.push({
      test: /\/(generateInsights|get-insights)\.ts$/,
      use: 'null-loader',
    });

    // Remove console.logs in production builds
    if (!dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.minimizer = config.optimization.minimizer || [];

      // Find TerserPlugin and configure it to drop console logs
      const TerserPlugin = require('terser-webpack-plugin');
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true,
            },
          },
        })
      );
    }

    // Help Vercel handle native modules in @tailwindcss/postcss
    // This doesn't change CSS/Tailwind processing, just module resolution
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // SERVER-SIDE ONLY: Exclude Capacitor plugins from serverless functions
    // These are native mobile libraries and should never be bundled for Vercel
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/browser',
        '@capacitor/camera',
        '@capacitor/geolocation',
        '@capacitor/haptics',
        '@capacitor/local-notifications',
        '@capacitor/network',
        '@capacitor/preferences',
        '@capacitor/push-notifications',
        '@capacitor/share',
        '@capacitor/splash-screen',
        '@capacitor/status-bar',
        '@capacitor/toast',
        '@capacitor-community/apple-sign-in',
        '@capgo/capacitor-social-login',
        // Exclude dev-only database engine
        'duckdb',
        // Exclude large UI libraries that are only used client-side
        'react-icons',
        'lucide-react',
        'framer-motion',
        'html2canvas',
        // Exclude test/dev dependencies
        'playwright-core',
        '@playwright/test',
        '@esbuild/darwin-arm64',
        '@esbuild/linux-x64'
      );
    }

    // Ignore optional native bindings that may not be available in Vercel's environment
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^lightningcss-linux-x64-gnu$/,
        contextRegExp: /@tailwindcss\/postcss/,
      })
    );

    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openweathermap.org',
        port: '',
        pathname: '/img/wn/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'appleid.cdn-apple.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'perenual.com',
        port: '',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'swmviqpxetwziqxhzldh.supabase.co',
        port: '',
        pathname: '/storage/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // Cache for 1 year
  },
  // Enable compression
  compress: true,
  env: {
    FREE_PROVIDERS_ENABLED: process.env.FREE_PROVIDERS_ENABLED ?? '1',
    FREE_PROVIDER_ORDER: process.env.FREE_PROVIDER_ORDER ?? 'auto',
    NEXT_PUBLIC_FREE_PROVIDERS_ENABLED: process.env.NEXT_PUBLIC_FREE_PROVIDERS_ENABLED ?? process.env.FREE_PROVIDERS_ENABLED ?? '1',
    NEXT_PUBLIC_FREE_PROVIDER_ORDER: process.env.NEXT_PUBLIC_FREE_PROVIDER_ORDER ?? process.env.FREE_PROVIDER_ORDER ?? 'auto',
  },
  // Headers for Apple App Site Association (Universal Links)
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  },
}

// Wrap nextConfig with PWA configuration
const pwaConfig = withPWA({
  dest: 'public',
  // Enable PWA in production (set NEXT_PUBLIC_ENABLE_PWA=true), disable in dev
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Fallback pages for offline scenarios
  fallbacks: {
    document: '/_offline',  // Offline fallback for navigation requests
  },
  // Exclude images and auth pages from precaching - images are cached on-demand via runtimeCaching
  // This prevents the PWA from downloading ALL public images on first load
  publicExcludes: [
    // Exclude ALL images from precaching - they'll be cached when actually requested
    '!**/*.png',
    '!**/*.jpg',
    '!**/*.jpeg',
    '!**/*.gif',
    '!**/*.webp',
    '!**/*.avif',
    '!**/*.svg',
    // Exclude auth pages
    '!**/findr/auth**',
    '!**/login**',
    '!**/auth/callback**',
  ],
  // Exclude non-existent Next.js 14+ build artifacts from precaching
  buildExcludes: [
    /dynamic-css-manifest\.json$/,
    /app-build-manifest\.json$/,
  ],
  // Clean up outdated Workbox caches automatically
  cleanupOutdatedCaches: true,
  // Force cache refresh by changing cacheId
  cacheId: '20251215-no-image-precache',
  runtimeCaching: [
    // Cache all HTML pages (SSR/SSG)
    {
      urlPattern: /^https?:\/\/[^\/]+\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    // Cache API responses (local and remote)
    {
      urlPattern: /\/api\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    // Cache Google-hosted OAuth avatars (no extensions in URL)
    {
      urlPattern: /^https?:\/\/(?:lh[0-9]|profiles)\.googleusercontent\.com\/.*$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-avatar-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Cache images on-demand (not precached) - only caches when actually requested
    // Uses path-aware caching for better organization
    {
      urlPattern: /\/grow\/.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'grow-images-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
        },
      },
    },
    {
      urlPattern: /\/findr\/.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'findr-images-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
        },
      },
    },
    {
      urlPattern: /\/godaisy\/.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'godaisy-images-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
        },
      },
    },
    // Cache root-level activity images for Go Daisy (legacy location)
    {
      urlPattern: /^https?:\/\/[^\/]+\/[^\/]+\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'activity-images-cache',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
        },
      },
    },
    // Cache static resources (JS, CSS)
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
});

const hasSentryCredentials = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
const sentryUploadsEnabled = process.env.SENTRY_UPLOAD_SOURCEMAPS === 'true' && hasSentryCredentials;

const withOptionalSentry = (config) => {
  if (!sentryUploadsEnabled) {
    return config;
  }

  return withSentryConfig(
    config,
    {
      // Suppresses source map uploading logs during build
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    {
      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Transpiles SDK to be compatible with IE11 (increases bundle size)
      transpileClientSDK: false,

      // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
      tunnelRoute: "/monitoring",

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,

      // Enables automatic instrumentation of Vercel Cron Monitors.
      automaticVercelMonitors: true,
    }
  );
};

// Wrap with Sentry only when credentials are provided
export default withOptionalSentry(bundleAnalyzer(pwaConfig(nextConfig)));
