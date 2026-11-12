/**
 * Every language answers every question English does.
 *
 * The Call and the drawn conditions page read their sentences from one locale
 * file per language (`lib/godaisy/i18n/locales`). English is the source; this
 * checks the other nine against it — same keys, same placeholders, same array
 * lengths, every sport named — and then RENDERS both pages in every language to
 * prove that no placeholder survives into the text and no English leaks into a
 * translated page.
 *
 * It cannot say whether a translation is GOOD. That is the spot-check a person
 * makes; see docs in the PR. What it can say is that nothing is missing, mangled
 * or still English.
 */

import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, fill } from '@/lib/godaisy/i18n';
import { LANGS, type LangCode, type Locale } from '@/lib/godaisy/i18n/types';
import { en } from '@/lib/godaisy/i18n/locales/en';
import { drawConditions, howFar, inPeople } from '@/lib/godaisy/conditions/drawn';
import { rowsFor } from '@/lib/godaisy/call/readings';
import { EVIDENCE_SECTIONS } from '@/lib/godaisy/call/evidence';
import { makeVerdict, asSharedSentence, asSentence } from '@/lib/godaisy/call/verdict';
import { bandLabel } from '@/lib/godaisy/call/bands';
import { PHRASEBOOK } from '@/lib/godaisy/call/phrasebook';
import { allSports } from '@/data/activities';
import { shareText } from '@/lib/godaisy/share/template';
import type { WeatherData } from '@/utils/getSuggestionsByDay';

