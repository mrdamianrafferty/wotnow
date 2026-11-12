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

const TITLE = Object.fromEntries(EVIDENCE_SECTIONS.map((s) => [s.id, s.title])) as Record<EvidenceSectionId, string>;

/** How tall the person in the drawings is. Stated on the page. */
export const PERSON_M = 1.75;
/** WHO 2021 air quality guideline for PM2.5, 24-hour mean, µg/m³. */
export const WHO_PM25_24H = 15;

/* ── What each drawing is given ──────────────────────────────────────── */

export type Drawing =
  | { kind: 'thermometers'; bars: Array<{ label: string; c: number; tone: 'warm' | 'cold' }>; gap?: string }
  | { kind: 'flags'; flags: Array<{ kmh: number; label?: string }>; first: string; last: string }
  | { kind: 'umbrellas'; days: Array<{ label: string; wet: Wetness; note?: string; strong?: boolean }> }
  | { kind: 'wave'; waveM: number; band: WaveBand; airC?: number; waterC?: number; wear?: SeaWear; wearLabel?: string }
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

/** "4:39pm", "7pm", "noon", "midnight". */
export function clock(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  if (mm === 0 && hh === 12) return 'noon';
  if (mm === 0 && hh === 0) return 'midnight';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${hh < 12 ? 'am' : 'pm'}`;
}

const weekday = (dateISO: string, style: 'long' | 'short' = 'long') =>
  new Intl.DateTimeFormat('en-GB', { weekday: style, timeZone: 'UTC' }).format(new Date(`${dateISO}T12:00:00Z`));

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const r0 = (v: number) => Math.round(v);
const kmh = (ms: number) => ms * 3.6;

/* ── The fixed comparisons ───────────────────────────────────────────── */

/** Beaufort, from km/h. The lower bound of each force from 1 to 12. */
const BEAUFORT_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
export const beaufort = (k: number) => BEAUFORT_KMH.filter((t) => k >= t).length;

/** The Beaufort land descriptions, shortened but not reworded. */
export const BEAUFORT_LAND = [
  'smoke rises straight up', 'smoke drifts', 'leaves rustle', 'leaves and twigs move',
  'small branches move', 'small trees sway', 'big branches move, umbrellas are hard work',
  'whole trees move, hard to walk into', 'twigs snap off trees', 'slates come off roofs',
  'trees come down', 'widespread damage', 'devastation',
];

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
export function inPeople(rangeM: number): string {
  if (rangeM < 0.6) return 'about knee height';
  if (rangeM < 1.0) return 'about waist height';
  if (rangeM < 1.5) return 'about chest height';
  const p = rangeM / PERSON_M;
  if (p < 1.15) return 'about one grown-up';
  if (p < 1.4) return 'a bit more than one grown-up';
  if (p < 1.75) return 'a grown-up and a half';
  if (p < 2.15) return 'two grown-ups standing on each other\'s shoulders';
  if (p < 2.75) return 'two grown-ups standing on each other\'s shoulders, and then some';
  return `${Math.round(p)} grown-ups standing on each other's shoulders`;
}

const UV_WORD = (uv: number) => (uv < 3 ? 'low' : uv < 6 ? 'moderate' : uv < 8 ? 'high' : uv < 11 ? 'very high' : 'extreme');

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass = (deg: number) => COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

/* ── The sections ────────────────────────────────────────────────────── */

