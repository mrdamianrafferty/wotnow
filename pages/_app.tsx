// Replace the entire file with this cleaned version:

import '../styles/index.css'
import '../styles/Card.css'
import '../styles/Popup.css'
import 'weather-icons/css/weather-icons.css';
import 'weather-icons/css/weather-icons.min.css';
import type { AppProps } from 'next/app'
import { UserPreferencesProvider } from '../context/UserPreferencesContext'

function getWeatherIconClass(iconCode: string) {
  // Map OpenWeatherMap icon codes to weather-icons class names
  const map: Record<string, string> = {
    '01d': 'wi-day-sunny',
    '01n': 'wi-night-clear',
    '02d': 'wi-day-cloudy',
    '02n': 'wi-night-alt-cloudy',
    '03d': 'wi-cloud',
    '03n': 'wi-cloud',
    '04d': 'wi-cloudy',
    '04n': 'wi-cloudy',
    '09d': 'wi-showers',
    '09n': 'wi-showers',
    '10d': 'wi-day-rain',
    '10n': 'wi-night-alt-rain',
    '11d': 'wi-thunderstorm',
    '11n': 'wi-thunderstorm',
    '13d': 'wi-snow',
    '13n': 'wi-snow',
    '50d': 'wi-fog',
    '50n': 'wi-fog',
  };
  return map[iconCode] || 'wi-na';
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserPreferencesProvider>
      {/* ✅ Removed the text navigation - now only hamburger menu will show */}
      <Component {...pageProps} />
    </UserPreferencesProvider>
  )
}