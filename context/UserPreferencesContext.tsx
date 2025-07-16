import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { activityTypes } from '../data/activityTypes';

interface EventPreferences {
  sport: boolean;
  music: boolean;
  arts: boolean;
  musicCategories: string[];
  artsCategories: string[];
  sportsCategories: string[];
}

interface Preferences {
  location: { name: string; lat?: number; lon?: number };
  interests: string[];
  forecast?: any[];
  category?: string;
  genre?: string;
  eventPreferences?: EventPreferences;
}

const defaultEventPreferences: EventPreferences = {
  sport: false,
  music: false,
  arts: false,
  musicCategories: [],
  artsCategories: [],
  sportsCategories: [],
};

const defaultPreferences: Preferences = {
  location: { name: 'Colunga, Asturias' },
  interests: [],
  forecast: [],
  category: 'Music',
  genre: '',
  eventPreferences: defaultEventPreferences,
};

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

      // Validate interests dynamically against all supported activity IDs
      const validIds = new Set(activityTypes.map(a => a.id));
      parsed.interests = Array.isArray(parsed.interests)
        ? parsed.interests.filter((id: string) => validIds.has(id))
        : [];

      // --- Event Preferences Migration & Validation (for Eventbrite) ---
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
      return parsed;
    } catch (e) {
      console.warn('Failed to parse preferences from localStorage, using defaults.', e);
      return defaultPreferences;
    }
  });

  // Auto-detect location if not set
  useEffect(() => {
    if (
      (!preferences.location.lat || !preferences.location.lon) &&
      typeof window !== "undefined" &&
      navigator.geolocation
    ) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPreferences(prev => ({
            ...prev,
            location: {
              name: 'Current Location',
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            },
          }));
        },
        (err) => {
          console.warn('Geolocation failed or denied', err);
          setPreferences(prev => ({
            ...prev,
            location: {
              name: 'Colunga, Asturias',
              lat: 43.4667,
              lon: -5.45,
            },
          }));
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist preferences on every change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferences', JSON.stringify(preferences));
    }
  }, [preferences]);

  // Weather forecast fetcher
  const fetchForecast = async () => {
    if (!preferences.location.lat || !preferences.location.lon) return;

    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
    if (!apiKey) {
      console.warn('OpenWeather API key is missing');
      return;
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${preferences.location.lat}&lon=${preferences.location.lon}&appid=${apiKey}&units=metric`;

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
