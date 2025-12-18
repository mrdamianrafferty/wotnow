// components/LanguageSelector.tsx

import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getSupportedLanguages } from '../lib/user/language';

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
}

// Flag emojis for each language
const LANGUAGE_FLAGS: Record<string, string> = {
  // en: Globe icon will be rendered instead of emoji
  en: '', // Placeholder for Globe icon
  es: '🇪🇸', 
  fr: '🇫🇷',
  pt: '🇵🇹',
  de: '🇩🇪',
  it: '🇮🇹',
  nl: '🇳🇱',
  pl: '🇵🇱',
  tr: '🇹🇷',
  sv: '🇸🇪',
};

export function LanguageSelector({ className = '', compact = false, showLabel = false }: LanguageSelectorProps) {
  const { language, setLanguage } = useLanguage();
  const supportedLanguages = getSupportedLanguages();
  const currentLang = supportedLanguages.find(lang => lang.code === language) || supportedLanguages[0];

  // Handler to set language and close dropdown
  const handleLanguageSelect = (langCode: string) => {
    setLanguage(langCode);
    // Force close dropdown by removing focus
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  if (compact) {
    return (
      <div className={`dropdown dropdown-end ${className}`}>
        <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-1 hover:bg-base-200">
          {language === 'en' ? (
            <Globe className="w-5 h-5" />
          ) : (
            <span className="text-lg leading-none">{LANGUAGE_FLAGS[language] || '🌐'}</span>
          )}
          <span className="text-xs font-medium uppercase">{language}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </div>
        <ul tabIndex={0} className="dropdown-content z-[100] p-2 shadow-lg bg-white/100 dark:bg-zinc-900/100 rounded-box w-48 border border-base-200">
          {supportedLanguages.map((lang) => (
            <li key={lang.code} className="list-none">
              <button
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors !bg-transparent hover:!bg-gray-100 dark:hover:!bg-zinc-800 focus:!bg-gray-100 dark:focus:!bg-zinc-800 active:!bg-gray-100 dark:active:!bg-zinc-800 text-base-content ${language === lang.code ? '!bg-gray-100 dark:!bg-zinc-800' : ''}`}
              >
                {lang.code === 'en' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <span className="text-lg leading-none">{LANGUAGE_FLAGS[lang.code] || '🌐'}</span>
                )}
                <div className="flex flex-col items-start">
                  <span className="font-medium text-base-content">{lang.nativeName}</span>
                  <span className="text-xs opacity-60 text-base-content">{lang.name}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`form-control ${className}`}>
      {showLabel && (
        <label className="label">
          <span className="label-text flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Language / Idioma
          </span>
        </label>
      )}
      <div className="dropdown dropdown-end w-full">
        <div tabIndex={0} role="button" className="btn btn-outline w-full justify-between">
          <div className="flex items-center gap-2">
            {language === 'en' ? (
              <Globe className="w-5 h-5" />
            ) : (
              <span className="text-lg leading-none">{LANGUAGE_FLAGS[language] || '🌐'}</span>
            )}
            <span>{currentLang.nativeName}</span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </div>
        <ul tabIndex={0} className="dropdown-content z-[100] p-2 shadow-lg bg-white/100 dark:bg-zinc-900/100 rounded-box w-full border border-base-200">
          {supportedLanguages.map((lang) => (
            <li key={lang.code} className="list-none">
              <button
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors !bg-transparent hover:!bg-gray-100 dark:hover:!bg-zinc-800 focus:!bg-gray-100 dark:focus:!bg-zinc-800 active:!bg-gray-100 dark:active:!bg-zinc-800 text-base-content ${language === lang.code ? '!bg-gray-100 dark:!bg-zinc-800' : ''}`}
              >
                {lang.code === 'en' ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  <span className="text-lg leading-none">{LANGUAGE_FLAGS[lang.code] || '🌐'}</span>
                )}
                <div className="flex flex-col items-start">
                  <span className="font-medium text-base-content">{lang.nativeName}</span>
                  <span className="text-xs opacity-60 text-base-content">{lang.name}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}