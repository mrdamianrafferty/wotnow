/**
 * Stripe Webhook Tests
 *
 * The checkout / portal / cancel endpoints that used to be covered here were
 * `pages/api/stripe/*` — dead findr-era routes with no callers anywhere in the
 * app, still deployed and still priced against findr's price ID. They were
 * deleted rather than fixed; Go Daisy+ and Grow Daisy have their own live
 * endpoints under `pages/api/godaisy/` and `pages/api/grow/`.
 *
 * Supabase is faked with a small in-memory store rather than per-call stubs,
 * because what these tests have to prove is the resulting STATE: that a
 * cancellation actually downgraded the row, that a replayed event left it
 * unchanged, that an out-of-order event did not resurrect a paid tier. A stub
 * that resolves `{ error: null }` to everything cannot tell those apart — which
 * is how seven unchecked writes, both downgrades among them, went unnoticed.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import webhookHandler from '@/pages/api/stripe/webhook';

type Row = Record<string, unknown>;

// `mock` prefix: jest.mock factories may only close over variables named so.
const mockDb: {
  tables: Record<string, Row[]>;
  failProfileUpdates: boolean;
} = { tables: {}, failProfileUpdates: false };

/** Subscriptions as Stripe would return them from `subscriptions.retrieve` now. */
const mockStripeSubscriptions: Record<string, Row> = {};

/** Minimal thenable PostgREST builder over `mockDb`. Only what the webhook uses. */
function mockQuery(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op: { kind: 'select' } | { kind: 'update'; data: Row } | { kind: 'insert'; row: Row } = {
    kind: 'select',
  };
  let limit: number | undefined;

  const run = (): { data: Row[] | null; error: { code: string; message: string } | null } => {
    const rows = (mockDb.tables[table] ??= []);
    const matches = (r: Row) => filters.every(([k, v]) => r[k] === v);

    if (op.kind === 'insert') {
      const row = op.row;
      if (row.stripe_event_id && rows.some(r => r.stripe_event_id === row.stripe_event_id)) {
        return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      }
      rows.push({ ...row });
      return { data: null, error: null };
    }
    if (op.kind === 'update') {
      if (table === 'profiles' && mockDb.failProfileUpdates) {
        return { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
      }
      const hit = rows.filter(matches);
      hit.forEach(r => Object.assign(r, (op as { data: Row }).data));
      return { data: hit.map(r => ({ id: r.id })), error: null };
    }
    const hit = rows.filter(matches);
    return { data: limit === undefined ? hit : hit.slice(0, limit), error: null };
  };

  const builder = {
    select: () => builder,
    update: (data: Row) => { op = { kind: 'update', data }; return builder; },
    insert: (row: Row) => { op = { kind: 'insert', row }; return builder; },
    eq: (column: string, value: unknown) => { filters.push([column, value]); return builder; },
    limit: (n: number) => { limit = n; return builder; },
    maybeSingle: () => {
      const { data, error } = run();
      return Promise.resolve({ data: data?.[0] ?? null, error });
    },
    then: <T>(resolve: (v: ReturnType<typeof run>) => T, reject?: (e: unknown) => T) =>
      Promise.resolve(run()).then(resolve, reject),
  };
  return builder;
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => mockQuery(table),
    rpc: (fn: string, args: Row) => {
      if (fn !== 'apply_voucher') return Promise.resolve({ data: null, error: null });
      (mockDb.tables.voucher_usage ??= []).push({
        id: `vu_${mockDb.tables.voucher_usage.length}`,
        voucher_id: args.voucher_id_input,
        user_id: args.user_id_input,
      });
      const voucher = (mockDb.tables.vouchers ?? []).find(v => v.id === args.voucher_id_input);
      if (voucher) voucher.current_uses = (voucher.current_uses as number) + 1;
      return Promise.resolve({ data: true, error: null });
    },
  })),
}));

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    subscriptions: {
      retrieve: jest.fn((id: string) => {
        const sub = mockStripeSubscriptions[id];
        return sub ? Promise.resolve(sub) : Promise.reject(new Error(`No such subscription: ${id}`));
      }),
    },
    prices: {
      retrieve: jest.fn(() => Promise.resolve({ unit_amount: 3000 })),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

// Email has its own never-throw contract and ledger; not under test here.
jest.mock('@/lib/grow/sendSubscriptionEmail', () => ({
  sendTrialStarted: jest.fn(() => Promise.resolve({ sent: false })),
  sendTrialEnding: jest.fn(() => Promise.resolve({ sent: false })),
  sendSubscriptionConfirmed: jest.fn(() => Promise.resolve({ sent: false })),
  sendSubscriptionCancelled: jest.fn(() => Promise.resolve({ sent: false })),
  sendPaymentFailed: jest.fn(() => Promise.resolve({ sent: false })),
  formatStripeAmount: jest.fn(() => null),
  formatEpochDate: jest.fn(() => null),
}));

// Mock micro buffer function for webhook body parsing
jest.mock('micro', () => ({
  buffer: jest.fn((req) => Promise.resolve(Buffer.from(JSON.stringify(req.body)))),
}));

const USER = 'user123';
const NOW = Math.floor(Date.now() / 1000);

function profile(): Row {
  return mockDb.tables.profiles.find(p => p.id === USER)!;
}

function subscription(id: string, status: string, app = 'grow_daisy', extra: Row = {}): Row {
  return {
    id,
    status,
    created: NOW,
    customer: 'cus_test123',
    items: { data: [{ price: { id: 'price_bloom' }, current_period_end: NOW + 86400 }] },
    metadata: { app, supabase_user_id: USER, tier: 'bloom', billing_type: 'annual', ...extra },
  };
}

/** Deliver an event. `now` is what Stripe would return for the subscription today. */
async function deliver(event: Row) {
  const { stripe } = require('@/lib/stripe/server');
  stripe.webhooks.constructEvent.mockReturnValueOnce(event);

  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    body: JSON.stringify(event),
    headers: { 'stripe-signature': 'test_signature' },
  });
  await webhookHandler(req, res);
  return { status: res._getStatusCode(), body: JSON.parse(res._getData()) };
}

