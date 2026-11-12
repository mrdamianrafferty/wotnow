/**
 * Which language The Call and the conditions page speak.
 *
 * ONE RULE, USED BY BOTH PAGES AND THE SHARE TEXT, so "Why?" never changes
 * language between them:
 *
 *   1. the person's own setting (`LanguageContext` — local storage, synced to
 *      their account), mirrored into the `gd-lang` cookie so the SERVER can
 *      read it and the first paint is already in the right language;
 *   2. otherwise the browser's `Accept-Language`, the first-visit default;
 *   3. otherwise English.
 *
 * @module lib/godaisy/i18n/lang
 */

import { LANGS, type LangCode } from './types';

export const LANG_COOKIE = 'gd-lang';

export const isLang = (v: unknown): v is LangCode => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

/** "fr-CA" → "fr", or null when we do not speak it. */
export function toLang(tag: string | null | undefined): LangCode | null {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

/** The first language in an `Accept-Language` header that we speak, in the order of its q-values. */
export function fromAcceptLanguage(header: string | null | undefined): LangCode | null {
  if (!header) return null;
  const ranked = header.split(',').map((part, i) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((p) => /^\s*q=([\d.]+)/.exec(p)?.[1]).find(Boolean);
    return { tag, q: q === undefined ? 1 : Number(q), i };
  }).filter((x) => x.tag && x.q > 0).sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of ranked) {
    const l = toLang(tag);
    if (l) return l;
  }
  return null;
}

export function fromCookieHeader(header: string | null | undefined): LangCode | null {
  const m = new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`).exec(header ?? '');
  return m ? toLang(decodeURIComponent(m[1])) : null;
}

/** Server side: cookie first, then the browser, then English. */
export function langFromRequest(req: { headers: { cookie?: string; 'accept-language'?: string | string[] } }): LangCode {
  const al = req.headers['accept-language'];
  return fromCookieHeader(req.headers.cookie) ?? fromAcceptLanguage(Array.isArray(al) ? al.join(',') : al) ?? 'en';
}

/** Browser side: mirror the person's setting into the cookie the server reads. Returns true if it changed. */
export function writeLangCookie(lang: LangCode): boolean {
  if (typeof document === 'undefined') return false;
  const had = fromCookieHeader(document.cookie);
  if (had === lang) return false;
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  return true;
}
