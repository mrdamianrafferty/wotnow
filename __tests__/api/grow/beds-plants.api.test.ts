import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/beds/[bedId]/plants';
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
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'order', 'single', 'maybeSingle'];
  chainMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.single = jest.fn().mockResolvedValue(resolveValue);
  builder.maybeSingle = jest.fn().mockResolvedValue(resolveValue);
  builder.then = jest.fn((resolve) => Promise.resolve(resolveValue).then(resolve));
  return builder;
}

describe('POST /api/grow/beds/[bedId]/plants — assign plants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockAuthFail();

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer invalid' },
      query: { bedId: 'bed-1' },
      body: { assignments: [{ plantId: 'plant-1', quantity: 1 }] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 400 when bedId is missing', async () => {
    mockAuth();

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: '' },
      body: { assignments: [{ plantId: 'plant-1', quantity: 1 }] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 when assignments is empty', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { assignments: [] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 404 when bed does not exist', async () => {
    mockAuth();

    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: null, error: { message: 'not found' } }));

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'nonexistent' },
      body: { assignments: [{ plantId: 'plant-1', quantity: 1 }] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('assigns plants to bed with quantity', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      if (table === 'grow_user_plants') {
        return chainBuilder({ data: [{ id: 'plant-1' }, { id: 'plant-2' }], error: null });
      }
      if (table === 'grow_bed_plantings') {
        // First call: check existing (returns empty)
        // Second call: insert
        const builder = chainBuilder({ data: [], error: null });
        builder.insert = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { assignments: [{ plantId: 'plant-1', quantity: 12 }, { plantId: 'plant-2', quantity: 3 }] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.assignedCount).toBe(2);
  });

  it('accepts legacy plantIds format with default quantity', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      if (table === 'grow_user_plants') {
        return chainBuilder({ data: [{ id: 'plant-1' }], error: null });
      }
      if (table === 'grow_bed_plantings') {
        const builder = chainBuilder({ data: [], error: null });
        builder.insert = jest.fn().mockResolvedValue({ error: null });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantIds: ['plant-1'] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.assignedCount).toBe(1);
  });

  it('returns 405 for GET method', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});

describe('DELETE /api/grow/beds/[bedId]/plants — unassign plants', () => {
  beforeEach(() => jest.clearAllMocks());

  it('unassigns plants from bed', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: { id: 'bed-1' }, error: null });
      }
      if (table === 'grow_user_plants') {
        return chainBuilder({ data: [{ id: 'plant-1' }], error: null });
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: null, error: null });
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { plantIds: ['plant-1'] },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.removedCount).toBe(1);
  });
});
