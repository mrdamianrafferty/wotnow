/**
 * The conditions, said in sentences and drawn — the model behind `/weather`.
 *
 * The page before this was a table: nine sections of label and value, which
 * is a dashboard, and a dashboard makes you do the work of deciding what
 * matters. This decides it. Each section says the one thing worth knowing as a
 * sentence, and hands its drawing the numbers it needs.
 *
 * EVERY SENTENCE IS A RULE, NOT A WRITER. A drawn page changes every hour in
 * every place, so nothing here is phrased by hand for a particular day. Each
 * section has a fixed rule and a fixed set of comparisons — the Beaufort land
 * scale, a 1.75 m person, the WHO's daily limit — and each rule has a band
 * where it says nothing clever and falls back to the plain readings, which are
 * always on the page underneath.
 *
 * Nothing here fetches or renders, so every sentence is testable without a
 * browser — and a sentence that is wrong is worse than a number, because a
 * number at least looks like it might need checking.
 *
 * @module lib/godaisy/conditions/drawn
 */

import { underfoot, UNDERFOOT_BANDS, type Readings, type Row } from '@/lib/godaisy/call/readings';
import { seaWear, type SeaWear } from '@/lib/godaisy/conditions/seaWear';
import {
  rankSections, EVIDENCE_SECTIONS, type EvidenceSectionId, type Weighed,
} from '@/lib/godaisy/call/evidence';
import {
  localeOf, tr_, plural, num as fmt, upperFirst, clock as clockOf, word, list as listOf, dayOfWeek,
} from '@/lib/godaisy/i18n';
import type { LangCode, Locale, TKey } from '@/lib/godaisy/i18n/types';

/** How tall the person in the drawings is. Stated on the page. */
export const PERSON_M = 1.75;
/** WHO 2021 air quality guideline for PM2.5, 24-hour mean, µg/m³. */
export const WHO_PM25_24H = 15;

/* ── What each drawing is given ──────────────────────────────────────── */

export type Drawing =
  | {
    kind: 'thermometers';
    bars: Array<{ label: string; c: number; tone: 'warm' | 'cold' }>;
    gap?: string;
    /** The gap cut into two lines by the locale, so the drawing does not guess at word counts. */
    gapLines?: [string, string];
    gapWindy?: boolean;
  }
  | { kind: 'flags'; flags: Array<{ kmh: number; label?: string }>; first: string; last: string }
  | { kind: 'umbrellas'; days: Array<{ label: string; wet: Wetness; note?: string; strong?: boolean }> }
  | { kind: 'wave'; waveM: number; band: WaveBand; bandLabel?: string; airC?: number; waterC?: number; wear?: SeaWear; wearLabel?: string }
  | {
    kind: 'tide';
    /** Local hours on the first extreme's day; the second may run past 24. */
    from: { h: number; m: number; type: string; label: string };
    to: { h: number; m: number; type: string; label: string };
    rangeM: number;
  }
  | { kind: 'daylight'; riseH: number; setH: number; riseLabel: string; setLabel: string; lengthLabel: string }
  | { kind: 'dots'; value: number; limit: number }
  | { kind: 'footwear'; index: number; frost?: { lowC: number; icy: boolean } }
  | { kind: 'snowDepth'; cm: number }
  | { kind: 'frost'; lowC: number; label: string }
  | { kind: 'visibility'; m: number }
  | {
    kind: 'moon';
    illuminationPct: number;
    waxing: boolean;
    fromH: number;
    event?: { h: number; type: 'set' | 'rise'; label: string };
    /** Local hour from which the sky is moonless, if it gets there before midnight. */
    darkFromH?: number;
  };

export interface DrawnSection {
  id: EvidenceSectionId;
  title: string;
  sentence: string;
  drawing: Drawing | null;
  /** Two or three exact readings, printed small under the drawing. */
  facts: Row[];
  /** When the call sent this page, the criterion that put this section first. */
  because?: Weighed;
  /** Held open for readings still on their way, so it does not pop in later. */
  pending?: boolean;
}

export interface DrawnPage {
  /** "Saturday", or null for today. */
  dayName: string | null;
  sections: DrawnSection[];
  /** Sections that only exist for today, named when a later day is shown. */
  todayOnly: string[];
}

export interface DrawOptions {
  /** 0 is today. */
  day: number;
  now: Date;
  /** The language the page speaks. English when absent. */
  lang?: LangCode;
  coastal: boolean;
  /** From the call: what the scorer weighed, so the page leads with it. */
  weighed?: readonly Weighed[];
  /** Sections whose readings are still loading; kept in place, empty. */
  pending?: readonly EvidenceSectionId[];
}

/* ── Time, in the place's own clock ──────────────────────────────────── */

const zoneOf = (r: Readings) => r.moon?.timezone || 'UTC';

function parts(iso: string | Date, tz: string) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour) + Number(p.minute) / 60 };
}

/** "4:39pm", "7pm", "noon", "midnight" — and "16:39" in every language but English. */
export function clock(h: number, lang?: LangCode): string {
  return clockOf(localeOf(lang), h);
}

const weekday = (L: Locale, dateISO: string, style: 'long' | 'short' = 'long') =>
  (style === 'long' ? L.weekday : L.weekdayShort)[dayOfWeek(dateISO)];

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const r0 = (v: number) => Math.round(v);
const kmh = (ms: number) => ms * 3.6;

/* ── The fixed comparisons ───────────────────────────────────────────── */

/** Beaufort, from km/h. The lower bound of each force from 1 to 12. */
const BEAUFORT_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
export const beaufort = (k: number) => BEAUFORT_KMH.filter((t) => k >= t).length;

/** The Beaufort land descriptions, shortened but not reworded. */
export const BEAUFORT_LAND = localeOf('en').beaufortLand;

export type Wetness = 'dry' | 'light' | 'wet' | 'snow';

