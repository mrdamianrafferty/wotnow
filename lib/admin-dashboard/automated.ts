/**
 * Adjusted active users for /admin/apps: GA4's figure minus the countries
 * that look automated. The owner chose this over blocking the traffic (GA4
 * data filters cannot exclude by country), so the raw figure is always kept.
 *
 * Pure. Per app, a country is "likely automated" when ALL of:
 *   1. it has at least 25 GA4 active users in the 7-day audience window;
 *   2. that is at least 20% of the app's users;
 *   3. the app's store reported no first-time download from it in 30 days;
 *   4. it browses like a script, by either test: its Vercel pageviews per
 *      visitor are at least 1.5x the app's overall ratio, or the app's GA4
 *      users are at least 70% desktop.
 *
 * Test 4's desktop half is per app, not per country: the audience section
 * has no country x device split, and adding one means changing every app's
 * endpoint. The Vercel half is per country, where Vercel has the country.
 *
 * Never guesses: an app whose audience, device split or store countries are
 * missing is shown raw with the reason; an app with no store is never
 * adjusted. A home market (GB, IE) is never flagged: a web-heavy app can
 * have UK desktop visitors who simply never installed.
 */

import type { AppSnapshot, FamilyAppId, Part, Trend } from './family';
import { FAMILY_APPS } from './family';

/** The family's home markets: a spike from here is not suspicious on its own. */
export const HOME_COUNTRIES = new Set(['GB', 'IE']);

export const AUTOMATED_RULE = {
  minUsers: 25,
  minShare: 0.2,
  desktopShare: 0.7,
  vercelRatio: 1.5,
} as const;

/** The rule in one sentence, for the tooltip and the page. */
export const AUTOMATED_RULE_TEXT =
  'Adjusted active users leave out a country with at least 25 users and 20% of an app’s users, no store download from it in 30 days, and either Vercel page views per visitor at least 1.5× the app’s average or an app that is at least 70% desktop. The raw GA4 figure is kept beside it.';

export interface FlaggedCountry {
  code: string;
  name: string;
  users: number;
  /** % of the app's audience, rounded. */
  share: number;
  /** Which test it passed. */
  basis: 'vercel' | 'desktop';
  /** Pages per visitor in this country on Vercel, when it was measured. */
  viewsPerVisitor: number | null;
}

export interface UsersView {
  /** GA4's own figure; null when the app reports no active users. */
  raw: Trend | null;
  /** What the headline shows: raw minus `excluded`, or raw when nothing was excluded or it could not be checked. */
  headline: Trend | null;
  excluded: number;
  flagged: FlaggedCountry[];
  /** The app's audience over the 7 days (sum of its device rows): the denominator of each flagged share. */
  audienceTotal: number;
  /** Why the figure is raw only (data missing); null when it was checked or does not apply. */
  rawOnlyWhy: string | null;
  /** The previous week is the raw one scaled by this week's excluded share: there is no per-country history. */
  previousEstimated: boolean;
}

const okData = <T,>(p: Part<T> | undefined): T | null => (p && p.state === 'ok' ? p.data : null);
const pctDelta = (value: number, previous: number): number | null => (previous === 0 ? null : Math.round(((value - previous) / previous) * 100));

function rawOnly(raw: Trend | null, why: string | null, audienceTotal = 0): UsersView {
  return { raw, headline: raw, excluded: 0, flagged: [], audienceTotal, rawOnlyWhy: why, previousEstimated: false };
}

