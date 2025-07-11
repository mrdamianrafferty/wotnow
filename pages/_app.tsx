import '../styles/index.css'
import type { AppProps } from 'next/app'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import Link from 'next/link'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/interests">Interests</Link></li>
          <li><Link href="/weather">Weather</Link></li>
          <li><Link href="/dev-gigs">Dev Gigs</Link></li>
          <li><Link href="/venues">Venues</Link></li>
        </ul>
      </nav>
      <Component {...pageProps} />
    </UserPreferencesProvider>
  )
}
