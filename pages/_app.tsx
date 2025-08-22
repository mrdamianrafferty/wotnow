import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
import '../styles/weather-icons-wind.css';
import '../styles/windwave.css';
import '../styles/weather-icons-wind.min.css';
import 'leaflet/dist/leaflet.css';
import type { AppProps } from 'next/app'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'
import Script from 'next/script';


export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        strategy="beforeInteractive"
      />
      <Component {...pageProps} />
    </UserPreferencesProvider>
  );
}