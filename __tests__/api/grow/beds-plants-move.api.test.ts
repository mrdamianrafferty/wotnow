import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/beds/[bedId]/plants/move';
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

function chainBuilder(resolveValue: { data: unknown; error: unknown } = { data: null, error: null }) {
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

describe('POST /api/grow/beds/[bedId]/plants/move', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockAuthFail();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
      query: { bedId: 'bed-1' },
      body: { plantingId: 'planting-1', targetBedId: 'bed-2' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 405 for non-POST', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 for missing fields', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: {},
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 for same-bed move', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantingId: 'planting-1', targetBedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('same bed');
  });

  it('returns 404 for source bed not found', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation(() => {
      return chainBuilder({ data: null, error: { message: 'not found' } });
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'nonexistent' },
      body: { plantingId: 'planting-1', targetBedId: 'bed-2' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns 404 for target bed not found', async () => {
    mockAuth();

    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Source bed found
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      // Target bed not found
      return chainBuilder({ data: null, error: { message: 'not found' } });
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantingId: 'planting-1', targetBedId: 'nonexistent' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns 404 for planting not found or already removed', async () => {
    mockAuth();

    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // Source and target beds found
        return chainBuilder({ data: { id: `bed-${callCount}` }, error: null });
      }
      // Planting not found
      return chainBuilder({ data: null, error: { message: 'not found' } });
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantingId: 'nonexistent-planting', targetBedId: 'bed-2' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('successfully moves plant between beds', async () => {
    mockAuth();

    let callCount = 0;
    mockSupabaseFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Source bed
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      if (callCount === 2) {
        // Target bed
        return chainBuilder({ data: { id: 'bed-2' }, error: null });
      }
      if (callCount === 3) {
        // Planting found
        return chainBuilder({ data: { id: 'planting-1', plant_id: 'plant-1', quantity: 3 }, error: null });
      }
      if (callCount === 4) {
        // Update removed_at
        return chainBuilder({ data: null, error: null });
      }
      if (callCount === 5) {
        // Insert new planting
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'new-planting-1' }, error: null }),
            }),
          }),
        };
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantingId: 'planting-1', targetBedId: 'bed-2' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.newPlantingId).toBe('new-planting-1');
  });
});
