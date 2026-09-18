/**
 * @jest-environment node
 */
/**
 * /api/grow/push/send and /api/godaisy/push/send: a signed-in person could
 * broadcast any title and text to every user, because both endpoints let any
 * authenticated caller use broadcast mode. Broadcasts now need the push API
 * secret; a signed-in person may only send to themselves.
 *
 * No real notification is sent: the senders are mocked, and each test checks
 * which of them the endpoint reached.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
process.env.GROW_PUSH_API_SECRET = 'grow-secret';
process.env.GODAISY_PUSH_API_SECRET = 'godaisy-secret';

const mockGetUser = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: (token: string) => mockGetUser(token) },
    from: () => {
      const q: Record<string, unknown> = {};
      Object.assign(q, {
        select: () => q,
        eq: () => q,
        in: () => q,
        or: () => q,
        then: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
      });
      return q;
    },
  }),
}));
jest.mock('@/lib/utils/rate-limiter', () => ({
  checkRateLimit: jest.fn(async () => undefined),
  RateLimitError: class extends Error {},
}));

const mockGrowSingle = jest.fn(async () => ({ sent: 1, failed: 0, errors: [] }));
const mockGrowBulk = jest.fn(async () => ({ sent: 5, failed: 0, errors: [] }));
jest.mock('@/lib/grow/notifications', () => ({
  sendPushNotification: (...a: unknown[]) => mockGrowSingle(...(a as [])),
  sendBulkNotification: (...a: unknown[]) => mockGrowBulk(...(a as [])),
  createFrostAlertPayload: jest.fn(),
  createWateringReminderPayload: jest.fn(),
  createPestRiskPayload: jest.fn(),
  createHarvestReminderPayload: jest.fn(),
}));
const mockGoDaisySingle = jest.fn(async () => ({ sent: 1, failed: 0, errors: [] }));
const mockGoDaisyBulk = jest.fn(async () => ({ sent: 5, failed: 0, errors: [] }));
jest.mock('@/lib/godaisy/notifications', () => ({
  sendGoDaisyPushNotification: (...a: unknown[]) => mockGoDaisySingle(...(a as [])),
  sendGoDaisyBulkNotification: (...a: unknown[]) => mockGoDaisyBulk(...(a as [])),
  createWeatherAlertPayload: jest.fn(),
  createActivityRecommendationPayload: jest.fn(),
  createAstronomyAlertPayload: jest.fn(),
  createTideAlertPayload: jest.fn(),
}));
jest.mock('@/lib/grow/apnsClient', () => ({ sendGrowApnsPushNotification: jest.fn(async () => true) }));
jest.mock('@/lib/godaisy/apnsClient', () => ({ sendGoDaisyApnsPushNotification: jest.fn(async () => true) }));
jest.mock('@/lib/notifications/fcmClient', () => ({ sendFcmPushNotification: jest.fn(async () => true) }));

type Handler = (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const grow = require('@/pages/api/grow/push/send').default as Handler;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const godaisy = require('@/pages/api/godaisy/push/send').default as Handler;

const PAYLOAD = { title: 'Anything at all', body: 'to everyone' };

async function send(handler: Handler, headers: Record<string, string>, body: unknown) {
  const { req, res } = createMocks({ method: 'POST', headers, body: body as Record<string, unknown> });
  await handler(req as unknown as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockImplementation(async (token: string) =>
    token === 'valid-user-token' ? { data: { user: { id: 'user-1' } }, error: null } : { data: { user: null }, error: new Error('bad') }
  );
});

describe.each([
  ['grow', () => grow, 'grow-secret', 'frost_alert', mockGrowBulk, mockGrowSingle],
  ['godaisy', () => godaisy, 'godaisy-secret', 'weather_alert', mockGoDaisyBulk, mockGoDaisySingle],
] as const)('/api/%s/push/send', (_name, handlerOf, secret, type, bulk, single) => {
  it('refuses a broadcast from a signed-in person, and sends nothing', async () => {
    const res = await send(handlerOf(), { authorization: 'Bearer valid-user-token' }, { broadcast: true, notificationType: type, payload: PAYLOAD });
    expect(res._getStatusCode()).toBe(403);
    expect(bulk).not.toHaveBeenCalled();
    expect(single).not.toHaveBeenCalled();
  });

  it('refuses a signed-in person sending to someone else', async () => {
    const res = await send(handlerOf(), { authorization: 'Bearer valid-user-token' }, { userId: 'user-2', payload: PAYLOAD });
    expect(res._getStatusCode()).toBe(403);
    expect(single).not.toHaveBeenCalled();
  });

  it('still lets a signed-in person send to themselves', async () => {
    const res = await send(handlerOf(), { authorization: 'Bearer valid-user-token' }, { payload: PAYLOAD });
    expect(res._getStatusCode()).toBe(200);
    expect(single).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }));
  });

  it('still lets the server broadcast with the secret', async () => {
    const res = await send(handlerOf(), { 'x-push-api-secret': secret }, { broadcast: true, notificationType: type, payload: PAYLOAD });
    expect(res._getStatusCode()).toBe(200);
    expect(bulk).toHaveBeenCalled();
  });

  it('refuses a wrong secret, and a missing one', async () => {
    expect((await send(handlerOf(), { 'x-push-api-secret': 'wrong' }, { broadcast: true, notificationType: type, payload: PAYLOAD }))._getStatusCode()).toBe(401);
    expect((await send(handlerOf(), {}, { broadcast: true, notificationType: type, payload: PAYLOAD }))._getStatusCode()).toBe(401);
    expect(bulk).not.toHaveBeenCalled();
  });
});
