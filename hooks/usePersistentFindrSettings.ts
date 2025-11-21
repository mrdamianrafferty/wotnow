import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { saveLastLocationToCookie, getLastLocationFromCookie } from '../lib/cookies';

const STORAGE_KEY = 'findrSettings';

interface StoredSettings {
  selectedCode?: string;
  predictionDate?: string;
}

export interface RectangleLocationDetails {
  rectangleCode: string;
  rectangleRegion: string;
  lat: number;
  lon: number;
}

interface UsePersistentFindrSettingsArgs {
  predictionDate: string;
  language?: string; // Deprecated - retained for backward compatibility
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
      const cookieLocation = getLastLocationFromCookie();
      if (cookieLocation) {
        console.log('[PersistentFindrSettings] Found location in cookie:', cookieLocation.rectangleCode);
        return {
          selectedCode: cookieLocation.rectangleCode,
          predictionDate: undefined,
        };
      }
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        selectedCode: typeof parsed.selectedCode === 'string' ? parsed.selectedCode : undefined,
        predictionDate: typeof parsed.predictionDate === 'string' ? parsed.predictionDate : undefined,
      };
    }
  } catch (error) {
    console.warn('Unable to read stored Findr settings', error);
  }
  return null;
}

export function usePersistentFindrSettings({
  predictionDate: defaultPredictionDate,
}: UsePersistentFindrSettingsArgs): UsePersistentFindrSettingsResult {
  const [selectedCode, setSelectedCode] = useState('');
  const [predictionDate, setPredictionDate] = useState(defaultPredictionDate);
  const hasHydrated = useRef(typeof window === 'undefined');
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = readStoredSettings();
    if (stored?.selectedCode) {
      setSelectedCode(stored.selectedCode);
    }

    if (stored?.predictionDate) {
      const storedDate = new Date(stored.predictionDate);
      const today = new Date(defaultPredictionDate);
      if (storedDate >= today) {
        setPredictionDate(stored.predictionDate);
      }
    }

    hasHydrated.current = true;
  }, [defaultPredictionDate]);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasHydrated.current) return;

    const payload: StoredSettings = {
      selectedCode: selectedCode || undefined,
      predictionDate: predictionDate || undefined,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist Findr settings', error);
    }
  }, [predictionDate, selectedCode]);

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
