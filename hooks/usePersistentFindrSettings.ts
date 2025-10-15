import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'findrSettings';

interface StoredSettings {
  selectedCode?: string;
  predictionDate?: string;
  language?: string;
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
}

function readStoredSettings(): StoredSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
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

  return {
    selectedCode,
    setSelectedCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
  };
}

export type { StoredSettings as FindrStoredSettings };
