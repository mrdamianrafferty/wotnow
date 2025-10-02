import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'findrSettings';

interface StoredSettings {
  selectedCode?: string;
  manualCode?: string;
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
  manualCode: string;
  setManualCode: (value: string) => void;
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
        manualCode: typeof parsed.manualCode === 'string' ? parsed.manualCode : undefined,
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
  const [manualCode, setManualCode] = useState('');
  const [predictionDate, setPredictionDate] = useState(defaultPredictionDate);
  const [language, setLanguage] = useState(defaultLanguage);
  const hasHydrated = useRef(typeof window === 'undefined');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = readStoredSettings();
    if (stored?.selectedCode) {
      setSelectedCode(stored.selectedCode);
    }
    if (stored?.manualCode) {
      setManualCode(stored.manualCode);
    }
    if (stored?.predictionDate) {
      setPredictionDate(stored.predictionDate);
    }
    if (stored?.language) {
      setLanguage(stored.language);
    }
    hasHydrated.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasHydrated.current) return;
    const payload: StoredSettings = {
      selectedCode: selectedCode || undefined,
      manualCode: manualCode || undefined,
      predictionDate: predictionDate || undefined,
      language: language || undefined,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist Findr settings', error);
    }
  }, [language, manualCode, predictionDate, selectedCode]);

  return {
    selectedCode,
    setSelectedCode,
    manualCode,
    setManualCode,
    predictionDate,
    setPredictionDate,
    language,
    setLanguage,
  };
}

export type { StoredSettings as FindrStoredSettings };
