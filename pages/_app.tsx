import '../styles/index.css'
import type { AppProps } from 'next/app'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import Link from 'next/link'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      <nav>
        
          <Link href="/">Home</Link> | <Link href="/interests">Set Your Interests</Link> | <Link href="/weather">Weather in Detail</Link>
        
      </nav>
      <Component {...pageProps} />
    </UserPreferencesProvider>
  )
}
