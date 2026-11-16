/**
 * @jest-environment node
 *
 * GA4 tracking helpers (lib/analytics/*). The pure parts: which property and
 * section a page belongs to, which pages GA must ignore, the sign-in rule,
 * the hashed user id the browser and server must agree on, and the mapping
 * from payment webhooks to GA's start_trial / purchase.
 */

import { webcrypto, createHash } from 'node:crypto';
import {
  analyticsUserId,
  appForLocation,
  authMethodOf,
  canonicalPath,
  contentGroupFor,
  gaClientId,
  gaInitScript,
  isTrackedHost,
  isUntrackedPath,
} from '@/lib/analytics/track';
import { signInKind } from '@/lib/analytics/sign-in-kind';
import {
  analyticsUserIdServer,
  buildPayload,
  clientIdFor,
  collectUrl,
  sendServerEvent,
  stripeAmountToValue,
} from '@/lib/analytics/measurement-protocol';
import {
  revenueCatServerEvent,
  stripeAppOf,
  stripeInvoicePurchase,
  stripeLifetimePurchase,
  stripeTrialStarted,
} from '@/lib/analytics/paymentEvents';
import type Stripe from 'stripe';

const UID = '4f1c2a7e-0000-4000-8000-123456789abc';

describe('which property a page belongs to', () => {
  it.each([
    ['godaisy.io', '/', 'godaisy'],
    ['godaisy.io', '/call', 'godaisy'],
    ['godaisy.io', '/grow/garden', 'grow'],
    ['grow.godaisy.io', '/', 'grow'],
    ['godaisy.io', '/growing-tips', 'godaisy'],
    ['godaisy.io', '/findr', null],
    ['fishfindr.eu', '/', null],
  ])('%s%s → %s', (host, path, app) => {
    expect(appForLocation(host, path)).toBe(app);
  });
});

describe('contentGroupFor', () => {
  it.each([
    ['/', 'call'],
    ['/call?place=x', 'call'],
    ['/weather', 'conditions'],
    ['/start', 'onboarding'],
    ['/account', 'account'],
    ['/support', 'support'],
    ['/login', 'auth'],
    ['/auth/callback', 'auth'],
    ['/studio/build', 'studio'],
    ['/share/abc', 'shared_link'],
    ['/PrivacyPolicy', 'legal'],
    ['/hiking/brighton', 'activity_page'],
    ['/admin/apps', 'admin'],
    ['/grow', 'grow_home'],
    ['/grow/', 'grow_home'],
    ['/grow/garden/beds/1', 'grow_garden'],
    ['/grow/fr/species/tomato', 'grow_species'],
    ['/grow/premium', 'grow_pricing'],
    ['/grow/terms', 'grow_legal'],
  ])('%s → %s', (path, group) => {
    expect(contentGroupFor(path)).toBe(group);
  });

  it('reads grow.godaisy.io paths as /grow paths', () => {
    expect(canonicalPath('grow.godaisy.io', '/')).toBe('/grow');
    expect(canonicalPath('grow.godaisy.io', '/plan')).toBe('/grow/plan');
    expect(canonicalPath('grow.godaisy.io', '/grow/plan')).toBe('/grow/plan');
    expect(canonicalPath('godaisy.io', '/plan')).toBe('/plan');
  });
});

describe('pages and hosts GA ignores', () => {
  it.each(['/admin', '/admin/apps', '/dev/x', '/demo', '/test/thing'])('%s is untracked', (p) => {
    expect(isUntrackedPath(p)).toBe(true);
  });
  it.each(['/', '/call', '/administration-tips', '/studio', '/grow/garden'])('%s is tracked', (p) => {
    expect(isUntrackedPath(p)).toBe(false);
  });
  it('counts production hosts only, not Vercel previews or localhost', () => {
    expect(isTrackedHost('godaisy.io')).toBe(true);
    expect(isTrackedHost('www.godaisy.io')).toBe(true);
    expect(isTrackedHost('grow.godaisy.io')).toBe(true);
    expect(isTrackedHost('wotnow-git-branch-team.vercel.app')).toBe(false);
    expect(isTrackedHost('localhost')).toBe(false);
    expect(isTrackedHost('godaisy.io.evil.com')).toBe(false);
  });
});

describe('gaInitScript', () => {
  it('configures without a page_view, announces ready, then sends the page_view', () => {
    const s = gaInitScript('G-0YDQB1067L');
    const config = s.indexOf("gtag('config', \"G-0YDQB1067L\", { send_page_view: false })");
    const ready = s.indexOf('daisy:ga-ready');
    const pv = s.indexOf("gtag('event', 'page_view')");
    expect(config).toBeGreaterThan(-1);
    expect(ready).toBeGreaterThan(config);
    expect(pv).toBeGreaterThan(ready);
  });
});

