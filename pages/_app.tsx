// Replace the entire file with this cleaned version:

import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
import type { AppProps } from 'next/app'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      {/* ✅ Removed the text navigation - now only hamburger menu will show */}
      <Component {...pageProps} />
    </UserPreferencesProvider>
  )
}