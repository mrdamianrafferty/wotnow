// pages/api/test-translation.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { autoTranslate } from '../../lib/translation/autoTranslate';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test translations in multiple languages
    const testPhrase = 'Sea Bass caught at dawn with ragworm';
    
    const spanish = await autoTranslate(testPhrase, 'es');
    const french = await autoTranslate(testPhrase, 'fr');
    const portuguese = await autoTranslate(testPhrase, 'pt');
    
    // Test that English returns unchanged
    const english = await autoTranslate(testPhrase, 'en');
    
    // Test caching - second call should be instant
    const start = Date.now();
    await autoTranslate(testPhrase, 'es');
    const cacheTime = Date.now() - start;
    
    return res.status(200).json({
      success: true,
      original: testPhrase,
      translations: {
        spanish,
        french,
        portuguese,
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