interface Ctx {
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

const SMALL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/** −3°, not -3°. */
const deg = (c: number) => { const n = r0(c); return n < 0 ? `−${-n}°` : `${n}°`; };

/** "today", "tomorrow", "on Saturday". */
function dayWord(ctx: Ctx, i: number, on = true): string {
  if (i === 0) return 'today';
  if (i === 1) return 'tomorrow';
  const d = ctx.r.daily?.[i]?.dateISO;
  return d ? `${on ? 'on ' : ''}${weekday(d)}` : 'later';
}

function temperature(ctx: Ctx): DrawnSection | null {
  const { r, day } = ctx;
  if (day > 0) {
    const d = r.daily?.[day];
    if (!num(d?.minC) || !num(d?.maxC)) return null;
    return {
      id: 'temperature', title: 'Temperature',
      sentence: r0(d.minC) === r0(d.maxC)
        ? `About ${r0(d.maxC)}° all day`
        : `${r0(d.minC)}° at its coldest, ${r0(d.maxC)}° at its warmest`,
      drawing: {
        kind: 'thermometers',
        bars: [{ label: `low ${r0(d.minC)}°`, c: d.minC, tone: 'cold' }, { label: `high ${r0(d.maxC)}°`, c: d.maxC, tone: 'warm' }],
      },
      facts: [{ label: 'Low', value: `${d.minC.toFixed(1)}°C` }, { label: 'High', value: `${d.maxC.toFixed(1)}°C` }],
    };
  }
  if (!num(r.temperatureC)) return null;
  const a = r.temperatureC;
  const f = num(r.feelsLikeC) ? r.feelsLikeC : null;
  const facts: Row[] = [{ label: 'Air', value: `${a.toFixed(1)}°C` }];
  if (f !== null) facts.push({ label: 'Feels like', value: `${f.toFixed(1)}°C` });
  if (num(r.daily?.[0]?.minC)) facts.push({ label: 'Low today', value: `${r.daily[0].minC.toFixed(1)}°C` });

  // Two degrees, the same cut-off the plain headline has always used.
  if (f === null || Math.abs(f - a) < 2) {
    return {
      id: 'temperature', title: 'Temperature',
      sentence: `It's ${r0(a)}°, and it feels it`,
      drawing: { kind: 'thermometers', bars: [{ label: `air ${r0(a)}°`, c: a, tone: a < 10 ? 'cold' : 'warm' }] },
      facts,
    };
  }
  // A cause only when the readings show it. Feels-like is a model, and naming
  // the wrong reason is a worse error than naming none.
  const windy = num(r.windSpeedMS) && kmh(r.windSpeedMS) >= 10;
  const humid = num(r.humidityPct) && r.humidityPct >= 60;
  const cause = f < a ? (windy ? 'the wind makes it feel' : 'it feels') : (humid ? 'the humidity makes it feel' : 'it feels');
  const gap = Math.abs(r0(a) - r0(f));
  return {
    id: 'temperature', title: 'Temperature',
    sentence: `It's ${r0(a)}°, but ${cause} like ${r0(f)}°`,
    drawing: {
      kind: 'thermometers',
      bars: [{ label: `air ${r0(a)}°`, c: a, tone: 'warm' }, { label: `feels ${r0(f)}°`, c: f, tone: f < a ? 'cold' : 'warm' }],
      gap: f < a ? (windy ? `the wind takes ${gap}°` : `${gap}° colder`) : `${gap}° warmer`,
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
  const { r, day } = ctx;
  const hours = windowHours(ctx);
  const when = (x: { h: number; date: string }) => `${clock(x.h)}${x.date !== ctx.date ? ' tomorrow' : ''}`;

  const flags = hours.length >= 6
    ? hours.filter((_, i) => i % 2 === 0).slice(0, 13).map((x, i) => ({ kmh: x.kmh, label: i % 2 === 0 ? clock(x.h) : undefined }))
    : null;
  const drawing: Drawing | null = flags && flags.length >= 4
    ? { kind: 'flags', flags, first: `${r0(flags[0].kmh)} km/h`, last: `${r0(flags[flags.length - 1].kmh)} km/h` }
    : null;

  if (day > 0) {
    if (hours.length) {
      const top = hours.reduce((a, b) => (b.kmh > a.kmh ? b : a));
      const f = beaufort(top.kmh);
      return {
        id: 'wind', title: 'Wind',
        sentence: `At its windiest, force ${f} around ${clock(top.h)}: ${BEAUFORT_LAND[f]}`,
        drawing,
        facts: [{ label: 'Strongest', value: `${r0(top.kmh)} km/h` }, ...(num(top.deg) ? [{ label: 'From the', value: compass(top.deg) }] : [])],
      };
    }
    const d = r.daily?.[day];
    if (!num(d?.windMS)) return null;
    const f = beaufort(kmh(d.windMS));
    return {
      id: 'wind', title: 'Wind',
      sentence: `Around force ${f} through the day: ${BEAUFORT_LAND[f]}`,
      drawing: null,
      facts: [{ label: 'Average', value: `${r0(kmh(d.windMS))} km/h` }],
    };
  }

  const nowK = num(r.windSpeedMS) ? kmh(r.windSpeedMS) : hours[0]?.kmh;
  if (!num(nowK)) return null;
  const f0 = beaufort(nowK);
  const later = hours.slice(2);
  const facts: Row[] = [{ label: 'Now', value: `${r0(nowK)} km/h${num(r.windDeg) ? ` from the ${compass(r.windDeg)}` : ''}` }];
  let sentence = `Force ${f0} for the next day: ${BEAUFORT_LAND[f0]}`;
  if (later.length) {
    const max = later.reduce((a, b) => (b.kmh > a.kmh ? b : a));
    const min = later.reduce((a, b) => (b.kmh < a.kmh ? b : a));
    if (beaufort(max.kmh) >= f0 + 2) {
      const fm = beaufort(max.kmh);
      sentence = `Force ${f0} now, building to force ${fm} by ${when(max)}`;
      facts.push({ label: 'Strongest', value: `${r0(max.kmh)} km/h, ${when(max)}` });
    } else if (beaufort(min.kmh) <= f0 - 2) {
      const fm = beaufort(min.kmh);
      const first = later.find((x) => beaufort(x.kmh) === fm) ?? min;
      sentence = `Force ${f0} now. By ${when(first)} it's force ${fm}: ${BEAUFORT_LAND[fm]}`;
      facts.push({ label: 'Lightest', value: `${r0(min.kmh)} km/h, ${when(min)}` });
    }
  }
  return { id: 'wind', title: 'Wind', sentence: `${sentence[0].toUpperCase()}${sentence.slice(1)}`, drawing, facts };
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
      sentence = `Dry until ${dayWord(ctx, firstWet.i, false)}, then snow`;
      notes.set(firstWet.i, 'first snow');
    } else if (firstWet) {
      sentence = `Leave the umbrella at home until ${dayWord(ctx, firstWet.i, false)}`;
      notes.set(firstWet.i, 'first rain');
    } else {
      sentence = 'No rain in the forecast';
    }
  } else {
    if (sel.w === 'snow') {
      sentence = `Snow ${dayWord(ctx, sel.i)}`;
    } else {
      const mm = num(sel.d.precipMM) && sel.d.precipMM >= 1 ? `, about ${r0(sel.d.precipMM)} mm` : '';
      sentence = `${sel.w === 'light' ? 'Showers' : 'Rain'} ${dayWord(ctx, sel.i)}${mm}`;
    }
    if (firstDry) {
      sentence += `, then dry ${dayWord(ctx, firstDry.i)}`;
      notes.set(firstDry.i, 'dry again');
    }
  }
  sentence = sentence[0].toUpperCase() + sentence.slice(1);

  return {
    id: 'rain', title: anySnow ? 'Rain and snow' : 'Rain',
    sentence,
    drawing: {
      kind: 'umbrellas',
      days: span.map((x) => ({
        label: x.d.dateISO ? weekday(x.d.dateISO, 'short') : '',
        wet: x.w,
        strong: x.i === from || notes.has(x.i),
        note: x.i === from ? (from === 0 ? 'today' : 'this day') : notes.get(x.i),
      })),
    },
    facts: [
      ...(num(sel.d.precipMM) ? [{ label: dayWord(ctx, sel.i, false).replace(/^./, (c) => c.toUpperCase()), value: `${sel.d.precipMM.toFixed(1)} mm${sel.w === 'snow' ? ' as water' : ''}` }] : []),
      ...(firstWet && sel.w === 'dry' && firstWet.d.dateISO ? [{ label: firstWet.w === 'snow' ? 'First snow' : 'First rain', value: weekday(firstWet.d.dateISO) }] : []),
    ],
  };
}

function sea(ctx: Ctx): DrawnSection | null {
  const { r, day } = ctx;
  let waveM: number | undefined;
  let waterC: number | undefined;
  let airC: number | undefined;
  if (day === 0) {
    waveM = r.marine?.waveHeight ?? r.hourly?.find((h) => num(h.waveHeightM))?.waveHeightM;
    waterC = r.marineHourly?.find((m) => num(m.waterTempC))?.waterTempC ?? r.seaTemp;
    airC = r.temperatureC;
  } else {
    // Midday on that day: the hour people go in.
    const near = <T extends { timeISO?: string }>(xs: T[] | undefined, ok: (x: T) => boolean) => (xs ?? [])
      .filter((x) => x.timeISO && ok(x) && parts(x.timeISO, ctx.tz).date === ctx.date)
      .sort((a, b) => Math.abs(parts(a.timeISO!, ctx.tz).h - 12) - Math.abs(parts(b.timeISO!, ctx.tz).h - 12))[0];
    waveM = near(r.hourly, (h) => num(h.waveHeightM))?.waveHeightM ?? near(r.marineHourly, (m) => num(m.waveHeightM))?.waveHeightM;
    waterC = near(r.marineHourly, (m) => num(m.waterTempC))?.waterTempC;
    airC = r.daily?.[day]?.maxC;
  }
  if (!num(waveM) && !num(waterC)) return null;

  const facts: Row[] = [];
  if (num(waveM)) facts.push({ label: 'Waves', value: `${waveM.toFixed(1)} m` });
  if (num(waterC)) facts.push({ label: 'Water', value: `${waterC.toFixed(1)}°C` });
  if (day === 0 && num(r.marine?.swellPeriod ?? r.marine?.wavePeriod)) {
    facts.push({ label: 'Period', value: `${r0((r.marine!.swellPeriod ?? r.marine!.wavePeriod)!)} s` });
  }

  /*
   * The water's temperature is said as what to wear in it — the wetsuit ladder
   * from `seaWear` — because "14°" means nothing until you know it is a 4/3
   * and boots. The air-versus-water comparison stays in the drawing.
   */
  const wear = num(waterC) ? seaWear(waterC) : null;
  if (wear) facts.push({ label: 'Wear', value: wear.short });
  const dressed = wear ? `At ${r0(waterC!)}°, ${wear.say}` : '';
  if (!num(waveM)) {
    return { id: 'sea', title: 'The sea', sentence: `The water's ${r0(waterC!)}°. ${dressed.replace(/^At \d+°, /, '').replace(/^./, (c) => c.toUpperCase())}`, drawing: null, facts };
  }
  const band = waveBand(waveM);
  const lead = band === 'overhead' ? `Waves bigger than a grown-up, ${waveM.toFixed(1)} m` : `Waves about ${band} high`;
  return {
    id: 'sea', title: 'The sea',
    sentence: dressed ? `${lead}. ${dressed}` : lead,
    drawing: {
      kind: 'wave', waveM, band,
      airC: num(airC) ? airC : undefined, waterC: num(waterC) ? waterC : undefined,
      wear: wear?.id, wearLabel: wear?.short,
    },
    facts,
  };
}

function tide(ctx: Ctx): DrawnSection | null {
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
  const ta = clock(pa.h);
  const tb = clock(hb);
  // "tomorrow" once, after the last time that needs it.
  const next = (date: string) => ctx.day === 0 && date !== ctx.date;
  const when = next(pa.date)
    ? `${ta} and ${tb} tomorrow`
    : `${ta} and ${tb}${next(pb.date) ? ' tomorrow' : ''}`;
  return {
    id: 'tide', title: 'Tides',
    sentence: `Between ${when} the sea ${rising ? 'climbs' : 'drops'} ${range.toFixed(1)} m. That's ${inPeople(range)}`,
    drawing: {
      kind: 'tide',
      from: { h: pa.h, m: a.m, type: a.type, label: ta },
      to: { h: hb, m: b.m, type: b.type, label: tb },
      rangeM: range,
    },
    facts: [
      { label: a.type === 'high' ? 'High' : 'Low', value: `${a.m.toFixed(1)} m · ${ta}` },
      { label: b.type === 'high' ? 'High' : 'Low', value: `${b.m.toFixed(1)} m · ${tb}` },
    ],
  };
}

/** "about 400 m, four football pitches". A pitch is about 100 m. */
export function howFar(m: number): string {
  if (m < 100) return `under ${Math.max(10, Math.round(m / 10) * 10)} m, not even a football pitch`;
  const pitches = Math.round(m / 100);
  const dist = m >= 1000 ? `${(Math.round(m / 100) / 10).toString()} km` : `${Math.round(m / 50) * 50} m`;
  return `about ${dist}, ${pitches === 1 ? 'one football pitch' : `${SMALL[pitches] ?? pitches} football pitches`}`;
}

function sky(ctx: Ctx): DrawnSection | null {
  const { r, day } = ctx;
  const rise = day === 0 ? (r.sunriseISO ?? r.daily?.[0]?.sunriseISO) : r.daily?.[day]?.sunriseISO;
  const set = day === 0 ? (r.sunsetISO ?? r.daily?.[0]?.sunsetISO) : r.daily?.[day]?.sunsetISO;
  const riseH = rise ? parts(rise, ctx.tz).h : null;
  const setH = set ? parts(set, ctx.tz).h : null;
  const light = riseH !== null && setH !== null && setH > riseH;

  const facts: Row[] = [];
  if (light) facts.push({ label: 'Sunrise', value: clock(riseH) }, { label: 'Sunset', value: clock(setH) });
  if (day === 0 && num(r.cloudsPct)) facts.push({ label: 'Cloud', value: `${r0(r.cloudsPct)}%` });
  if (day === 0 && num(r.uvi)) facts.push({ label: 'UV', value: `${r0(r.uvi)}, ${UV_WORD(r.uvi)}` });

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
      if (vis !== null) facts.unshift({ label: 'Visibility', value: vis < 1000 ? `${Math.round(vis / 50) * 50} m` : `${(vis / 1000).toFixed(1)} km` });
      const clears = fogCoded ? fromNow(ctx, 12).find((x) => x.t > ctx.now.getTime() && !isFog(x)) : undefined;
      const until = clears ? `, clearing by ${clock(clears.h)}` : '';
      return {
        id: 'sky', title: 'Sky and light',
        sentence: vis !== null ? `${fog ? 'Fog' : 'Mist'}: you can see ${howFar(vis)}${until}` : `Foggy now${until}`,
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
      ? `Foggy until about ${clock(last.h + 1)}`
      : `Fog likely from ${clock(first.h)}${day === 0 && first.date !== ctx.date ? ' tonight' : ''}`;
  }

  if (!light) {
    return fogNote ? { id: 'sky', title: 'Sky and light', sentence: fogNote, drawing: null, facts } : null;
  }
  const len = setH - riseH;
  const half = Math.round(len * 2) / 2;
  const hours = `${Math.floor(half)}${half % 1 ? '½' : ''} hours`;
  const base = len < 12 ? `About ${hours} of daylight, and it's gone by ${clock(setH)}` : `Light until ${clock(setH)}: about ${hours} of it`;
  return {
    id: 'sky', title: 'Sky and light',
    sentence: fogNote ? `${base}. ${fogNote}` : base,
    drawing: {
      kind: 'daylight', riseH, setH,
      riseLabel: `sunrise ${clock(riseH)}`, setLabel: `sunset ${clock(setH)}`,
      lengthLabel: `${Math.floor(len)} h ${r0((len % 1) * 60)} min`,
    },
    facts,
  };
}

function air(ctx: Ctx): DrawnSection | null {
  if (ctx.day > 0) return null;
  const r = ctx.r;
  const pm = r.airQuality?.components?.pm2_5;
  const facts: Row[] = [];
  if (num(pm)) facts.push({ label: 'PM2.5', value: `${pm.toFixed(1)} µg/m³` });
  if (num(r.humidityPct)) facts.push({ label: 'Humidity', value: `${r0(r.humidityPct)}%` });
  if (num(r.pressureHpa)) facts.push({ label: 'Pressure', value: `${r0(r.pressureHpa)} hPa${r.pressureTrend ? `, ${r.pressureTrend}` : ''}` });
  if (!num(pm)) return null;
  const f = pm / WHO_PM25_24H;
  const sentence = f < 1 / 3
    ? 'Clean air: fine dust is under a third of the WHO\'s daily limit'
    : f < 0.6 ? 'Fine dust is about half the WHO\'s daily limit'
      : f < 1 ? 'Fine dust is most of the way to the WHO\'s daily limit'
        : 'Fine dust is over the WHO\'s daily limit';
  return { id: 'air', title: 'Air', sentence, drawing: { kind: 'dots', value: pm, limit: WHO_PM25_24H }, facts };
}

const UNDERFOOT_SAYS: Record<string, string> = {
  'Hard and dry': 'Hard and dry underfoot',
  Firm: 'Firm underfoot',
  Soft: 'Soft underfoot. Trainers will do',
  'A bit soggy': 'A bit soggy. Boots, not trainers',
  Muddy: 'Muddy. Wellies, not trainers',
  'Very muddy': 'Very muddy. Wellies, and expect to sink',
  'Frozen hard': 'Frozen hard underfoot',
};

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
  const low = overnightLow(ctx);
  const frost = low !== null && low <= 0 ? low : null;
  const lowFact: Row[] = frost !== null ? [{ label: 'Low overnight', value: `${frost.toFixed(1)}°C` }] : [];

