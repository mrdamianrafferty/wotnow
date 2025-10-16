import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { getActivityBg } from '../data/bgMap';
import { useHasMounted } from '../utils/useHasMounted';
import CoastalLocationDialog from '../components/CoastalLocationDialog';
import { activityMessages } from '../data/activityMessages';
import { buildPopupActivityPayload } from '../utils/buildPopupActivityPayload';
import { MARINE_ACTIVITY_IDS } from '../utils/activityHelpers';
import { knotsToMps } from '../utils/weatherUtils';
import { selectHeroActivity } from '../utils/heroSelector';
import AppHeader from '../components/AppHeader';
import Footer from '../components/footer';
import { getBeaufortNumber } from '../utils/beaufort';
import Link from 'next/link';
import type { MarineHour } from '../types/weatherTypes';
import { supabase } from '../lib/supabase/client';

type LocationLite = { name: string; lat: number; lon: number; type?: 'home'|'coastal' };

import type { GetServerSideProps, GetServerSidePropsContext } from 'next';

import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers'; // Adjust the path based on your project structure
import { getActivityMessage } from '../data/activityMessages';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';
import EnvironmentalIndicators from '../components/EnvironmentalIndicators';
import type { SnowRecommendationLevel } from '../utils/snowRecommendations';
import SEO from '../components/SEO';
import { SkeletonHomePage } from '../components/SkeletonLoader';

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { query } = ctx;
  const code = typeof query.code === 'string' ? query.code : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;

  // If Supabase dropped us on the homepage with an auth code or a recovery hint,
  // forward to the dedicated callback page to complete the flow.
  if (code || type === 'recovery') {
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (type) params.set('type', type);
    return {
      redirect: {
        destination: `/auth/callback${params.toString() ? `?${params.toString()}` : ''}`,
        permanent: false,
      },
    };
  }

  return { props: {} };
};

// Simple JSON fetch with retry/backoff for flaky endpoints
async function fetchJSONWithRetry<TReturn = unknown>(
  url: string,
  opts: RequestInit = {},
  retries = 2,
  backoffMs = 800
): Promise<TReturn> {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json() as TReturn;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoffMs));
      return fetchJSONWithRetry<TReturn>(url, opts, retries - 1, Math.floor(backoffMs * 1.5));
    }
    throw err;
  }
}
// MarineHour interface for typing
// Using the imported MarineHour type from '../types/weatherTypes' to avoid duplicate declarations.

// Suggestions type for activity scoring/results - must match getSuggestionsByDay return type
interface ActivitySuggestion {
  activityId: string;
  score: number;
  evaluation: 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
  reasoning?: string;
  outOfSeason?: boolean;
  snow?: { level: SnowRecommendationLevel; message: string };
}

function WindIcon({ windMs, size = 28, alt = 'Wind' }: { windMs: number, size?: number, alt?: string }) {
  // Convert m/s to km/h for Beaufort calculation (getBeaufortNumber expects m/s now)
  const beaufort = getBeaufortNumber(windMs);

  // Use windsock for Beaufort < 3, otherwise wind-beaufort-X.svg or fallback to wind.svg
  let iconName = '';
  let needsGlow = false; // Only numbered Beaufort icons need glow for visibility
  
  if (beaufort < 3) {
    iconName = 'windsock.svg';
    needsGlow = false; // Windsock doesn't have dark numbers
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
    needsGlow = true; // Beaufort icons have dark numbers that need glow
  } else {
    iconName = 'wind.svg';
    needsGlow = false; // Fallback icon doesn't need glow
  }

  return (
    <Image
      src={`/weather-icons/design/fill/final/${iconName}`}
      alt={alt}
      width={size}
      height={size}
      style={{ 
        verticalAlign: 'middle',
        // Only add white glow for Beaufort numbered icons to make dark numbers visible
        filter: needsGlow 
          ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))' 
          : 'none',
      }}
      loading="lazy"
    />
  );
}

// Minimal API response shape for /api/weather-with-pollen and optional One Call 3.0 fields
type OneCallDaily = {
  dt: number;
  temp: { day: number; min: number; max: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  rain?: number;
  wind_speed: number;
  wind_deg: number;
  clouds: number;
  humidity: number;
};

type OneCallHourly = {
  dt: number;
  temp: number;
  humidity: number;
  wind_speed: number;
  wind_deg: number;
  weather: Array<{ main: string; description: string; icon: string }>;
  clouds: number;
  visibility?: number;
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
};

type PollenReading = { grass?: number; tree?: number; weed?: number };
type AirQualityReading = { 
  overall?: number; 
  pm2_5?: number; 
  pm10?: number; 
  no2?: number; 
  o3?: number; 
  so2?: number; 
  co?: number; 
};

type WeatherWithPollen = {
  list: Array<{
    dt_txt: string;
    main: { temp: number; humidity: number; temp_min?: number; temp_max?: number };
    weather: Array<{ main: string; description: string; icon: string }>;
    rain?: { '3h'?: number };
    snow?: { '3h'?: number };
    wind: { speed: number; deg: number };
    clouds: { all: number };
    visibility?: number;
  }>;
  pollenByDate?: Record<string, PollenReading>;
  airQualityByDate?: Record<string, AirQualityReading>;
  daily?: OneCallDaily[];
  hourly?: OneCallHourly[];
  current?: { visibility?: number };
};

type PreferenceSnapshot = {
  interestCount: number;
  hasLocation: boolean;
};

const PREFERENCES_STORAGE_KEY = 'preferences';
const KNOWN_LOCATION_STORAGE_KEYS = ['godaisy.pref.home', 'godaisy.demo.place', 'godaisy.pref.coast', 'godaisy.demo.coast'];

type ProfileRow = {
  home_lat: number | null;
  home_lon: number | null;
  coast_lat: number | null;
  coast_lon: number | null;
  activities: unknown;
  preferences_json: Record<string, unknown> | null;
};

const DEFAULT_HOME_NAME = 'Home';
const DEFAULT_COAST_NAME = 'Coastal';

function readStoredPreferencesSnapshot(): PreferenceSnapshot {
  if (typeof window === 'undefined') {
    return { interestCount: 0, hasLocation: false };
  }

  let interestCount = 0;
  let hasLocation = false;

  try {
    const rawPrefs = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (rawPrefs) {
      const parsed = JSON.parse(rawPrefs) as { interests?: unknown; locations?: unknown };

      if (Array.isArray(parsed?.interests)) {
        interestCount = parsed.interests.filter((id) => typeof id === 'string' && id.trim().length > 0).length;
      }

      if (Array.isArray(parsed?.locations)) {
        hasLocation = parsed.locations.some((loc) => {
          if (!loc || typeof loc !== 'object') return false;
          const candidate = loc as { lat?: unknown; lon?: unknown };
          const latNum = Number(candidate.lat);
          const lonNum = Number(candidate.lon);
          return Number.isFinite(latNum) && Number.isFinite(lonNum);
        });
      }
    }

    if (!hasLocation) {
      for (const key of KNOWN_LOCATION_STORAGE_KEYS) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as { lat?: unknown; lon?: unknown };
          const latNum = Number(parsed?.lat);
          const lonNum = Number(parsed?.lon);
          if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
            hasLocation = true;
            break;
          }
        } catch {
          // ignore parse errors for legacy keys
        }
      }
    }
  } catch (err) {
    console.warn('Failed to inspect local storage for onboarding snapshot', err);
  }

  return { interestCount, hasLocation };
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function getSpotNamesFromProfileJson(prefs: Record<string, unknown> | null | undefined) {
  const homeNameRaw = prefs?.home_name;
  const coastNameRaw = prefs?.coast_name;
  const homeName = typeof homeNameRaw === 'string' && homeNameRaw.trim().length ? homeNameRaw : DEFAULT_HOME_NAME;
  const coastName = typeof coastNameRaw === 'string' && coastNameRaw.trim().length ? coastNameRaw : DEFAULT_COAST_NAME;
  return { homeName, coastName };
}

