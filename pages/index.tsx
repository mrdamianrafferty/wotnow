import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { activityTypes } from '../data/activityTypes';
import { WeatherForecastDay } from '../types/weatherTypes';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { getActivityEmoji } from '../data/emojiMap';
import { resolveSpeciesImage, type CardData } from '../lib/findr/mapPrediction';
import FishSpeciesModal from '../components/findr/FishSpeciesModal';
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
import { useUIText } from '../hooks/useUIText';
import SEO from '../components/SEO';
type LocationLite = { name: string; lat: number; lon: number; type?: 'home'|'coastal' };

import type { GetServerSideProps, GetServerSidePropsContext } from 'next';

import {
  getWindMessage as _getWindMessage,
} from '../utils/weatherLabels';
import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers'; // Adjust the path based on your project structure
import { getActivityMessage } from '../data/activityMessages';
import { WeatherData } from '../types/weatherData';
import AstronomyCard from '../components/AstronomyCard';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';
import BottomNav from '../components/BottomNav';

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
    main: { temp: number; humidity: number };
    weather: Array<{ main: string; description: string; icon: string }>;
    rain?: { '3h'?: number };
    wind: { speed: number; deg: number };
    clouds: { all: number };
    visibility?: number;
  }>;
  pollenByDate?: Record<string, PollenReading>;
  airQualityByDate?: Record<string, AirQualityReading>;
  daily?: OneCallDaily[];
  current?: { visibility?: number };
};

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

    if (!weatherData?.list || marineHours.length === 0) return;

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
          console.log('Today: Using current conditions instead of noon:',
            { time: currentEntry.dt_txt, temp: currentEntry.main.temp });
        } else {
          // For future days, use noon as before
          currentEntry = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
        }

        // Calculate true min and max temps across all hours of the day
        const allTemps = dayEntries.map(entry => entry.main.temp);
        const minTemp = Math.min(...allTemps);
        const maxTemp = Math.max(...allTemps);

        const marineForDay = marineHours.filter((h) => h.time && h.time.slice(0, 10) === dateStr);

        // Get pollen and air quality data for this date
        const pollenForDate = weatherData.pollenByDate?.[dateStr];
        const airQualityForDate = weatherData.airQualityByDate?.[dateStr];

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
        };
      });

    setForecastByDay(forecast);
  }, [weatherData, marineHours]);

  return { forecastByDay, loading, error, marineHours, weatherData, marineError };
};

const _hasMarineInterest = (interests: string[]) =>
  interests.some((id) => MARINE_ACTIVITY_IDS.includes(id));

