// lib/translation/clientTranslate.ts

/**
 * Client-side translation utility that calls the server API.
 * This avoids importing Node.js modules in the browser.
 */

// In-memory cache for client-side performance
const clientCache = new Map<string, string>();

function getCacheKey(text: string, targetLang: string): string {
  const normalizedText = text.trim().replace(/\s+/g, ' ');
  const normalizedLang = targetLang.toLowerCase();
  return `${normalizedLang}:${normalizedText}`;
}

/**
 * Translate text using the server API
 */
export async function clientTranslate(text: string, targetLang: string): Promise<string> {
  // Return immediately if text is empty or target is English
  if (!text || !text.trim() || targetLang.toLowerCase() === 'en') {
    return text;
  }

  // Check client cache first
  const cacheKey = getCacheKey(text, targetLang);
  const cached = clientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Translation failed');
    }

    const translation = data.translation || text;
    
    // Cache the result
    clientCache.set(cacheKey, translation);
    
    return translation;
  } catch (error) {
    console.error('Client translation failed:', error);
    return text; // Fallback to original text
  }
}

/**
 * Translate multiple texts using the server API
 */
export async function clientTranslateBatch(texts: string[], targetLang: string): Promise<string[]> {
  // Return immediately if target is English
  if (targetLang.toLowerCase() === 'en') {
    return texts;
  }

  // Check cache for each text
  const cacheResults: (string | null)[] = texts.map(text => {
    if (!text || !text.trim()) return text;
    const cacheKey = getCacheKey(text, targetLang);
    return clientCache.get(cacheKey) || null;
  });

  // If all are cached, return cached results
  if (cacheResults.every(result => result !== null)) {
    return cacheResults as string[];
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        targetLang,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Batch translation failed');
    }

    const translations = data.translations || texts;
    
    // Cache the results
    texts.forEach((text, index) => {
      if (text && text.trim()) {
        const cacheKey = getCacheKey(text, targetLang);
        clientCache.set(cacheKey, translations[index]);
      }
    });
    
    return translations;
  } catch (error) {
    console.error('Client batch translation failed:', error);
    return texts; // Fallback to original texts
  }
}