import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { activityTypes } from '../data/activityTypes';

interface Preferences {
  location: { name: string; lat?: number; lon?: number };
  interests: string[];
  forecast?: any[];
}

const defaultPreferences: Preferences = {
  location: { name: '' },
  interests: [],
  forecast: [],
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
    const parsed = JSON.parse(stored);
    const validActivityIds = new Set([
      'dog_walking',
      'outdoor_gardening',
      'going_to_pub',
      'surfing',
      'kayaking',
      'photography',
      'bbq',
      'camping',
      'fly_fishing_freshwater',
      'diy',
      'canoeing',
      'urban_exploring',
    ]);
    parsed.interests = parsed.interests.filter((id: string) => validActivityIds.has(id));
    return parsed;
  });

  // Try to set location dynamically if missing
  useEffect(() => {
    if ((!preferences.location.lat || !preferences.location.lon) && typeof window !== "undefined" && navigator.geolocation) {
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
              name: 'Berlin, Germany',
              lat: 52.52,
              lon: 13.405,
            },
          }));
        }
      );
    }
  // Only run on mount and if lat/lon not set
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('preferences', JSON.stringify(preferences));
  }, [preferences]);

  const fetchForecast = async () => {
    if (!preferences.location.lat || !preferences.location.lon) return;

    const apiKey = import.meta.env.VITE_OPENWEATHER_KEY;
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${preferences.location.lat}&lon=${preferences.location.lon}&appid=${apiKey}&units=metric`;

    const res = await fetch(url);
    const data = await res.json();

    const byDay: any[] = [];

    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayStr = date.toISOString().split('T')[0];
      const daySlots = data.list.filter((entry: any) => entry.dt_txt.startsWith(dayStr));

      const slots = {
        date: dayStr,
        morning: daySlots.filter((e: any) => parseInt(e.dt_txt.slice(11, 13)) >= 6 && parseInt(e.dt_txt.slice(11, 13)) < 12)[0],
        afternoon: daySlots.filter((e: any) => parseInt(e.dt_txt.slice(11, 13)) >= 12 && parseInt(e.dt_txt.slice(11, 13)) < 18)[0],
        night: daySlots.filter((e: any) => parseInt(e.dt_txt.slice(11, 13)) >= 18 || parseInt(e.dt_txt.slice(11, 13)) < 6)[0],
      };

      byDay.push(slots);
    }

    setPreferences(prev => ({
      ...prev,
      forecast: byDay,
    }));
  };

  return (
    <UserPreferencesContext.Provider value={{ preferences, setPreferences, fetchForecast }}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export { UserPreferencesContext };