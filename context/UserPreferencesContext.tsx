import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { activityTypes } from '../data/activityTypes';

// --- Types ---
type LocationType = 'home' | 'coastal';

interface Location {
  name: string;
  lat: number;
  lon: number;
  type?: LocationType;
}

interface EventPreferences {
  sport: boolean;
  music: boolean;
  arts: boolean;
  musicCategories: string[];
  artsCategories: string[];
  sportsCategories: string[];
}

// Minimal OpenWeather 3-hour forecast entry
interface ForecastEntry {
  dt_txt: string; // e.g. "2025-09-19 12:00:00"
  // retain other properties without using any
  [key: string]: unknown;
}

interface ForecastSlots {
  date: string; // YYYY-MM-DD
  morning?: ForecastEntry;
  afternoon?: ForecastEntry;
  night?: ForecastEntry;
}

interface OpenWeatherForecastResponse {
  list: ForecastEntry[];
}

interface Preferences {
  locations: Location[];           // Now supports multiple locations!
  interests: string[];
  forecast?: ForecastSlots[];
  category?: string;
  genre?: string;
  eventPreferences?: EventPreferences;
}

// --- Constants ---
const waterActivityIds = [
  'kayaking', 'canoeing', 'surfing', 'stand_up_paddleboarding', 'snorkeling',
  'swimming', 'sea_fishing_shore', 'sea_fishing_boat'
];

const DEFAULT_HOME_LOCATION: Location = {
  name: "Colunga, Asturias",
  lat: 43.4667,
  lon: -5.45,
  type: 'home',
};

const DEFAULT_COASTAL_LOCATION: Location = {
  name: "Playa de La Griega", // You can customize for your region!
  lat: 43.4898,
  lon: -5.2716,
  type: 'coastal',
};

const defaultEventPreferences: EventPreferences = {
  sport: false,
  music: false,
  arts: false,
  musicCategories: [],
  artsCategories: [],
  sportsCategories: [],
};

const defaultPreferences: Preferences = {
  locations: [DEFAULT_HOME_LOCATION],
  interests: [],
  forecast: [],
  category: 'Music',
  genre: '',
  eventPreferences: { ...defaultEventPreferences },
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

function normalisePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') {
    return { ...defaultPreferences };
  }

  const parsed = value as Partial<Preferences>;
  const validIds = new Set(activityTypes.map(a => a.id));
  const interests = Array.isArray(parsed.interests)
    ? parsed.interests.filter((id): id is string => typeof id === 'string' && validIds.has(id))
    : [];

  const rawLocations = Array.isArray(parsed.locations) ? parsed.locations : [];
  const locations: Location[] = rawLocations
    .map((loc) => {
      if (!loc || typeof loc !== 'object') return null;
      const { name, lat, lon, type } = loc as Location;
      const latNum = Number(lat);
      const lonNum = Number(lon);
      if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;
      return {
        name: typeof name === 'string' && name.trim() ? name : 'Saved place',
        lat: latNum,
        lon: lonNum,
        type: type === 'coastal' ? 'coastal' : 'home',
      } as Location;
    })
    .filter((loc): loc is Location => !!loc);

  const forecast = Array.isArray(parsed.forecast) ? parsed.forecast : [];

  const rawEventPreferences = parsed.eventPreferences && typeof parsed.eventPreferences === 'object'
    ? parsed.eventPreferences as Partial<EventPreferences>
    : undefined;

  const eventPreferences: EventPreferences = rawEventPreferences
    ? {
        sport: !!rawEventPreferences.sport,
        music: !!rawEventPreferences.music,
        arts: !!rawEventPreferences.arts,
        musicCategories: toStringArray(rawEventPreferences.musicCategories),
        artsCategories: toStringArray(rawEventPreferences.artsCategories),
        sportsCategories: toStringArray(rawEventPreferences.sportsCategories),
      }
    : { ...defaultEventPreferences };

  const base: Preferences = {
    locations: locations.length ? locations : [DEFAULT_HOME_LOCATION],
    interests,
    forecast,
    category: typeof parsed.category === 'string' ? parsed.category : 'Music',
    genre: typeof parsed.genre === 'string' ? parsed.genre : '',
    eventPreferences,
  };

  return base;
}

function loadPreferencesFromStorage(): Preferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('preferences');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as unknown;
    return normalisePreferences(parsed);
  } catch (err) {
    console.warn('Failed to load preferences from storage', err);
    return null;
  }
}

