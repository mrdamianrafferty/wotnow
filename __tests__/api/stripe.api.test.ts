/**
 * Stripe API Endpoints Tests
 *
 * Tests for Stripe webhook handling.
 *
 * The checkout / portal / cancel endpoints that used to be covered here were
 * `pages/api/stripe/*` — dead findr-era routes with no callers anywhere in the
 * app, still deployed and still priced against findr's price ID. They were
 * deleted rather than fixed; Go Daisy+ and Grow Daisy have their own live
 * endpoints under `pages/api/godaisy/` and `pages/api/grow/`.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import webhookHandler from '@/pages/api/stripe/webhook';

// Mock Stripe
jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      update: jest.fn(),
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: {
              stripe_customer_id: 'cus_test123',
              stripe_subscription_id: 'sub_test123',
              subscription_status: 'premium',
              payment_platform: 'web',
            },
            error: null,
          })),
          maybeSingle: jest.fn(() => Promise.resolve({
            data: null,
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ error: null })),
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'user123', email: 'test@example.com' } },
        error: null,
      })),
    },
  })),
}));

// Mock micro buffer function for webhook body parsing
jest.mock('micro', () => ({
  buffer: jest.fn((req) => Promise.resolve(Buffer.from(JSON.stringify(req.body)))),
}));

/** Build a mocked request for a given Stripe event. */
function requestFor(mockEvent: unknown, signature = 'test_signature') {
  const { stripe } = require('@/lib/stripe/server');
  stripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

  return createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    body: JSON.stringify(mockEvent),
    headers: { 'stripe-signature': signature },
  });
}

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
    const { req, res } = requestFor({
      id: 'evt_test123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          customer: 'cus_test123',
          subscription: 'sub_test123',
          metadata: {
            app: 'grow_daisy',
            supabase_user_id: 'user123',
            voucherCode: 'SAVE10',
            voucherId: 'voucher123',
          },
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
  });

  it('should handle customer.subscription.updated event', async () => {
    const { req, res } = requestFor({
      id: 'evt_test123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          status: 'active',
          metadata: {
            app: 'grow_daisy',
            supabase_user_id: 'user123',
          },
          created: Math.floor(Date.now() / 1000),
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
  });

  it('should handle customer.subscription.deleted event', async () => {
    const { req, res } = requestFor({
      id: 'evt_test123',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          status: 'canceled',
          metadata: {
            app: 'grow_daisy',
            supabase_user_id: 'user123',
          },
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
  });

  it('should handle a Go Daisy+ event', async () => {
    const { req, res } = requestFor({
      id: 'evt_test_godaisy',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          status: 'active',
          metadata: {
            app: 'godaisy_plus',
            supabase_user_id: 'user123',
          },
          created: Math.floor(Date.now() / 1000),
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
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
    const { req, res } = requestFor({
      id: 'evt_test_risedaisy',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_rise123',
          status: 'active',
          metadata: {
            supabase_user_id: 'user123',
          },
          created: Math.floor(Date.now() / 1000),
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      received: true,
      ignored: 'not_this_app',
    });
  });

  it('should ignore an event belonging to another app', async () => {
    const { req, res } = requestFor({
      id: 'evt_test_findr',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_findr123',
          customer: 'cus_findr123',
          subscription: 'sub_findr123',
          metadata: {
            app: 'findr',
            userId: 'user123',
          },
        },
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      received: true,
      ignored: 'not_this_app',
    });
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
