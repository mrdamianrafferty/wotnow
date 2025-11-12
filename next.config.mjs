// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';
import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for smaller serverless functions
  output: 'standalone',

  // Disable Babel completely (SWC is used by default in Next.js 15+)
  experimental: {
    forceSwcTransforms: true,
  },

  // Exclude large packages from function bundles to stay under 250MB limit
  outputFileTracingExcludes: {
    '*': [
      // Large node_modules that are never used server-side
      'node_modules/react-icons/**/*',
      'node_modules/duckdb/**/*',
      'node_modules/@img/**/*',
      'node_modules/playwright-core/**/*',
      'node_modules/@esbuild/**/*',
      'node_modules/@playwright/**/*',
      'node_modules/jest/**/*',
      'node_modules/@jest/**/*',
      'node_modules/@testing-library/**/*',
      'node_modules/typescript/**/*',
      'node_modules/eslint/**/*',
      'node_modules/@typescript-eslint/**/*',
      'node_modules/lucide-react/**/*',
      'node_modules/@capacitor/**/*',
      'node_modules/@babel/**/*',
      'node_modules/lightningcss-**/**/*',
      'node_modules/svix/**/*',
      'node_modules/@sinclair/**/*',
      // Project directories that should never be in functions
      '.git/**/*',
      'tmp/**/*',
      '__tests__/**/*',
      'docs/**/*',
      'archive/**/*',
      'supabase/migrations/**/*',
      'scripts/**/*',
      'ios/**/*',
      'android/**/*',
      'services/astro_highlights/**/*',  // Python services only
      'services/web/**/*',
      '.venv/**/*',
      'venv/**/*',
      '__pycache__/**/*',
      // Test and doc files
      '**.md',
      '**.test.ts',
      '**.test.tsx',
      '**.spec.ts',
      '**.spec.tsx',
      '**/test-*.ts',
      '**/test-*.js',
    ],
  },
  
  // Disable ESLint during production builds; lint enforced via `prebuild` script
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer, webpack }) => {
    // Exclude WIP files with syntax errors
    config.module.rules.push({
      test: /\/(generateInsights|get-insights)\.ts$/,
      use: 'null-loader',
    });

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
  // Enable PWA except in development
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Exclude auth pages from precaching to prevent stale cached versions
  publicExcludes: [
    '!**/findr/auth**',
    '!**/login**',
    '!**/auth/callback**',
  ],
  // Clean up outdated Workbox caches automatically
  cleanupOutdatedCaches: true,
  // Force cache refresh by changing cacheId
  cacheId: '20251109-email-notifs',
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
    // Cache images
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
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