const OTHERS = LANGS.filter((l) => l !== 'en') as LangCode[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const PLURAL = /_(one|few|many|other)$/;
const base = (k: string) => k.replace(PLURAL, '');

const load = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const NOV = load('unified-weather-newquay-nov.json');
const SEP = load('unified-weather-marine.json');
const NOON = new Date('2026-11-12T12:05:00Z');
const EVENING = new Date('2026-09-05T18:30:00Z');

/**
 * Words that are English and nothing else. A rendered page in another language
 * must contain none of them. Words that are ALSO real words in a language (the
 * German "Wind", the Swedish "frost") are listed per language, below, so the
 * list stays an honest alarm instead of being talked down.
 */
const ENGLISH_ONLY = [
  'the', 'and', 'until', 'tomorrow', 'today', 'about', 'football', 'pitch', 'pitches', 'grown-up', 'grown-ups',
  'feels', 'gusting', 'underfoot', 'sunrise', 'sunset', 'daylight', 'waves', 'overnight', 'dry', 'rain', 'showers',
  'snow', 'moon', 'clear', 'cloud', 'water', 'now', 'from', 'with', 'then', 'only', 'measured', 'force', 'knee',
  'waist', 'ankle', 'chest', 'shoulders', 'hours', 'hour', 'leave', 'umbrella', 'home', 'light', 'fog', 'mist',
  'tide', 'wind', 'sea', 'high', 'low', 'air', 'day', 'is', 'it', 'at', 'on', 'of', 'a', 'to', 'in', 'for', 'by',
];
/** Real words in these languages that happen to be spelt like an English one. */
const ALSO_REAL: Partial<Record<LangCode, string[]>> = {
  de: ['wind', 'sea', 'is', 'air', 'rain', 'in', 'a', 'low', 'to', 'tide'],
  nl: ['wind', 'is', 'in', 'a', 'on', 'it', 'at', 'of', 'to', 'for', 'water', 'low', 'high', 'tide', 'air', 'sea', 'rain', 'dry', 'by', 'now', 'with', 'day', 'light', 'then'],
  sv: ['i', 'is', 'in', 'a', 'on', 'it', 'at', 'of', 'to', 'for', 'by', 'then', 'low', 'high', 'air', 'sea', 'rain', 'dry', 'light', 'day', 'now', 'with'],
  fr: ['force', 'a', 'on', 'it', 'is', 'at', 'in', 'to', 'for', 'by', 'sea', 'air', 'low', 'high', 'tide', 'then', 'now', 'dry', 'rain', 'wind', 'water', 'day', 'light', 'with', 'of'],
  es: ['a', 'en', 'es', 'sea', 'it', 'is', 'on', 'at', 'in', 'to', 'for', 'by', 'low', 'high', 'tide', 'air', 'dry', 'rain', 'wind', 'water', 'day', 'now', 'with', 'of', 'light', 'then'],
  pt: ['a', 'sea', 'it', 'is', 'on', 'at', 'in', 'to', 'for', 'by', 'low', 'high', 'tide', 'air', 'dry', 'rain', 'wind', 'water', 'day', 'now', 'with', 'of', 'light', 'then'],
  it: ['a', 'it', 'is', 'on', 'at', 'in', 'to', 'for', 'by', 'low', 'high', 'tide', 'air', 'dry', 'rain', 'wind', 'water', 'day', 'now', 'with', 'of', 'light', 'then', 'sea'],
  pl: ['a', 'w', 'is', 'it', 'on', 'at', 'in', 'to', 'for', 'by', 'low', 'high', 'tide', 'air', 'dry', 'rain', 'wind', 'water', 'day', 'now', 'with', 'of', 'light', 'then', 'sea'],
  tr: ['a', 'is', 'it', 'on', 'at', 'in', 'to', 'for', 'by', 'low', 'high', 'tide', 'air', 'dry', 'rain', 'wind', 'water', 'day', 'now', 'with', 'of', 'light', 'then', 'sea'],
};
/*
 * The short function words and the many one-word collisions above are only
 * meaningful as a PAIR check, so the leak scan below looks for runs: two or more
 * English-only words in a row ("the wind", "and then"), or one of the long,
 * distinctive ones. A lone "a" or "in" proves nothing.
 */
const DISTINCTIVE = new Set([
  'tomorrow', 'today', 'until', 'about', 'football', 'pitch', 'pitches', 'grown-up', 'grown-ups', 'feels', 'gusting',
  'underfoot', 'sunrise', 'sunset', 'daylight', 'waves', 'overnight', 'showers', 'snow', 'moon', 'clear', 'cloud',
  'measured', 'force', 'knee', 'waist', 'ankle', 'chest', 'shoulders', 'hours', 'hour', 'leave', 'umbrella', 'fog',
  'mist', 'only', 'the', 'and',
]);

function leaks(lang: LangCode, text: string): string[] {
  const allowed = new Set(ALSO_REAL[lang] ?? []);
  const words = text.toLowerCase().split(/[^a-zà-ÿ'’-]+/i).filter(Boolean);
  const out: string[] = [];
  const english = new Set(ENGLISH_ONLY);
  words.forEach((w, i) => {
    if (!english.has(w) || allowed.has(w)) return;
    const next = words[i + 1];
    if (DISTINCTIVE.has(w) || (next && english.has(next) && !allowed.has(next))) out.push(w);
  });
  return out;
}

const NO_UNFILLED = /\{|\}|undefined|NaN|\[object|null/;

describe.each(OTHERS)('%s locale: shape', (lang) => {
  const L: Locale = LOCALES[lang];

  it('is the language it says it is', () => {
    expect(L.code).toBe(lang);
    expect(L.intl.toLowerCase().startsWith(lang)).toBe(true);
    expect(L.clock).toBe('24h');
  });

  it('has every array at the length English has', () => {
    for (const k of ['weekday', 'weekdayStart', 'weekdayOn', 'weekdayUntil', 'weekdayShort'] as const) expect(L[k]).toHaveLength(7);
    expect(L.numerals).toHaveLength(21);
    expect(L.compassWords).toHaveLength(8);
    expect(L.compassShort).toHaveLength(8);
    expect(L.forceNames).toHaveLength(13);
    expect(L.beaufortLand).toHaveLength(13);
    expect(L.shoes).toHaveLength(6);
    for (const [a] of L.shoes) expect(a.length).toBeGreaterThan(0);
  });

  it('answers every template, with the same placeholders', () => {
    const problems: string[] = [];
    for (const [key, tpl] of Object.entries(en.t)) {
      const isPlural = PLURAL.test(key);
      if (isPlural && !key.endsWith('_other')) continue; // `_one` may not exist in every language
      const got = L.t[key];
      if (typeof got !== 'string' || !got.length) { problems.push(`${key}: missing`); continue; }
      if (placeholders(got).join() !== placeholders(tpl).join()) {
        problems.push(`${key}: placeholders ${placeholders(got)} ≠ ${placeholders(tpl)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('has plural variants only for keys English has, with placeholders from its set', () => {
    const problems: string[] = [];
    for (const [key, got] of Object.entries(L.t)) {
      if (!(key in en.t) && !(PLURAL.test(key) && `${base(key)}_other` in en.t)) { problems.push(`${key}: unknown key`); continue; }
      if (PLURAL.test(key)) {
        const allowed = new Set([...placeholders((en.t as Record<string, string>)[`${base(key)}_other`]),
          ...placeholders((en.t as Record<string, string>)[`${base(key)}_one`] ?? '')]);
        for (const p of placeholders(got)) if (!allowed.has(p)) problems.push(`${key}: stray {${p}}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('is not English in disguise', () => {
    const same = Object.entries(en.t)
      .filter(([k, v]) => !PLURAL.test(k) || k.endsWith('_other'))
      // Units, symbols and brands are the same everywhere.
      .filter(([, v]) => /[A-Za-z]{4,}/.test(v.replace(/\{\w+\}/g, '').replace(/Go Daisy|Open-Meteo|Stormglass|PM2\.5|WHO/g, '')))
      .filter(([k, v]) => L.t[k] === v)
      .map(([k]) => k);
    expect(same).toEqual([]);
  });

  it('names every one of the 118 activities, and every phrasebook sport', () => {
    const ids = (allSports as Array<{ id: string }>).map((a) => a.id);
    expect(ids.length).toBeGreaterThan(100);
    expect(ids.filter((id) => !L.sportNames[id])).toEqual([]);
    for (const [id, e] of Object.entries(PHRASEBOOK)) {
      const got = L.sports[id];
      expect(got).toBeDefined();
      if (e.noun) expect(got.noun).toBeTruthy();
      if (e.predicates?.length) expect(got.predicates?.length ?? 0).toBeGreaterThan(0);
      if (e.sentences?.length) expect(got.sentences?.length ?? 0).toBeGreaterThan(0);
    }
    expect(Object.keys(L.sports).filter((id) => !(id in PHRASEBOOK))).toEqual([]);
  });

  it('keeps the voice: whole sentences end in a full stop, no shouting, no emoji', () => {
    const bad: string[] = [];
    for (const [id, e] of Object.entries(L.sports)) {
      for (const v of [e.noun, ...(e.predicates ?? []), ...(e.sentences ?? [])]) {
        if (!v) continue;
        if (!/[.]$/.test(v)) bad.push(`${id}: "${v}" has no full stop`);
        if (/!|\p{Extended_Pictographic}/u.test(v)) bad.push(`${id}: "${v}" shouts`);
      }
    }
    for (const [k, v] of Object.entries(L.t)) if (/!|\p{Extended_Pictographic}/u.test(v)) bad.push(`${k}: "${v}"`);
    expect(bad).toEqual([]);
  });

  it('keeps standalone phrasebook sentences short enough to fit the lockup', () => {
    // English is held to 34. Other languages run longer; `fitVerdict` shrinks type to
    // 44px, and this is the line past which even that overflows three lines.
    const long: string[] = [];
    for (const [id, e] of Object.entries(L.sports)) {
      for (const v of e.sentences ?? []) {
        const filled = v.replace('{when}', L.weekdayOn[3]);
        if (filled.length > 46) long.push(`${id}: "${filled}" (${filled.length})`);
      }
      for (const v of e.predicates ?? []) if (v.length > 44) long.push(`${id}: "${v}" (${v.length})`);
    }
    expect(long).toEqual([]);
  });
});

/* ── Rendering: the conditions page ───────────────────────────────────── */

type Strs = string[];
function everyString(lang: LangCode, readings: unknown, now: Date, day: number, coastal = true): Strs {
  const page = drawConditions(readings as never, { day, now, coastal, lang, weighed: [{ key: 'gust', score: 0.1 }] });
  const out: Strs = [];
  if (page.dayName) out.push(page.dayName);
  out.push(...page.todayOnly);
  for (const s of page.sections) {
    out.push(s.title, s.sentence);
    for (const f of s.facts) out.push(f.label, f.value);
    const d = s.drawing as Record<string, unknown> | null;
    if (!d) continue;
    // `kind`, `band`, `type`, `wear` and `tone` are internal ids, not text on the page.
    for (const [key, v] of Object.entries(d)) {
      if (['kind', 'band', 'wear', 'tone', 'type'].includes(key)) continue;
      if (typeof v === 'string') out.push(v);
      if (Array.isArray(v)) for (const x of v) {
        if (typeof x === 'string') out.push(x);
        else if (x && typeof x === 'object') for (const [k2, y] of Object.entries(x)) if (typeof y === 'string' && !['tone', 'wet', 'type'].includes(k2)) out.push(y);
      }
      if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k2, y] of Object.entries(v)) if (typeof y === 'string' && !['type'].includes(k2)) out.push(y);
    }
  }
  for (const sec of EVIDENCE_SECTIONS) for (const r of rowsFor({ ...sec, because: undefined }, readings as never, lang)) out.push(r.label, r.value);
  return out.filter((x) => x !== '');
}

describe.each(LANGS)('%s: the drawn conditions page, rendered', (lang) => {
  const cases: Array<[string, unknown, Date, number]> = [
    ['Newquay today', NOV, NOON, 0], ['Newquay on Saturday', NOV, NOON, 2], ['Newquay tomorrow', NOV, NOON, 1],
    ['September evening', SEP, EVENING, 0], ['September, three days on', SEP, EVENING, 3],
  ];

  it.each(cases)('%s: fills every placeholder', (_n, readings, now, day) => {
    const strings = everyString(lang, readings, now, day);
    expect(strings.length).toBeGreaterThan(10);
    expect(strings.filter((s) => NO_UNFILLED.test(s))).toEqual([]);
  });

  if (lang !== 'en') {
    it.each(cases)('%s: leaks no English', (_n, readings, now, day) => {
      const found = everyString(lang, readings, now, day).flatMap((s) => leaks(lang, s).map((w) => `${w} ← "${s}"`));
      expect(found).toEqual([]);
    });
  }

  it('says distances and heights in the language, for every size', () => {
    for (const m of [40, 100, 150, 400, 1000, 1500, 2000]) expect(howFar(m, lang)).not.toMatch(NO_UNFILLED);
    for (const r of [0.3, 0.8, 1.2, 1.7, 2, 2.4, 3.5, 5]) expect(inPeople(r, lang)).not.toMatch(NO_UNFILLED);
  });

  it('reads a 24-hour clock everywhere but English', () => {
    const page = drawConditions(NOV, { day: 0, now: NOON, coastal: true, lang });
    const sky = page.sections.find((s) => s.id === 'sky')!;
    if (lang === 'en') expect(sky.sentence).toMatch(/pm/);
    else expect(sky.sentence).toMatch(/\d{1,2}:\d{2}/);
  });
});

/* ── Rendering: the call's sentences ──────────────────────────────────── */

const SCENES: Array<[string, WeatherData]> = [
  ['fine', { temperature: 18, precipitation: 0, windspeed: 12, gustspeed: 20, humidity: 55, clouds: 30, waterTemperature: 14, swellHeight: 1.4, swellPeriod: 11 }],
  ['wet and windy', { temperature: 12, precipitation: 8, windspeed: 30, gustspeed: 55, humidity: 95, waterTemperature: 11 }],
  ['murky', { temperature: 7, precipitation: 0.5, windspeed: 8, gustspeed: 14, humidity: 92, visibility: 800, winddirection: 225, snowDepthCm: 6 }],
  ['no rain figure', { temperature: 15, windspeed: 15 }],
];
const SPORTS = [...Object.keys(PHRASEBOOK), 'dog_walking', 'beach', 'archery', 'reading', 'cooking', 'watch_a_movie', 'outdoor_yoga', 'bbq'];
const BANDS = ['prime', 'worthALook', 'marginal', 'notToday', 'unsafe'] as const;
const BINDINGS = [undefined, 'windSpeed', 'gust', 'precipitation', 'waterTemperature', 'waveHeight', 'cloudCover', 'soilMoisture', 'humidity', 'visibility', 'windDirection', 'snowDepthCm', 'snowfallRateMmH'];

describe.each(LANGS)('%s: the call, rendered', (lang) => {
  const sentences: Array<{ ctx: string; text: string; verdict: string }> = [];
  for (const [sceneName, weather] of SCENES) {
    for (const sport of SPORTS) {
      for (const band of BANDS) {
        for (const dayIndex of [0, 1, 4]) {
          for (const first of [true, false]) {
            const binding = BINDINGS[(sport.length + dayIndex) % BINDINGS.length];
            const v = makeVerdict({
              suggestion: {
                activityId: sport, score: band === 'prime' ? 85 : band === 'worthALook' ? 65 : band === 'marginal' ? 45 : 20,
                vetoed: band === 'unsafe', ...(binding ? { binding: { key: binding, score: 0.3 } } : {}),
              } as never,
              activityName: (allSports as Array<{ id: string; name: string }>).find((a) => a.id === sport)?.name,
              weather, band, isFirst: first, place: 'Newquay', dayIndex,
              weekday: LOCALES.en.weekday[(dayIndex + 3) % 7], weekdayIdx: (dayIndex + 3) % 7,
              nextYes: LOCALES.en.weekday[(dayIndex + 5) % 7], nextYesIdx: (dayIndex + 5) % 7,
              window: band === 'prime' ? { parts: ['morning', 'afternoon'], ends: ['gust', 'precipitation', 'cloudCover', 'swellPeriod'][dayIndex % 4] } : undefined,
              gusty: dayIndex === 1 && band === 'prime', lang,
            });
            sentences.push({ ctx: `${sceneName}/${sport}/${band}/d${dayIndex}/${first}`, text: asSentence(v), verdict: `${v.leadIn ?? ''} ${v.verdict}`.trim() });
            sentences.push({ ctx: `${sceneName}/${sport}/${band}/d${dayIndex}/${first}/shared`, text: asSharedSentence(v, lang), verdict: '' });
          }
        }
      }
    }
  }

  it('fills every placeholder, in every band and every sport', () => {
    expect(sentences.length).toBeGreaterThan(1000);
    expect(sentences.filter((s) => NO_UNFILLED.test(s.text)).map((s) => `${s.ctx}: ${s.text}`).slice(0, 8)).toEqual([]);
  });

  it('ends every verdict in a full stop', () => {
    expect(sentences.filter((s) => s.verdict && !/[.]$/.test(s.verdict)).map((s) => `${s.ctx}: ${s.verdict}`).slice(0, 8)).toEqual([]);
  });

  it('never says "also" to someone who has not seen the first answer', () => {
    const alt = sentences.filter((s) => /\/false\/shared$/.test(s.ctx));
    const first = sentences.filter((s) => /\/false$/.test(s.ctx));
    expect(alt.length).toBeGreaterThan(0);
    // The shared form of an alternate equals the plain lead-in, so it differs from the on-screen one.
    if (LOCALES[lang].t.lead_is_also !== LOCALES[lang].t.lead_is) {
      const differing = first.filter((s, i) => s.text !== alt[i].text);
      expect(differing.length).toBeGreaterThan(0);
    }
  });

  if (lang !== 'en') {
    it('leaks no English', () => {
      const found = sentences.filter((s) => !s.ctx.endsWith('shared')).flatMap((s) => leaks(lang, s.text).map((w) => `${w} ← ${s.ctx}: "${s.text}"`));
      expect([...new Set(found)].slice(0, 8)).toEqual([]);
    });

    it('keeps a generated verdict short enough for the lockup', () => {
      const long = sentences.filter((s) => s.verdict && s.verdict.length > 64).map((s) => `${s.ctx}: "${s.verdict}" (${s.verdict.length})`);
      expect([...new Set(long)].slice(0, 8)).toEqual([]);
    });
  }

  it('labels the bands and shares the text in the language', () => {
    for (const b of BANDS) expect(bandLabel(b, lang)).toMatch(/\S/);
    const text = shareText({ place: 'Newquay', verdict: 'x.', reason: 'Y.', facts: [], date: '', url: '', photo: '' } as never, lang);
    expect(text).not.toMatch(NO_UNFILLED);
    if (lang !== 'en') expect(text).not.toMatch(/Join me/);
  });

  it('substitutes templates fully', () => {
    expect(fill('{a} and {b}', { a: 1, b: 2 })).toBe('1 and 2');
  });
});
