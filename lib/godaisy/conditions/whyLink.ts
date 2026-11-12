/**
 * "Why?" on the call opens the drawn conditions page, about the call's day.
 *
 * The call carries everything the page needs to explain it: where (which may
 * not be the setup's place — a shared call is somebody else's), which day, the
 * sentence being explained, and what the scorer weighed, so the page leads with
 * the section the verdict turned on. All of it travels in the query string,
 * because the page is server-rendered from a URL and a link is also something
 * people send.
 *
 * Every field is parsed defensively: this is user input by the time it arrives.
 *
 * @module lib/godaisy/conditions/whyLink
 */

import type { Weighed } from '@/lib/godaisy/call/evidence';

export interface WhyTarget {
  place: string;
  lat: number;
  lon: number;
  coastal: boolean;
  day: number;
  /** The verdict being explained, as a sentence. */
  verdict?: string;
  weighed?: readonly Weighed[];
}

export function whyHref(t: WhyTarget): string {
  const q = new URLSearchParams();
  q.set('n', t.place);
  q.set('lat', t.lat.toFixed(4));
  q.set('lon', t.lon.toFixed(4));
  if (t.coastal) q.set('c', '1');
  q.set('day', String(t.day));
  if (t.verdict) q.set('v', t.verdict);
  const w = (t.weighed ?? [])
    .filter((x) => /^[A-Za-z]+$/.test(x.key) && Number.isFinite(x.score))
    .slice(0, 20)
    .map((x) => `${x.key}:${Math.max(0, Math.min(1, x.score)).toFixed(2)}`);
  if (w.length) q.set('w', w.join(','));
  return `/weather?${q.toString()}`;
}

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** The place, if the query names one by coordinates. */
export function placeFromQuery(q: Query): { name: string; lat: number; lon: number; coastal: boolean } | null {
  const lat = Number(one(q.lat));
  const lon = Number(one(q.lon));
  if (!one(q.lat) || !one(q.lon) || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = (one(q.n) ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80) || 'Here';
  return { name, lat, lon, coastal: one(q.c) === '1' };
}

export function whyFromQuery(q: Query): { day: number; verdict: string | null; weighed: Weighed[] } {
  const d = Number(one(q.day));
  const day = Number.isInteger(d) && d >= 0 && d <= 13 ? d : 0;
  const v = (one(q.v) ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 200);
  const weighed: Weighed[] = (one(q.w) ?? '')
    .split(',')
    .slice(0, 20)
    .map((s) => /^([A-Za-z]+):(\d(?:\.\d+)?)$/.exec(s))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => ({ key: m[1], score: Math.min(1, Number(m[2])) }));
  return { day, verdict: v || null, weighed };
}
