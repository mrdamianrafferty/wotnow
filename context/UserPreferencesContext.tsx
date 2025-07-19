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

interface Preferences {
  locations: Location[];           // Now supports multiple locations!
  interests: string[];
  forecast?: any[];
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
  eventPreferences: defaultEventPreferences,
};

// --- Context/Provider ---
interface UserPreferencesContextType {
  preferences: Preferences;
  setPreferences: React.Dispatch<React.SetStateAction<Preferences>>;
  fetchForecast: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const UserPreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === 'undefined') {
      return defaultPreferences;
    }
    const stored = localStorage.getItem('preferences');
    if (!stored) return defaultPreferences;
    try {
      const parsed = JSON.parse(stored);

      // --- Interests validation
      const validIds = new Set(activityTypes.map(a => a.id));
      parsed.interests = Array.isArray(parsed.interests)
        ? parsed.interests.filter((id: string) => validIds.has(id))
        : [];

      // --- Event Preferences validation
      if (!parsed.eventPreferences || typeof parsed.eventPreferences !== 'object') {
        parsed.eventPreferences = { ...defaultEventPreferences };
      } else {
        const ep = parsed.eventPreferences;
        parsed.eventPreferences = {
          sport: !!ep.sport,
          music: !!ep.music,
          arts: !!ep.arts,
          musicCategories: Array.isArray(ep.musicCategories) ? ep.musicCategories : [],
          artsCategories: Array.isArray(ep.artsCategories) ? ep.artsCategories : [],
          sportsCategories: Array.isArray(ep.sportsCategories) ? ep.sportsCategories : [],
        };
      }

      // --- Locations validation
      parsed.locations = Array.isArray(parsed.locations) && parsed.locations.length > 0
        ? parsed.locations
        : [DEFAULT_HOME_LOCATION];

      return parsed;
    } catch (e) {
      console.warn('Failed to parse preferences from localStorage, using defaults.', e);
      return defaultPreferences;
    }
  });

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

  // --- Persist preferences to localStorage ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferences', JSON.stringify(preferences));
    }
  }, [preferences]);

  // --- Weather forecast fetcher (fetches for home location) ---
  const fetchForecast = async () => {
    const home = preferences.locations.find(l => l.type === 'home');
    if (!home?.lat || !home.lon) return;

    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
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
      const data = await res.json();

      // Structure forecast by day/slot (morning, afternoon, night)
      const byDay: any[] = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayStr = date.toISOString().split('T')[0];
        const daySlots = data.list.filter((entry: any) => entry.dt_txt.startsWith(dayStr));
        const slots = {
          date: dayStr,
          morning: daySlots.find((e: any) => {
            const hour = parseInt(e.dt_txt.slice(11, 13));
            return hour >= 6 && hour < 12;
          }),
          afternoon: daySlots.find((e: any) => {
            const hour = parseInt(e.dt_txt.slice(11, 13));
            return hour >= 12 && hour < 18;
          }),
          night: daySlots.find((e: any) => {
            const hour = parseInt(e.dt_txt.slice(11, 13));
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