describe('signInKind', () => {
  const now = Date.parse('2026-11-16T12:00:00Z');
  it('a fresh sign-in on a new account is a sign_up', () => {
    expect(signInKind('2026-11-16T11:59:00Z', '2026-11-16T11:59:30Z', null, now)).toBe('sign_up');
  });
  it('a fresh sign-in on an old account is a login', () => {
    expect(signInKind('2025-01-01T00:00:00Z', '2026-11-16T11:58:00Z', null, now)).toBe('login');
  });
  it('the same sign-in seen again (token refresh, refocus) is nothing', () => {
    expect(signInKind('2025-01-01T00:00:00Z', '2026-11-16T11:58:00Z', '2026-11-16T11:58:00Z', now)).toBeNull();
  });
  it('an old session restored on a new device is nothing', () => {
    expect(signInKind('2025-01-01T00:00:00Z', '2026-11-10T09:00:00Z', null, now)).toBeNull();
  });
  it('no sign-in time is nothing', () => {
    expect(signInKind(undefined, undefined, null, now)).toBeNull();
  });
});

describe('analytics user id', () => {
  beforeAll(() => {
    if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
  });

  it('is sha256("<app>:" + id), cut to 32 hex, the same in browser and server', async () => {
    const expected = createHash('sha256').update(`godaisy:${UID}`).digest('hex').slice(0, 32);
    expect(analyticsUserIdServer('godaisy', UID)).toBe(expected);
    await expect(analyticsUserId('godaisy', UID)).resolves.toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{32}$/);
    expect(expected).not.toContain(UID.slice(0, 8));
  });

  it('differs per property', async () => {
    expect(analyticsUserIdServer('grow', UID)).not.toBe(analyticsUserIdServer('godaisy', UID));
    await expect(analyticsUserId('grow', UID)).resolves.toBe(analyticsUserIdServer('grow', UID));
  });
});

describe('small helpers', () => {
  it('gaClientId reads the _ga cookie', () => {
    expect(gaClientId('foo=1; _ga=GA1.1.123456789.1700000000; bar=2')).toBe('123456789.1700000000');
    expect(gaClientId('foo=1')).toBeNull();
  });
  it('authMethodOf maps Supabase providers', () => {
    expect(authMethodOf('apple')).toBe('apple');
    expect(authMethodOf('github')).toBe('other');
    expect(authMethodOf(undefined)).toBe('other');
  });
  it('stripeAmountToValue handles minor units and zero-decimal currencies', () => {
    expect(stripeAmountToValue(499, 'eur')).toBe(4.99);
    expect(stripeAmountToValue(500, 'JPY')).toBe(500);
    expect(stripeAmountToValue(null, 'eur')).toBe(0);
  });
});

describe('Measurement Protocol', () => {
  it('uses the browser client id when passed, else one derived from the user', () => {
    expect(clientIdFor('grow', '123.456', UID)).toBe('123.456');
    expect(clientIdFor('grow', 'junk', UID)).toMatch(/^\d+\.1$/);
    expect(clientIdFor('grow', null, UID)).toBe(clientIdFor('grow', null, UID));
  });

  it('builds a payload with the hashed user id, never the raw one', () => {
    const body = buildPayload(
      { app: 'grow', name: 'purchase', params: { transaction_id: 'in_1', value: 4.99, currency: 'EUR', dropped: undefined } },
      { supabaseUserId: UID, platform: 'web' },
    );
    expect(body.user_id).toBe(analyticsUserIdServer('grow', UID));
    expect(JSON.stringify(body)).not.toContain(UID);
    const ev = (body.events as Array<{ name: string; params: Record<string, unknown> }>)[0];
    expect(ev.name).toBe('purchase');
    expect(ev.params).toEqual({ engagement_time_msec: 1, transaction_id: 'in_1', value: 4.99, currency: 'EUR' });
  });

  it('only sends in Vercel production with that property’s own secret', () => {
    expect(collectUrl('grow', { GA_MP_API_SECRET_GROW: 's3cret', VERCEL_ENV: 'preview' })).toBeNull();
    expect(collectUrl('grow', { GA_MP_API_SECRET_GODAISY: 's3cret', VERCEL_ENV: 'production' })).toBeNull();
    expect(collectUrl('grow', { GA_MP_API_SECRET_GROW: '  ', VERCEL_ENV: 'production' })).toBeNull();
    expect(collectUrl('grow', { GA_MP_API_SECRET_GROW: 's3cret', VERCEL_ENV: 'production' }))
      .toBe('https://www.google-analytics.com/mp/collect?measurement_id=G-S895QHFGQH&api_secret=s3cret');
    expect(collectUrl('godaisy', { GA_MP_API_SECRET_GODAISY: 'x', VERCEL_ENV: 'production' })).toContain('G-0YDQB1067L');
  });

  it('never throws, even when fetch does', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      sendServerEvent({ app: 'godaisy', name: 'purchase', params: {} }, {}, { GA_MP_API_SECRET_GODAISY: 'x', VERCEL_ENV: 'production' }),
    ).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    globalThis.fetch = orig;
  });

  it('does not call fetch without a secret', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = jest.fn();
    await sendServerEvent({ app: 'grow', name: 'purchase', params: {} }, {}, { VERCEL_ENV: 'production' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    globalThis.fetch = orig;
  });
});

