import { useCallback, useEffect, useRef, useState } from 'react';
import { saveLastLocationToCookie, getLastLocationFromCookie } from '../lib/cookies';

const STORAGE_KEY = 'findrSettings';

interface StoredSettings {
  selectedCode?: string;
  predictionDate?: string;
  language?: string;
}

export interface RectangleLocationDetails {
  rectangleCode: string;
  rectangleRegion: string;
  lat: number;
  lon: number;
}

interface UsePersistentFindrSettingsArgs {
  predictionDate: string;
  language?: string;
}

interface UsePersistentFindrSettingsResult {
  selectedCode: string;
  setSelectedCode: (value: string) => void;
  predictionDate: string;
  setPredictionDate: (value: string) => void;
  language: string;
  setLanguage: (value: string) => void;
  saveLocationToCookie: (details: RectangleLocationDetails) => void;
}

function readStoredSettings(): StoredSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // If no localStorage, check cookie as fallback
      const cookieLocation = getLastLocationFromCookie();
      if (cookieLocation) {
        console.log('[PersistentFindrSettings] Found location in cookie:', cookieLocation.rectangleCode);
        return {
          selectedCode: cookieLocation.rectangleCode,
          predictionDate: undefined,
          language: undefined,
        };
      }
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        selectedCode: typeof parsed.selectedCode === 'string' ? parsed.selectedCode : undefined,
        predictionDate: typeof parsed.predictionDate === 'string' ? parsed.predictionDate : undefined,
        language: typeof parsed.language === 'string' ? parsed.language : undefined,
      };
    }
  } catch (error) {
    console.warn('Unable to read stored Findr settings', error);
  }
  return null;
}

export function usePersistentFindrSettings({
  predictionDate: defaultPredictionDate,
  language: defaultLanguage = 'en',
}: UsePersistentFindrSettingsArgs): UsePersistentFindrSettingsResult {
  const [selectedCode, setSelectedCode] = useState('');
  const [predictionDate, setPredictionDate] = useState(defaultPredictionDate);
  const [language, setLanguage] = useState(defaultLanguage);
  const hasHydrated = useRef(typeof window === 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readStoredSettings();
    if (stored?.selectedCode) {
      setSelectedCode(stored.selectedCode);
    }
    // Don't load old prediction dates - always use today's date
    // The stored date might be days/weeks old which would show stale predictions
    if (stored?.predictionDate) {
      const storedDate = new Date(stored.predictionDate);
      const today = new Date(defaultPredictionDate);
      // Only use stored date if it's today or in the future
      if (storedDate >= today) {
        setPredictionDate(stored.predictionDate);
      }
      // Otherwise stick with defaultPredictionDate (today)
    }
    if (stored?.language) {
      setLanguage(stored.language);
    }
    hasHydrated.current = true;
  }, [defaultPredictionDate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasHydrated.current) return;
    const payload: StoredSettings = {
      selectedCode: selectedCode || undefined,
      predictionDate: predictionDate || undefined,
      language: language || undefined,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist Findr settings', error);
    }
  }, [language, predictionDate, selectedCode]);

  // Callback to save location to cookie (for incognito/cross-session persistence)
  const handleSaveLocationToCookie = useCallback((details: RectangleLocationDetails) => {
    const success = saveLastLocationToCookie({
      rectangleCode: details.rectangleCode,
      rectangleRegion: details.rectangleRegion,
      lat: details.lat,
      lon: details.lon,
      updatedAt: new Date().toISOString(),
    });
    if (success) {
      console.log('[PersistentFindrSettings] Saved location to cookie:', details.rectangleCode);
    }
  }, []);

  return {
    selectedCode,
    setSelectedCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
    saveLocationToCookie: handleSaveLocationToCookie,
  };
}

export type { StoredSettings as FindrStoredSettings };
