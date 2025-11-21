// context/LanguageContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  fetchRemoteUserLanguage,
  getUserLanguage,
  isSupportedLanguage,
  setUserLanguage,
} from '../lib/user/language';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  isSpanish: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<string>('en');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;
    const localLanguage = getUserLanguage();
    setLanguageState(localLanguage);

    const handleLanguageChanged = (event: Event) => {
      const custom = event as CustomEvent<{ language?: string }>;
      const nextLanguage = custom.detail?.language;
      if (!isSupportedLanguage(nextLanguage)) return;
      setLanguageState((current) => (current === nextLanguage ? current : nextLanguage));
    };

    window.addEventListener('languageChanged', handleLanguageChanged as EventListener);

    void (async () => {
      const remoteLanguage = await fetchRemoteUserLanguage();
      if (!cancelled && isSupportedLanguage(remoteLanguage) && remoteLanguage !== localLanguage) {
        setLanguageState(remoteLanguage);
        setUserLanguage(remoteLanguage, { syncRemote: false });
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('languageChanged', handleLanguageChanged as EventListener);
    };
  }, []);

  const setLanguage = (lang: string) => {
    const safeLang = isSupportedLanguage(lang) ? lang : 'en';
    setLanguageState((current) => (current === safeLang ? current : safeLang));
    setUserLanguage(safeLang);
  };

  const isSpanish = language === 'es';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isSpanish }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  
  // Fallback state for when provider is not available
  const [fallbackLanguage, setFallbackLanguage] = useState<string>('en');

  useEffect(() => {
    if (typeof window !== 'undefined' && context === undefined) {
      const userLang = getUserLanguage();
      setFallbackLanguage(userLang);
    }
  }, [context]);

  // If context is available, use it
  if (context !== undefined) {
    return context;
  }
  
  // Gracefully handle missing provider with fallbacks
  console.warn('useLanguage used outside LanguageProvider, using fallbacks');
  
  const setLanguage = (lang: string) => {
    const safeLang = isSupportedLanguage(lang) ? lang : 'en';
    setFallbackLanguage(safeLang);
    setUserLanguage(safeLang);
  };

  const isSpanish = fallbackLanguage === 'es';

  return { 
    language: fallbackLanguage, 
    setLanguage, 
    isSpanish 
  };
}

// Enhanced translation hook that uses the language context
export function useContextualTranslation(text: string, targetLang?: string) {
  const { language } = useLanguage();
  const [translated, setTranslated] = useState(text);
  const [loading, setLoading] = useState(false);

  const finalLang = targetLang || language || 'en';

  useEffect(() => {
    if (finalLang === 'en' || !text?.trim()) {
      setTranslated(text);
      return;
    }

    // Import clientTranslate dynamically to avoid SSR issues
    let isMounted = true;
    setLoading(true);

    import('../lib/translation/clientTranslate')
      .then(({ clientTranslate }) => clientTranslate(text, finalLang))
      .then((result) => {
        if (isMounted) {
          setTranslated(result);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Translation failed:', error);
        if (isMounted) {
          setTranslated(text); // Fall back to original text
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [text, finalLang]);

  return { translated, loading };
}