const getDayLabel = (dateNum: number, idx: number, todayText: string, serverTime?: Date) => {
  const date = new Date(dateNum * 1000);
  const today = serverTime || new Date();
  const isSameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  return isSameDay ? todayText : date.toLocaleDateString('en-GB', { weekday: 'long' });
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
    
    console.log(`Looking for marine hour with time starting with: ${targetHourIso} (${isToday ? 'today' : 'future day'})`);
    console.log("Marine hours available:", (day.marine as MarineHour[]).map((h: MarineHour) => h.time));
    
    const marineHour = (day.marine as MarineHour[]).find(
      (h) => typeof h.time === 'string' && h.time.startsWith(targetHourIso)
    );
    
    if (marineHour) {
      console.log("Found matching marine hour:", marineHour);
      console.log("Raw Stormglass wind speed (knots):", marineHour.windSpeed?.noaa);
      
      // Convert Stormglass wind speed from knots to m/s for internal consistency
      const windSpeedKnots = marineHour.windSpeed?.noaa;
      const windSpeedMps = windSpeedKnots ? knotsToMps(windSpeedKnots) : undefined;
      
      console.log("Converted wind speed (m/s):", windSpeedMps);
      
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
      console.log("No matching marine hour found");
    }
  }
  return day;
}
// Consistent helper function you can reuse
const _getTargetHourForDay = (dayUnixTimestamp: number): string => {
  const dayDate = new Date(dayUnixTimestamp * 1000);
  const today = new Date();
  const isToday = dayDate.getDate() === today.getDate() && 
                  dayDate.getMonth() === today.getMonth() && 
                  dayDate.getFullYear() === today.getFullYear();
  
  const hour = isToday ? today.getHours() : 12;
  return `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
};

export default function Home() {
  // Fish species modal state (for hero/favourites)
  const [fishModalOpen, setFishModalOpen] = useState(false);
  const [fishModalCard, setFishModalCard] = useState<CardData | null>(null);
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
  const interests = preferences.interests ?? [];
  
  // Add these missing state variables
const [showHomeDialog, setShowHomeDialog] = useState(false);
const [showCoastDialog, setShowCoastDialog] = useState(false);
  
  // Your existing state
  const hasMounted = useHasMounted();
  const [popupActivity, setPopupActivity] = useState<ReturnType<typeof buildPopupActivityPayload> | null>(null);


  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  
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

  const isFirstTimeUser = interests.length === 0;
  const needsLocation = !homeLocation?.lat || !homeLocation?.lon;
  const usedHeroActivities = new Set<string>();

const { forecastByDay, loading, error, marineHours, weatherData, marineError } = useFetchForecastData(
  homeLocation,
  coastalLocation,
  interests
);

  // Translation hooks
  const marineErrorText = useUIText('index.nav.marine_conditions_are_temporar_4',
    "Marine conditions are temporarily unavailable. We'll show land‑based suggestions for now.");
  const needsLocationText = useUIText('index.paragraph.please_set_your_home_location__5',
    'Please set your home location to see suggestions.');
  const noActivitiesTitle = useUIText('index.heading.no_activities_selected_7',
    'No Activities Selected');
  const noActivitiesText = useUIText('index.paragraph.choose_your_outdoor_interests',
    'Choose your outdoor interests to see personalised activity recommendations based on the weather.');
  const chooseActivitiesButton = useUIText('index.button.choose_activities',
    'Choose Activities');
  const loadingRecommendations = useUIText('index.paragraph.loading_your_smart_recommendat_8',
    'Loading your smart recommendations...');
  const errorPrefix = useUIText('index.label.error', 'Error');
  const pickHomeLocation = useUIText('index.label.pick_your_home_location_9',
    'Pick your home location');
  const todayLabel = useUIText('index.label.today', 'Today');
  const initialLoadingText = useUIText('index.paragraph.loading', 'Loading...');
  const alsoPerfectToday = useUIText('index.heading._also_perfect_today_11',
    '💯 Also Perfect Today');
  const goodOptionsToday = useUIText('index.heading._good_options_today_12',
    '👍 Good Options Today');
  const stayingIndoors = useUIText('index.heading._staying_indoors__13',
    '👺 Staying Indoors?');
  const moreActivitiesButton = useUIText('index.button.more_activities',
    '+ More activities');
  const allMyActivitiesButton = useUIText('index.button.all_my_activities',
    '👀 All my activities');

// Helper: Build forecastByDay from One Call 3.0 if available
function buildForecastFromOneCall(weatherData: WeatherWithPollen): WeatherForecastDay[] {
  if (!weatherData?.daily) return [];
  return weatherData.daily
    .slice(0, 8)
    // Filter out days with missing temperature data
    .filter(day => day.temp && typeof day.temp.day === 'number')
    .map((day) => {
      return {
        date: day.dt,
        temperature: Math.round(day.temp.day),
        tempMax: Math.round(day.temp.max ?? day.temp.day),
        tempMin: Math.round(day.temp.min ?? day.temp.day),
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
      };
    });
}



  // Use One Call 3.0 if available, else fallback to old format
  const useOneCall = weatherData && weatherData.daily;
  const forecastDays = useOneCall ? buildForecastFromOneCall(weatherData) : forecastByDay;

  // Normalize and sanitize interests to avoid mismatches (e.g., stray whitespace)
  const normalizedInterests = Array.isArray(interests)
    ? interests.map((s) => String(s).trim())
    : [];
  const validActivityIds = new Set(activityTypes.map((a) => a.id));
  const sanitizedInterests = normalizedInterests.filter((id) => validActivityIds.has(id));
  
  console.log('🔍 Interest filtering:', {
    rawInterests: interests,
    normalizedInterests,
    sanitizedInterests,
    validActivityCount: validActivityIds.size
  });

  // Use a single filtered list for all days
  let filteredActivitiesBase = activityTypes.filter((a) => sanitizedInterests.includes(a.id));
  // Safety fallback: if user has interests but none match (e.g., legacy IDs), try soft match by prefix
  if (sanitizedInterests.length > 0 && filteredActivitiesBase.length === 0) {
    const interestSet = new Set(sanitizedInterests);
    filteredActivitiesBase = activityTypes.filter((a) => interestSet.has(a.id) || interestSet.has(a.id.replace(/_/g, '-')));
  }

  const heroDataByDay = forecastDays.map((day, idx) => {
    const filteredActivities = filteredActivitiesBase;
    console.log(`🌤️ Processing day ${idx} (${new Date(day.date * 1000).toDateString()}):`, {
      dayData: { temp: day.temperature, rain: day.rain, wind: day.wind_speed, clouds: day.clouds },
      filteredActivitiesCount: filteredActivities.length,
      interests: sanitizedInterests
    });

    // ✅ CORRECT: Use the original getSuggestionsByDay structure
    const suggestionsData = getSuggestionsByDay({
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
          swellPeriod: day.swellPeriod
        }
      }],
      activities: filteredActivities,
      interests: sanitizedInterests,
      now: new Date(day.date * 1000),
    });
    // getSuggestionsByDay returns an array of day objects, we want the first (and only) day
    const dayResults = suggestionsData?.[0];
    const suggestions: ActivitySuggestion[] = (dayResults?.suggestions ?? []) as ActivitySuggestion[];
    const currentMonth = new Date(day.date * 1000).getMonth() + 1;
    const filteredSuggestions = suggestions.filter((suggestion: ActivitySuggestion) => {
      const activity = activityTypes.find(a => a.id === suggestion.activityId);
      return !activity?.seasonalMonths || activity.seasonalMonths.includes(currentMonth);
    });
    
    console.log(`🗓️ Day ${idx} seasonal filtering:`, {
      currentMonth,
      totalSuggestions: suggestions.length,
      filteredCount: filteredSuggestions.length,
      sampleActivity: suggestions[0] ? {
        id: suggestions[0].activityId,
        seasonalMonths: activityTypes.find(a => a.id === suggestions[0].activityId)?.seasonalMonths
      } : 'none'
    });
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
    const heroActivity = selectHeroActivity(heroCompatibleSuggestions);
    console.log(`🎯 Day ${idx} hero selection:`, {
      filteredSuggestionsCount: filteredSuggestions.length,
      topSuggestions: filteredSuggestions.slice(0, 3).map(s => ({ id: s.activityId, score: s.score })),
      selectedHero: heroActivity ? { id: heroActivity.activityId, score: heroActivity.score } : null
    });

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
      dayLabel: getDayLabel(day.date, idx, todayLabel)
    };
  });


  useEffect(() => {
    console.log('Forecast by day:', forecastByDay);
  }, [forecastByDay]);

  console.log('marineHours before building forecast:', marineHours);

  if (!hasMounted) {
    return <div>{initialLoadingText}</div>;
  }

  if (needsLocation) {
    return <div>{needsLocationText}</div>;
  }

  if (isFirstTimeUser) {
    return (
      <div style={{
        textAlign: 'center' as const,
        padding: '3rem',
        background: '#fefbf2',
        borderRadius: '8px',
        border: '1px solid #fed7aa',
        margin: '2rem'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
        <h2 style={{ color: '#d97706', marginBottom: '0.5rem' }}>{noActivitiesTitle}</h2>
        <p style={{ color: '#92400e' }}>
          {noActivitiesText}
        </p>
        <Link
          href="/interests"
          style={{
            display: 'inline-block',
            marginTop: '1rem',
            padding: '12px 24px',
            background: '#d97706',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '1.1rem'
          }}
        >
          {chooseActivitiesButton}
        </Link>
      </div>
    );
  }

  if (loading) {
    return <div>{loadingRecommendations}</div>;
  }

  if (error) {
    return <div>{errorPrefix}: {error}</div>;
  }

  // MAIN RETURN - Enhanced version preserving all your functionality
  return (
    <>
      <SEO
        title="Weather-Based Activity Recommendations"
        description="Get personalized outdoor activity suggestions based on real-time weather conditions. Perfect for planning your day in the UK and Europe."
        url="https://godaisy.io"
      />
      {/* Home Location Modal */}
      {showHomeDialog && (
        <CoastalLocationDialog
          open={showHomeDialog}
          onClose={() => setShowHomeDialog(false)}
          title={pickHomeLocation}
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
<main role="main">
{marineError ? (
  <div className="alert alert-warning mx-4 my-2">
    <span>{marineErrorText}</span>
  </div>
) : null}
<div className="main-grid">
  {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, suggestionsData: _suggestionsData, dayLabel }, idx) => {
    const _date = new Date(day.date * 1000);
    const _isToday = idx === 0;

    // Always show AstronomyCard for users with stargazing interest after today's card
    const hasStargazing = interests.includes('stargazing');
    // Pass full One Call 3.0 object if available, else pass summary day with nightTemp fallback
    let astronomyWeatherData: WeatherData | undefined;
    if (useOneCall && weatherData && weatherData.daily) {
      astronomyWeatherData = {
        daily: weatherData.daily.map(d => ({
          dt: d.dt,
          temp: d.temp,
          weather: d.weather,
          wind_speed: d.wind_speed,
          wind_deg: d.wind_deg,
          clouds: d.clouds,
          rain: d.rain,
        })),
        current: {
          dt: day.date,
          temp: day.temperature,
          wind_speed: day.wind_speed || 0,
          clouds: day.clouds || 0,
          visibility: day.visibility,
        },
        clouds: day.clouds,
        visibility: day.visibility,
        wind_speed: day.wind_speed,
        rain: day.rain,
        condition: day.condition,
        description: day.description,
      };
    } else {
      // Add nightTemp fallback for summary day object
      astronomyWeatherData = {
        clouds: day.clouds,
        visibility: day.visibility,
        wind_speed: day.wind_speed,
        rain: day.rain,
        condition: day.condition,
        description: day.description,
        nightTemp: typeof day.tempMin === 'number' ? day.tempMin : day.temperature // fallback to temperature if nightTemp missing
      };
    }
    const astronomyCard = idx === 0 && hasStargazing ? (
      <AstronomyCard
        key="astronomy-card"
        weatherData={astronomyWeatherData}
      />
    ) : null;

    const dayCard = (
      <div
        key={day.date}
        className="activity-card-enhanced"
        style={{
          backgroundImage: `url(${heroActivity?.activityId && isImageOptimized(heroActivity.activityId)
            ? getOptimizedImageSrc(heroActivity.activityId, 'webpSmall')
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

            </div>
          </div>

          {/* HERO ACTIVITY */}
          {heroActivity && (() => {
            const { activityId, score } = heroActivity;
            const activity = activityTypes.find((a) => a.id === activityId);
            const scoreInfo = getScoreCategory(score || 0);
            const isOutdoorActivity = isOutdoor(activityId);
            const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase() as "perfect" | "good" | "fair" | "poor", []);

            // Use activity name as species name for fish image lookup
            const fishCommonName: string | undefined = activity?.name;
            const fishImageInfo = fishCommonName ? resolveSpeciesImage(undefined, fishCommonName) : undefined;

            const handleFishClick = () => {
              if (fishCommonName) {
                setFishModalCard({
                  emoji: getActivityEmoji(activityId) || '🐟',
                  commonName: fishCommonName,
                  ...(fishImageInfo && {
                    image: {
                      src: fishImageInfo.image,
                      alt: fishImageInfo.name,
                      mobile: fishImageInfo.mobile ?? null,
                      thumb: fishImageInfo.thumb ?? null,
                    }
                  })
                } as CardData);
                setFishModalOpen(true);
              }
            };

            return (
              <div
                className="card__hero-activity"
                role="button"
                tabIndex={0}
                onClick={fishCommonName ? handleFishClick : undefined}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && fishCommonName) {
                    e.preventDefault();
                    handleFishClick();
                  }
                }}
              >
                <div className="card__hero-icon">
                  {fishImageInfo && fishImageInfo.thumb ? (
                    <Image
                      src={fishImageInfo.thumb}
                      alt={fishCommonName || ''}
                      width={48}
                      height={48}
                      style={{ borderRadius: '50%', cursor: 'pointer' }}
                    />
                  ) : (
                    <span style={{ fontSize: 40, cursor: 'pointer' }}>{getActivityEmoji(activityId) || '🐟'}</span>
                  )}
                </div>
                <div className="card__hero-title">
                  <div className={`card__hero-name ${isOutdoorActivity ? 'outdoor' : ''}`}>{activity?.name || activityId.replace(/_/g, ' ')}</div>
                  <div className="card__hero-message">{activityMessage}</div>
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

      {/* Fish Species Modal (global, not per-card) */}
      <FishSpeciesModal
        open={fishModalOpen}
        card={fishModalCard}
        onClose={() => setFishModalOpen(false)}
      />

          {/* Activity Lists */}
          <div className="activity-suggestions">
            {/* Perfect Activities */}
            {alsoGoodPerfect.length > 0 && (
              <div className="activity-section">
                <h4 className="also-good-title">{alsoPerfectToday}</h4>
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
                  <h4 className="also-good-title">{goodOptionsToday}</h4>
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
      <h4 className="also-good-title">{stayingIndoors}</h4>
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
              {moreActivitiesButton}
            </Link>
            <Link
              href="/activities"
              className="activity-card-btn"
            >
              {allMyActivitiesButton}
            </Link>
          </div>
          
        </div> 
      </div> 
    );

    // Return both the day card and astronomy card if it's the first day
    return (
      <React.Fragment key={`fragment-${day.date}`}>
        {dayCard}
        {astronomyCard}
      </React.Fragment>
    );
  })}
</div> {/* End of main-grid */}
</main>

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
      <BottomNav />
    </> /* End of fragment */
  ); // End of return
} // End of Home component

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