/** One app's adjusted active users, or why it stays raw. */
export function adjustUsers(app: AppSnapshot): UsersView {
  const raw = okData(app.analytics)?.activeUsers ?? null;
  if (!raw) return rawOnly(null, null);
  const family = FAMILY_APPS.find((f) => f.id === app.id);
  // No store at all (web only): no download evidence exists, so nothing is ever judged
  if (family && family.platforms.length === 0) return rawOnly(raw, null);

  const audience = okData(app.audience);
  if (!audience) return rawOnly(raw, 'audience not reported');
  const total = audience.devices.reduce((a, d) => a + d.activeUsers, 0);
  if (total <= 0) return rawOnly(raw, 'no device split');
  const stored = okData(app.downloads)?.countries30d;
  if (!stored) return rawOnly(raw, 'store countries not reported');

  const downloadCountries = new Set(stored.filter((c) => c.downloads > 0).map((c) => c.country));
  const desktop = audience.devices.filter((d) => d.category === 'desktop').reduce((a, d) => a + d.activeUsers, 0);
  const desktopHeavy = desktop / total >= AUTOMATED_RULE.desktopShare;

  const v = okData(app.vercel);
  const overall = v && v.visitors.value > 0 ? v.pageviews.value / v.visitors.value : null;

  const flagged = audience.countries.flatMap((c): FlaggedCountry[] => {
    if (!c.code || HOME_COUNTRIES.has(c.code)) return [];
    if (c.activeUsers < AUTOMATED_RULE.minUsers || c.activeUsers / total < AUTOMATED_RULE.minShare) return [];
    if (downloadCountries.has(c.code)) return [];
    const vc = v?.countries.find((x) => x.code === c.code);
    const perVisitor = vc && vc.visitors > 0 ? vc.pageviews / vc.visitors : null;
    const vercelBusy = overall !== null && overall > 0 && perVisitor !== null && perVisitor >= overall * AUTOMATED_RULE.vercelRatio;
    if (!vercelBusy && !desktopHeavy) return [];
    return [
      {
        code: c.code,
        name: c.name,
        users: c.activeUsers,
        share: Math.round((c.activeUsers / total) * 100),
        basis: vercelBusy ? 'vercel' : 'desktop',
        viewsPerVisitor: perVisitor === null ? null : Math.round(perVisitor * 10) / 10,
      },
    ];
  });
  if (flagged.length === 0) return rawOnly(raw, null, total);

  const excluded = flagged.reduce((a, c) => a + c.users, 0);
  const value = Math.max(0, raw.value - excluded);
  const previous = raw.value > 0 ? Math.round(raw.previous * (value / raw.value)) : raw.previous;
  return {
    raw,
    headline: { value, previous, delta: pctDelta(value, previous), daily: [] },
    excluded: raw.value - value,
    flagged,
    audienceTotal: total,
    rawOnlyWhy: null,
    previousEstimated: raw.previous > 0,
  };
}

export interface FamilyUsers {
  /** Sum of each reporting app's headline (adjusted where it was). */
  headline: Trend & { apps: number };
  /** The same sum of GA4's raw figures. */
  raw: Trend;
  excluded: number;
  /** Distinct countries excluded, largest first, with the apps they came from. */
  countries: { code: string; name: string; users: number; apps: FamilyAppId[] }[];
  /** Apps shown raw because data was missing, with why. */
  rawOnly: { id: FamilyAppId; name: string; why: string }[];
}

const sum = (ts: Trend[]): Trend => {
  const value = ts.reduce((a, t) => a + t.value, 0);
  const previous = ts.reduce((a, t) => a + t.previous, 0);
  return { value, previous, delta: pctDelta(value, previous), daily: [] };
};

export function familyUsers(apps: AppSnapshot[]): FamilyUsers {
  const views = apps.map((app) => ({ app, v: adjustUsers(app) })).filter((x) => x.v.raw !== null);
  const byCountry = new Map<string, { code: string; name: string; users: number; per: Map<FamilyAppId, number> }>();
  for (const { app, v } of views) {
    for (const c of v.flagged) {
      const e = byCountry.get(c.code) ?? { code: c.code, name: c.name, users: 0, per: new Map() };
      e.users += c.users;
      e.per.set(app.id, c.users);
      byCountry.set(c.code, e);
    }
  }
  return {
    headline: { ...sum(views.map((x) => x.v.headline!)), apps: views.length },
    raw: sum(views.map((x) => x.v.raw!)),
    excluded: views.reduce((a, x) => a + x.v.excluded, 0),
    countries: [...byCountry.values()]
      .sort((a, b) => b.users - a.users)
      .map((e) => ({ code: e.code, name: e.name, users: e.users, apps: [...e.per.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id) })),
    rawOnly: views.flatMap(({ app, v }) => (v.rawOnlyWhy ? [{ id: app.id, name: app.name, why: v.rawOnlyWhy }] : [])),
  };
}
