/**
 * @jest-environment node
 */
/**
 * Audience end to end: the GA4 row mapping, store countries over 30 days,
 * the family aggregation (with apps that do not send audience yet), and the
 * "Needs attention" rules.
 */

import { countries30d, type StoreStatInput } from '@/lib/store-stats/summary';
import { appAttention, deriveAttention } from '../attention';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot, type AppSnapshot, type FamilySummary } from '../family';
import { sampleFamilyBodies, sampleFamilySummary } from '../family-sample';
import { audienceRequests, fetchAudienceSummary, summariseAudience } from '../ga4';

const now = new Date('2026-10-27T07:00:00Z');
const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;
const row = (dims: string[], value: number) => ({ dimensionValues: dims.map((v) => ({ value: v })), metricValues: [{ value: String(value) }] });

describe('summariseAudience', () => {
  it('maps countries, devices and demographics, and the 7-day window', () => {
    const data = summariseAudience(
      {
        reports: [
          { rows: [row(['GB', 'United Kingdom'], 40), row(['(not set)', '(not set)'], 3), row(['ES', 'Spain'], 90)] },
          { rows: [row(['mobile'], 100), row(['desktop'], 30), row(['smart tv'], 1)] },
          { rows: [row(['25-34'], 20), row(['unknown'], 90)] },
          { rows: [row(['female'], 12), row(['male'], 10), row(['unknown'], 100)] },
        ],
      },
      now,
    );
    expect(data.window).toEqual({ from: '2026-10-20', to: '2026-10-26' });
    expect(data.countries).toEqual([
      { code: 'ES', name: 'Spain', activeUsers: 90 },
      { code: 'GB', name: 'United Kingdom', activeUsers: 40 },
      { code: null, name: 'Unknown', activeUsers: 3 },
    ]);
    expect(data.devices).toEqual([
      { category: 'mobile', activeUsers: 100 },
      { category: 'desktop', activeUsers: 30 },
      { category: 'smart tv', activeUsers: 1 },
    ]);
    expect(data.demographics).toEqual({
      available: true,
      age: [{ bracket: '25-34', activeUsers: 20 }],
      gender: [
        { gender: 'female', activeUsers: 12 },
        { gender: 'male', activeUsers: 10 },
      ],
    });
  });

  it('says honestly when GA4 has no demographics (only "unknown" rows, or none)', () => {
    const data = summariseAudience({ reports: [{}, {}, { rows: [row(['unknown'], 5)] }, {}] }, now);
    expect(data.countries).toEqual([]);
    expect(data.demographics.available).toBe(false);
    expect(data.demographics.note).toMatch(/Google signals is off/);
    expect(summariseAudience({}, now).demographics).toMatchObject({ available: false, age: [], gender: [] });
  });

  it('asks for four 7-day reports, countries capped at 10', () => {
    const reqs = audienceRequests();
    expect(reqs.map((r) => r.dimensions.map((d) => d.name).join('+'))).toEqual(['countryId+country', 'deviceCategory', 'userAgeBracket', 'userGender']);
    expect(reqs[0].limit).toBe(10);
    expect(reqs.every((r) => r.dateRanges[0].startDate === '7daysAgo' && r.dateRanges[0].endDate === 'yesterday')).toBe(true);
  });

  it('is not_configured exactly as analytics is', async () => {
    await expect(fetchAudienceSummary({})).resolves.toEqual({ state: 'not_configured', missing: ['GA_PROPERTY_ID', 'GOOGLE_ANALYTICS_CREDENTIALS'] });
  });
});

describe('countries30d', () => {
  const r = (stat_date: string, platform: string, country: string, downloads: number): StoreStatInput => ({
    stat_date,
    platform,
    country,
    downloads,
    redownloads: 0,
    uninstalls: 0,
  });

  it('sums both platforms over the last 30 complete days, drops ZZ, today and older rows', () => {
    const rows = [
      r('2026-10-26', 'ios', 'GB', 2),
      r('2026-10-26', 'android', 'GB', 1),
      r('2026-09-27', 'ios', 'FR', 4), // 30 days back: in
      r('2026-09-26', 'ios', 'FR', 9), // 31 days back: out
      r('2026-10-27', 'ios', 'US', 9), // today: incomplete, out
      r('2026-10-20', 'ios', 'ZZ', 7),
      r('2026-10-20', 'ios', 'DE', 0),
    ];
    expect(countries30d(rows, now)).toEqual([
      { country: 'FR', downloads: 4 },
      { country: 'GB', downloads: 3 },
    ]);
  });

  it('keeps the top 10', () => {
    const rows = 'ABCDEFGHIJKL'.split('').map((c, i) => r('2026-10-20', 'ios', `X${c}`, i + 1));
    expect(countries30d(rows, now)).toHaveLength(10);
    expect(countries30d(rows, now)[0]).toEqual({ country: 'XL', downloads: 12 });
  });
});