function event(id: string, type: string, object: Row): Row {
  return { id, type, data: { object } };
}

beforeEach(() => {
  mockDb.failProfileUpdates = false;
  mockDb.tables = {
    profiles: [{ id: USER, grow_subscription_tier: 'seed', godaisy_subscription_tier: 'free' }],
    vouchers: [{ id: 'voucher123', current_uses: 0 }],
    voucher_usage: [],
    grow_subscription_events: [],
    godaisy_subscription_events: [],
  };
  for (const k of Object.keys(mockStripeSubscriptions)) delete mockStripeSubscriptions[k];
});

describe('POST /api/stripe/webhook', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should handle checkout.session.completed event', async () => {
    const result = await deliver(event('evt_checkout', 'checkout.session.completed', {
      id: 'cs_test123',
      customer: 'cus_test123',
      subscription: 'sub_test123',
      mode: 'subscription',
      metadata: { app: 'grow_daisy', supabase_user_id: USER, tier: 'bloom' },
    }));

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(profile().stripe_customer_id).toBe('cus_test123');
  });

  it('should grant the tier on customer.subscription.updated', async () => {
    const sub = subscription('sub_test123', 'active');
    mockStripeSubscriptions.sub_test123 = sub;

    const result = await deliver(event('evt_updated', 'customer.subscription.updated', sub));

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(profile().grow_subscription_tier).toBe('bloom');
    expect(profile().grow_stripe_subscription_id).toBe('sub_test123');
  });

  it('should downgrade on customer.subscription.deleted', async () => {
    Object.assign(profile(), { grow_subscription_tier: 'bloom', grow_stripe_subscription_id: 'sub_test123' });

    const result = await deliver(event('evt_deleted', 'customer.subscription.deleted',
      subscription('sub_test123', 'canceled')));

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(profile().grow_subscription_tier).toBe('seed');
  });

  it('should handle a Go Daisy+ event', async () => {
    const sub = subscription('sub_gd', 'active', 'godaisy_plus');
    mockStripeSubscriptions.sub_gd = sub;

    const result = await deliver(event('evt_test_godaisy', 'customer.subscription.updated', sub));

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(profile().godaisy_subscription_tier).toBe('plus');
  });

  // ── Checked writes ────────────────────────────────────────────────────
  //
  // Both cancellation downgrades used to discard their error and answer 200,
  // so a failed downgrade was never retried and the customer kept a paid tier
  // for free, indefinitely and silently.

  it('returns 500 when the Grow downgrade fails, so Stripe retries it', async () => {
    Object.assign(profile(), { grow_subscription_tier: 'bloom', grow_stripe_subscription_id: 'sub_test123' });
    mockDb.failProfileUpdates = true;

    const result = await deliver(event('evt_deleted', 'customer.subscription.deleted',
      subscription('sub_test123', 'canceled')));

    expect(result.status).toBe(500);
    expect(profile().grow_subscription_tier).toBe('bloom');
  });

  it('returns 500 when the Go Daisy+ downgrade fails, so Stripe retries it', async () => {
    Object.assign(profile(), { godaisy_subscription_tier: 'plus', godaisy_stripe_subscription_id: 'sub_gd' });
    mockDb.failProfileUpdates = true;

    const result = await deliver(event('evt_gd_deleted', 'customer.subscription.deleted',
      subscription('sub_gd', 'canceled', 'godaisy_plus')));

    expect(result.status).toBe(500);
  });

  it('downgrades Go Daisy+ to free on cancellation', async () => {
    Object.assign(profile(), { godaisy_subscription_tier: 'plus', godaisy_stripe_subscription_id: 'sub_gd' });

    const result = await deliver(event('evt_gd_deleted', 'customer.subscription.deleted',
      subscription('sub_gd', 'canceled', 'godaisy_plus')));

    expect(result.status).toBe(200);
    expect(profile().godaisy_subscription_tier).toBe('free');
  });

  it('answers 200 with a flag, not silent success, when the profile does not exist', async () => {
    mockDb.tables.profiles = [];

    const result = await deliver(event('evt_deleted', 'customer.subscription.deleted',
      subscription('sub_test123', 'canceled')));

    expect(result).toEqual({ status: 200, body: { received: true, ignored: 'profile_not_found' } });
  });

  // ── Superseded subscriptions ──────────────────────────────────────────

  it('does not downgrade a lifetime customer when an old subscription is deleted', async () => {
    Object.assign(profile(), {
      grow_subscription_tier: 'harvest',
      grow_subscription_type: 'lifetime',
      grow_stripe_subscription_id: null,
    });

    const result = await deliver(event('evt_old_deleted', 'customer.subscription.deleted',
      subscription('sub_old', 'canceled')));

    expect(result.status).toBe(200);
    expect(profile().grow_subscription_tier).toBe('harvest');
  });

  it('does not downgrade a customer who has resubscribed when the old subscription lapses', async () => {
    Object.assign(profile(), { grow_subscription_tier: 'bloom', grow_stripe_subscription_id: 'sub_new' });
    const old = subscription('sub_old', 'canceled');
    mockStripeSubscriptions.sub_old = old;

    const result = await deliver(event('evt_old_updated', 'customer.subscription.updated', old));

    expect(result.status).toBe(200);
    expect(profile().grow_subscription_tier).toBe('bloom');
    expect(profile().grow_stripe_subscription_id).toBe('sub_new');
  });

  // ── Replay and ordering ───────────────────────────────────────────────
  //
  // Returning 5xx commits us to Stripe retrying, so every write must be safe
  // to run twice, and Stripe does not promise delivery order.

  it('does not re-grant a paid tier when a stale `updated` arrives after `deleted`', async () => {
    Object.assign(profile(), { grow_subscription_tier: 'bloom', grow_stripe_subscription_id: 'sub_test123' });
    const staleSnapshot = subscription('sub_test123', 'active');
    mockStripeSubscriptions.sub_test123 = subscription('sub_test123', 'canceled');

    await deliver(event('evt_deleted', 'customer.subscription.deleted',
      subscription('sub_test123', 'canceled')));
    const result = await deliver(event('evt_stale_updated', 'customer.subscription.updated', staleSnapshot));

    expect(result.status).toBe(200);
    expect(profile().grow_subscription_tier).toBe('seed');
  });

  it('is safe to replay: the same `updated` twice redeems a voucher once and audits once', async () => {
    const sub = subscription('sub_test123', 'active', 'grow_daisy', {
      voucherCode: 'SAVE10',
      voucherId: 'voucher123',
    });
    mockStripeSubscriptions.sub_test123 = sub;
    const e = event('evt_updated', 'customer.subscription.updated', sub);

    const first = await deliver(e);
    const second = await deliver(e);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(profile().grow_subscription_tier).toBe('bloom');
    expect(mockDb.tables.voucher_usage).toHaveLength(1);
    expect(mockDb.tables.vouchers[0].current_uses).toBe(1);
    expect(mockDb.tables.grow_subscription_events).toHaveLength(1);
  });

  it('does not count a voucher again on a later renewal event', async () => {
    const sub = subscription('sub_test123', 'active', 'grow_daisy', {
      voucherCode: 'SAVE10',
      voucherId: 'voucher123',
    });
    mockStripeSubscriptions.sub_test123 = sub;

    await deliver(event('evt_created', 'customer.subscription.created', sub));
    await deliver(event('evt_renewed', 'customer.subscription.updated', sub));

    expect(mockDb.tables.voucher_usage).toHaveLength(1);
    expect(mockDb.tables.vouchers[0].current_uses).toBe(1);
  });

  it('is safe to replay a cancellation', async () => {
    Object.assign(profile(), { grow_subscription_tier: 'bloom', grow_stripe_subscription_id: 'sub_test123' });
    const e = event('evt_deleted', 'customer.subscription.deleted', subscription('sub_test123', 'canceled'));

    const first = await deliver(e);
    const second = await deliver(e);

    expect([first.status, second.status]).toEqual([200, 200]);
    expect(profile().grow_subscription_tier).toBe('seed');
    expect(mockDb.tables.grow_subscription_events).toHaveLength(1);
  });

  // ── Shared-Stripe-account cross-talk guard ────────────────────────────
  //
  // Every Daisy app shares one Stripe account, so this endpoint receives
  // every app's events. Before the guard, a Rise Daisy subscription event
  // (which carries `supabase_user_id` but no `app`) fell through to a
  // branch that stamped `subscription_status: 'premium'` on the SHARED
  // profiles row — granting Grow Daisy premium to Rise Daisy subscribers.
  //
  // These assert the 200-with-`ignored` shape specifically. A non-2xx would
  // make Stripe retry and eventually disable the endpoint, so "not ours"
  // must read as successfully handled, not as a failure.

  it('should ignore an event with no app metadata (Rise Daisy shape)', async () => {
    const result = await deliver(event('evt_test_risedaisy', 'customer.subscription.updated', {
      id: 'sub_rise123',
      status: 'active',
      metadata: { supabase_user_id: USER },
      created: NOW,
    }));

    expect(result).toEqual({ status: 200, body: { received: true, ignored: 'not_this_app' } });
    expect(profile().grow_subscription_tier).toBe('seed');
  });

  it('should ignore an event belonging to another app', async () => {
    const result = await deliver(event('evt_test_findr', 'checkout.session.completed', {
      id: 'cs_findr123',
      customer: 'cus_findr123',
      subscription: 'sub_findr123',
      metadata: { app: 'findr', userId: USER },
    }));

    expect(result).toEqual({ status: 200, body: { received: true, ignored: 'not_this_app' } });
  });

  it('should return 400 for invalid webhook signature', async () => {
    const { stripe } = require('@/lib/stripe/server');

    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'stripe-signature': 'invalid_signature',
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Invalid signature' });
  });
});
