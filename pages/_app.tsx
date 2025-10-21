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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { pathname, search, hash } = window.location;

    // Avoid loops on auth pages
    if (pathname.startsWith('/findr/magic-link') || pathname.startsWith('/auth/callback')) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');
    const hasOauthFragment = /(?:^#|&)(access_token|refresh_token|provider_token|expires_in|token_type)=/i.test(hash || '');

    if (code || type === 'recovery' || hasOauthFragment) {
      // Check if this is a findr-related auth flow
      const isFindrFlow = url.searchParams.get('app') === 'findr' || 
                          pathname.startsWith('/findr') ||
                          window.location.host.includes('fishfindr.eu');
      
      if (isFindrFlow) {
        // Preserve query and any OAuth hash for findr flows
        window.location.replace(`/findr/magic-link${search}${hash || ''}`);
      } else {
        // Preserve query and any OAuth hash for GoDaisy flows
        window.location.replace(`/auth/callback${search}${hash || ''}`);
      }
    }
  }, []);
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

              {/* PWA Manifest */}
              <link rel="manifest" href="/manifest.json" />

              {/* Apple Touch Icons */}
              <link rel="apple-touch-icon" href="/findr-favicon/apple-touch-icon.png" />
              <meta name="mobile-web-app-capable" content="yes" />
              <meta name="apple-mobile-web-app-capable" content="yes" />
              <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
              <meta name="apple-mobile-web-app-title" content="Findr" />

              {/* Favicons */}
              <link rel="icon" type="image/svg+xml" href="/findr-favicon/favicon.svg" />
              <link rel="icon" type="image/png" sizes="96x96" href="/findr-favicon/favicon-96x96.png" />
              <link rel="icon" type="image/x-icon" href="/findr-favicon/favicon.ico" />
              </Head>
              {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
              <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content" style={{ fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, sans-serif' }}>
                <Component {...pageProps} />
              </div>
            </UnifiedLocationProvider>
          </UserPreferencesProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
