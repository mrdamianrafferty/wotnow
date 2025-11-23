import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { invalidateManualOverrideCache } from '../../lib/translation/autoTranslate';
import { normalizeLanguageCode } from '../../lib/i18n/translate';

const ADMIN_TOKEN = process.env.TRANSLATION_ADMIN_TOKEN;

function unauthorized(res: NextApiResponse, message = 'Unauthorized') {
  return res.status(401).json({ success: false, error: message });
}

function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase credentials missing for translation overrides API');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function hashSourceText(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex').substring(0, 16);
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  if (!ADMIN_TOKEN) {
    return unauthorized(res, 'TRANSLATION_ADMIN_TOKEN not configured');
  }

  const authHeader = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (authHeader !== ADMIN_TOKEN) {
    return unauthorized(res);
  }

  const supabase = getSupabaseServerClient();
  const { targetLang, search, includeInactive, limit = '50' } = req.query;
  const normalizedLang = typeof targetLang === 'string' ? normalizeLanguageCode(targetLang) : undefined;
  const maxRows = Math.min(Number(limit) || 50, 500);
  const includeInactiveFlag = includeInactive === 'true';

  let query = supabase
    .from('translation_overrides')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(maxRows);

  if (!includeInactiveFlag) {
    query = query.eq('is_active', true);
  }

  if (normalizedLang) {
    query = query.eq('target_language', normalizedLang);
  }

  if (typeof search === 'string' && search.trim()) {
    query = query.ilike('source_text', `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  return res.status(200).json({ success: true, overrides: data });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  if (!ADMIN_TOKEN) {
    return unauthorized(res, 'TRANSLATION_ADMIN_TOKEN not configured');
  }

  const authHeader = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (authHeader !== ADMIN_TOKEN) {
    return unauthorized(res);
  }

  const {
    sourceText,
    targetLanguage,
    translatedText,
    context,
    notes,
    tags,
    isActive = true,
    updatedBy = 'admin',
    createdBy,
  } = req.body || {};

  if (!sourceText || !targetLanguage || !translatedText) {
    return res.status(400).json({
      success: false,
      error: 'sourceText, targetLanguage, and translatedText are required',
    });
  }

  const normalizedLang = normalizeLanguageCode(targetLanguage);
  const supabase = getSupabaseServerClient();
  const payload = {
    source_text: sourceText.trim(),
    target_language: normalizedLang,
    translated_text: translatedText.trim(),
    context: context?.trim() || null,
    notes: notes || null,
    tags: Array.isArray(tags) ? tags : null,
    is_active: Boolean(isActive),
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  };

  if (createdBy) {
    Object.assign(payload, { created_by: createdBy });
  }

  const { data, error } = await supabase
    .from('translation_overrides')
    .upsert(payload, { onConflict: 'source_text,target_language' })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: error.message });
  }

  // Mirror manual translation into runtime cache table
  try {
    await supabase.from('translation_cache').upsert(
      {
        source_text: payload.source_text,
        target_language: normalizedLang,
        translated_text: payload.translated_text,
        translation_source: 'manual',
        source_content_hash: hashSourceText(payload.source_text),
        needs_review: false,
        has_fishing_terminology: false,
        access_count: 1,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'source_text,target_language' }
    );
  } catch (cacheError) {
    console.error('Failed to mirror manual translation into cache:', cacheError);
  }

  invalidateManualOverrideCache(payload.source_text, normalizedLang);

  return res.status(200).json({ success: true, override: data });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      return handleGet(req, res);
    }

    if (req.method === 'POST') {
      return handlePost(req, res);
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('translation-overrides API error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
