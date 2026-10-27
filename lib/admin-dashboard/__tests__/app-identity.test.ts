/**
 * @jest-environment node
 */
/**
 * One codebase, two apps: the deployment's identity picks Go Daisy's or
 * Grow Daisy's store ids, RevenueCat app, Sentry project and Stripe prices.
 */

import { getAppleConfig } from '@/lib/store-stats/apple';
import { getGoogleConfig } from '@/lib/store-stats/google';
import { GROWDAISY_VERCEL_PROJECT_ID, metricsApp } from '../app-identity';
import { fetchSentrySummary } from '../sentry';
import { fetchStripeWebSummary, summariseStripeWeb, type StripeSubscription } from '../stripe-web';

const now = new Date('2026-10-27T07:00:00Z');

describe('metricsApp', () => {
  it('is Go Daisy by default, Grow Daisy on the growdaisy project, and METRICS_APP_ID wins', () => {
    expect(metricsApp({}).id).toBe('go_daisy');
    expect(metricsApp({ VERCEL_PROJECT_ID: GROWDAISY_VERCEL_PROJECT_ID }).id).toBe('grow_daisy');
    expect(metricsApp({ VERCEL_PROJECT_ID: GROWDAISY_VERCEL_PROJECT_ID, METRICS_APP_ID: 'go_daisy' }).id).toBe('go_daisy');
    expect(metricsApp({ METRICS_APP_ID: 'grow_daisy' }).id).toBe('grow_daisy');
    expect(metricsApp({ METRICS_APP_ID: 'nonsense' }).id).toBe('go_daisy');
  });

  it('gives each app its own RevenueCat app in the shared project, so neither is counted twice', () => {
    expect(metricsApp({}).revenuecatAppId).toBe('app7b23f455ba');
    expect(metricsApp({ METRICS_APP_ID: 'grow_daisy' }).revenuecatAppId).toBe('appb6332dd627');
  });

  it('feeds the store config defaults, which explicit env still overrides', () => {
    const apple = {
      APP_STORE_CONNECT_KEY_ID: 'k',
      APP_STORE_CONNECT_ISSUER_ID: 'i',
      APP_STORE_CONNECT_PRIVATE_KEY: 'BEGIN PRIVATE KEY',
      APP_STORE_VENDOR_NUMBER: 'v',
    };
    expect(getAppleConfig(apple)?.appId).toBe('6755695873');
    expect(getAppleConfig({ ...apple, METRICS_APP_ID: 'grow_daisy' })?.appId).toBe('6756812661');
    expect(getAppleConfig({ ...apple, METRICS_APP_ID: 'grow_daisy', APP_STORE_APP_ID: '1' })?.appId).toBe('1');
    const creds = Buffer.from(JSON.stringify({ client_email: 'sa@x', private_key: 'k' })).toString('base64');
    expect(getGoogleConfig({ GOOGLE_PLAY_REPORTS_CREDENTIALS: creds, GOOGLE_PLAY_REPORTS_BUCKET: 'b', METRICS_APP_ID: 'grow_daisy' })?.packageName).toBe(
      'io.growdaisy.app',
    );
  });

  it('reports Grow Daisy’s missing Sentry project honestly, without reading Go Daisy’s DSN', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const env = { METRICS_APP_ID: 'grow_daisy', SENTRY_ADMIN_TOKEN: 't', NEXT_PUBLIC_SENTRY_DSN_GODAISY: 'https://k@o1.ingest.sentry.io/42' };
    await expect(fetchSentrySummary(env)).resolves.toEqual({
      state: 'not_configured',
      missing: [],
      hint: 'Grow Daisy has no Sentry project yet.',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('Stripe web revenue', () => {
  const price = (product: string, amount: number, interval: 'month' | 'year', currency = 'gbp') => ({
    id: `price_${product}_${interval}`,
    product,
    unit_amount: amount,
    currency,
    recurring: { interval, interval_count: 1 },
  });
  const sub = (status: string, p: ReturnType<typeof price>, extra: Partial<StripeSubscription> = {}): StripeSubscription => ({
    id: Math.random().toString(36),
    status,
    created: now.getTime() / 1000 - 60 * 86_400,
    cancel_at_period_end: false,
    items: { data: [{ quantity: 1, price: p }] },
    ...extra,
  });

  it('counts only the app’s products, normalises annual plans to monthly and leaves trials out of MRR', () => {
    const data = summariseStripeWeb(
      [
        sub('active', price('prod_grow', 499, 'month')),
        sub('active', price('prod_grow', 4800, 'year'), { cancel_at_period_end: true, created: now.getTime() / 1000 - 86_400 }),
        sub('trialing', price('prod_grow', 499, 'month')),
        sub('active', price('prod_rise', 999, 'month')), // another family app on the shared account
      ],
      new Set(['prod_grow']),
      now,
    );
    expect(data).toEqual({
      activeSubscriptions: 2,
      trialing: 1,
      cancellingAtPeriodEnd: 1,
      new28d: 1,
      mrrByCurrency: [{ currency: 'GBP', mrr: 8.99, subscriptions: 2 }],
    });
  });

  it('is left out for an app with no web plans, and names what Grow Daisy is missing', async () => {
    await expect(fetchStripeWebSummary({})).resolves.toBeNull();
    await expect(fetchStripeWebSummary({ METRICS_APP_ID: 'grow_daisy' })).resolves.toEqual({
      state: 'not_configured',
      missing: ['STRIPE_SECRET_KEY', 'STRIPE_GROW_SPROUT_MONTHLY_PRICE_ID'],
    });
  });
});
