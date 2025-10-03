import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
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
type LocationLite = { name: string; lat: number; lon: number; type?: 'home'|'coastal' };

import type { GetServerSideProps, GetServerSidePropsContext } from 'next';

import Popup from '../components/Popup';
import { buildReasons } from '../utils/activityHelpers';
import { getActivityMessage } from '../data/activityMessages';
import { getOptimizedImageSrc, isImageOptimized } from '../data/bgMapOptimized';

// Default activities for new users
const DEFAULT_ACTIVITIES = [
  'hiking',
  'road_cycling',
  'running',
  'park_visiting',
  'picnicking',
  'dog_walking',
  'football_soccer',
  'urban_exploring',
  'cafe',
  'shopping',
  'cinema',
  'reading'
];

export const getServerSideProps: GetServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const { query } = ctx;
  const code = typeof query.code === 'string' ? query.code : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;

  if (code || type === 'recovery') {
    const params = new URLSearchParams();
    if (code) params.set('code', code);
    if (type) params.set('type', type);
    
    // Check if this is a findr-related flow
    const isFindrFlow = ctx.query.app === 'findr' || 
                       ctx.req.headers.host?.includes('fishfindr.eu');
    
    const destination = isFindrFlow 
      ? `/findr/magic-link${params.toString() ? `?${params.toString()}` : ''}`
      : `/auth/callback${params.toString() ? `?${params.toString()}` : ''}`;
    
    return {
      redirect: {
        destination,
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

// Detect user location with mobile geolocation, Geo IP, and London fallback
async function detectUserLocation(): Promise<LocationLite> {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
  // Try native geolocation on mobile
  if (isMobile && 'geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });
      
      console.log('Location detected via GPS');
      return {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        name: "Your Location",
        type: 'home'
      };
    } catch (_error) {
      console.log('Geolocation denied or failed, falling back to Geo IP');
    }
  }
  
  // Fall back to Geo IP
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    console.log('Location detected via Geo IP:', data.city);
    return {
      lat: data.latitude,
      lon: data.longitude,
      name: `${data.city}, ${data.region}`,
      type: 'home'
    };
  } catch (_error) {
    console.log('Geo IP failed, using London as fallback');
    // Final fallback to London
    return {
      lat: 51.5074,
      lon: -0.1278,
      name: "London, UK",
      type: 'home'
    };
  }
}

interface ActivitySuggestion {
  activityId: string;
  score: number;
  evaluation: 'perfect' | 'good' | 'fair' | 'poor' | 'indoor' | 'indoorAlternative';
  reasoning?: string;
  outOfSeason?: boolean;
}

function WindIcon({ windMs, size = 28, alt = 'Wind' }: { windMs: number, size?: number, alt?: string }) {
  const beaufort = getBeaufortNumber(windMs);

  let iconName = '';
  let needsGlow = false;
  
  if (beaufort < 3) {
    iconName = 'windsock.svg';
    needsGlow = false;
  } else if (beaufort <= 12) {
    iconName = `wind-beaufort-${beaufort}.svg`;
    needsGlow = true;
  } else {
    iconName = 'wind.svg';
    needsGlow = false;
  }

  return (
    <Image
      src={`/weather-icons/design/fill/final/${iconName}`}
      alt={alt}
      width={size}
      height={size}
      style={{ 
        verticalAlign: 'middle',
        filter: needsGlow 
          ? 'drop-shadow(0px 0px 3px rgba(255, 255, 255, 0.9)) drop-shadow(0px 0px 1px rgba(255, 255, 255, 1)) drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5))' 
          : 'none',
      }}
      loading="lazy"
    />
  );
}

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
        setMarineError("Marine conditions are temporarily unavailable. We'll show land‑based suggestions for now.");
      }
    };

    if ((coastalLocation?.lat && coastalLocation?.lon) || (homeLocation?.lat && homeLocation?.lon)) {
      fetchMarineData();
    }
  }, [coastalLocation, homeLocation]);

  useEffect(() => {
    if (!weatherData || marineHours.length === 0) return;

    const grouped: Record<string, WeatherWithPollen['list']> = {};
    weatherData.list.forEach((item) => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    });

    const forecast: WeatherForecastDay[] = Object.entries(grouped)
      .slice(0, 5)
      .map(([dateStr, dayEntries], dayIndex) => {
        const isToday = dayIndex === 0;

        let currentEntry;

        if (isToday) {
          const now = new Date();
          const currentHour = now.getHours();

          const sortedByCloseness = [...dayEntries].sort((a, b) => {
            const hourA = new Date(a.dt_txt).getHours();
            const hourB = new Date(b.dt_txt).getHours();
            return Math.abs(hourA - currentHour) - Math.abs(hourB - currentHour);
          });

          currentEntry = sortedByCloseness[0];
          console.log('Today: Using current conditions instead of noon:',
            { time: currentEntry.dt_txt, temp: currentEntry.main.temp });
        } else {
          currentEntry = dayEntries.find((e) => e.dt_txt.includes('12:00:00')) ?? dayEntries[0];
        }

        const allTemps = dayEntries.map(entry => entry.main.temp);
        const minTemp = Math.min(...allTemps);
        const maxTemp = Math.max(...allTemps);

        const marineForDay = marineHours.filter((h) => h.time && h.time.slice(0, 10) === dateStr);

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
          wind_speed: currentEntry.wind.speed,
          wind_direction: currentEntry.wind.deg,
          clouds: currentEntry.clouds.all,
          humidity: currentEntry.main.humidity,
          visibility: currentEntry.visibility ?? 10000,
          waveHeight: undefined,
          waterTemperature: undefined,
          marine: marineForDay,
          pollen: pollenForDate,
          airQuality: airQualityForDate,
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
  const supportedIcons = [
    '01d','01n','02d','02n','03d','03n','04d','04n',
    '09d','09n','10d','10n','11d','11n','13d','13n','50d','50n'
  ];
  if (supportedIcons.includes(iconCode)) {
    return `/weather-icons/design/fill/final/${iconCode}.svg`;
  }
  return '/weather-icons/design/fill/final/na.svg';
}

function getPopupDay(activityId: string, day: WeatherForecastDay) {
  if (MARINE_ACTIVITY_IDS.includes(activityId) && Array.isArray(day.marine)) {
    const dayDate = new Date(day.date * 1000);
    const today = new Date();
    
    const isToday = dayDate.getDate() === today.getDate() &&
                   dayDate.getMonth() === today.getMonth() &&
                   dayDate.getFullYear() === today.getFullYear();
    
    const hour = isToday ? today.getHours() : 12;
    
    const targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;
    
    console.log(`Looking for marine hour with time starting with: ${targetHourIso} (${isToday ? 'today' : 'future day'})`);
    console.log("Marine hours available:", (day.marine as MarineHour[]).map((h: MarineHour) => h.time));
    
    const marineHour = (day.marine as MarineHour[]).find(
      (h) => typeof h.time === 'string' && h.time.startsWith(targetHourIso)
    );
    
    if (marineHour) {
      console.log("Found matching marine hour:", marineHour);
      console.log("Raw Stormglass wind speed (knots):", marineHour.windSpeed?.noaa);
      
      const windSpeedKnots = marineHour.windSpeed?.noaa;
      const windSpeedMps = windSpeedKnots ? knotsToMps(windSpeedKnots) : undefined;
      
      console.log("Converted wind speed (m/s):", windSpeedMps);
      
      return {
        ...day,
        waveHeight: marineHour.waveHeight?.noaa,
        swellHeight: marineHour.swellHeight?.noaa,
        swellPeriod: marineHour.swellPeriod?.noaa,
        waterTemperature: marineHour.waterTemperature?.noaa,
        windSpeed: windSpeedMps,
        swellDir: marineHour.swellDirection?.noaa,
        gust: marineHour.windGust?.noaa ? knotsToMps(marineHour.windGust.noaa) : undefined,
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
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location.href);
    const qs = url.search;
    const hash = url.hash || '';
    const code = url.searchParams.get('code');
    const type = url.searchParams.get('type');
    const hasOauthFragment = /(?:^#|&)(access_token|refresh_token|provider_token|expires_in|token_type)=/i.test(hash);

    if (code || type === 'recovery' || hasOauthFragment) {
      // Check if this is a findr-related flow
      const isFindrFlow = url.searchParams.get('app') === 'findr' || 
                          window.location.host.includes('fishfindr.eu');
      
      if (isFindrFlow) {
        window.location.replace(`/findr/magic-link${qs}${hash}`);
      } else {
        window.location.replace(`/auth/callback${qs}${hash}`);
      }
    }
  }, []);

  const { preferences, setPreferences } = useUserPreferences();
  const interests = preferences.interests ?? [];
  
  // Handle fishfindr.eu redirect for first-time users
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isFindrDomain = window.location.origin.includes('fishfindr.eu');
    if (isFindrDomain && interests.length === 0) {
      router.push('/findr');
      return;
    }
  }, [interests.length, router]);
  
  const [showHomeDialog, setShowHomeDialog] = useState(false);
  const [showCoastDialog, setShowCoastDialog] = useState(false);
  
  const hasMounted = useHasMounted();
  const [popupActivity, setPopupActivity] = useState<ReturnType<typeof buildPopupActivityPayload> | null>(null);

  const homeLocation = preferences.locations?.find((loc) => loc.type === 'home');
  const coastalLocation = preferences.locations?.find((loc) => loc.type === 'coastal');
  
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

  // Initialize app for first-time users
  useEffect(() => {
    const initializeApp = async () => {
      // Check if user already has preferences
      if (interests.length === 0 && !homeLocation) {
        console.log('First-time user detected, initializing defaults...');
        
        // Set default activities
        setPreferences(prev => ({
          ...prev,
          interests: DEFAULT_ACTIVITIES
        }));
        
        // Detect and set location
        try {
          const detectedLocation = await detectUserLocation();
          setHomeLocation(detectedLocation);
          console.log('Location detected:', detectedLocation.name);
        } catch (error) {
          console.error('Failed to detect location:', error);
        }
      }
    };
    
    initializeApp();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const usedHeroActivities = new Set<string>();

  const { forecastByDay, loading, error, marineHours, weatherData, marineError } = useFetchForecastData(
    homeLocation,
    coastalLocation,
    interests
  );

  function buildForecastFromOneCall(weatherData: WeatherWithPollen): WeatherForecastDay[] {
    if (!weatherData?.daily) return [];
    return weatherData.daily.slice(0, 5).map((day) => {
      return {
        date: day.dt,
        temperature: Math.round(day.temp.day),
        tempMax: Math.round(day.temp.max),
        tempMin: Math.round(day.temp.min),
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

  const useOneCall = weatherData && weatherData.daily;
  const forecastDays = useOneCall ? buildForecastFromOneCall(weatherData) : forecastByDay;

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

  let filteredActivitiesBase = activityTypes.filter((a) => sanitizedInterests.includes(a.id));
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

  useEffect(() => {
    console.log('Forecast by day:', forecastByDay);
  }, [forecastByDay]);

  console.log('marineHours before building forecast:', marineHours);

  if (!hasMounted) {
    return <div>Loading...</div>;
  }

  if (loading) {
    return <div>Loading your smart recommendations...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Show hint for new users who haven't customized yet
  const showHint = interests.length === DEFAULT_ACTIVITIES.length && 
                   interests.every(id => DEFAULT_ACTIVITIES.includes(id));

  return (
    <>
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

      {showHint && (
        <div className="alert alert-info mx-4 my-2 shadow-sm">
          <div className="flex-1">
            <span>We&apos;ve set up some popular activities for you. Tap <strong>Set activities</strong> below to personalize your list!</span>
          </div>
          <button 
            className="btn btn-sm btn-ghost"
            onClick={() => router.push('/interests')}
          >
            Customize now
          </button>
        </div>
      )}

      {marineError ? (
        <div className="alert alert-warning mx-4 my-2">
          <span>{marineError}</span>
        </div>
      ) : null}

      <div className="main-grid">
        {heroDataByDay.map(({ day, heroActivity, alsoGoodPerfect, suggestions, dayLabel }) => {
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

                {heroActivity && (() => {
                  const { activityId, score } = heroActivity;
                  const activity = activityTypes.find((a) => a.id === activityId);
                  const emoji = getActivityEmoji(activityId) || '❓';
                  const scoreInfo = getScoreCategory(score || 0);
                  const isOutdoorActivity = isOutdoor(activityId);
                  const activityMessage = getActivityMessage(activityId, scoreInfo.label.toLowerCase() as "perfect" | "good" | "fair" | "poor", []);

                  const dayDate = new Date(day.date * 1000);
                  const today = new Date();
                  const isToday = dayDate.getDate() === today.getDate() && 
                                  dayDate.getMonth() === today.getMonth() && 
                                  dayDate.getFullYear() === today.getFullYear();

                  const hour = isToday ? today.getHours() : 12;
                  const _targetHourIso = `${dayDate.toISOString().slice(0, 10)}T${hour.toString().padStart(2, '0')}`;

                  const _isMarineActivity = MARINE_ACTIVITY_IDS.includes(heroActivity.activityId);
                  const marinePopupDay = getPopupDay(heroActivity.activityId, day);
                  const _weatherPopupDay = getWeatherDay(day);

                  const popupPayload = buildPopupActivityPayload({
                    activityId: heroActivity.activityId,
                    score: heroActivity.score,
                    day: marinePopupDay,
                    reasons: buildReasons(day, heroActivity.activityId),
                  });

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

                <div className="activity-suggestions">
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

                  {(() => {
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
                </div>
                
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

          return dayCard;
        })}
      </div>

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
          dayTimestamp={popupActivity.dayTimestamp}
          coastalLocation={coastalLocation}
          homeLocation={homeLocation}
          pollen={popupActivity.pollen}
          airQuality={popupActivity.airQuality}
          onClose={() => setPopupActivity(null)}
        />
      )}
      <Footer />
    </>
  );
}

function getWeatherDay(day: WeatherForecastDay) {
  return {
    temperature: day.temperature,
    tempMax: day.tempMax,
    tempMin: day.tempMin,
    condition: day.condition,
    description: day.description,
    icon: day.icon,
    precipitation: day.rain,
    windSpeed: day.wind_speed,
    windDir: day.wind_direction,
    humidity: day.humidity,
    visibility: day.visibility,
    clouds: day.clouds,
  };
}