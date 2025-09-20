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
import { useRouter } from 'next/router'
import { useEffect } from 'react'

type ThemeName = 'light' | 'wotnow' | string;

type PagePropsWithTheme = {
  theme?: ThemeName;
  [key: string]: unknown;
};

export default function App({ Component, pageProps }: AppProps<PagePropsWithTheme>) {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const { pathname, search, hash } = window.location;

    // Avoid loops on the callback page itself
    if (pathname.startsWith('/auth/callback')) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');
    const hasOauthFragment = /(?:^#|&)(access_token|refresh_token|provider_token|expires_in|token_type)=/i.test(hash || '');

    if (code || type === 'recovery' || hasOauthFragment) {
      // Preserve query and any OAuth hash
      window.location.replace(`/auth/callback${search}${hash || ''}`);
    }
  }, []);
  // Use Light theme on onboarding, otherwise default to wotnow
  const chosenTheme = router.pathname.startsWith('/onboarding') ? 'light' : 'wotnow';
  // If a page explicitly passes a theme via pageProps, honour it
  const theme = (pageProps?.theme as ThemeName | undefined) ?? chosenTheme;

  return (
    <UserPreferencesProvider>
      <Head>
        {/* Ensure proper scaling and colour on iPad/phones */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
      </Head>
      {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
      <div data-theme={theme} className="min-h-screen bg-base-100 text-base-content">
        <Component {...pageProps} />
      </div>
    </UserPreferencesProvider>
  )
}