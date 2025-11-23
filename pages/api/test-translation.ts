// pages/api/test-translation.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { translateText } from '../../lib/i18n/translate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test translations in multiple languages
    const testPhrase = 'Sea Bass caught at dawn with ragworm';
    
    const spanish = await translateText(testPhrase, { targetLang: 'es' });
    const french = await translateText(testPhrase, { targetLang: 'fr' });
    const portuguese = await translateText(testPhrase, { targetLang: 'pt' });
    const swedish = await translateText(testPhrase, { targetLang: 'sv' });
    const turkish = await translateText(testPhrase, { targetLang: 'tr' });
    const polish = await translateText(testPhrase, { targetLang: 'pl' });
    
    // Test that English returns unchanged
    const english = await translateText(testPhrase, { targetLang: 'en' });
    
    // Test caching - second call should be instant
    const start = Date.now();
    await translateText(testPhrase, { targetLang: 'es' });
    const cacheTime = Date.now() - start;
    
    return res.status(200).json({
      success: true,
      original: testPhrase,
      translations: {
        spanish,
        french,
        portuguese,
        swedish,
        turkish,
        polish,
        english,
      },
      cache_time_ms: cacheTime,
      message: cacheTime < 10 
        ? 'Cache is working! Translation served instantly.'
        : 'Translation completed but cache may need optimization.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check that DEEPL_API_KEY is set in your .env.local file',
    });
  }
}