// --- Context/Provider ---
interface UserPreferencesContextType {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  fetchForecast: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Lazy-load preferences synchronously on first render (client only)
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    return loadPreferencesFromStorage() ?? defaultPreferences;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => {
      const stored = loadPreferencesFromStorage();
      if (!stored) return;
      setPreferences((prev) => {
        const sameInterests = prev.interests.length === stored.interests.length && prev.interests.every((id, idx) => id === stored.interests[idx]);
        const sameLocations = prev.locations.length === stored.locations.length && prev.locations.every((loc, idx) => {
          const other = stored.locations[idx];
          if (!other) return false;
          return (
            loc.type === other.type &&
            loc.name === other.name &&
            Number(loc.lat).toFixed(4) === Number(other.lat).toFixed(4) &&
            Number(loc.lon).toFixed(4) === Number(other.lon).toFixed(4)
          );
        });
        if (sameInterests && sameLocations) return prev;
        return { ...prev, ...stored };
      });
    };

    // Hydrate immediately after mount
    syncFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'preferences') {
        syncFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // --- Auto-detect home location if not set ---
  useEffect(() => {
    const hasHome = preferences.locations.some(l => l.type === 'home');
    if (!hasHome && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPreferences(prev => ({
            ...prev,
            locations: [
              ...prev.locations.filter(l => l.type !== 'home'),
              {
                name: 'Current Location',
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                type: 'home'
              }
            ]
          }));
        },
        () => {
          // fallback, set to default home location
          setPreferences(prev => ({
            ...prev,
            locations: [
              ...prev.locations.filter(l => l.type !== 'home'),
              DEFAULT_HOME_LOCATION
            ]
          }));
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Watch for water activities, auto-add coastal location if needed ---
  useEffect(() => {
    const wantsCoastal = preferences.interests.some(id => waterActivityIds.includes(id));
    const hasCoastal = preferences.locations.some(l => l.type === 'coastal');
    if (wantsCoastal && !hasCoastal) {
      setPreferences(prev => ({
        ...prev,
        locations: [...prev.locations, DEFAULT_COASTAL_LOCATION]
      }));
    }
    // Optional: You might want to remove the coastal location if no more water activities
    // else if (!wantsCoastal && hasCoastal) {
    //   setPreferences(prev => ({
    //     ...prev,
    //     locations: prev.locations.filter(l => l.type !== 'coastal')
    //   }));
    // }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.interests]);

  // --- Persist preferences to localStorage with debounce ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('preferences', JSON.stringify(preferences));
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [preferences]);

  // --- Weather forecast fetcher (fetches for home location) ---
  const fetchForecast = async () => {
    const home = preferences.locations.find(l => l.type === 'home');
    if (!home?.lat || !home.lon) return;

    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!apiKey) {
      console.warn('OpenWeather API key is missing');
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${home.lat}&lon=${home.lon}&appid=${apiKey}&units=metric`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('Failed to fetch forecast:', res.statusText);
        return;
      }
      const data: OpenWeatherForecastResponse = await res.json();

      // Structure forecast by day/slot (morning, afternoon, night)
      const byDay: ForecastSlots[] = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayStr = date.toISOString().split('T')[0];
        const daySlots = data.list.filter((entry: ForecastEntry) => entry.dt_txt.startsWith(dayStr));
        const slots: ForecastSlots = {
          date: dayStr,
          morning: daySlots.find((e: ForecastEntry) => {
            const hour = parseInt(e.dt_txt.slice(11, 13), 10);
            return hour >= 6 && hour < 12;
          }),
          afternoon: daySlots.find((e: ForecastEntry) => {
            const hour = parseInt(e.dt_txt.slice(11, 13), 10);
            return hour >= 12 && hour < 18;
          }),
          night: daySlots.find((e: ForecastEntry) => {
            const hour = parseInt(e.dt_txt.slice(11, 13), 10);
            return hour >= 18 || hour < 6;
          }),
        };
        byDay.push(slots);
      }
      setPreferences(prev => ({
        ...prev,
        forecast: byDay,
      }));
    } catch (error) {
      console.warn('Error fetching forecast:', error);
    }
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, setPreferences, fetchForecast }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (!context) throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  return context;
};

export { UserPreferencesContext };
