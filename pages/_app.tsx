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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      <Head>
        {/* Ensure proper scaling and colour on iPad/phones */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
      </Head>
      {/* Apply DaisyUI theme globally. If you later store theme in context, bind it here. */}
      <div data-theme="wotnow" className="min-h-screen bg-base-100 text-base-content">
        <Component {...pageProps} />
      </div>
    </UserPreferencesProvider>
  )
}