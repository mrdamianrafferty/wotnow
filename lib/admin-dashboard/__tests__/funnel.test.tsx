/**
 * The per-app funnel and errors per 100 users (funnel.ts), and both on the
 * family dashboard's cards. The Sentry fetch is in sentry-top.test.ts.
 * A step that cannot be read is "not tracked", never 0; a step that does
 * not exist for the app is left out.
 */

import { render, screen, within } from '@testing-library/react';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import { adjustUsers } from '../automated';
import { FAMILY_APPS, readAppSummary, type AppSnapshot, type Part, type VercelPart } from '../family';
import { sampleFamilySummary } from '../family-sample';
import { appFunnel, errorRate } from '../funnel';

const now = new Date('2026-10-28T10:00:00Z');
const app = (id: string) => FAMILY_APPS.find((a) => a.id === id)!;

const platform = (total30d: number | undefined) => ({ week: 1, previousWeek: 1, sparkline: [], ...(total30d === undefined ? {} : { total30d }) });
const vercel = (visitors28d: number | null | undefined): Part<VercelPart> => ({
  state: 'ok',
  data: {
    window: { from: '2026-10-21', to: '2026-10-27' },
    visitors: { value: 10, previous: 10, delta: 0, daily: [] },
    pageviews: { value: 20, previous: 20, delta: 0, daily: [] },
    countries: [],
    ...(visitors28d === undefined ? {} : { visitors28d }),
  },
});
const week = (value: number) => ({ value, previous: value, daily: [] });

function snap(id: string, body: Record<string, unknown>, extra: Partial<AppSnapshot> = {}): AppSnapshot {
  return { ...readAppSummary(app(id), { generatedAt: now.toISOString(), ...body }), ...extra };
}

const steps = (a: AppSnapshot) => appFunnel(a).steps.map((s) => [s.key, s.value]);
const rates = (a: AppSnapshot) => appFunnel(a).links.map((l) => l.rate);

describe('appFunnel', () => {
  it('runs visitors → downloads → trials → paid, adding web plans, with step-to-step %', () => {
    const a = snap(
      'risedaisy',
      {
        storeDownloads: { state: 'ok', data: { ios: platform(40), android: platform(10), hasData: true } },
        revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 12.98, activeTrials: 2, activeSubscriptions: 1 } },
        webRevenue: { state: 'ok', data: { activeSubscriptions: 1, trialing: 0, mrrByCurrency: [] } },
      },
      { vercel: vercel(1000) },
    );
    expect(steps(a)).toEqual([
      ['visitors', 1000],
      ['downloads', 50],
      ['trials', 2],
      ['paid', 2],
    ]);
    expect(rates(a)).toEqual([5, 4, 100]);
    expect(appFunnel(a).steps[3].note).toBe('RevenueCat + Stripe web');
  });

  it('shows a step it cannot read as not tracked (null), never 0, and gives no rate across it', () => {
    const a = snap('findr', {
      storeDownloads: { state: 'error', message: 'App Store Connect 500' },
      revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'EUR', mrr: 0, activeSubscriptions: 0, activeTrials: null } },
    });
    const f = appFunnel(a);
    expect(f.steps.map((s) => [s.key, s.value])).toEqual([
      ['visitors', null],
      ['downloads', null],
      ['trials', null],
      ['paid', 0],
    ]);
    expect(f.steps[0].note).toBe('Vercel not reported');
    expect(f.steps[1].note).toBe('error: App Store Connect 500');
    expect(f.steps[2].note).toBe('RevenueCat does not report trials');
    expect(f.links.map((l) => l.rate)).toEqual([null, null, null]);
  });

  it('skips the store step for a web-first app with no store data (Grewp), but shows one it does report', () => {
    const web = snap('grewp', { revenue: { state: 'ok', data: { source: 'stripe', currency: 'EUR', mrr: 0, activeSubscriptions: 0, activeTrials: 0 } } }, { vercel: vercel(4000) });
    expect(steps(web)).toEqual([
      ['visitors', 4000],
      ['trials', 0],
      ['paid', 0],
    ]);
    expect(rates(web)).toEqual([0, null]);
    expect(appFunnel(web).links[1].note).toBe('no trials to convert');

    const withStores = snap('grewp', { storeDownloads: { state: 'ok', data: { ios: platform(3), android: platform(1), hasData: true } } }, { vercel: vercel(4000) });
    expect(steps(withStores)[1]).toEqual(['downloads', 4]);
  });

  it('gives a club app (Hungerford) no trials or paid, and counts only the stores it is on', () => {
    const a = snap(
      'hungerford',
      { storeDownloads: { state: 'ok', data: { ios: platform(12), android: { available: false }, hasData: true } }, revenue: { state: 'ok', data: { source: 'none' } } },
      { vercel: vercel(200) },
    );
    expect(steps(a)).toEqual([
      ['visitors', 200],
      ['downloads', 12],
    ]);
    expect(appFunnel(a).steps[1].note).toBe('iOS');
  });

  it('says which platform is missing when only one store sends a 30-day total', () => {
    const a = snap('godaisy', { storeDownloads: { state: 'ok', data: { ios: platform(9), android: platform(undefined), hasData: true } } });
    expect(appFunnel(a).steps[1]).toMatchObject({ value: 9, note: 'iOS only; Android not tracked' });
  });

  it('gives no rate above 100%: trials and paid are standing counts, not one cohort', () => {
    const a = snap('flycast', { revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 5, activeTrials: 1, activeSubscriptions: 3 } } });
    expect(appFunnel(a).links.at(-1)).toEqual({ rate: null, note: 'standing counts, not one cohort' });
  });

  it('does not take a shared RevenueCat project total as this app’s', () => {
    const a = snap('godaisy', {
      revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 0, activeTrials: 4, activeSubscriptions: 0, projectTotal: ['activeTrials'] } },
    });
    expect(appFunnel(a).steps.find((s) => s.key === 'trials')).toMatchObject({ value: null, note: 'only the shared project total is known' });
  });

  it('marks visitors not tracked when Vercel answered but a cached snapshot predates the 28-day count', () => {
    expect(appFunnel(snap('findr', {}, { vercel: vercel(undefined) })).steps[0]).toMatchObject({ value: null, note: 'no 28-day count yet' });
  });
});

