// lib/user/language.ts

/**
 * Determine the user's preferred language from available sources.
 * Checks in priority order: manual selection, browser preference, default.
 */
export function getUserLanguage(): string {
  if (typeof window === 'undefined') {
    return 'en'; // Server-side rendering default
  }

  // Check localStorage for manual language selection
  const manualSelection = localStorage.getItem('findr-language');
  if (manualSelection) {
    return manualSelection;
  }

  // Check browser language settings
  const browserLang = navigator.language.split('-')[0];
  
  // Supported languages in your translation system
  const supported = ['en', 'es', 'fr', 'pt', 'de', 'it', 'nl'];
  
  if (supported.includes(browserLang)) {
    return browserLang;
  }

  // Default to English
  return 'en';
}

/**
 * Save the user's language preference.
 * Stores in localStorage for persistence across sessions.
 * No longer reloads the page - language changes are handled reactively.
 */
export function setUserLanguage(lang: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('findr-language', lang);
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }
}

/**
 * Get list of supported languages with display names
 */
export function getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  ];
}