export type WaveBand = 'ankle' | 'knee' | 'waist' | 'chest' | 'head' | 'overhead';
export function waveBand(m: number): WaveBand {
  if (m < 0.3) return 'ankle';
  if (m < 0.6) return 'knee';
  if (m < 1.0) return 'waist';
  if (m < 1.4) return 'chest';
  if (m < 1.9) return 'head';
  return 'overhead';
}

/** A tide's rise or fall, in grown-ups. Below one person it says a height on one. */
export function inPeople(rangeM: number, lang?: LangCode): string {
  const L = localeOf(lang);
  if (rangeM < 0.6) return tr_(L, 'people_knee');
  if (rangeM < 1.0) return tr_(L, 'people_waist');
  if (rangeM < 1.5) return tr_(L, 'people_chest');
  const p = rangeM / PERSON_M;
  if (p < 1.15) return tr_(L, 'people_one');
  if (p < 1.4) return tr_(L, 'people_bit_more');
  if (p < 1.75) return tr_(L, 'people_and_half');
  if (p < 2.15) return tr_(L, 'people_two');
  if (p < 2.75) return tr_(L, 'people_two_more');
  return plural(L, 'people_many', Math.round(p));
}

const UV_KEY = (uv: number): TKey => (uv < 3 ? 'uv_low' : uv < 6 ? 'uv_moderate' : uv < 8 ? 'uv_high' : uv < 11 ? 'uv_very_high' : 'uv_extreme');

