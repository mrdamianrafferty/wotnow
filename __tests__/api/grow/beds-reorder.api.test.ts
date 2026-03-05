import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/beds/reorder';
import { getAuthenticatedClient } from '../../../lib/grow/server/auth';

const mockedGetAuth = getAuthenticatedClient as jest.MockedFunction<typeof getAuthenticatedClient>;

function mockAuth(userId = 'user-123') {
  mockedGetAuth.mockResolvedValue({
    supabase: mockSupabase as never,
    userId,
  });
}

function mockAuthFail() {
  mockedGetAuth.mockImplementation(async (_req, res) => {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  });
}

function chainBuilder(resolveValue: { data: unknown; error: unknown } = { data: [], error: null }) {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'not', 'order', 'limit', 'single', 'maybeSingle'];
  chainMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.single = jest.fn().mockResolvedValue(resolveValue);
  builder.maybeSingle = jest.fn().mockResolvedValue(resolveValue);
  builder.then = jest.fn((resolve) => Promise.resolve(resolveValue).then(resolve));
  return builder;
}

describe('POST /api/grow/beds/reorder', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockAuthFail();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
      body: { bedIds: ['bed-1', 'bed-2'] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 405 for non-POST', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 for empty bedIds', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { bedIds: [] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 for missing bedIds', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: {},
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('successfully reorders beds', async () => {
    mockAuth();

    const updateBuilder = chainBuilder({ data: null, error: null });
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                then: jest.fn((resolve) => Promise.resolve({
                  data: [{ id: 'bed-1' }, { id: 'bed-2' }, { id: 'bed-3' }],
                  error: null,
                }).then(resolve)),
              }),
            }),
          }),
          update: updateBuilder.update,
        };
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { bedIds: ['bed-3', 'bed-1', 'bed-2'] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
  });

  it('ignores bed IDs not belonging to user', async () => {
    mockAuth();

    const updateBuilder = chainBuilder({ data: null, error: null });
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                then: jest.fn((resolve) => Promise.resolve({
                  data: [{ id: 'bed-1' }],
                  error: null,
                }).then(resolve)),
              }),
            }),
          }),
          update: updateBuilder.update,
        };
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { bedIds: ['bed-1', 'someone-elses-bed'] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
  });
});
