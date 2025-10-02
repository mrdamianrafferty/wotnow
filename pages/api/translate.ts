// pages/api/translate.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { autoTranslate, autoTranslateBatch } from '../../lib/translation/autoTranslate';

interface TranslateRequest {
  text?: string;
  texts?: string[];
  targetLang: string;
}

interface TranslateResponse {
  success: boolean;
  translation?: string;
  translations?: string[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TranslateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { text, texts, targetLang }: TranslateRequest = req.body;

    if (!targetLang) {
      return res.status(400).json({
        success: false,
        error: 'targetLang is required',
      });
    }

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      const translations = await autoTranslateBatch(texts, targetLang);
      return res.status(200).json({
        success: true,
        translations,
      });
    }

    // Handle single translation
    if (text) {
      const translation = await autoTranslate(text, targetLang);
      return res.status(200).json({
        success: true,
        translation,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Either text or texts array is required',
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Translation failed',
    });
  }
}