describe('Stripe → GA', () => {
  const growMeta = { app: 'grow_daisy', tier: 'bloom', billing_type: 'annual', supabase_user_id: UID, ga_client_id: '11.22' };

  it('routes by metadata.app', () => {
    expect(stripeAppOf({ app: 'godaisy_plus' })).toBe('godaisy');
    expect(stripeAppOf({ app: 'grow_daisy' })).toBe('grow');
    expect(stripeAppOf({ supabase_user_id: UID })).toBeNull();
  });

  it('start_trial only for a trialing subscription', () => {
    const m = stripeTrialStarted({ status: 'trialing', metadata: growMeta, currency: 'gbp' } as Stripe.Subscription);
    expect(m?.event).toEqual({
      app: 'grow',
      name: 'start_trial',
      params: { product: 'bloom_annual', product_kind: 'subscription', store: 'stripe', value: 0, currency: 'GBP' },
    });
    expect(m?.opts).toEqual({ supabaseUserId: UID, gaClientId: '11.22', platform: 'web' });
    expect(stripeTrialStarted({ status: 'active', metadata: growMeta, currency: 'gbp' } as Stripe.Subscription)).toBeNull();
  });

  it('purchase for a paid invoice, keyed on the invoice id; nothing for £0', () => {
    const m = stripeInvoicePurchase(
      { id: 'in_123', amount_paid: 2999, currency: 'eur', billing_reason: 'subscription_cycle' } as Stripe.Invoice,
      { metadata: { app: 'godaisy_plus', billing_type: 'monthly', supabase_user_id: UID } } as unknown as Stripe.Subscription,
    );
    expect(m?.event.app).toBe('godaisy');
    expect(m?.event.params).toMatchObject({ transaction_id: 'in_123', value: 29.99, currency: 'EUR', product: 'plus_monthly', billing_reason: 'subscription_cycle' });
    expect(stripeInvoicePurchase(
      { id: 'in_0', amount_paid: 0, currency: 'eur', billing_reason: 'subscription_create' } as Stripe.Invoice,
      { metadata: growMeta } as unknown as Stripe.Subscription,
    )).toBeNull();
  });

  it('purchase for a paid lifetime checkout, keyed on the payment intent', () => {
    const m = stripeLifetimePurchase({
      id: 'cs_1', mode: 'payment', payment_status: 'paid', payment_intent: 'pi_9', amount_total: 4900, currency: 'eur',
      metadata: { app: 'grow_daisy', tier: 'harvest', supabase_user_id: UID },
    } as unknown as Stripe.Checkout.Session);
    expect(m?.event.params).toMatchObject({ transaction_id: 'pi_9', value: 49, product: 'harvest_lifetime', product_kind: 'lifetime' });
    expect(stripeLifetimePurchase({
      id: 'cs_2', mode: 'subscription', payment_status: 'paid', payment_intent: null, amount_total: 4900, currency: 'eur',
      metadata: { app: 'grow_daisy' },
    } as unknown as Stripe.Checkout.Session)).toBeNull();
  });
});

describe('RevenueCat → GA', () => {
  const base = { id: 'evt_1', app_user_id: UID, product_id: 'growdaisy_sprout_monthly', store: 'APP_STORE', environment: 'PRODUCTION' as const };

  it('a trial start', () => {
    const m = revenueCatServerEvent({ ...base, type: 'INITIAL_PURCHASE', period_type: 'TRIAL', currency: 'GBP' }, 'grow', 'subscription');
    expect(m?.event.name).toBe('start_trial');
    expect(m?.opts.platform).toBe('ios');
  });

  it('a paid purchase and a renewal, keyed on the store transaction', () => {
    const p = revenueCatServerEvent(
      { ...base, type: 'RENEWAL', period_type: 'NORMAL', price_in_purchased_currency: 3.99, currency: 'GBP', transaction_id: '2000001' },
      'grow', 'subscription',
    );
    expect(p?.event).toMatchObject({ name: 'purchase', params: { transaction_id: '2000001', value: 3.99, billing_reason: 'renewal', store: 'app_store' } });
  });

  it('a tip goes to Go Daisy as a one-off purchase', () => {
    const t = revenueCatServerEvent(
      { ...base, product_id: 'godaisy_tip_pint', type: 'NON_RENEWING_PURCHASE', price_in_purchased_currency: 4.99, currency: 'EUR' },
      'godaisy', 'tip',
    );
    expect(t?.event).toMatchObject({ app: 'godaisy', name: 'purchase', params: { transaction_id: 'evt_1', product_kind: 'tip', billing_reason: 'one_off' } });
  });

  it('ignores sandbox, zero-price and non-money events', () => {
    expect(revenueCatServerEvent({ ...base, type: 'INITIAL_PURCHASE', environment: 'SANDBOX', price_in_purchased_currency: 3 }, 'grow', 'subscription')).toBeNull();
    expect(revenueCatServerEvent({ ...base, type: 'INITIAL_PURCHASE', price_in_purchased_currency: 0 }, 'grow', 'subscription')).toBeNull();
    expect(revenueCatServerEvent({ ...base, type: 'CANCELLATION', price_in_purchased_currency: 3 }, 'grow', 'subscription')).toBeNull();
  });
});