describe('family audience', () => {
  it('sums countries by code across apps and remembers which apps they came from', () => {
    const { totals } = sampleFamilySummary(now);
    const sg = totals.audience.countries.find((c) => c.code === 'SG')!;
    expect(sg.value).toBe(663 + 42 + 19);
    expect(sg.apps).toEqual(['risedaisy', 'flycast', 'findr']);
    expect(totals.audience.countries[0].code).toBe('SG');
    expect(totals.audience.reporting).toBe(5);
    // Unknown country rows keep their own bucket rather than merging into a real one
    expect(totals.audience.countries.some((c) => c.code === null)).toBe(true);
  });

  it('counts visitors from device rows and sums devices per category', () => {
    const { totals } = sampleFamilySummary(now);
    const sum = totals.audience.devices.reduce((a, d) => a + d.value, 0);
    expect(totals.audience.visitors).toBe(sum);
    expect(totals.audience.devices.map((d) => d.category)).toEqual(['desktop', 'mobile', 'tablet']);
    const grewp = totals.audience.deviceShare.find((d) => d.id === 'grewp')!;
    expect(grewp).toMatchObject({ visitors: 542, mobile: 368 });
  });

  it('sums store countries across apps that send them', () => {
    const { totals } = sampleFamilySummary(now);
    expect(totals.audience.storeReporting).toBe(5);
    expect(totals.audience.storeCountries.find((c) => c.code === 'FR')).toMatchObject({ value: 8, apps: ['risedaisy', 'findr'] });
    expect(totals.audience.storeCountries.some((c) => c.code === 'SG')).toBe(false);
  });

  it('lets an app without audience or countries30d simply not contribute', () => {
    const bodies = sampleFamilyBodies(now) as Record<string, Record<string, unknown>>;
    const { audience: _a, ...grewpOld } = bodies.grewp;
    const stripped = { ...grewpOld, storeDownloads: { state: 'ok', data: { ios: { week: 1, previousWeek: 1 }, hasData: true } } };
    const apps = FAMILY_APPS.map((a) => readAppSummary(a, a.id === 'grewp' ? stripped : bodies[a.id]));
    const g = apps.find((a) => a.id === 'grewp')!;
    expect(g.audience).toMatchObject({ state: 'not_configured', note: 'Not reported by this app' });
    expect(g.downloads).toMatchObject({ state: 'ok', data: { countries30d: null } });
    const t = familyTotals(apps).audience;
    expect(t.reporting).toBe(4);
    expect(t.storeReporting).toBe(4);
    expect(t.countries.find((c) => c.code === 'ES')!.apps).not.toContain('grewp');
  });

  it('reads demographics defensively and trusts the rows over the flag', () => {
    const s = readAppSummary(app('findr'), {
      audience: {
        state: 'ok',
        data: {
          countries: [{ code: 'gb', name: 'United Kingdom', activeUsers: 3 }, { code: 'x', activeUsers: 'many' }, null],
          devices: [{ category: 'Mobile', activeUsers: 3 }],
          demographics: { available: true, age: [], gender: [] },
        },
      },
    });
    expect(s.audience).toMatchObject({
      state: 'ok',
      data: {
        countries: [{ code: 'GB', name: 'United Kingdom', activeUsers: 3 }],
        devices: [{ category: 'mobile', activeUsers: 3 }],
        demographics: { available: false },
      },
    });
    expect(readAppSummary(app('findr'), { audience: { state: 'ok', data: { something: 1 } } }).audience).toEqual({
      state: 'error',
      message: 'Unreadable response',
    });
  });

  it('aggregates age and gender only from apps that have them', () => {
    const bodies = sampleFamilyBodies(now) as Record<string, Record<string, { data: Record<string, unknown> }>>;
    const rise = structuredClone(bodies.risedaisy);
    rise.audience.data.demographics = { available: true, age: [{ bracket: '35-44', activeUsers: 30 }], gender: [{ gender: 'male', activeUsers: 25 }] };
    const apps = FAMILY_APPS.map((a) => readAppSummary(a, a.id === 'risedaisy' ? rise : bodies[a.id]));
    expect(familyTotals(apps).audience.demographics).toEqual({
      availableApps: 1,
      age: [{ bracket: '35-44', value: 30 }],
      gender: [{ gender: 'male', value: 25 }],
    });
  });
});

