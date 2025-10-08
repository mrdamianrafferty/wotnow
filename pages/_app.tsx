import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
// Keep only one of the weather-icons CSS imports to avoid duplicate rules
// Removed: import '../styles/weather-icons-wind.css'
import '../styles/weather-icons-wind.min.css'
import '../styles/windwave.css'
import 'leaflet/dist/leaflet.css'

import type { AppProps } from 'next/app'
import Head from 'next/head'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import { LanguageProvider } from '../context/LanguageContext'
import { useEffect } from 'react'

type ThemeName = 'light' | 'wotnow' | string;

type PagePropsWithTheme = {
  theme?: ThemeName;
  [key: string]: unknown;
};

export default function App({ Component, pageProps }: AppProps<PagePropsWithTheme>) {
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
    <LanguageProvider>
      <UserPreferencesProvider>
        <Head>
          {/* Ensure proper scaling and colour on iPad/phones */}
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <meta name="theme-color" content="#111827" />
          
          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />
          
          {/* Apple Touch Icons */}
          <link rel="apple-touch-icon" href="/findr-favicon/apple-touch-icon.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Findr" />
          
          {/* Favicons */}
          <link rel="icon" type="image/svg+xml" href="/findr-favicon/favicon.svg" />
          <link rel="icon" type="image/png" sizes="96x96" href="/findr-favicon/favicon-96x96.png" />
          <link rel="icon" type="image/x-icon" href="/findr-favicon/favicon.ico" />
        </Head>
        {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
        <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content">
          <Component {...pageProps} />
        </div>
      </UserPreferencesProvider>
    </LanguageProvider>
  )
}