const compass = (L: Locale, deg: number) => L.compassShort[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/* ── The sections ────────────────────────────────────────────────────── */

interface Ctx {
  L: Locale;
  r: Readings;
  tz: string;
  day: number;
  now: Date;
  today: string;
  /** The date this page is about. */
  date: string;
  nowH: number;
  /** Every hourly reading, with its time in the place's clock. */
  hours: Hour[];
}

type Hour = NonNullable<Readings['hourly']>[number] & { t: number; h: number; date: string };

const FOG_CODES = new Set([45, 48]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const isFog = (x: Hour) => num(x.weatherCode) && FOG_CODES.has(x.weatherCode);

/** The hours from now to `ahead` hours on. */
const fromNow = (ctx: Ctx, ahead: number) =>
  ctx.hours.filter((x) => x.t >= ctx.now.getTime() - 30 * 60_000 && x.t <= ctx.now.getTime() + ahead * 3_600_000);

/** The reading nearest a moment: now for today, midday for a later day. */
function nearestHour(ctx: Ctx, ok: (x: Hour) => boolean): Hour | undefined {
  const target = ctx.day === 0
    ? ctx.now.getTime()
    : ctx.hours.find((x) => x.date === ctx.date && x.h >= 12)?.t;
  if (target === undefined) return undefined;
  return ctx.hours.filter(ok).sort((a, b) => Math.abs(a.t - target) - Math.abs(b.t - target))[0];
}

/** −3°, not -3°. */
const deg = (c: number) => { const n = r0(c); return n < 0 ? `−${-n}°` : `${n}°`; };

/** "today", "tomorrow", "on Saturday" — or, with `kind` 'until', "until Saturday"; 'label' is the bare, capitalised name. */
function dayWord(ctx: Ctx, i: number, kind: 'on' | 'until' | 'label' = 'on'): string {
  const { L } = ctx;
  if (i === 0) return kind === 'label' ? L.todayLabel : L.todayMid;
  if (i === 1) return kind === 'label' ? L.tomorrowLabel : kind === 'until' ? L.tomorrowUntil : L.tomorrowMid;
  const d = ctx.r.daily?.[i]?.dateISO;
  if (!d) return tr_(L, 'day_later');
  const k = dayOfWeek(d);
  return kind === 'label' ? L.weekday[k] : kind === 'until' ? L.weekdayUntil[k] : L.weekdayOn[k];
}

/** A template, filled, in this page's language. */
const T = (ctx: Ctx, key: TKey, vars?: Record<string, string | number>) => tr_(ctx.L, key, vars);
const ck = (ctx: Ctx, h: number) => clockOf(ctx.L, h);
const f1 = (ctx: Ctx, v: number, dp = 1) => fmt(ctx.L, v, dp);
const title = (ctx: Ctx, id: EvidenceSectionId): string => T(ctx, `title_${id}` as TKey);

function temperature(ctx: Ctx): DrawnSection | null {
  const { r, day } = ctx;
  const id = 'temperature' as const;
  if (day > 0) {
    const d = r.daily?.[day];
    if (!num(d?.minC) || !num(d?.maxC)) return null;
    return {
      id, title: title(ctx, id),
      sentence: r0(d.minC) === r0(d.maxC)
        ? T(ctx, 'temp_allday', { t: r0(d.maxC) })
        : T(ctx, 'temp_range', { lo: r0(d.minC), hi: r0(d.maxC) }),
      drawing: {
        kind: 'thermometers',
        bars: [
          { label: T(ctx, 'bar_low', { t: r0(d.minC) }), c: d.minC, tone: 'cold' },
          { label: T(ctx, 'bar_high', { t: r0(d.maxC) }), c: d.maxC, tone: 'warm' },
        ],
      },
      facts: [
        { label: T(ctx, 'fact_low'), value: `${f1(ctx, d.minC)}°C` },
        { label: T(ctx, 'fact_high'), value: `${f1(ctx, d.maxC)}°C` },
      ],
    };
  }
  if (!num(r.temperatureC)) return null;
  const a = r.temperatureC;
  const f = num(r.feelsLikeC) ? r.feelsLikeC : null;
  const facts: Row[] = [{ label: T(ctx, 'fact_air'), value: `${f1(ctx, a)}°C` }];
  if (f !== null) facts.push({ label: T(ctx, 'fact_feels'), value: `${f1(ctx, f)}°C` });
  if (num(r.daily?.[0]?.minC)) facts.push({ label: T(ctx, 'fact_low_today'), value: `${f1(ctx, r.daily[0].minC)}°C` });

  // Two degrees, the same cut-off the plain headline has always used.
  if (f === null || Math.abs(f - a) < 2) {
    return {
      id, title: title(ctx, id),
      sentence: T(ctx, 'temp_same', { a: r0(a) }),
      drawing: { kind: 'thermometers', bars: [{ label: T(ctx, 'bar_air', { t: r0(a) }), c: a, tone: a < 10 ? 'cold' : 'warm' }] },
      facts,
    };
  }
  // A cause only when the readings show it. Feels-like is a model, and naming
  // the wrong reason is a worse error than naming none.
  const windy = num(r.windSpeedMS) && kmh(r.windSpeedMS) >= 10;
  const humid = num(r.humidityPct) && r.humidityPct >= 60;
  const sentenceKey: TKey = f < a ? (windy ? 'temp_diff_wind' : 'temp_diff_plain') : (humid ? 'temp_diff_humid' : 'temp_diff_plain');
  const gap = Math.abs(r0(a) - r0(f));
  const gapText = f < a ? (windy ? T(ctx, 'gap_wind', { n: gap }) : T(ctx, 'gap_colder', { n: gap })) : T(ctx, 'gap_warmer', { n: gap });
  /*
   * The drawing writes the gap on two lines, the second one bold. English cut
   * it at the last two words, which is a fact about English. The same rule is
   * applied to the words each locale wrote: three or more words split before
   * the last two, fewer stay on one line.
   */
  const words = gapText.split(' ');
  const gapLines: [string, string] = words.length > 2
    ? [words.slice(0, -2).join(' '), words.slice(-2).join(' ')]
    : ['', gapText];
  return {
    id, title: title(ctx, id),
    sentence: T(ctx, sentenceKey, { a: r0(a), f: r0(f) }),
    drawing: {
      kind: 'thermometers',
      bars: [
        { label: T(ctx, 'bar_air', { t: r0(a) }), c: a, tone: 'warm' },
        { label: T(ctx, 'bar_feels', { t: r0(f) }), c: f, tone: f < a ? 'cold' : 'warm' },
      ],
      gap: gapText,
      gapLines,
      gapWindy: f < a && windy,
    },
    facts,
  };
}

/** The hours this section looks at: the next day from now, or the daylight hours of a later day. */
function windowHours(ctx: Ctx) {
  const out: Array<{ h: number; date: string; kmh: number; deg?: number }> = [];
  const start = ctx.now.getTime() - 30 * 60_000;
  for (const x of ctx.r.hourly ?? []) {
    if (!x.timeISO || !num(x.windMS)) continue;
    const t = new Date(x.timeISO).getTime();
    const p = parts(x.timeISO, ctx.tz);
    if (ctx.day === 0 ? (t >= start && t <= start + 24.5 * 3_600_000) : (p.date === ctx.date && p.h >= 6 && p.h <= 22)) {
      out.push({ h: p.h, date: p.date, kmh: kmh(x.windMS), deg: x.windDeg });
    }
  }
  return out;
}

function wind(ctx: Ctx): DrawnSection | null {
  const { r, day, L } = ctx;
  const id = 'wind' as const;
  const hours = windowHours(ctx);
  const when = (x: { h: number; date: string }) => (x.date !== ctx.date
    ? T(ctx, 'wind_time_tomorrow', { time: ck(ctx, x.h) })
    : ck(ctx, x.h));
  const land = (f: number) => L.beaufortLand[f];

  const flags = hours.length >= 6
    ? hours.filter((_, i) => i % 2 === 0).slice(0, 13).map((x, i) => ({ kmh: x.kmh, label: i % 2 === 0 ? ck(ctx, x.h) : undefined }))
    : null;
  const drawing: Drawing | null = flags && flags.length >= 4
    ? {
      kind: 'flags', flags,
      first: T(ctx, 'wind_kmh', { kmh: r0(flags[0].kmh) }),
      last: T(ctx, 'wind_kmh', { kmh: r0(flags[flags.length - 1].kmh) }),
    }
    : null;

  if (day > 0) {
    if (hours.length) {
      const top = hours.reduce((a, b) => (b.kmh > a.kmh ? b : a));
      const f = beaufort(top.kmh);
      return {
        id, title: title(ctx, id),
        sentence: T(ctx, 'wind_top_day', { f, time: ck(ctx, top.h), land: land(f) }),
        drawing,
        facts: [
          { label: T(ctx, 'fact_strongest'), value: T(ctx, 'wind_kmh', { kmh: r0(top.kmh) }) },
          ...(num(top.deg) ? [{ label: T(ctx, 'fact_from_the'), value: compass(L, top.deg) }] : []),
        ],
      };
    }
    const d = r.daily?.[day];
    if (!num(d?.windMS)) return null;
    const f = beaufort(kmh(d.windMS));
    return {
      id, title: title(ctx, id),
      sentence: T(ctx, 'wind_avg_day', { f, land: land(f) }),
      drawing: null,
      facts: [{ label: T(ctx, 'fact_average'), value: T(ctx, 'wind_kmh', { kmh: r0(kmh(d.windMS)) }) }],
    };
  }

  const nowK = num(r.windSpeedMS) ? kmh(r.windSpeedMS) : hours[0]?.kmh;
  if (!num(nowK)) return null;
  const f0 = beaufort(nowK);
  const later = hours.slice(2);
  const facts: Row[] = [{
    label: T(ctx, 'fact_now'),
    value: num(r.windDeg)
      ? T(ctx, 'wind_now_from', { kmh: r0(nowK), dir: compass(L, r.windDeg) })
      : T(ctx, 'wind_kmh', { kmh: r0(nowK) }),
  }];
  let sentence = T(ctx, 'wind_next_day', { f: f0, land: land(f0) });
  if (later.length) {
    const max = later.reduce((a, b) => (b.kmh > a.kmh ? b : a));
    const min = later.reduce((a, b) => (b.kmh < a.kmh ? b : a));
    if (beaufort(max.kmh) >= f0 + 2) {
      const fm = beaufort(max.kmh);
      sentence = T(ctx, 'wind_build', { f0, fm, when: when(max) });
      facts.push({ label: T(ctx, 'fact_strongest'), value: T(ctx, 'wind_peak_at', { kmh: r0(max.kmh), when: when(max) }) });
    } else if (beaufort(min.kmh) <= f0 - 2) {
      const fm = beaufort(min.kmh);
      const first = later.find((x) => beaufort(x.kmh) === fm) ?? min;
      sentence = T(ctx, 'wind_ease', { f0, fm, when: when(first), land: land(fm) });
      facts.push({ label: T(ctx, 'fact_lightest'), value: T(ctx, 'wind_peak_at', { kmh: r0(min.kmh), when: when(min) }) });
    }
  }
  return { id, title: title(ctx, id), sentence: upperFirst(L, sentence), drawing, facts };
}

export function wetness(d: { precipMM?: number; summary?: string } | undefined): Wetness {
  // Snow before amount: a day's millimetres are the same whether they fall as
  // rain or as snow, and an umbrella is the wrong drawing for snow.
  if (/snow|sleet/.test((d?.summary ?? '').toLowerCase())) return 'snow';
  if (num(d?.precipMM)) return d.precipMM >= 2 ? 'wet' : d.precipMM >= 0.2 ? 'light' : 'dry';
  const s = (d?.summary ?? '').toLowerCase();
  if (!/rain|shower|drizzle|snow|sleet|thunder/.test(s)) return 'dry';
  return /light|drizzle/.test(s) ? 'light' : 'wet';
}

/** Snow in the hourly forecast for that date, where the hours reach it. */
function snowsOn(ctx: Ctx, date?: string): boolean {
  return Boolean(date) && ctx.hours.some((x) => x.date === date
    && ((num(x.snowfallRateMmH) && x.snowfallRateMmH >= 1) || (num(x.weatherCode) && SNOW_CODES.has(x.weatherCode))));
}

function rain(ctx: Ctx): DrawnSection | null {
  const { L } = ctx;
  const daily = ctx.r.daily ?? [];
  if (!daily[ctx.day]) return null;
  const from = ctx.day;
  const span = daily.slice(from, from + 7).map((d, k) => ({
    i: from + k, d, w: (snowsOn(ctx, d.dateISO) ? 'snow' : wetness(d)) as Wetness,
  }));
  const sel = span[0];
  const firstWet = span.slice(1).find((x) => x.w !== 'dry');
  const firstDry = span.slice(1).find((x) => x.w === 'dry');
  const anySnow = span.some((x) => x.w === 'snow');

  let sentence: string;
  const notes = new Map<number, string>();
  if (sel.w === 'dry') {
    if (firstWet?.w === 'snow') {
      sentence = T(ctx, 'rain_dry_then_snow', { until: dayWord(ctx, firstWet.i, 'until') });
      notes.set(firstWet.i, T(ctx, 'note_first_snow'));
    } else if (firstWet) {
      sentence = T(ctx, 'rain_dry_umbrella', { until: dayWord(ctx, firstWet.i, 'until') });
      notes.set(firstWet.i, T(ctx, 'note_first_rain'));
    } else {
      sentence = T(ctx, 'rain_none');
    }
  } else {
    if (sel.w === 'snow') {
      sentence = T(ctx, 'rain_snow', { on: dayWord(ctx, sel.i) });
    } else {
      const mm = num(sel.d.precipMM) && sel.d.precipMM >= 1 ? T(ctx, 'rain_mm', { mm: r0(sel.d.precipMM) }) : '';
      sentence = T(ctx, sel.w === 'light' ? 'rain_showers' : 'rain_rain', { on: dayWord(ctx, sel.i), mm });
    }
    if (firstDry) {
      sentence += T(ctx, 'rain_then_dry', { on: dayWord(ctx, firstDry.i) });
      notes.set(firstDry.i, T(ctx, 'note_dry_again'));
    }
  }
  sentence = upperFirst(L, sentence);

  const mmFact = (v: number, snow: boolean) => T(ctx, snow ? 'mm_as_water' : 'mm_plain', { mm: f1(ctx, v) });
  return {
    id: 'rain', title: T(ctx, anySnow ? 'title_rain_snow' : 'title_rain'),
    sentence,
    drawing: {
      kind: 'umbrellas',
      days: span.map((x) => ({
        label: x.d.dateISO ? weekday(L, x.d.dateISO, 'short') : '',
        wet: x.w,
        strong: x.i === from || notes.has(x.i),
        note: x.i === from ? T(ctx, from === 0 ? 'note_today' : 'note_this_day') : notes.get(x.i),
      })),
    },
    facts: [
      ...(num(sel.d.precipMM) ? [{ label: dayWord(ctx, sel.i, 'label'), value: mmFact(sel.d.precipMM, sel.w === 'snow') }] : []),
      ...(firstWet && sel.w === 'dry' && firstWet.d.dateISO
        ? [{ label: T(ctx, firstWet.w === 'snow' ? 'fact_first_snow' : 'fact_first_rain'), value: weekday(L, firstWet.d.dateISO) }]
        : []),
    ],
  };
}

function sea(ctx: Ctx): DrawnSection | null {
  const { r, day, L } = ctx;
  const id = 'sea' as const;
  let waveM: number | undefined;
  let waterC: number | undefined;
  let airC: number | undefined;
  if (day === 0) {
    waveM = r.marine?.waveHeight ?? r.hourly?.find((h) => num(h.waveHeightM))?.waveHeightM;
    waterC = r.marineHourly?.find((m) => num(m.waterTempC))?.waterTempC ?? r.seaTemp;
    airC = r.temperatureC;
  } else {
    // Midday on that day: the hour people go in.
    const near = <T2 extends { timeISO?: string }>(xs: T2[] | undefined, ok: (x: T2) => boolean) => (xs ?? [])
      .filter((x) => x.timeISO && ok(x) && parts(x.timeISO, ctx.tz).date === ctx.date)
      .sort((a, b) => Math.abs(parts(a.timeISO!, ctx.tz).h - 12) - Math.abs(parts(b.timeISO!, ctx.tz).h - 12))[0];
    waveM = near(r.hourly, (h) => num(h.waveHeightM))?.waveHeightM ?? near(r.marineHourly, (m) => num(m.waveHeightM))?.waveHeightM;
    waterC = near(r.marineHourly, (m) => num(m.waterTempC))?.waterTempC;
    airC = r.daily?.[day]?.maxC;
  }
  if (!num(waveM) && !num(waterC)) return null;

  const facts: Row[] = [];
  if (num(waveM)) facts.push({ label: T(ctx, 'fact_waves'), value: `${f1(ctx, waveM)} m` });
  if (num(waterC)) facts.push({ label: T(ctx, 'fact_water'), value: `${f1(ctx, waterC)}°C` });
  if (day === 0 && num(r.marine?.swellPeriod ?? r.marine?.wavePeriod)) {
    facts.push({ label: T(ctx, 'fact_period'), value: `${r0((r.marine!.swellPeriod ?? r.marine!.wavePeriod)!)} s` });
  }

  /*
   * The water's temperature is said as what to wear in it — the wetsuit ladder
   * from `seaWear` — because "14°" means nothing until you know it is a 4/3
   * and boots. The air-versus-water comparison stays in the drawing.
   */
  const wear = num(waterC) ? seaWear(waterC, L.code) : null;
  if (wear) facts.push({ label: T(ctx, 'fact_wear'), value: wear.short });
  const dressed = wear ? T(ctx, 'sea_dressed', { t: r0(waterC!), say: wear.say }) : '';
  if (!num(waveM)) {
    return { id, title: title(ctx, id), sentence: T(ctx, 'sea_water_only', { t: r0(waterC!), say: upperFirst(L, wear!.say) }), drawing: null, facts };
  }
  const band = waveBand(waveM);
  const bandLabel = T(ctx, `band_${band}` as TKey);
  const lead = band === 'overhead'
    ? T(ctx, 'sea_overhead', { m: f1(ctx, waveM) })
    : T(ctx, 'sea_waves', { band: bandLabel });
  return {
    id, title: title(ctx, id),
    sentence: dressed ? T(ctx, 'sea_join', { lead, dressed }) : lead,
    drawing: {
      kind: 'wave', waveM, band, bandLabel,
      airC: num(airC) ? airC : undefined, waterC: num(waterC) ? waterC : undefined,
      wear: wear?.id, wearLabel: wear?.short,
    },
    facts,
  };
}

function tide(ctx: Ctx): DrawnSection | null {
  const { L } = ctx;
  const id = 'tide' as const;
  const xs = (ctx.r.tides ?? [])
    .filter((t) => t.time && num(t.height))
    .map((t) => ({ t: new Date(t.time!).getTime(), iso: t.time!, m: t.height!, type: t.type === 'high' ? 'high' : 'low' }))
    .sort((a, b) => a.t - b.t);
  /*
   * Today: the next rise or fall from now. A later day: the first one that
   * starts after six in the morning, because the 1am-to-7am tide is a true
   * answer nobody planning a day out was asking.
   */
  let i = ctx.day === 0
    ? xs.findIndex((x) => x.t >= ctx.now.getTime())
    : xs.findIndex((x) => parts(x.iso, ctx.tz).date === ctx.date && parts(x.iso, ctx.tz).h >= 6);
  if (i < 0 && ctx.day > 0) i = xs.findIndex((x) => parts(x.iso, ctx.tz).date === ctx.date);
  const a = i >= 0 ? xs[i] : undefined;
  const b = i >= 0 ? xs[i + 1] : undefined;
  if (!a || !b) return null;

  const pa = parts(a.iso, ctx.tz);
  const pb = parts(b.iso, ctx.tz);
  const hb = pa.h + (b.t - a.t) / 3_600_000;
  const range = Math.abs(b.m - a.m);
  const rising = b.m > a.m;
  const ta = ck(ctx, pa.h);
  const tb = ck(ctx, hb);
  // "tomorrow" once, after the last time that needs it.
  const next = (date: string) => ctx.day === 0 && date !== ctx.date;
  const when = (next(pa.date) || next(pb.date))
    ? T(ctx, 'tide_times_tomorrow', { a: ta, b: tb })
    : T(ctx, 'tide_times', { a: ta, b: tb });
  const typeFact = (t: string) => T(ctx, t === 'high' ? 'fact_high_tide' : 'fact_low_tide');
  return {
    id, title: title(ctx, id),
    sentence: T(ctx, rising ? 'tide_rises' : 'tide_falls', { when, m: f1(ctx, range), people: inPeople(range, L.code) }),
    drawing: {
      kind: 'tide',
      from: { h: pa.h, m: a.m, type: a.type, label: ta },
      to: { h: hb, m: b.m, type: b.type, label: tb },
      rangeM: range,
    },
    facts: [
      { label: typeFact(a.type), value: `${f1(ctx, a.m)} m · ${ta}` },
      { label: typeFact(b.type), value: `${f1(ctx, b.m)} m · ${tb}` },
    ],
  };
}

/** "about 400 m, four football pitches". A pitch is about 100 m. */
export function howFar(m: number, lang?: LangCode): string {
  const L = localeOf(lang);
  if (m < 100) return tr_(L, 'far_under', { m: Math.max(10, Math.round(m / 10) * 10) });
  const pitches = Math.round(m / 100);
  const dist = m >= 1000
    ? tr_(L, 'dist_km', { km: fmt(L, Math.round(m / 100) / 10, Math.round(m / 100) % 10 ? 1 : 0) })
    : tr_(L, 'dist_m', { m: Math.round(m / 50) * 50 });
  return pitches === 1
    ? tr_(L, 'far_about_one', { dist })
    : plural(L, 'far_about', pitches, { dist, n: word(L, pitches) });
}

function sky(ctx: Ctx): DrawnSection | null {
  const { r, day, L } = ctx;
  const id = 'sky' as const;
  const rise = day === 0 ? (r.sunriseISO ?? r.daily?.[0]?.sunriseISO) : r.daily?.[day]?.sunriseISO;
  const set = day === 0 ? (r.sunsetISO ?? r.daily?.[0]?.sunsetISO) : r.daily?.[day]?.sunsetISO;
  const riseH = rise ? parts(rise, ctx.tz).h : null;
  const setH = set ? parts(set, ctx.tz).h : null;
  const light = riseH !== null && setH !== null && setH > riseH;

  const facts: Row[] = [];
  if (light) facts.push({ label: T(ctx, 'fact_sunrise'), value: ck(ctx, riseH) }, { label: T(ctx, 'fact_sunset'), value: ck(ctx, setH) });
  if (day === 0 && num(r.cloudsPct)) facts.push({ label: T(ctx, 'fact_cloud'), value: `${r0(r.cloudsPct)}%` });
  if (day === 0 && num(r.uvi)) facts.push({ label: T(ctx, 'fact_uv'), value: T(ctx, 'uv_fmt', { n: r0(r.uvi), word: T(ctx, UV_KEY(r.uvi)) }) });

  /*
   * FOG FIRST. Fog under a kilometre is what changes a day out — a walk on
   * the tops, a drive, a paddle — so when it is here it is the sentence, said
   * as how far you can see, and the daylight drops to the small print.
   */
  if (day === 0) {
    const vis = num(r.visibilityKm) ? r.visibilityKm * 1000 : null;
    const now = nearestHour(ctx, () => true);
    const fogCoded = Boolean(now && isFog(now));
    const fog = (vis !== null && vis < 1000) || fogCoded;
    const mist = !fog && vis !== null && vis < 2000;
    if (fog || mist) {
      if (vis !== null) {
        facts.unshift({
          label: T(ctx, 'fact_visibility'),
          value: vis < 1000
            ? T(ctx, 'vis_m', { m: Math.round(vis / 50) * 50 })
            : T(ctx, 'vis_km', { km: f1(ctx, vis / 1000) }),
        });
      }
      const clears = fogCoded ? fromNow(ctx, 12).find((x) => x.t > ctx.now.getTime() && !isFog(x)) : undefined;
      const until = clears ? T(ctx, 'fog_clearing', { time: ck(ctx, clears.h) }) : '';
      return {
        id, title: title(ctx, id),
        sentence: vis !== null
          ? T(ctx, fog ? 'sky_fog' : 'sky_mist', { far: howFar(vis, L.code), until })
          : T(ctx, 'sky_foggy_now', { until }),
        drawing: vis !== null ? { kind: 'visibility', m: vis } : null,
        facts,
      };
    }
  }

  // Fog coming: today in the next eighteen hours, or a later day's daylight hours.
  const coming = day === 0
    ? fromNow(ctx, 18).filter((x) => x.t > ctx.now.getTime() && isFog(x))
    : ctx.hours.filter((x) => x.date === ctx.date && x.h >= 5 && x.h <= 22 && isFog(x));
  let fogNote = '';
  if (coming.length) {
    const first = coming[0];
    const last = coming[coming.length - 1];
    fogNote = day > 0 && first.h <= 7
      ? T(ctx, 'fog_until', { time: ck(ctx, last.h + 1) })
      : T(ctx, day === 0 && first.date !== ctx.date ? 'fog_likely_tonight' : 'fog_likely', { time: ck(ctx, first.h) });
  }

  if (!light) {
    return fogNote ? { id, title: title(ctx, id), sentence: fogNote, drawing: null, facts } : null;
  }
  const len = setH - riseH;
  const half = Math.round(len * 2) / 2;
  const hoursN = `${Math.floor(half)}${half % 1 ? '½' : ''}`;
  const hours = plural(L, 'hours', half % 1 ? 0.5 : Math.floor(half), { n: hoursN });
  const base = len < 12
    ? T(ctx, 'sky_short_day', { hours, time: ck(ctx, setH) })
    : T(ctx, 'sky_long_day', { hours, time: ck(ctx, setH) });
  return {
    id, title: title(ctx, id),
    sentence: fogNote ? T(ctx, 'sky_join', { base, fog: fogNote }) : base,
    drawing: {
      kind: 'daylight', riseH, setH,
      riseLabel: T(ctx, 'draw_sunrise', { time: ck(ctx, riseH) }),
      setLabel: T(ctx, 'draw_sunset', { time: ck(ctx, setH) }),
      lengthLabel: T(ctx, 'draw_daylength', { h: Math.floor(len), m: r0((len % 1) * 60) }),
    },
    facts,
  };
}

function air(ctx: Ctx): DrawnSection | null {
  if (ctx.day > 0) return null;
  const { L } = ctx;
  const r = ctx.r;
  const pm = r.airQuality?.components?.pm2_5;
  const facts: Row[] = [];
  if (num(pm)) facts.push({ label: T(ctx, 'fact_pm25'), value: `${f1(ctx, pm)} µg/m³` });
  if (num(r.humidityPct)) facts.push({ label: T(ctx, 'fact_humidity'), value: `${r0(r.humidityPct)}%` });
  if (num(r.pressureHpa)) {
    const trend = r.pressureTrend ? (L.t[`trend_${r.pressureTrend}`] ?? r.pressureTrend) : '';
    facts.push({
      label: T(ctx, 'fact_pressure'),
      value: trend ? T(ctx, 'pressure_trend', { hpa: r0(r.pressureHpa), trend }) : `${r0(r.pressureHpa)} hPa`,
    });
  }
  if (!num(pm)) return null;
  const f = pm / WHO_PM25_24H;
  const sentence = T(ctx, f < 1 / 3 ? 'air_clean' : f < 0.6 ? 'air_half' : f < 1 ? 'air_most' : 'air_over');
  return { id: 'air', title: title(ctx, 'air'), sentence, drawing: { kind: 'dots', value: pm, limit: WHO_PM25_24H }, facts };
}

/** Snow lying, in cm, at now or midday. */
function snowLyingCm(ctx: Ctx): number | null {
  const x = nearestHour(ctx, (h) => num(h.snowDepthCm));
  return x && num(x.snowDepthCm) ? x.snowDepthCm : null;
}

/** Snow against a leg: where on you it comes up to. */
export function snowDeep(cm: number): string {
  if (cm < 12) return 'ankle';
  if (cm < 30) return 'shin';
  if (cm < 55) return 'knee';
  if (cm < 80) return 'thigh';
  return 'waist';
}

/** The coldest it gets overnight: the next eighteen hours, or a later day's low. */
function overnightLow(ctx: Ctx): number | null {
  if (ctx.day > 0) {
    const v = ctx.r.daily?.[ctx.day]?.minC;
    return num(v) ? v : null;
  }
  const temps = fromNow(ctx, 18).map((x) => x.tempC).filter(num);
  return temps.length ? Math.min(...temps) : null;
}

function ground(ctx: Ctx): DrawnSection | null {
  const { L } = ctx;
  const id = 'ground' as const;
  const low = overnightLow(ctx);
  const frost = low !== null && low <= 0 ? low : null;
  const lowFact: Row[] = frost !== null ? [{ label: T(ctx, 'fact_low_overnight'), value: `${f1(ctx, frost)}°C` }] : [];

  /*
   * Snow lying beats everything: under it, nobody cares whether the soil is
   * soggy. It is said against a leg, ankle to waist, because "9 cm" is a
   * number and "ankle deep" is a pair of boots.
   */
  const snow = snowLyingCm(ctx);
  if (snow !== null && snow >= 1) {
    return {
      id, title: title(ctx, id),
      sentence: snow < 3
        ? T(ctx, 'snow_dusting')
        : T(ctx, 'snow_lying', { cm: r0(snow), deep: T(ctx, `snow_deep_${snowDeep(snow)}` as TKey) }),
      drawing: { kind: 'snowDepth', cm: snow },
      facts: [{ label: T(ctx, 'fact_snow_lying'), value: `${r0(snow)} cm` }, ...lowFact],
    };
  }

  const frostSaid = (lowC: number) => T(ctx, 'frost_said', { t: deg(lowC) });
  const downTo = (lowC: number) => T(ctx, 'draw_down_to', { t: deg(lowC) });
  if (ctx.day > 0) {
    if (frost === null) return null;
    return {
      id, title: title(ctx, id),
      sentence: frostSaid(frost),
      drawing: { kind: 'frost', lowC: frost, label: downTo(frost) },
      facts: lowFact,
    };
  }

  const s = ctx.r.soil;
  const band = underfoot(s?.moisture0to1, s?.temp0cm);
  const soilFact: Row[] = num(s?.temp0cm) ? [{ label: T(ctx, 'fact_soil_surface'), value: `${f1(ctx, s.temp0cm)}°C` }] : [];
  if (!band) {
    return frost === null ? null : {
      id, title: title(ctx, id), sentence: frostSaid(frost),
      drawing: { kind: 'frost', lowC: frost, label: downTo(frost) }, facts: lowFact,
    };
  }
  const bandFact: Row = { label: T(ctx, 'fact_underfoot'), value: L.underfoot[band].label };
  if (band === 'Frozen hard') {
    const coldest = frost ?? s!.temp0cm!;
    return {
      id, title: title(ctx, id),
      sentence: frost !== null ? T(ctx, 'ground_frozen_low', { t: deg(frost) }) : L.underfoot['Frozen hard'].say,
      drawing: {
        kind: 'frost', lowC: coldest,
        label: frost !== null ? downTo(frost) : T(ctx, 'draw_ground_temp', { t: deg(s!.temp0cm!) }),
      },
      facts: [bandFact, ...soilFact, ...lowFact],
    };
  }

  /*
   * Frost on wet ground is ice. Soggy or worse, with the air going below
   * zero, the puddles and the mud are what you will be walking on at dawn.
   */
  const index = (UNDERFOOT_BANDS as readonly string[]).indexOf(band);
  const icy = frost !== null && index >= 3;
  return {
    id, title: title(ctx, id),
    sentence: frost !== null
      ? `${T(ctx, 'ground_with_frost', { say: L.underfoot[band].say, frost: frostSaid(frost) })}${icy ? T(ctx, 'frost_icy_tail') : ''}`
      : L.underfoot[band].say,
    drawing: { kind: 'footwear', index, frost: frost !== null ? { lowC: frost, icy } : undefined },
    facts: [bandFact, ...soilFact, ...lowFact],
  };
}

function night(ctx: Ctx): DrawnSection | null {
  if (ctx.day > 0) return null;
  const { r } = ctx;
  const id = 'night' as const;
  const illum = r.moon?.illuminationPct;
  const setISO = r.sunsetISO ?? r.daily?.[0]?.sunsetISO;
  if (!num(illum) || !setISO) return null;
  const phase = r.daily?.[0]?.moonPhase ?? r.moon?.phaseFraction;
  const sunsetH = parts(setISO, ctx.tz).h;
  const fromH = Math.floor(sunsetH);
  const evening = (iso?: string) => {
    if (!iso) return null;
    const p = parts(iso, ctx.tz);
    return p.date === ctx.today && p.h > sunsetH ? p.h : null;
  };
  const sameDay = (iso?: string) => (iso && parts(iso, ctx.tz).date === ctx.today ? parts(iso, ctx.tz).h : null);
  const setH = evening(r.moon?.moonsetISO);
  const riseH = evening(r.moon?.moonriseISO);
  const size = T(ctx, illum < 25 ? 'moon_thin' : illum < 60 ? 'moon_half' : illum < 95 ? 'moon_big' : 'moon_full');
  const waxing = num(phase) ? phase < 0.5 : true;
  const pct = r0(illum);
  const facts: Row[] = [{
    label: T(ctx, 'fact_moon'),
    value: num(phase)
      ? T(ctx, 'moon_lit_phase', { pct, phase: T(ctx, waxing ? 'moon_waxing' : 'moon_waning') })
      : T(ctx, 'moon_lit', { pct }),
  }];

  let sentence: string;
  let event: Extract<Drawing, { kind: 'moon' }>['event'];
  let darkFromH: number | undefined;
  if (illum < 3) {
    sentence = T(ctx, 'night_none');
    darkFromH = sunsetH;
  } else if (setH !== null) {
    sentence = T(ctx, 'night_sets', { size, time: ck(ctx, setH) });
    event = { h: setH, type: 'set', label: T(ctx, 'draw_moon_sets', { time: ck(ctx, setH) }) };
    darkFromH = setH;
    facts.push({ label: T(ctx, 'fact_moonset'), value: ck(ctx, setH) });
  } else if (riseH !== null) {
    sentence = T(ctx, 'night_rises', { size, time: ck(ctx, riseH) });
    event = { h: riseH, type: 'rise', label: T(ctx, 'draw_moon_rises', { time: ck(ctx, riseH) }) };
    facts.push({ label: T(ctx, 'fact_moonrise'), value: ck(ctx, riseH) });
  } else {
    // Neither event in the evening: up the whole time, or down the whole time.
    const rose = sameDay(r.moon?.moonriseISO);
    const sank = sameDay(r.moon?.moonsetISO);
    const up = rose !== null && rose < sunsetH && (sank === null || sank < rose);
    sentence = up ? T(ctx, 'night_up', { size }) : T(ctx, 'night_none_evening');
    if (!up) darkFromH = sunsetH;
  }
  return {
    id, title: title(ctx, id),
    sentence,
    drawing: { kind: 'moon', illuminationPct: illum, waxing, fromH, event, darkFromH },
    facts,
  };
}

const BUILD: Record<EvidenceSectionId, (c: Ctx) => DrawnSection | null> = {
  temperature, wind, rain, sea, tide, sky, air, ground, night,
};

/**
 * The page's order with nothing from the call: the order a person asks, the
 * same as the table it replaced — what it is like, what is falling, the water,
 * then everything else.
 */
const ORDER: readonly EvidenceSectionId[] = [
  'temperature', 'wind', 'rain', 'sea', 'tide', 'sky', 'air', 'ground', 'night',
];
const COASTAL_ONLY = new Set<EvidenceSectionId>(['sea', 'tide']);
const TODAY_ONLY: Partial<Record<EvidenceSectionId, TKey>> = {
  air: 'todayonly_air', ground: 'todayonly_ground', night: 'todayonly_night', sky: 'todayonly_sky',
};

export function drawConditions(r: Readings | null, opts: DrawOptions): DrawnPage {
  if (!r) return { dayName: null, sections: [], todayOnly: [] };
  const L = localeOf(opts.lang);
  const tz = zoneOf(r);
  const today = parts(opts.now, tz).date;
  const day = Math.max(0, Math.min(opts.day, (r.daily?.length ?? 1) - 1));
  const date = day === 0 ? today : (r.daily?.[day]?.dateISO ?? today);
  const hours: Hour[] = (r.hourly ?? [])
    .filter((x) => x.timeISO)
    .map((x) => ({ ...x, t: new Date(x.timeISO!).getTime(), ...parts(x.timeISO!, tz) }));
  const ctx: Ctx = { L, r, tz, day, now: opts.now, today, date, nowH: parts(opts.now, tz).h, hours };

  /*
   * When the call sent this page, it leads with what the verdict turned on —
   * the same ranking the evidence drawer used, from the same function — and
   * otherwise keeps the ordinary order.
   */
  const order = opts.weighed?.length
    ? rankSections(opts.weighed).map((s) => ({ id: s.id, because: s.because }))
    : ORDER.map((id) => ({ id, because: undefined }));

  const sections: DrawnSection[] = [];
  const todayOnly: string[] = [];
  for (const { id, because } of order) {
    if (!opts.coastal && COASTAL_ONLY.has(id)) continue;
    const s = BUILD[id](ctx);
    if (s) sections.push(because ? { ...s, because } : s);
    else if (opts.pending?.includes(id)) {
      sections.push({ id, title: title(ctx, id), sentence: '', drawing: null, facts: [], pending: true, because });
    } else if (day > 0 && TODAY_ONLY[id]) todayOnly.push(T(ctx, TODAY_ONLY[id]!));
  }
  return {
    dayName: day === 0 ? null : weekday(L, date),
    sections,
    todayOnly,
  };
}

/** "The air and the moon are only measured for today." */
export function todayOnlyNote(things: string[], lang?: LangCode): string {
  const L = localeOf(lang);
  return upperFirst(L, plural(L, 'todayonly', things.length === 1 ? 1 : 2, { list: listOf(L, things) }));
}
