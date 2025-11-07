// Temporarily disabled next/font to fix Vercel build
// import { Roboto, Indie_Flower } from 'next/font/google'

import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
// Using minified version only (124KB). Unminified version (144KB) removed as duplicate.
import '../styles/weather-icons-wind.min.css'
import '../styles/windwave.css'
import 'leaflet/dist/leaflet.css'

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import { LanguageProvider } from '../context/LanguageContext'
import { AuthProvider } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { UnifiedLocationProvider } from '../context/UnifiedLocationContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InstallPrompt } from '../components/InstallPrompt'
import { OfflineIndicator } from '../components/OfflineIndicator'
import { OfflineInit } from '../components/OfflineInit'

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

  // Handle deep link OAuth callbacks (for native app)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only needed for Capacitor native apps
    import('@capacitor/app').then(({ App }) => {
      import('@capacitor/core').then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;

        // Listen for app opening via deep link (OAuth callback)
        const listener = App.addListener('appUrlOpen', async (event) => {
          console.log('Deep link opened:', event.url);

          // Check if this is an OAuth callback
          if (event.url.startsWith('fishfindr://auth/callback')) {
            console.log('Processing OAuth callback in-app');

            try {
              // Parse the deep link URL to extract OAuth code
              const url = new URL(event.url);
              const code = url.searchParams.get('code');

              if (code) {
                // Exchange OAuth code for session (stay in app!)
                const { createBrowserClient } = await import('@supabase/ssr');
                const supabase = createBrowserClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                  console.error('OAuth code exchange error:', error);
                  window.location.href = '/findr/simple-auth?error=oauth_failed';
                } else {
                  console.log('OAuth session established successfully:', data.session?.user?.email);
                  // Navigate to Findr home page (stays in app!)
                  window.location.href = '/findr';
                }
              } else {
                console.error('No OAuth code found in deep link');
                window.location.href = '/findr/simple-auth?error=no_code';
              }
            } catch (error) {
              console.error('Deep link OAuth processing error:', error);
              // Fallback: redirect to Findr home
              window.location.href = '/findr';
            }
          }
        });

        return () => {
          listener.then(l => l.remove());
        };
      });
    });
  }, []);

  // Removed manual auth redirect logic - Supabase handles this via detectSessionInUrl
  // See lib/supabase/client.ts for configuration

  // Use Light theme as universal default unless explicitly overridden at page level
  const defaultTheme = 'light';
  // If a page explicitly passes a theme via pageProps, honour it, otherwise use light
  const theme = (pageProps?.theme as ThemeName | undefined) ?? defaultTheme;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <UserPreferencesProvider>
            <UnifiedLocationProvider>
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
              <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
              <meta name="apple-mobile-web-app-title" content={isFindr ? "Findr" : "Go Daisy"} />

              {/* Favicons - Domain-based */}
              <link rel="icon" type="image/svg+xml" href={isFindr ? "/findr-favicon-v2/favicon.svg" : "/godaisy-favicon/favicon.svg"} />
              <link rel="icon" type="image/png" sizes="96x96" href={isFindr ? "/findr-favicon-v2/favicon-96x96.png" : "/godaisy-favicon/favicon-96x96.png"} />
              <link rel="icon" type="image/x-icon" href={isFindr ? "/findr-favicon-v2/favicon.ico" : "/godaisy-favicon/favicon.ico"} />
              </Head>
              {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
              <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content" style={{ fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, sans-serif' }}>
                {/* Initialize offline storage and sync service */}
                <OfflineInit />
                {/* Offline Indicator - shows at top when offline */}
                <OfflineIndicator />
                <Component {...pageProps} />
                {/* PWA Install Prompt - shows at bottom, not in standalone mode */}
                <InstallPrompt />
              </div>
            </UnifiedLocationProvider>
          </UserPreferencesProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
