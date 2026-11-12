/**
 * Reading a locale: filling templates, plurals, numbers, clocks, weekdays.
 *
 * @module lib/godaisy/i18n
 */

import type { LangCode, Locale, TKey } from './types';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { pt } from './locales/pt';
import { de } from './locales/de';
import { it } from './locales/it';
import { nl } from './locales/nl';
import { pl } from './locales/pl';
import { sv } from './locales/sv';
import { tr } from './locales/tr';

export const LOCALES: Record<LangCode, Locale> = { en, es, fr, pt, de, it, nl, pl, sv, tr };

export const localeOf = (lang: LangCode | undefined): Locale => LOCALES[lang ?? 'en'] ?? en;

/** `{name}` placeholders, filled. A missing value is left visible rather than silently dropped. */
export function fill(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** A template by key, filled. */
export function tr_(L: Locale, key: TKey, vars?: Record<string, string | number>): string {
  return fill(L.t[key] ?? en.t[key], vars);
}

/**
 * The plural form of a template: `${key}_one`, `_few`, `_many` or `_other`,
 * chosen by the locale's own plural rules and falling back to `_other`.
 */
export function plural(L: Locale, base: string, n: number, vars: Record<string, string | number> = {}): string {
  const cat = new Intl.PluralRules(L.intl).select(n);
  const tpl = L.t[`${base}_${cat}`] ?? L.t[`${base}_other`] ?? (en.t as Record<string, string>)[`${base}_other`];
  return fill(tpl, { n, ...vars });
}

/** A number in the locale's own notation: "1,8" in German, "1.8" in English. */
export function num(L: Locale, v: number, dp = 0): string {
  // English keeps `toFixed`, which is what every existing sentence was built on.
  if (L.code === 'en') return v.toFixed(dp);
  return new Intl.NumberFormat(L.intl, { minimumFractionDigits: dp, maximumFractionDigits: dp, useGrouping: false }).format(v)
    // Intl uses U+2212 for negatives in some locales; the page prints a hyphen-minus-free "−" itself.
    .replace(/−/g, '−');
}

/** First letter up, by the locale's own rules (Turkish dotted İ). */
export const upperFirst = (L: Locale, s: string) => (s ? s[0].toLocaleUpperCase(L.intl) + s.slice(1) : s);

/** "4:39pm", "7pm", "noon", "midnight" in English; "16:39" everywhere else. */
export function clock(L: Locale, h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  if (L.clock === '24h') return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (mm === 0 && hh === 12) return 'noon';
  if (mm === 0 && hh === 0) return 'midnight';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${hh < 12 ? 'am' : 'pm'}`;
}

/** An axis tick: whole hours only. */
export function tick(L: Locale, h: number): string {
  const k = ((h % 24) + 24) % 24;
  if (L.clock === '24h') return `${String(k).padStart(2, '0')}:00`;
  return k === 0 ? 'midnight' : k === 12 ? 'noon' : k < 12 ? `${k}am` : `${k - 12}pm`;
}

/** The number as a word where the locale has one (0–20), otherwise as digits. */
export const word = (L: Locale, n: number) => (Number.isInteger(n) && n >= 0 && n < L.numerals.length ? L.numerals[n] : String(n));

/** "a, b and c", in the locale's own list grammar. */
export const list = (L: Locale, items: string[]) =>
  new Intl.ListFormat(L.intl, { style: 'long', type: 'conjunction' }).format(items);

/** The weekday (0 = Sunday) of an ISO date, read as a calendar date and nothing else. */
export const dayOfWeek = (dateISO: string): number => new Date(`${dateISO}T12:00:00Z`).getUTCDay();