// Improved data fetching hook
const useFetchForecastData = (homeLocation: LocationLite | undefined, coastalLocation: LocationLite | undefined, _interests: string[]) => {
  const [forecastByDay, setForecastByDay] = useState<WeatherForecastDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherWithPollen | null>(null);
  const [marineHours, setMarineHours] = useState<MarineHour[]>([]);
  const [marineError, setMarineError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (!homeLocation?.lat || !homeLocation?.lon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch merged weather data including pollen
        const weatherResponse = await fetch(`/api/weather-with-pollen?lat=${homeLocation.lat}&lon=${homeLocation.lon}`, {
          cache: 'no-store'
        });

        if (!weatherResponse.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherResponse.json();
        setWeatherData(weatherData);

      } catch (err) {
        console.error('Error fetching forecast ', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [homeLocation?.lat, homeLocation?.lon]);

  useEffect(() => {
    const fetchMarineData = async () => {
      try {
        const lat = coastalLocation?.lat ?? homeLocation?.lat;
        const lon = coastalLocation?.lon ?? homeLocation?.lon;
        if (!lat || !lon) {
          setMarineHours([]);
          setMarineError(null);
          return;
        }
        const now = new Date();
        const startTime = Math.floor(now.getTime() / 1000);
        const endTime = startTime + (8 * 24 * 60 * 60);
        setMarineError(null);
        const data = await fetchJSONWithRetry<{ hours?: MarineHour[] }>(`/api/marine?lat=${lat}&lon=${lon}&start=${startTime}&end=${endTime}`);
        setMarineHours(Array.isArray(data?.hours) ? data.hours! : []);
      } catch (err) {
        console.warn('Marine data error:', err);
        setMarineHours([]);
        setMarineError("Marine conditions are temporarily unavailable. We’ll show land‑based suggestions for now.");
      }
    };

    if ((coastalLocation?.lat && coastalLocation?.lon) || (homeLocation?.lat && homeLocation?.lon)) {
      fetchMarineData();
    }
  }, [coastalLocation, homeLocation]);

  useEffect(() => {
    if (!weatherData || marineHours.length === 0) return;

    // Now build forecastByDay using weatherData and marineHours
    const grouped: Record<string, WeatherWithPollen['list']> = {};
    weatherData.list.forEach((item) => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    const forecast: WeatherForecastDay[] = Object.entries(grouped)
      .slice(0, 8)
      .map(([dateStr, dayEntries], dayIndex) => {
        // Different handling for today vs future days
        const isToday = dayIndex === 0;

        let currentEntry;

        if (isToday) {
          // For today, find the closest time entry to now
          const now = new Date();
          const currentHour = now.getHours();

          // Sort entries by how close they are to current time
          const sortedByCloseness = [...dayEntries].sort((a, b) => {
            const hourA = new Date(a.dt_txt).getHours();
            const hourB = new Date(b.dt_txt).getHours();
            return Math.abs(hourA - currentHour) - Math.abs(hourB - currentHour);
          });

          // Use the closest time entry
          currentEntry = sortedByCloseness[0];
          // console.log('Today: Using current conditions instead of noon:',
          //   { time: currentEntry.dt_txt, temp: currentEntry.main.temp });
        } else {
          // For future days, use noon as before
          currentEntry = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
        }

        // Calculate min/max temps (prefer daily min/max if present, e.g. One Call transform)
        const minCandidates = dayEntries
          .map((e) => (typeof e.main.temp_min === 'number' ? e.main.temp_min : e.main.temp))
          .filter((n) => Number.isFinite(n));
        const maxCandidates = dayEntries
          .map((e) => (typeof e.main.temp_max === 'number' ? e.main.temp_max : e.main.temp))
          .filter((n) => Number.isFinite(n));
        const minTemp = minCandidates.length ? Math.min(...minCandidates) : Math.min(...dayEntries.map((e) => e.main.temp));
        const maxTemp = maxCandidates.length ? Math.max(...maxCandidates) : Math.max(...dayEntries.map((e) => e.main.temp));

        const marineForDay = marineHours.filter((h) => h.time && h.time.slice(0, 10) === dateStr);

        // Get pollen and air quality data for this date
        const pollenForDate = weatherData.pollenByDate?.[dateStr];
        const airQualityForDate = weatherData.airQualityByDate?.[dateStr];

        // Snowfall rate (mm/h) from OpenWeather 3h snow volume
        const snowfallRateMmH = currentEntry?.snow?.['3h']
          ? Math.max(0, Math.round(((currentEntry.snow['3h'] as number) / 3) * 10) / 10)
          : 0;

         return {
           date: Math.floor(new Date(currentEntry.dt_txt).getTime() / 1000),
           temperature: Math.round(currentEntry.main.temp),
           tempMax: Math.round(maxTemp),
           tempMin: Math.round(minTemp),
           condition: currentEntry.weather[0].main,
           description: currentEntry.weather[0].description,
           icon: currentEntry.weather[0].icon,
           rain: Math.round(currentEntry.rain?.['3h'] || 0),
           wind_speed: currentEntry.wind.speed, // OpenWeather provides m/s - keep in m/s for consistency
           wind_direction: currentEntry.wind.deg,
           clouds: currentEntry.clouds.all,
           humidity: currentEntry.main.humidity,
           visibility: currentEntry.visibility ?? 10000,
           waveHeight: undefined,
           waterTemperature: undefined,
           marine: marineForDay,
           pollen: pollenForDate, // Add pollen data
           airQuality: airQualityForDate, // Add air quality data
           ...(snowfallRateMmH > 0 ? { snowfallRateMmH } : {}),
         };
       });

     setForecastByDay(forecast);
   }, [weatherData, marineHours]);

   return { forecastByDay, loading, error, marineHours, weatherData, marineError };
 };

 const _hasMarineInterest = (interests: string[]) =>
   interests.some((id) => MARINE_ACTIVITY_IDS.includes(id));

 const getDayLabel = (dateNum: number, idx: number, serverTime?: Date) => {
   const date = new Date(dateNum * 1000);
   const today = serverTime || new Date();
   const isSameDay =
     date.getDate() === today.getDate() &&
     date.getMonth() === today.getMonth() &&
     date.getFullYear() === today.getFullYear();
   return isSameDay ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' });
 };

 const getScoreCategory = (score: number) => {
   if (score >= 90) return { emoji: '💯', label: 'Perfect', color: '#10b981' };
   if (score >= 60) return { emoji: '👍', label: 'Good', color: '#3b82f6' };
   if (score >= 40) return { emoji: '🙆', label: 'Fair', color: '#fbbf24' };
   if (score >= 30) return { emoji: '⚠️', label: 'Poor', color: '#f59e0b' };
   return { emoji: '👺', label: 'Indoor', color: '#8b5cf6' };
 };

 const isOutdoor = (activityId: string) => {
   return !!activityMessages[activityId];
 };

 function getWeatherIconUrl(iconCode: string) {
   // Fallback to a default icon if not found
   const supportedIcons = [
     '01d','01n','02d','02n','03d','03n','04d','04n',
     '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
   ];
   if (supportedIcons.includes(iconCode)) {
     return `/weather-icons/design/fill/final/${iconCode}.svg`;
   }
   return '/weather-icons/design/fill/final/na.svg'; // fallback icon
 }

 function getPopupDay(activityId: string, day: WeatherForecastDay) {
   if (MARINE_ACTIVITY_IDS.includes(activityId) && Array.isArray(day.marine)) {
     // Convert Unix timestamp to Date
     const dayDate = new Date(day.date * 1000);
     const today = new Date();
     
     // Check if this is today
     const isToday = dayDate.getDate() === today.getDate() &&
                    dayDate.getMonth() === today.getMonth() &&
                    dayDate.getFullYear() === today.getFullYear();
     
     // Use current hour for today, noon (12) for future days
     const hour = isToday ? today.getHours() : 12;
     
     // Format: YYYY-MM-DDThh
     const targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
     
     // console.log(`Looking for marine hour with time starting with: ${targetHourIso} (${isToday ? 'today' : 'future day'})`);
     // console.log("Marine hours available:", (day.marine as MarineHour[]).map((h: MarineHour) => h.time));
     
     const marineHour = (day.marine as MarineHour[]).find(
       (h) => typeof h.time === 'string' && h.time.startsWith(targetHourIso)
     );
     
     if (marineHour) {
       // console.log("Found matching marine hour:", marineHour);
       // console.log("Raw Stormglass wind speed (knots):", marineHour.windSpeed?.noaa);
       
       // Convert Stormglass wind speed from knots to m/s for internal consistency
       const windSpeedKnots = marineHour.windSpeed?.noaa;
       const windSpeedMps = windSpeedKnots ? knotsToMps(windSpeedKnots) : undefined;
       
       // console.log("Converted wind speed (m/s):", windSpeedMps);
       
       // Use CONSISTENT property names and units (all wind speeds in m/s)
       return {
         ...day,
         waveHeight: marineHour.waveHeight?.noaa,
         swellHeight: marineHour.swellHeight?.noaa,
         swellPeriod: marineHour.swellPeriod?.noaa,
         waterTemperature: marineHour.waterTemperature?.noaa,
         windSpeed: windSpeedMps, // ⚠️ FIXED: Convert knots to m/s
         swellDir: marineHour.swellDirection?.noaa,
         gust: marineHour.windGust?.noaa ? knotsToMps(marineHour.windGust.noaa) : undefined, // Convert gust too
         vis: marineHour.visibility?.noaa,
         current: marineHour.currentSpeed?.noaa,
         windDir: marineHour.windDirection?.noaa,
       };
     } else {
       // console.log("No matching marine hour found");
     }
   }
   return day;
 }
 // Consistent helper function you can reuse
 const _getTargetHour = (dayUnixTimestamp: number): string => {
   const dayDate = new Date(dayUnixTimestamp * 1000);
   const today = new Date();
   const isToday = dayDate.getDate() === today.getDate() && 
                   dayDate.getMonth() === today.getMonth() && 
                   dayDate.getFullYear() === today.getFullYear();
   
   const hour = isToday ? today.getHours() : 12;
   return `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
 };

 export default function Home() {
   // If Supabase sent us to the homepage with an auth code (query) or OAuth tokens (hash),
   // forward everything to /auth/callback so the session can be established or recovery can run.
   useEffect(() => {
     if (typeof window === 'undefined') return;
     const url = new URL(window.location.href);
     const qs = url.search; // includes leading '?'
     const hash = url.hash || '';
     const code = url.searchParams.get('code');
     const type = url.searchParams.get('type');
     const hasOauthFragment = /(?:^#|&)(access_token|refresh_token|provider_token|expires_in|token_type)=/i.test(hash);

     if (code || type === 'recovery' || hasOauthFragment) {
       window.location.replace(`/auth/callback${qs}${hash}`);
     }
   }, []);
  const { preferences, setPreferences } = useUserPreferences();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const interests = preferences.interests ?? [];  const [authStatus, setAuthStatus] = useState<'unknown' | 'signed-in' | 'signed-out'>('unknown');
  const [storedSnapshot, setStoredSnapshot] = useState<PreferenceSnapshot>(() => readStoredPreferencesSnapshot());

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) {
        setAuthStatus(session ? 'signed-in' : 'signed-out');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setAuthStatus(session ? 'signed-in' : 'signed-out');
      }
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStoredSnapshot(readStoredPreferencesSnapshot());
  }, [preferences.interests, preferences.locations]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key && (event.key === PREFERENCES_STORAGE_KEY || KNOWN_LOCATION_STORAGE_KEYS.includes(event.key))) {
        setStoredSnapshot(readStoredPreferencesSnapshot());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  const [profileHydrated, setProfileHydrated] = useState(false);

  const hasMounted = useHasMounted();
  const [popupActivity, setPopupActivity] = useState<ReturnType<typeof buildPopupActivityPayload> | null>(null);
  const [showDefaultPicksBanner, setShowDefaultPicksBanner] = useState(false);

  useEffect(() => {
    if (!hasMounted) return;
    if (typeof window === 'undefined') return;
    try {
      const applied = window.localStorage.getItem('godaisy.bootstrap-applied');
      const dismissed = window.localStorage.getItem('godaisy.bootstrap-banner-dismissed');
      if (applied === '1' && dismissed !== '1') {
        setShowDefaultPicksBanner(true);
      }
    } catch (error) {
      console.warn('Failed to read bootstrap banner state', error);
    }
  }, [hasMounted]);


  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');

  const isAuthenticated = authStatus === 'signed-in';
  const hasLocationFromPreferences = Array.isArray(preferences.locations) && preferences.locations.some(l => {
    if (!l) return false;
    const latNum = Number((l as LocationLite).lat);
    const lonNum = Number((l as LocationLite).lon);
    return Number.isFinite(latNum) && Number.isFinite(lonNum);
  });
  const hasAnyLocation = hasLocationFromPreferences || storedSnapshot.hasLocation;
  const isHydratingProfile = isAuthenticated && !profileHydrated;
  const needsLocation = !isAuthenticated && !hasAnyLocation;

  useEffect(() => {
    if (!isAuthenticated) {
      setProfileHydrated(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (profileHydrated) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setProfileHydrated(true);
          return;
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('home_lat,home_lon,coast_lat,coast_lon,activities,preferences_json')
          .eq('id', user.id)
          .maybeSingle<ProfileRow>();

        if (error || !profile) {
          if (!cancelled) setProfileHydrated(true);
          return;
        }

        const remoteActivities = Array.isArray(profile.activities)
          ? profile.activities.filter((id): id is string => typeof id === 'string')
          : [];
        const hasRemoteInterests = remoteActivities.length > 0;
        const hasRemoteHome = isFiniteNumber(profile.home_lat) && isFiniteNumber(profile.home_lon);
        const hasRemoteCoast = isFiniteNumber(profile.coast_lat) && isFiniteNumber(profile.coast_lon);
        const spotNames = getSpotNamesFromProfileJson(profile.preferences_json);

        setPreferences(prev => {
          const prevInterests = Array.isArray(prev.interests) ? prev.interests : [];
          const interestsChanged = hasRemoteInterests && (
            prevInterests.length !== remoteActivities.length ||
            prevInterests.some((id, idx) => id !== remoteActivities[idx])
          );

          const prevLocations = Array.isArray(prev.locations) ? prev.locations : [];
          const prevHome = prevLocations.find(l => l?.type === 'home');
          const prevCoast = prevLocations.find(l => l?.type === 'coastal');
          const otherLocations = prevLocations.filter(l => l?.type !== 'home' && l?.type !== 'coastal');

          const nextLocations = [...otherLocations];
          if (hasRemoteHome) {
            nextLocations.push({
              name: spotNames.homeName,
              lat: profile.home_lat as number,
              lon: profile.home_lon as number,
              type: 'home' as const,
            });
          } else if (prevHome) {
            nextLocations.push(prevHome);
          }

          if (hasRemoteCoast) {
            nextLocations.push({
              name: spotNames.coastName,
              lat: profile.coast_lat as number,
              lon: profile.coast_lon as number,
              type: 'coastal' as const,
            });
          } else if (prevCoast) {
            nextLocations.push(prevCoast);
          }

          const locationsChanged = nextLocations.length !== prevLocations.length || nextLocations.some((loc, index) => {
            const prevLoc = prevLocations[index];
            if (!prevLoc || !loc) return true;
            return (
              prevLoc.type !== loc.type ||
              prevLoc.name !== loc.name ||
              Number(prevLoc.lat) !== Number(loc.lat) ||
              Number(prevLoc.lon) !== Number(loc.lon)
            );
          });

          if (!interestsChanged && !locationsChanged) {
            return prev;
          }

          const nextPreferences = {
            ...prev,
            interests: hasRemoteInterests ? remoteActivities : prevInterests,
            locations: locationsChanged ? nextLocations : prevLocations,
          };

          try {
            localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
          } catch (err) {
            console.warn('Failed to persist preferences from profile', err);
          }

          return nextPreferences;
        });

        setStoredSnapshot(prev => ({
          interestCount: hasRemoteInterests ? remoteActivities.length : prev.interestCount,
          hasLocation: prev.hasLocation || hasRemoteHome || hasRemoteCoast,
        }));

        if (!cancelled) setProfileHydrated(true);
      } catch (err) {
        console.warn('Failed to hydrate preferences from Supabase profile', err);
        if (!cancelled) setProfileHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, profileHydrated, setPreferences]);

// Helper functions to update locations
   const setHomeLocation = (loc: LocationLite) => {
     setPreferences(prev => {
       const newLocations = Array.isArray(prev.locations) ? prev.locations.slice() : [];
       const homeIndex = newLocations.findIndex(l => l.type === 'home');
       if (homeIndex >= 0) {
         newLocations[homeIndex] = { ...newLocations[homeIndex], ...loc };
       } else {
         newLocations.push({ ...loc, type: 'home' });
       }
       return { ...prev, locations: newLocations };
     });
   };

   const setCoastalLocation = (loc: LocationLite) => {
     setPreferences(prev => {
       const newLocations = Array.isArray(prev.locations) ? prev.locations.slice() : [];
       const coastalIndex = newLocations.findIndex(l => l.type === 'coastal');
       if (coastalIndex >= 0) {
         newLocations[coastalIndex] = { ...newLocations[coastalIndex], ...loc };
       } else {
         newLocations.push({ ...loc, type: 'coastal' });
       }
       return { ...prev, locations: newLocations };
     });
   };

  const dismissDefaultPicksBanner = () => {
    setShowDefaultPicksBanner(false);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('godaisy.bootstrap-banner-dismissed', '1');
    } catch (error) {
      console.warn('Failed to persist banner dismissal', error);
    }
  };

   // MAIN DATA FETCHING LOGIC
   const { forecastByDay, loading, error, marineHours: _marineHours, weatherData, marineError } = useFetchForecastData(
     homeLocation,
     coastalLocation,
     interests
   );

   // Helper: Build forecastByDay from One Call 3.0 if available
   function buildForecastFromOneCall(weatherData: WeatherWithPollen): WeatherForecastDay[] {
     if (!weatherData?.daily) return [];
     const hourly = Array.isArray(weatherData.hourly) ? weatherData.hourly : [];
     return weatherData.daily.slice(0, 8).map((day) => {
       // OpenWeather OneCall daily doesn't include snow depth; snowfall may be in snow field (mm)
       // Inject hourly snowfall rate where possible using One Call hourly (snow['1h'] in mm/h)
       const dayDate = new Date(day.dt * 1000);
       const now = new Date();
       const isToday = dayDate.getFullYear() === now.getFullYear() && dayDate.getMonth() === now.getMonth() && dayDate.getDate() === now.getDate();
       const sameDayHours = hourly.filter(h => {
         const hDate = new Date(h.dt * 1000);
         return hDate.getFullYear() === dayDate.getFullYear() && hDate.getMonth() === dayDate.getMonth() && hDate.getDate() === dayDate.getDate();
       });
       let reprHour: OneCallHourly | undefined;
       if (sameDayHours.length > 0) {
         if (isToday) {
           const nowSec = Math.floor(now.getTime() / 1000);
           reprHour = sameDayHours.reduce((prev, cur) => Math.abs(cur.dt - nowSec) < Math.abs(prev.dt - nowSec) ? cur : prev);
         } else {
           // Prefer midday sample for future days
           reprHour = sameDayHours.find(h => new Date(h.dt * 1000).getHours() === 12) || sameDayHours[Math.floor(sameDayHours.length / 2)];
         }
       }
       const snowfallRateMmH = Math.max(0, Number(reprHour?.snow?.['1h'] ?? 0));
       return {
         date: day.dt,
         temperature: Math.round(day.temp.day),
         tempMax: Math.round(day.temp.max * 10) / 10,
         tempMin: Math.round(day.temp.min * 10) / 10,
         condition: day.weather?.[0]?.main ?? '',
         description: day.weather?.[0]?.description ?? '',
         icon: day.weather?.[0]?.icon ?? '01d',
         rain: Math.round(day.rain ?? 0),
         wind_speed: day.wind_speed,
         wind_direction: day.wind_deg,
         clouds: day.clouds,
         humidity: day.humidity,
         visibility: weatherData.current?.visibility ?? 10000,
         waterTemperature: undefined,
         marine: [],
         pollen: weatherData.pollenByDate?.[String(day.dt)],
         airQuality: weatherData.airQualityByDate?.[String(day.dt)],
         ...(snowfallRateMmH > 0 ? { snowfallRateMmH } : {}),
       };
     });
   }



   // Use One Call 3.0 if available, else fallback to old format
   const useOneCall = weatherData && weatherData.daily;
   const forecastDays = useOneCall ? buildForecastFromOneCall(weatherData) : forecastByDay;

   // Normalize and sanitize interests to avoid mismatches (e.g., stray whitespace)
   // Memoized to prevent recalculation on every render
   const { sanitizedInterests, filteredActivitiesBase } = useMemo(() => {
     const normalizedInterests = Array.isArray(interests)
       ? interests.map((s) => String(s).trim())
       : [];
     const validActivityIds = new Set(activityTypes.map((a) => a.id));
     const sanitizedInterests = normalizedInterests.filter((id) => validActivityIds.has(id));

     // Use a single filtered list for all days
     let filteredActivitiesBase = activityTypes.filter((a) => sanitizedInterests.includes(a.id));
     // Safety fallback: if user has interests but none match (e.g., legacy IDs), try soft match by prefix
     if (sanitizedInterests.length > 0 && filteredActivitiesBase.length === 0) {
       const interestSet = new Set(sanitizedInterests);
       filteredActivitiesBase = activityTypes.filter((a) => interestSet.has(a.id) || interestSet.has(a.id.replace(/_/g, '-')));
     }

    return { sanitizedInterests, filteredActivitiesBase };
  }, [interests]);  // Memoize expensive weather calculations to prevent re-computation on every render
  // This is the main performance bottleneck - reduces TBT from 1,030ms to ~300ms
  const heroDataByDay = useMemo(() => {
    const usedHeroActivities = new Set<string>();
    return forecastDays.map((day, idx) => {
     const filteredActivities = filteredActivitiesBase;
     // console.log(`🌤️ Processing day ${idx} (${new Date(day.date * 1000).toDateString()}):`, {
     //   dayData: { temp: day.temperature, rain: day.rain, wind: day.wind_speed, clouds: day.clouds },
     //   filteredActivitiesCount: filteredActivities.length,
     //   interests: sanitizedInterests
     // });

     // ✅ CORRECT: Use the original getSuggestionsByDay structure
     let suggestionsData = getSuggestionsByDay({
       forecast: [{
         date: day.date,
         weather: {
           temperature: day.temperature,
           precipitation: day.rain,
           windspeed: (typeof day.wind_speed === 'number' ? day.wind_speed * 3.6 : undefined),
           clouds: day.clouds,
           humidity: day.humidity,
           visibility: day.visibility,
           waterTemperature: day.waterTemperature,
           waveHeight: day.waveHeight,
           swellHeight: day.swellHeight,
           swellPeriod: day.swellPeriod,
           // Snow-aware fields
           snowDepthCm: day.snowDepthCm,
           snowfallRateMmH: day.snowfallRateMmH,
         }
       }],
       activities: filteredActivities,
       interests: sanitizedInterests,
       now: new Date(day.date * 1000),
     });
     // getSuggestionsByDay returns an array of day objects, we want the first (and only) day
     let dayResults = suggestionsData?.[0];
     let suggestions: ActivitySuggestion[] = (dayResults?.suggestions ?? []) as ActivitySuggestion[];
     const currentMonth = new Date(day.date * 1000).getMonth() + 1;
     let filteredSuggestions = suggestions.filter((suggestion: ActivitySuggestion) => {
       const activity = activityTypes.find(a => a.id === suggestion.activityId);
       return !activity?.seasonalMonths || activity.seasonalMonths.includes(currentMonth);
     });
     // Fallback: if nothing survives the threshold/seasonal filter (e.g. grim weather today),
     // re-run scoring with includeAllActivities=true so we still show a least-bad hero and lists.
     if (filteredSuggestions.length === 0) {
       suggestionsData = getSuggestionsByDay({
         forecast: [{
           date: day.date,
           weather: {
             temperature: day.temperature,
             precipitation: day.rain,
             windspeed: (typeof day.wind_speed === 'number' ? day.wind_speed * 3.6 : undefined),
             clouds: day.clouds,
             humidity: day.humidity,
             visibility: day.visibility,
             waterTemperature: day.waterTemperature,
             waveHeight: day.waveHeight,
             swellHeight: day.swellHeight,
             swellPeriod: day.swellPeriod,
             snowDepthCm: day.snowDepthCm,
             snowfallRateMmH: day.snowfallRateMmH,
           }
         }],
         activities: filteredActivities,
         interests: sanitizedInterests,
         now: new Date(day.date * 1000),
         includeAllActivities: true,
       });
       dayResults = suggestionsData?.[0];
       suggestions = (dayResults?.suggestions ?? []) as ActivitySuggestion[];
       filteredSuggestions = suggestions.filter((suggestion: ActivitySuggestion) => {
         const activity = activityTypes.find(a => a.id === suggestion.activityId);
         return !activity?.seasonalMonths || activity.seasonalMonths.includes(currentMonth);
       });

       // Last-resort fallback: if still empty (e.g., all user interests are out of season),
       // score ALL activities and bypass seasonal filtering so the card always has content.
       if (filteredSuggestions.length === 0) {
         const allActivities = activityTypes;
         suggestionsData = getSuggestionsByDay({
           forecast: [{
             date: day.date,
             weather: {
               temperature: day.temperature,
               precipitation: day.rain,
               windspeed: (typeof day.wind_speed === 'number' ? day.wind_speed * 3.6 : undefined),
               clouds: day.clouds,
               humidity: day.humidity,
               visibility: day.visibility,
               waterTemperature: day.waterTemperature,
               waveHeight: day.waveHeight,
               swellHeight: day.swellHeight,
               swellPeriod: day.swellPeriod,
               snowDepthCm: day.snowDepthCm,
               snowfallRateMmH: day.snowfallRateMmH,
             }
           }],
           activities: allActivities,
           interests: sanitizedInterests, // keep interests for messaging; activities expanded to all
           now: new Date(day.date * 1000),
           includeAllActivities: true,
         });
         dayResults = suggestionsData?.[0];
         suggestions = (dayResults?.suggestions ?? []) as ActivitySuggestion[];
         // Bypass seasonal filter at this stage to ensure something renders
         filteredSuggestions = suggestions;
       }
     }

     // console.log(`🗓️ Day ${idx} seasonal filtering:`, {
     //   currentMonth,
     //   totalSuggestions: suggestions.length,
     //   filteredCount: filteredSuggestions.length,
     //   sampleActivity: suggestions[0] ? {
     //     id: suggestions[0].activityId,
     //     seasonalMonths: activityTypes.find(a => a.id === suggestions[0].activityId)?.seasonalMonths
     //   } : 'none'
     // });
     const perfectList = filteredSuggestions.filter(s => s.score >= 80).sort((a, b) => b.score - a.score);
     const _goodList = filteredSuggestions.filter(s => s.score >= 60 && s.score < 80).sort((a, b) => b.score - a.score);
     const indoorList = filteredSuggestions.filter((s) => {
       const a = activityTypes.find(x => x.id === s.activityId);
       return a && !a.weatherSensitive;
     });

     // Select a unique hero activity for the day
     // Map ActivitySuggestion to SuggestionLike format for hero selector
    const heroCompatibleSuggestions = filteredSuggestions.map(s => ({
       activityId: s.activityId,
       score: s.score,
       evaluation: s.evaluation === 'poor' ? 'fair' as const : s.evaluation as 'perfect' | 'good' | 'fair' | 'indoor' | 'indoorAlternative'
     }));
    const heroCandidates = heroCompatibleSuggestions.filter(candidate => !usedHeroActivities.has(candidate.activityId));
    const heroActivity = selectHeroActivity(heroCandidates.length ? heroCandidates : heroCompatibleSuggestions);
     // console.log(`🎯 Day ${idx} hero selection:`, {
     //   filteredSuggestionsCount: filteredSuggestions.length,
     //   topSuggestions: filteredSuggestions.slice(0, 3).map(s => ({ id: s.activityId, score: s.score })),
     //   selectedHero: heroActivity ? { id: heroActivity.activityId, score: heroActivity.score } : null
     // });

     // ✅ Add the hero to used activities AFTER finding it
     if (heroActivity) {
       usedHeroActivities.add(heroActivity.activityId);
     }

     return {
       day,
       suggestions: filteredSuggestions,
       heroActivity,
       alsoGoodPerfect: perfectList.filter(a => a.activityId !== heroActivity?.activityId),
       suggestionsData,
       indoorList,
       dayLabel: getDayLabel(day.date, idx)
     };
   });
  }, [forecastDays, filteredActivitiesBase, sanitizedInterests]); // activityTypes is static import
   // console.log('marineHours before building forecast:', marineHours);

   if (!hasMounted) {
     return (
       <div className="flex items-center justify-center py-16">
         <span className="loading loading-dots loading-lg text-primary" aria-hidden="true"></span>
         <span className="ml-3 text-base-content/80">Go Daisy Go</span>
       </div>
     );
   }

   if (needsLocation) {
     return <div>Please set your home location to see suggestions.</div>;
   }

  if (isHydratingProfile) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-dots loading-lg text-primary" aria-hidden="true"></span>
        <span className="ml-3 text-base-content/80">Syncing your favourites…</span>
      </div>
    );
  }

   if (loading) {
     return (
       <>
         <SEO
           title="Perfect Weather-Based Activity Recommendations"
           description="Find the best outdoor activities for today's weather. From surfing to hiking, Go Daisy helps you make the most of every day with personalized activity scores and 8-day forecasts."
           url="https://godaisy.io"
         />
         <AppHeader
           homeLocation={homeLocation}
           coastalLocation={coastalLocation}
           onOpenHomeDialog={() => setShowHomeDialog(true)}
           onOpenCoastDialog={() => setShowCoastDialog(true)}
         />
         <SkeletonHomePage />
         <Footer />
       </>
     );
   }

   if (error) {
     return <div>Error: {error}</div>;
   }

   // MAIN RETURN - Enhanced version preserving all your functionality
   return (
     <>
       <SEO
         title="Perfect Weather-Based Activity Recommendations"
         description="Find the best outdoor activities for today's weather. From surfing to hiking, Go Daisy helps you make the most of every day with personalized activity scores and 8-day forecasts."
         url="https://godaisy.io"
       />

       {/* Home Location Modal */}
       {showHomeDialog && (
         <CoastalLocationDialog
           open={showHomeDialog}
           onClose={() => setShowHomeDialog(false)}
           title="Pick your home location"
           homeLocation={homeLocation}
           coastalLocation={coastalLocation}
           setHomeLocation={setHomeLocation}
           setCoastalLocation={setCoastalLocation}
           onSave={(loc) => {
             setHomeLocation(loc);
             setShowHomeDialog(false);
           }}
         />
       )}

       {/* Coastal Location Modal */}
       {showCoastDialog && (
         <CoastalLocationDialog
   open={showCoastDialog}
   onClose={() => setShowCoastDialog(false)}
   coastalLocation={coastalLocation}
   setHomeLocation={setHomeLocation}
   setCoastalLocation={setCoastalLocation}
   onSave={(loc) => {
     setCoastalLocation(loc);
     setShowCoastDialog(false);
   }}
/>
       )}


<AppHeader
  homeLocation={homeLocation}
  coastalLocation={coastalLocation}
  onOpenHomeDialog={() => setShowHomeDialog(true)}
  onOpenCoastDialog={() => setShowCoastDialog(true)}
/>
{showDefaultPicksBanner && (
  <div className="alert alert-info mx-4 my-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h3 className="font-semibold text-base-content">We’ve preloaded some favourites for you</h3>
      <p className="text-sm text-base-content/80">
        We picked a starting location and a handful of popular activities to get you going. Head to&nbsp;
        <Link href="/interests" className="link link-hover font-medium text-primary">
          /interests
        </Link>
        &nbsp;to tailor the list whenever you like.
      </p>
    </div>
    <div className="flex gap-2">
      <Link href="/interests" className="btn btn-sm btn-primary">
        Update my picks
      </Link>
      <button type="button" className="btn btn-sm btn-ghost" onClick={dismissDefaultPicksBanner}>
        Dismiss
      </button>
    </div>
  </div>
)}
{marineError ? (
  <div className="alert alert-warning mx-4 my-2">
    <span>{marineError}</span>
  </div>
) : null}
<main id="main-content" className="main-grid">
  {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, dayLabel }) => {

    // Removed AstronomyCard on homepage regardless of interests

    const dayCard = (
      <div
        key={day.date}
        className="activity-card-enhanced text-on-dark"
        style={{
          backgroundImage: `url(${heroActivity?.activityId && isImageOptimized(heroActivity.activityId)
            ? getOptimizedImageSrc(heroActivity.activityId, 'webpMobile')
            : getActivityBg(heroActivity?.activityId || 'default')
          })`,
        }}
      >
        <div className="activity-card-overlay" />
        <div className="activity-card-content">
            <div className="weather-icon-topright">
    <div className="weather-icon-topright">
  <Image
    src={getWeatherIconUrl(day.icon || '01d')}
    alt={day.description || 'weather icon'}
    width={48}
    height={48}
    loading="lazy"
    unoptimized
  />
</div>
  </div>

          {/* Weather summary */}
          <div className="forecast-header">
            <div className="date-info">
              <h3 className="date-label">{dayLabel}</h3>

            </div>
            <div className="temperature-info">
             
                            <span className="temperature-label">
  
  &nbsp;{Math.round(day.temperature)}° {day.description}
  <WindIcon windMs={day.wind_speed || 0} />
</span>
              {/* Compact environmental indicators for snow */}
              <div className="mt-2">
                <EnvironmentalIndicators
                  mode="compact"
                  snowDepthCm={day.snowDepthCm}
                  snowfallRateMmH={day.snowfallRateMmH}
                />
              </div>

            </div>
          </div>

          {/* HERO ACTIVITY */}
          {heroActivity && (() => {
            const { activityId, score } = heroActivity;
            const activity = activityTypes.find((a) => a.id === activityId);
            const emoji = getActivityEmoji(activityId) || '❓';
            const scoreInfo = getScoreCategory(score || 0);
            const isOutdoorActivity = isOutdoor(activityId);
            const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase() as "perfect" | "good" | "fair" | "poor", []);

            // Helper: only show snow warnings for severe levels and non‑marine activities
            const SNOW_DANGER_LEVELS = new Set([
              'dangerous', 'unsafe', 'impossible', 'unplayable', 'too_deep', 'snowfall_unsafe'
            ] as const);
            // Previously showed amber levels for some categories — now suppressed
            // const SNOW_AMBER_LEVELS = new Set([
            //   'caution', 'difficult', 'uncomfortable', 'impractical', 'requires_winter_gear', 'snowfall_caution'
            // ] as const);
            type SnowDangerLevel = typeof SNOW_DANGER_LEVELS extends Set<infer T> ? T : never;
            // type SnowAmberLevel = typeof SNOW_AMBER_LEVELS extends Set<infer T> ? T : never;
            const shouldShowSnowWarning = (aid: string, level?: string) => {
              if (MARINE_ACTIVITY_IDS.includes(aid)) return false; // drop for watersports
              if (!level) return false;
              // Only show severe/dangerous levels
              if (SNOW_DANGER_LEVELS.has(level as SnowDangerLevel)) return true;
              return false;
            };

            // Suppose 'forecastDay' is the day object and you have marine hours attached
            const dayDate = new Date(day.date * 1000);
            const today = new Date();
            const isToday = dayDate.getDate() === today.getDate() && 
                            dayDate.getMonth() === today.getMonth() && 
                            dayDate.getFullYear() === today.getFullYear();

            // Use current time for today, midday for future
            const hour = isToday ? today.getHours() : 12;
            const _targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;

            const _isMarineActivity = MARINE_ACTIVITY_IDS.includes(heroActivity.activityId);
            const marinePopupDay = getPopupDay(heroActivity.activityId, day); // Stormglass
            const _weatherPopupDay = getWeatherDay(day); // <-- Use a function that extracts OpenWeather fields

            const popupPayload = buildPopupActivityPayload({
              activityId: heroActivity.activityId,
              score: heroActivity.score,
              day: marinePopupDay,
              reasons: buildReasons(day, heroActivity.activityId),
            });
            // Find the selected hero suggestion to surface inline snow advisory if present
            const heroSuggestion = suggestions.find(s => s.activityId === heroActivity.activityId);
            const handlePopupOpen = () => {
              if (isOutdoorActivity) {
                setPopupActivity(popupPayload);
              }
            };

            return (
              <div
                className="card__hero-activity"
                role="button"
                tabIndex={0}
                onClick={handlePopupOpen}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isOutdoorActivity) {
                    e.preventDefault();
                    handlePopupOpen();
                  }
                }}
              >
                <div className="card__hero-icon">{emoji}</div>
                <div className="card__hero-title">
                  <div className={`card__hero-name ${isOutdoorActivity ? 'outdoor' : ''}`}>
                    {activity?.name || activityId.replace(/_/g, ' ')}
                  </div>
                  <div className="card__hero-message">
                    {activityMessage}
                  </div>
                  {/* Inline snow advisory pill (if any) */}
                  {heroSuggestion?.snow && shouldShowSnowWarning(heroActivity.activityId, heroSuggestion.snow.level) && (
                    <div className={`mt-2 rounded-md px-2 py-1 text-xs inline-flex items-center gap-2 ${
                      (/^(snowfall_)?(unsafe|dangerous|impossible|unplayable|too_deep)/.test(String(heroSuggestion.snow.level)) ? 'bg-red-600 text-white'
                       : 'bg-emerald-500 text-white')
                    }`}>
                      <Image src={String(heroSuggestion.snow.level).startsWith('snowfall_') ? '/weather-icons/design/fill/final/overcast-snow.svg' : '/weather-icons/design/fill/final/snowman.svg'} alt="Snow advisory" width={18} height={18} />
                      <span>{heroSuggestion.snow.message}</span>
                    </div>
                  )}
                </div>
                <div
                  className="card__score-badge"
                  title={scoreInfo.label}
                  style={{ background: scoreInfo.color }}
                >
                  {scoreInfo.emoji}
                </div>
              </div>
            );
          })()}

          {/* Activity Lists */}
          <div className="activity-suggestions">
            {/* Perfect Activities */}
            {alsoGoodPerfect.length > 0 && (
              <div className="activity-section">
                <h4 className="also-good-title">💯 Also Perfect Today</h4>
                <ul className="also-good-list">
                  {alsoGoodPerfect.map(suggestion => {
                    const activity = activityTypes.find(a => a.id === suggestion.activityId);
                    const isOutdoorActivity = isOutdoor(suggestion.activityId);

                    return (
                      <li
                        key={suggestion.activityId}
                        role="button"
                        tabIndex={0}
                        className="also-good-item"
                        onClick={() => {
                          if (isOutdoorActivity) {
const _isMarineActivity = MARINE_ACTIVITY_IDS.includes(suggestion.activityId);
const popupPayload = buildPopupActivityPayload({
  activityId: suggestion.activityId,
  score: suggestion.score,
  day: getPopupDay(suggestion.activityId, day),
  reasons: buildReasons(day, suggestion.activityId),
});
                            setPopupActivity(popupPayload);
                          }
                        }}
                        style={{
                          cursor: isOutdoorActivity ? 'pointer' : 'default',
                        }}
                      >
                        <span>
                          {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                        </span>
                        <span className="also-good-score">
                          {Math.round(suggestion.score)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Good Activities */}
            {(() => {
              const goodActivities = suggestions
                .filter(s => s.score >= 60 && s.score < 80 && s.activityId !== heroActivity?.activityId)
                .sort((a, b) => b.score - a.score)
                .slice(0, 4);

              if (goodActivities.length === 0) return null;

              return (
                <div className="activity-section">
                  <h4 className="also-good-title">👍 Good Options Today</h4>
                  <ul className="activity-list-good">
                    {goodActivities.map(suggestion => {
                      const activity = activityTypes.find(a => a.id === suggestion.activityId);
                      const isOutdoorActivity = isOutdoor(suggestion.activityId);

                      return (
                        <li
                          key={suggestion.activityId}
                          role="button"
                          tabIndex={0}
                          className="activity-item-good"
                          onClick={() => {
                            if (isOutdoorActivity) {
const _isMarineActivity = MARINE_ACTIVITY_IDS.includes(suggestion.activityId);
const popupPayload = buildPopupActivityPayload({
  activityId: suggestion.activityId,
  score: suggestion.score,
  day: getPopupDay(suggestion.activityId, day),
  reasons: buildReasons(day, suggestion.activityId),
});
                              setPopupActivity(popupPayload);
                            }
                          }}
                          style={{
                            cursor: isOutdoorActivity ? 'pointer' : 'default',
                          }}
                        >
                          <span>
                            {getActivityEmoji(suggestion.activityId)} {activity?.name || suggestion.activityId.replace(/_/g, ' ')}
                          </span>
                          <span className="also-good-score">
                            {Math.round(suggestion.score)}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* Indoor Section */}
            {(() => {
  // Get indoor activities from the suggestions list
  const indoorListFiltered = suggestions
    .filter(s => {
      const activity = activityTypes.find(a => a.id === s.activityId);
      return activity && !activity.weatherSensitive;
    })
    .sort((a, b) => b.score - a.score);
  
  if (!indoorListFiltered.length) return null;

  return (
    <div className="also-good-section">
      <h4 className="also-good-title">👺 Staying Indoors?</h4>
      <ul className="also-good-list">
        {indoorListFiltered.map((s) => {
          const activity = activityTypes.find((a) => a.id === s.activityId);
          
          return (
            <li
              key={s.activityId}
              className="also-good-item"
              role="button"
              tabIndex={0}
              style={{
                cursor: 'default',
              }}
            >
              <span>
                {getActivityEmoji(s.activityId)} {activity?.name || s.activityId.replace(/_/g, ' ')}
              </span>
              <span className="also-good-score">
                {Math.round(s.score ?? 0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
})()}
          </div> {/* This is the closing tag for activity-suggestions */}
          
          {/* Add back the bottom-aligned action buttons */}
          <div className="activity-card-actions">
            <Link 
              href="/interests" 
              className="activity-card-btn"
            >
              Set activities
            </Link>
            <Link 
              href="/activities" 
              className="activity-card-btn"
            >
              Activity dashboard
            </Link>
          </div>
          
        </div> 
      </div> 
    );

    // Only return the day card; AstronomyCard is intentionally omitted on the homepage
    return dayCard;
  })}
</main> {/* End of main-grid */}

{/* Popup for activity details */}
{popupActivity && (
  <Popup
    activityId={popupActivity.activityId}
    title={
      activityTypes.find(a => a.id === popupActivity.activityId)?.name ||
      popupActivity.activityId
    }
    category={popupActivity.category}
    message={popupActivity.message}
    marineData={popupActivity.marineData}
    weatherData={popupActivity.weatherData}
    score={popupActivity.score}
    dayTimestamp={popupActivity.dayTimestamp} // Use the direct timestamp property
    coastalLocation={coastalLocation}
    homeLocation={homeLocation}
    pollen={popupActivity.pollen}
    airQuality={popupActivity.airQuality}
    onClose={() => setPopupActivity(null)}
  />
)}
      <Footer />
    </> /* End of fragment */
  ); // End of return
} // End of Home component

function getWeatherDay(day: WeatherForecastDay) {
  return {
    temperature: day.temperature,
    tempMax: day.tempMax,
    tempMin: day.tempMin,
    condition: day.condition,
    description: day.description,
    icon: day.icon,
    precipitation: day.rain,
    windSpeed: day.wind_speed, // Already in m/s from OpenWeather
    windDir: day.wind_direction,
    humidity: day.humidity,
    visibility: day.visibility,
    clouds: day.clouds,
    // Add more OpenWeather fields as needed
  };
}