  /*
   * Snow lying beats everything: under it, nobody cares whether the soil is
   * soggy. It is said against a leg, ankle to waist, because "9 cm" is a
   * number and "ankle deep" is a pair of boots.
   */
  const snow = snowLyingCm(ctx);
  if (snow !== null && snow >= 1) {
    return {
      id: 'ground', title: 'Underfoot',
      sentence: snow < 3 ? 'A dusting of snow on the ground' : `Snow on the ground, about ${r0(snow)} cm: ${snowDeep(snow)} deep`,
      drawing: { kind: 'snowDepth', cm: snow },
      facts: [{ label: 'Snow lying', value: `${r0(snow)} cm` }, ...lowFact],
    };
  }

  const frostSaid = (lowC: number) => `Frost overnight, down to ${deg(lowC)}`;
  if (ctx.day > 0) {
    if (frost === null) return null;
    return {
      id: 'ground', title: 'Underfoot',
      sentence: frostSaid(frost),
      drawing: { kind: 'frost', lowC: frost, label: `down to ${deg(frost)}` },
      facts: lowFact,
    };
  }

  const s = ctx.r.soil;
  const band = underfoot(s?.moisture0to1, s?.temp0cm);
  const soilFact: Row[] = num(s?.temp0cm) ? [{ label: 'Soil at the surface', value: `${s.temp0cm.toFixed(1)}°C` }] : [];
  if (!band) {
    return frost === null ? null : {
      id: 'ground', title: 'Underfoot', sentence: frostSaid(frost),
      drawing: { kind: 'frost', lowC: frost, label: `down to ${deg(frost)}` }, facts: lowFact,
    };
  }
  if (band === 'Frozen hard') {
    const coldest = frost ?? s!.temp0cm!;
    return {
      id: 'ground', title: 'Underfoot',
      sentence: frost !== null ? `Frozen hard underfoot, and down to ${deg(frost)} overnight` : 'Frozen hard underfoot',
      drawing: { kind: 'frost', lowC: coldest, label: frost !== null ? `down to ${deg(frost)}` : `ground ${deg(s!.temp0cm!)}` },
      facts: [{ label: 'Underfoot', value: band }, ...soilFact, ...lowFact],
    };
  }

