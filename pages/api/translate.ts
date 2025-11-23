// pages/api/translate.ts

import { NextApiRequest, NextApiResponse } from 'next';
import {
  translateText,
  translateTextBatch,
  isSupportedLanguage,
  normalizeLanguageCode,
} from '../../lib/i18n/translate';

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
  retryAfter?: number;
}

// Simple rate limiter - track requests per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20; // 20 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    // New window or expired window
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
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

  // Check rate limit
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             (req.headers['x-real-ip'] as string) || 
             'unknown';
  
  const { allowed, retryAfter } = checkRateLimit(ip);
  
  if (!allowed) {
    return res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
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

    if (!isSupportedLanguage(targetLang)) {
      return res.status(400).json({
        success: false,
        error: `Language ${targetLang} is not supported`,
      });
    }

    const normalizedLang = normalizeLanguageCode(targetLang);

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      const translations = await translateTextBatch(texts, {
        targetLang: normalizedLang,
      });
      return res.status(200).json({
        success: true,
        translations,
      });
    }

    // Handle single translation
    if (text) {
      const translation = await translateText(text, {
        targetLang: normalizedLang,
      });
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
    
    // Check if it's a DeepL rate limit error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('Too many requests') || errorMessage.includes('high load')) {
      return res.status(429).json({
        success: false,
        error: 'DeepL API rate limit reached. Please try again later.',
        retryAfter: 60, // Suggest retrying after 1 minute
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Translation failed',
    });
  }
}