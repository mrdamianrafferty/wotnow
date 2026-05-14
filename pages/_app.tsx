import { Roboto, Playfair_Display, DM_Sans } from 'next/font/google'

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
import { useRouter } from 'next/router'
import { UnifiedLocationProvider } from '../context/UnifiedLocationContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OfflineIndicator } from '../components/OfflineIndicator'
import dynamic from 'next/dynamic'
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PullToRefresh } from '../components/PullToRefresh';
import { OrganizationJsonLd, WebsiteJsonLd } from '../components/JsonLd';

// Lazy-load RevenueCat auth sync (iOS only, Grow only)
const RevenueCatAuthSync = dynamic(
  () => import('../components/grow/RevenueCatAuthSync'),
  { ssr: false }
);

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
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

// Grow Daisy editorial font pair
const playfair = Playfair_Display({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

const dmSans = DM_Sans({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dmsans',
})

type ThemeName = 'light' | 'wotnow' | string;

type PagePropsWithTheme = {
  theme?: ThemeName;
  [key: string]: unknown;
};

export default function App({ Component, pageProps }: AppProps<PagePropsWithTheme>) {
  const router = useRouter();

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
  // Detect app context immediately (client-side only, but before first render completes)
  const [appContext, setAppContext] = useState<'findr' | 'grow' | 'godaisy'>(() => {
    if (typeof window === 'undefined') {
      if (router.pathname.startsWith('/findr')) return 'findr';
      if (router.pathname.startsWith('/grow')) return 'grow';
      return 'godaisy';
    }
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    if (hostname.includes('fishfindr.eu') || pathname.startsWith('/findr')) return 'findr';
    if (hostname.includes('grow.') || pathname.startsWith('/grow')) return 'grow';
    return 'godaisy';
  });

  // Update if route changes (e.g., navigating from / to /findr or /grow)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      if (hostname.includes('fishfindr.eu') || pathname.startsWith('/findr')) {
        setAppContext('findr');
      } else if (hostname.includes('grow.') || pathname.startsWith('/grow')) {
        setAppContext('grow');
      } else {
        setAppContext('godaisy');
      }
    }
  }, []);

  const isFindr = appContext === 'findr';
  const isGrow = appContext === 'grow';

  // Detect iOS native for RevenueCat auth sync
  const [isIOSNative, setIsIOSNative] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@capacitor/core').then(({ Capacitor }) => {
        setIsIOSNative(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios');
      }).catch(() => { /* Capacitor not available */ });
    }
  }, []);

  // Note: Service worker cleanup removed to enable offline support
  // The PWA service worker now handles cache management via next-pwa's cleanupOutdatedCaches option
  // If you need to force-clear caches, users can do so via browser settings or app reinstall

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
                <meta name="theme-color" content={isGrow ? "#10b981" : "#111827"} />

                {/* PWA Manifest - App-based */}
                <link rel="manifest" href={isFindr ? "/manifest.json" : isGrow ? "/manifest-growdaisy.json" : "/manifest-godaisy.json"} />

                {/* Apple Touch Icons - App-based */}
                <link rel="apple-touch-icon" href={isFindr ? "/findr-favicon-v2/apple-touch-icon.png" : isGrow ? "/growdaisy-favicon/apple-touch-icon.png" : "/godaisy-favicon/apple-touch-icon.png"} />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content={isFindr ? "Findr" : isGrow ? "Grow Daisy" : "Go Daisy"} />

                {/* Favicons - App-based */}
                <link rel="icon" type="image/svg+xml" href={isFindr ? "/findr-favicon-v2/favicon.svg" : isGrow ? "/growdaisy-favicon/favicon.svg" : "/godaisy-favicon/favicon.svg"} />
                <link rel="icon" type="image/png" sizes="96x96" href={isFindr ? "/findr-favicon-v2/favicon-96x96.png" : isGrow ? "/growdaisy-favicon/favicon-96x96.png" : "/godaisy-favicon/favicon-96x96.png"} />
                <link rel="icon" type="image/x-icon" href={isFindr ? "/findr-favicon-v2/favicon.ico" : isGrow ? "/growdaisy-favicon/favicon.ico" : "/godaisy-favicon/favicon.ico"} />

                {/* Smart App Banner — shows "Open in App Store" on iOS Safari when app not installed. */}
                {isGrow && (
                  <meta
                    name="apple-itunes-app"
                    content={`app-id=6756812661, app-argument=${typeof window !== 'undefined' ? window.location.href : 'https://grow.godaisy.io/grow'}`}
                  />
                )}
                </Head>

                {/* JSON-LD Structured Data for SEO */}
                <OrganizationJsonLd app={appContext} />
                <WebsiteJsonLd app={appContext} />

                {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
                <div data-theme={theme} className={`${roboto.variable} ${playfair.variable} ${dmSans.variable} min-h-screen bg-base-100 text-base-content`} style={{ fontFamily: 'var(--font-roboto), system-ui, -apple-system, Segoe UI, sans-serif' }}>
                  {/* Initialize offline storage and sync service */}
                  <OfflineInit />
                  {/* Initialize performance tracking for iOS profiling */}
                  <PerformanceInit />
                  {/* RevenueCat auth sync for iOS IAP (Grow only) */}
                  {(isGrow || appContext === 'godaisy') && isIOSNative && <RevenueCatAuthSync />}
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
