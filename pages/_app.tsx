// Temporarily disabled next/font to fix Vercel build
// import { Roboto, Indie_Flower } from 'next/font/google'

import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
// weather-icons-wind.min.css (124KB) moved to weather pages for code splitting
import '../styles/windwave.css'
// Leaflet CSS moved to map components for code splitting

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import { LanguageProvider } from '../context/LanguageContext'
import { AuthProvider } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { UnifiedLocationProvider } from '../context/UnifiedLocationContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OfflineIndicator } from '../components/OfflineIndicator'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PullToRefresh } from '../components/PullToRefresh';
import { OrganizationJsonLd, WebsiteJsonLd } from '../components/JsonLd';

// Lazy-load non-critical initialization components
const OfflineInit = dynamic(
  () => import('../components/OfflineInit').then(mod => ({ default: mod.OfflineInit })),
  { ssr: false }
);
const PerformanceInit = dynamic(
  () => import('../components/PerformanceInit').then(mod => ({ default: mod.PerformanceInit })),
  { ssr: false }
);

// Lazy-load non-critical components
const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { ssr: false }
);
const Analytics = dynamic(
  () => import('@vercel/analytics/react').then(mod => mod.Analytics),
  { ssr: false }
);
const SpeedInsights = dynamic(
  () => import('@vercel/speed-insights/next').then(mod => mod.SpeedInsights),
  { ssr: false }
);
// Optimize font loading with next/font
// Temporarily disabled to fix Vercel build
// const roboto = Roboto({
//   weight: ['300', '400', '500', '700'],
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-roboto',
// })

// const indieFlower = Indie_Flower({
//   weight: '400',
//   subsets: ['latin'],
//   display: 'swap',
//   variable: '--font-indie-flower',
// })

type ThemeName = 'light' | 'wotnow' | string;

type PagePropsWithTheme = {
  theme?: ThemeName;
  [key: string]: unknown;
};

export default function App({ Component, pageProps }: AppProps<PagePropsWithTheme>) {
  // Create a client instance for React Query
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Domain-based favicon and manifest selection
  // Detect domain immediately (client-side only, but before first render completes)
  const [isFindr, setIsFindr] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname.includes('fishfindr.eu') || window.location.pathname.startsWith('/findr');
  });

  // Update if route changes (e.g., navigating from / to /findr)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isFindrDomain = hostname.includes('fishfindr.eu') || window.location.pathname.startsWith('/findr');
      setIsFindr(isFindrDomain);
    }
  }, []);

  // Clean up stale service workers and caches on app load
  // This fixes 404 errors for build manifests when a new deployment uses different build IDs
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const cleanupServiceWorkers = async () => {
      try {
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          if (process.env.NODE_ENV === 'development') {
            console.log('[SW Cleanup] Unregistered service worker:', registration.scope);
          }
        }

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            if (process.env.NODE_ENV === 'development') {
              console.log('[SW Cleanup] Deleted cache:', cacheName);
            }
          }
        }
      } catch (error) {
        console.error('[SW Cleanup] Error during cleanup:', error);
      }
    };

    void cleanupServiceWorkers();
  }, []);

  // Initialize safe area insets for native apps (capacitor-plugin-safe-area)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initSafeArea = async () => {
      try {
        const { initSafeArea: init } = await import('../lib/capacitor/safeArea');
        await init();
      } catch (error) {
        // Safe area init is optional - CSS env() fallback will be used
        console.warn('[App] Safe area init failed:', error);
      }
    };

    void initSafeArea();
  }, []);

  // Note: Deep link handling removed - @capgo/capacitor-social-login handles OAuth internally
  // using ASWebAuthenticationSession on iOS, which doesn't require deep link callbacks

  // Removed manual auth redirect logic - Supabase handles this via detectSessionInUrl
  // See lib/supabase/client.ts for configuration

  // Use Light theme as universal default unless explicitly overridden at page level
  const defaultTheme = 'light';
  // If a page explicitly passes a theme via pageProps, honour it, otherwise use light
  const theme = (pageProps?.theme as ThemeName | undefined) ?? defaultTheme;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LanguageProvider>
            <UnifiedLocationProvider>
              <UserPreferencesProvider>
                <Head>
                {/* Ensure proper scaling and colour on iPad/phones */}
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
                <meta name="theme-color" content="#111827" />

                {/* PWA Manifest - Domain-based */}
                <link rel="manifest" href={isFindr ? "/manifest.json" : "/manifest-godaisy.json"} />

                {/* Apple Touch Icons - Domain-based */}
                <link rel="apple-touch-icon" href={isFindr ? "/findr-favicon-v2/apple-touch-icon.png" : "/godaisy-favicon/apple-touch-icon.png"} />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content={isFindr ? "Findr" : "Go Daisy"} />

                {/* Favicons - Domain-based */}
                <link rel="icon" type="image/svg+xml" href={isFindr ? "/findr-favicon-v2/favicon.svg" : "/godaisy-favicon/favicon.svg"} />
                <link rel="icon" type="image/png" sizes="96x96" href={isFindr ? "/findr-favicon-v2/favicon-96x96.png" : "/godaisy-favicon/favicon-96x96.png"} />
                <link rel="icon" type="image/x-icon" href={isFindr ? "/findr-favicon-v2/favicon.ico" : "/godaisy-favicon/favicon.ico"} />
                </Head>

                {/* JSON-LD Structured Data for SEO */}
                <OrganizationJsonLd />
                <WebsiteJsonLd />

                {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
                <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content" style={{ fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, sans-serif' }}>
                  {/* Initialize offline storage and sync service */}
                  <OfflineInit />
                  {/* Initialize performance tracking for iOS profiling */}
                  <PerformanceInit />
                  {/* Offline Indicator - shows at top when offline */}
                  <OfflineIndicator />
                  {/* Toast notifications */}
                  <Toaster
                    position="top-center"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: 'hsl(var(--b1))',
                        color: 'hsl(var(--bc))',
                        border: '1px solid hsl(var(--b3))',
                      },
                      success: {
                        iconTheme: {
                          primary: 'hsl(var(--su))',
                          secondary: 'hsl(var(--suc))',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: 'hsl(var(--er))',
                          secondary: 'hsl(var(--erc))',
                        },
                      },
                    }}
                  />
                  <PullToRefresh>
                    <Component {...pageProps} />
                  </PullToRefresh>
                  <Analytics />
                  <SpeedInsights />
                </div>
              </UserPreferencesProvider>
            </UnifiedLocationProvider>
          </LanguageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