  /*
   * Frost on wet ground is ice. Soggy or worse, with the air going below
   * zero, the puddles and the mud are what you will be walking on at dawn.
   */
  const index = (UNDERFOOT_BANDS as readonly string[]).indexOf(band);
  const icy = frost !== null && index >= 3;
  return {
    id: 'ground', title: 'Underfoot',
    sentence: frost !== null
      ? `${UNDERFOOT_SAYS[band]}. ${frostSaid(frost)}${icy ? ': icy by morning' : ''}`
      : UNDERFOOT_SAYS[band],
    drawing: { kind: 'footwear', index, frost: frost !== null ? { lowC: frost, icy } : undefined },
    facts: [{ label: 'Underfoot', value: band }, ...soilFact, ...lowFact],
  };
}

function night(ctx: Ctx): DrawnSection | null {
  if (ctx.day > 0) return null;
  const { r } = ctx;
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
  const size = illum < 25 ? 'thin' : illum < 60 ? 'half' : illum < 95 ? 'big' : 'full';
  const waxing = num(phase) ? phase < 0.5 : true;
  const facts: Row[] = [{ label: 'Moon', value: `${r0(illum)}% lit${num(phase) ? `, ${waxing ? 'waxing' : 'waning'}` : ''}` }];

  let sentence: string;
  let event: Extract<Drawing, { kind: 'moon' }>['event'];
  let darkFromH: number | undefined;
  if (illum < 3) {
    sentence = 'No moon to speak of, so it\'s properly dark';
    darkFromH = sunsetH;
  } else if (setH !== null) {
    sentence = `A ${size} moon that sets at ${clock(setH)}, so it's dark after that`;
    event = { h: setH, type: 'set', label: `moon sets ${clock(setH)}` };
    darkFromH = setH;
    facts.push({ label: 'Moonset', value: clock(setH) });
  } else if (riseH !== null) {
    sentence = `A ${size} moon, rising at ${clock(riseH)}`;
    event = { h: riseH, type: 'rise', label: `moon rises ${clock(riseH)}` };
    facts.push({ label: 'Moonrise', value: clock(riseH) });
  } else {
    // Neither event in the evening: up the whole time, or down the whole time.
    const rose = sameDay(r.moon?.moonriseISO);
    const sank = sameDay(r.moon?.moonsetISO);
    const up = rose !== null && rose < sunsetH && (sank === null || sank < rose);
    sentence = up ? `A ${size} moon, up all evening` : 'No moon this evening, so it\'s properly dark';
    if (!up) darkFromH = sunsetH;
  }
  return {
    id: 'night', title: 'After dark',
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
const TODAY_ONLY: Partial<Record<EvidenceSectionId, string>> = {
  air: 'the air', ground: 'the ground', night: 'the moon', sky: 'daylight',
};

export function drawConditions(r: Readings | null, opts: DrawOptions): DrawnPage {
  if (!r) return { dayName: null, sections: [], todayOnly: [] };
  const tz = zoneOf(r);
  const today = parts(opts.now, tz).date;
  const day = Math.max(0, Math.min(opts.day, (r.daily?.length ?? 1) - 1));
  const date = day === 0 ? today : (r.daily?.[day]?.dateISO ?? today);
  const hours: Hour[] = (r.hourly ?? [])
    .filter((x) => x.timeISO)
    .map((x) => ({ ...x, t: new Date(x.timeISO!).getTime(), ...parts(x.timeISO!, tz) }));
  const ctx: Ctx = { r, tz, day, now: opts.now, today, date, nowH: parts(opts.now, tz).h, hours };

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
      sections.push({ id, title: TITLE[id], sentence: '', drawing: null, facts: [], pending: true, because });
    } else if (day > 0 && TODAY_ONLY[id]) todayOnly.push(TODAY_ONLY[id]!);
  }
  return {
    dayName: day === 0 ? null : weekday(date),
    sections,
    todayOnly,
  };
}
