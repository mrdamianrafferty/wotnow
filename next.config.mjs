// next.config.mjs
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

export default nextConfig