describe('errorRate', () => {
  it('is stored errors per 100 active users over the same 7 days', () => {
    const a = snap('flycast', { platformHealth: { state: 'ok', data: { errors: week(30) } }, analytics: { state: 'ok', data: { activeUsers: week(600) } } });
    expect(errorRate(a)).toEqual({ errors: 30, users: 600, adjusted: false, per100: 5, note: null });
  });

  it('keeps one decimal for small rates', () => {
    const a = snap('flycast', { platformHealth: { state: 'ok', data: { errors: week(1) } }, analytics: { state: 'ok', data: { activeUsers: week(300) } } });
    expect(errorRate(a).per100).toBe(0.3);
  });

  it('uses the adjusted active users, not the raw GA4 figure', () => {
    const data = sampleFamilySummary(now, { withVercel: true });
    const adjusted = data.apps.filter((a) => adjustUsers(a).excluded > 0 && errorRate(a).errors !== null);
    expect(adjusted.length).toBeGreaterThan(0);
    for (const a of adjusted) {
      expect(errorRate(a)).toMatchObject({ users: adjustUsers(a).headline!.value, adjusted: true });
      expect(errorRate(a).users).toBeLessThan(adjustUsers(a).raw!.value);
    }
  });

  it('has no rate, with the reason, when either side is missing or there were no users', () => {
    expect(errorRate(snap('findr', { platformHealth: { state: 'not_configured', missing: ['SENTRY_ADMIN_TOKEN'] } }))).toMatchObject({
      per100: null,
      note: 'Errors: SENTRY_ADMIN_TOKEN not set',
    });
    expect(errorRate(snap('findr', { platformHealth: { state: 'ok', data: { errors: week(3) } } }))).toMatchObject({ per100: null, note: 'Active users: Not reported by this app' });
    expect(
      errorRate(snap('findr', { platformHealth: { state: 'ok', data: { errors: week(3) } }, analytics: { state: 'ok', data: { activeUsers: week(0) } } })),
    ).toMatchObject({ per100: null, note: 'no active users this week' });
  });
});

describe('on the family dashboard', () => {
  it('shows each card’s funnel, "not tracked" steps, errors per 100 users and a link to the top issue', () => {
    render(<FamilyDashboard data={sampleFamilySummary(now, { withVercel: true, withTopIssues: true })} />);
    const go = document.getElementById('app-godaisy')!;
    expect(within(go).getByRole('list', { name: /Go Daisy funnel: Visitors \d+, Downloads \d+, Trials/ })).toBeInTheDocument();
    expect(within(go).getByRole('link', { name: /hourly.*opens Sentry in a new tab/ })).toHaveAttribute('href', 'https://go-daisy.sentry.io/issues/GODAISY-NEXTJS-4F/');
    expect(within(go).getByText('Errors per 100 users')).toBeInTheDocument();

    const hf = document.getElementById('app-hungerford')!;
    expect(within(hf).getByText(/project shared with Rise Daisy/)).toBeInTheDocument();
    expect(within(hf).queryByText(/^Trials/)).toBeNull();

    // Findr's Sentry is not connected in the sample: no rate, and a reason
    expect(within(document.getElementById('app-findr')!).getByText(/Top issue: Sentry refused the token/)).toBeInTheDocument();
    expect(screen.getAllByText('not tracked').length).toBeGreaterThan(0);
  });
});
