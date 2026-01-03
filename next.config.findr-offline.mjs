// next.config.findr-offline.mjs
// Configuration for building Findr as a static export for Capacitor bundling
// This enables the full React app to work offline

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor bundling
  output: 'export',
  distDir: 'out-findr',

  // Trailing slash for proper static file serving
  trailingSlash: true,

  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },

  // Base path for the app (matches Capacitor webDir structure)
  basePath: '',

  // Environment variables for offline mode
  env: {
    NEXT_PUBLIC_OFFLINE_MODE: 'true',
    NEXT_PUBLIC_API_URL: 'https://fishfindr.eu', // API calls go to server
  },

  // Disable features not compatible with static export
  experimental: {
    forceSwcTransforms: true,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Client-side only: resolve node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },

  // Enable compression
  compress: true,
};

export default nextConfig;