// ─── Attention ───────────────────────────────────────────────────────

const summaryOf = (apps: AppSnapshot[]): FamilySummary => ({ generatedAt: now.toISOString(), apps, totals: familyTotals(apps) });

/** The sample family with one app's body changed. */
function withBody(id: string, edit: (b: Record<string, unknown>) => Record<string, unknown>): FamilySummary {
  const bodies = sampleFamilyBodies(now) as Record<string, Record<string, unknown>>;
  return summaryOf(FAMILY_APPS.map((a) => readAppSummary(a, a.id === id ? edit(structuredClone(bodies[a.id])) : bodies[a.id])));
}

const week = (value: number, previous: number) => ({ value, previous, delta: previous ? Math.round(((value - previous) / previous) * 100) : null, daily: [] });

describe('deriveAttention', () => {
  it('lists the sample week worst first', () => {
    const items = deriveAttention(sampleFamilySummary(now));
    expect(items.map((i) => `${i.level}:${i.rule}:${i.label}`)).toEqual([
      'danger:errors_rising:Go Daisy',
      'check:not_reporting:Findr',
      'check:wrong_property:Go Daisy',
      'check:automated_traffic:Rise Daisy · Fly Cast · Findr',
      'waiting:android_missing:Android',
    ]);
    expect(items[0].title).toBe('Errors up 92% in a week');
    expect(items[1]).toMatchObject({ title: 'Health failed', body: 'Sentry 404: project “findr” not found.' });
    expect(items[3]).toMatchObject({ title: 'Singapore traffic looks automated', country: { code: 'SG', visitors: 724, share: 43 } });
  });

  it('says nothing when nothing is wrong', () => {
    const healthy = (id: string, b: Record<string, unknown>) => b;
    const clean = summaryOf(
      FAMILY_APPS.map((a) =>
        readAppSummary(
          a,
          healthy(a.id, {
            storeDownloads: {
              state: 'ok',
              data: {
                ios: { week: 3, previousWeek: 2 },
                android: { week: 1, previousWeek: 1 },
                hasData: true,
                countries30d: [{ country: 'GB', downloads: 4 }],
              },
            },
            revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 1 } },
            analytics: { state: 'ok', data: { activeUsers: week(100, 90) } },
            platformHealth: { state: 'ok', data: { errors: week(40, 10), crashFreeRate: 99.9, topIssues: [] } },
            audience: {
              state: 'ok',
              data: { countries: [{ code: 'GB', name: 'United Kingdom', activeUsers: 100 }], devices: [{ category: 'mobile', activeUsers: 100 }] },
            },
          }),
        ),
      ),
    );
    expect(deriveAttention(clean)).toEqual([]);
  });

  it('needs both a 50% rise and 100 events before calling errors urgent', () => {
    const errors = (value: number, previous: number) =>
      deriveAttention(withBody('grewp', (b) => ({ ...b, platformHealth: { state: 'ok', data: { errors: week(value, previous), topIssues: [] } } }))).filter(
        (i) => i.rule === 'errors_rising' && i.apps.includes('grewp'),
      );
    expect(errors(150, 100)).toHaveLength(1); // +50%, 150 events
    expect(errors(149, 100)).toHaveLength(0); // +49%
    expect(errors(99, 10)).toHaveLength(0); // too few events
    expect(errors(500, 0)).toHaveLength(0); // no previous week to compare
  });

  it('names an app that is not connected, and every section not reporting', () => {
    const apps = sampleFamilySummary(now).apps.map((a) =>
      a.id === 'flycast' ? unavailableSnapshot(app('flycast'), 'not_configured', 'Not connected yet', ['METRICS_FLYCAST_URL']) : a,
    );
    const fly = deriveAttention(summaryOf(apps)).find((i) => i.apps.includes('flycast'))!;
    expect(fly).toMatchObject({ rule: 'not_reporting', title: 'Not connected to this dashboard', short: 'Not connected' });
    expect(fly.body).toContain('METRICS_FLYCAST_URL');

    const two = deriveAttention(
      withBody('grewp', (b) => ({
        ...b,
        revenue: { state: 'not_configured', missing: ['STRIPE_SECRET_KEY'] },
        platformHealth: { state: 'error', message: 'Sentry 500' },
      })),
    ).find((i) => i.apps.includes('grewp') && i.rule === 'not_reporting')!;
    expect(two.title).toBe('2 sources not reporting');
    expect(two.body).toBe('Revenue: not configured (STRIPE_SECRET_KEY). Health: error: Sentry 500.');
  });

  it('does not flag an app for not sending audience yet, only for audience errors', () => {
    const missing = deriveAttention(withBody('grewp', ({ audience: _a, ...b }) => b));
    expect(missing.some((i) => i.apps.includes('grewp') && i.rule === 'not_reporting')).toBe(false);
    const failed = deriveAttention(withBody('grewp', (b) => ({ ...b, audience: { state: 'error', message: 'GA4 500' } })));
    expect(failed.find((i) => i.apps.includes('grewp'))).toMatchObject({ title: 'Audience failed' });
  });

  it('suspects the GA4 property only with evidence of real use', () => {
    const rule = (b: Record<string, unknown>) => deriveAttention(withBody('godaisy', () => b)).filter((i) => i.rule === 'wrong_property');
    const base = { analytics: { state: 'ok', data: { activeUsers: week(2, 3) } } };
    expect(rule({ ...base, platformHealth: { state: 'ok', data: { errors: week(150, 140), topIssues: [] } } })).toHaveLength(1);
    expect(rule({ ...base, storeDownloads: { state: 'ok', data: { ios: { week: 1, previousWeek: 0 }, hasData: true } } })).toHaveLength(1);
    expect(rule({ ...base, platformHealth: { state: 'ok', data: { errors: week(20, 10), topIssues: [] } } })).toHaveLength(0);
    expect(
      rule({ analytics: { state: 'ok', data: { activeUsers: week(6, 3) } }, platformHealth: { state: 'ok', data: { errors: week(900, 900), topIssues: [] } } }),
    ).toHaveLength(0);
  });

  it('flags a non-home country only at 30% of visitors with no downloads from it', () => {
    const auto = (s: FamilySummary) => deriveAttention(s).filter((i) => i.rule === 'automated_traffic');
    expect(auto(sampleFamilySummary(now))).toHaveLength(1);
    // A Singapore download clears it
    const sgDownload = withBody('findr', (b) => {
      (b.storeDownloads as { data: { countries30d: unknown[] } }).data.countries30d.push({ country: 'SG', downloads: 1 });
      return b;
    });
    expect(auto(sgDownload)).toHaveLength(0);
    // Without any store countries there is no evidence either way
    const bodies = sampleFamilyBodies(now) as Record<string, Record<string, { data: Record<string, unknown> }>>;
    const noStore = summaryOf(
      FAMILY_APPS.map((a) => {
        const b = structuredClone(bodies[a.id]);
        delete b.storeDownloads.data.countries30d;
        return readAppSummary(a, b);
      }),
    );
    expect(auto(noStore)).toHaveLength(0);
    // Home countries never count, however large
    const ukOnly = summaryOf(
      ['risedaisy', 'grewp'].map((id) =>
        readAppSummary(app(id), {
          storeDownloads: { state: 'ok', data: { ios: { week: 1 }, hasData: true, countries30d: [{ country: 'US', downloads: 1 }] } },
          audience: {
            state: 'ok',
            data: { countries: [{ code: 'GB', name: 'United Kingdom', activeUsers: 900 }], devices: [{ category: 'desktop', activeUsers: 1000 }] },
          },
        }),
      ),
    );
    expect(auto(ukOnly)).toHaveLength(0);
  });

  it('waits on Android only when no app has Android downloads and iOS has some', () => {
    const android = (s: FamilySummary) => deriveAttention(s).filter((i) => i.rule === 'android_missing');
    expect(android(sampleFamilySummary(now))).toHaveLength(1);
    const withAndroid = withBody('grewp', (b) => {
      (b.storeDownloads as { data: Record<string, unknown> }).data.android = { week: 2, previousWeek: 0 };
      return b;
    });
    expect(android(withAndroid)).toHaveLength(0);
  });

  it('gives each app card its worst item, but not the family-wide traffic flag', () => {
    const items = deriveAttention(sampleFamilySummary(now));
    expect(appAttention(items, 'godaisy')).toMatchObject({ level: 'danger', short: 'Errors rising' });
    expect(appAttention(items, 'findr')).toMatchObject({ short: 'Health failing' });
    expect(appAttention(items, 'risedaisy')).toBeNull();
  });
});
