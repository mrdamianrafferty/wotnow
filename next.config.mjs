// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';
import withPWA from 'next-pwa';
import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable Babel completely (SWC is used by default in Next.js 15+)
  experimental: {
    forceSwcTransforms: true,
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
}

// Wrap nextConfig with PWA configuration
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openweathermap\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'openweather-api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/api\.met\.no\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'met-norway-api-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 60 * 60, // 1 hour
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-resources-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
  ],
});

const sentryEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

const withOptionalSentry = (config) => {
  if (!sentryEnabled) {
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
