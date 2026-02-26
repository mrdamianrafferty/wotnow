/**
 * Stripe API Endpoints Tests
 *
 * Tests for Stripe checkout, portal, cancellation, and webhook handling.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import checkoutHandler from '@/pages/api/stripe/create-checkout-session';
import portalHandler from '@/pages/api/stripe/create-portal-session';
import cancelHandler from '@/pages/api/stripe/cancel-subscription';
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

describe('POST /api/stripe/create-checkout-session', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await checkoutHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should return 401 if no auth header', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    });

    await checkoutHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
  });

  it('should create a checkout session successfully', async () => {
    const { stripe } = require('@/lib/stripe/server');
    stripe.checkout.sessions.create.mockResolvedValueOnce({
      id: 'cs_test123',
      url: 'https://checkout.stripe.com/test',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        voucherCode: 'SAVE10',
      },
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await checkoutHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.sessionId).toBe('cs_test123');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test123',
        mode: 'subscription',
      })
    );
  });
});

describe('POST /api/stripe/create-portal-session', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await portalHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should return 401 if no auth header', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    });

    await portalHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
  });

  it('should create a portal session successfully', async () => {
    const { stripe } = require('@/lib/stripe/server');
    stripe.billingPortal.sessions.create.mockResolvedValueOnce({
      url: 'https://billing.stripe.com/portal/test',
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await portalHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.url).toBe('https://billing.stripe.com/portal/test');
  });

  it('should return 400 if no customer ID exists', async () => {
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: { id: 'user123', email: 'test@example.com' } },
          error: null,
        })),
      },
    }).mockReturnValueOnce({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { stripe_customer_id: null },
              error: null,
            })),
          })),
        })),
      })),
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await portalHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'No active subscription found'
    });
  });
});

describe('POST /api/stripe/cancel-subscription', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res} = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });

    await cancelHandler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Method not allowed' });
  });

  it('should return 401 if no auth header', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
    });

    await cancelHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Unauthorized' });
  });

  it('should cancel subscription successfully', async () => {
    const { stripe } = require('@/lib/stripe/server');
    const now = Math.floor(Date.now() / 1000);
    const periodEnd = now + (30 * 24 * 60 * 60); // 30 days from now

    stripe.subscriptions.update.mockResolvedValueOnce({
      id: 'sub_test123',
      cancel_at_period_end: true,
      current_period_end: periodEnd,
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await cancelHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
    expect(data.message).toContain('end of the billing period');
    expect(data.cancelsAt).toBeTruthy();
  });

  it('should return 400 if no active subscription', async () => {
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: { id: 'user123', email: 'test@example.com' } },
          error: null,
        })),
      },
    }).mockReturnValueOnce({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: { stripe_subscription_id: null, payment_platform: 'web' },
              error: null,
            })),
          })),
        })),
      })),
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await cancelHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'No active subscription found' });
  });

  it('should return 400 for iOS subscriptions', async () => {
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValueOnce({
      auth: {
        getUser: jest.fn(() => Promise.resolve({
          data: { user: { id: 'user123', email: 'test@example.com' } },
          error: null,
        })),
      },
    }).mockReturnValueOnce({
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({
              data: {
                stripe_subscription_id: 'sub_test123',
                payment_platform: 'ios',
              },
              error: null,
            })),
          })),
        })),
      })),
    });

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {},
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await cancelHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Only web subscriptions can be cancelled via this endpoint'
    });
  });
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
    const { stripe } = require('@/lib/stripe/server');

    const mockEvent = {
      id: 'evt_test123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test123',
          customer: 'cus_test123',
          subscription: 'sub_test123',
          metadata: {
            supabase_user_id: 'user123',
            voucherCode: 'SAVE10',
            voucherId: 'voucher123',
          },
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
  });

  it('should handle customer.subscription.updated event', async () => {
    const { stripe } = require('@/lib/stripe/server');

    const mockEvent = {
      id: 'evt_test123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          status: 'active',
          metadata: {
            supabase_user_id: 'user123',
          },
          created: Math.floor(Date.now() / 1000),
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
  });

  it('should handle customer.subscription.deleted event', async () => {
    const { stripe } = require('@/lib/stripe/server');

    const mockEvent = {
      id: 'evt_test123',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          status: 'canceled',
          metadata: {
            supabase_user_id: 'user123',
          },
        },
      },
    };

    stripe.webhooks.constructEvent.mockReturnValueOnce(mockEvent);

    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: {
        'stripe-signature': 'test_signature',
      },
    });

    await webhookHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true });
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
