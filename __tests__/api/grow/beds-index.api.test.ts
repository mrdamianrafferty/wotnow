import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/beds/index';
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

function chainBuilder(resolveValue: { data: unknown; error: unknown; count?: number | null } = { data: [], error: null }) {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'order', 'single', 'maybeSingle'];
  chainMethods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });
  builder.single = jest.fn().mockResolvedValue(resolveValue);
  builder.maybeSingle = jest.fn().mockResolvedValue(resolveValue);
  builder.then = jest.fn((resolve) => Promise.resolve(resolveValue).then(resolve));
  if (resolveValue.count !== undefined) {
    builder.select = jest.fn().mockReturnValue({ ...builder, then: jest.fn((resolve) => Promise.resolve({ count: resolveValue.count, error: null }).then(resolve)) });
  }
  return builder;
}

const sampleBed = {
  id: 'bed-1',
  user_id: 'user-123',
  name: 'Raised Bed 1',
  type: 'raised_bed',
  color: 'terracotta',
  sort_order: 0,
  sun_exposure: null,
  soil_type: null,
  size_label: null,
  notes: null,
  created_at: '2026-03-05T10:00:00Z',
  updated_at: '2026-03-05T10:00:00Z',
};

describe('GET /api/grow/beds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 without auth token', async () => {
    mockAuthFail();
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer invalid' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 405 for unsupported methods', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns empty beds array for new user', async () => {
    mockAuth();

    const bedsBuilder = chainBuilder({ data: [], error: null });
    mockSupabaseFrom.mockReturnValue(bedsBuilder);

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.beds).toEqual([]);
  });

  it('returns beds with plant counts from grow_bed_plantings', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: [sampleBed], error: null });
      }
      if (table === 'grow_bed_plantings') {
        const builder = chainBuilder({
          data: [
            { bed_id: 'bed-1', quantity: 6, grow_user_plants: { name: 'Tomato' } },
            { bed_id: 'bed-1', quantity: 3, grow_user_plants: { name: 'Basil' } },
          ],
          error: null,
        });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.beds).toHaveLength(1);
    expect(body.beds[0].name).toBe('Raised Bed 1');
    expect(body.beds[0].type).toBe('raised_bed');
    expect(body.beds[0].color).toBe('terracotta');
    expect(typeof body.beds[0].plantCount).toBe('number');
  });
});

describe('POST /api/grow/beds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainBuilder({ data: { grow_subscription_tier: 'seed' }, error: null });
      }
      if (table === 'grow_garden_beds') {
        const builder = chainBuilder();
        builder.select = jest.fn().mockReturnValue({
          ...builder,
          then: jest.fn((resolve) => Promise.resolve({ count: 0, error: null }).then(resolve)),
        });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { type: 'raised_bed' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('name');
  });

  it('returns 400 when type is invalid', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainBuilder({ data: { grow_subscription_tier: 'seed' }, error: null });
      }
      if (table === 'grow_garden_beds') {
        const builder = chainBuilder();
        builder.select = jest.fn().mockReturnValue({
          ...builder,
          then: jest.fn((resolve) => Promise.resolve({ count: 0, error: null }).then(resolve)),
        });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { name: 'My Bed', type: 'swimming_pool' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('type');
  });

  it('returns 403 when seed tier hits bed limit of 2', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainBuilder({ data: { grow_subscription_tier: 'seed' }, error: null });
      }
      if (table === 'grow_garden_beds') {
        // Build a chain where every method returns the same object that resolves with count: 2
        const countResult = { count: 2, error: null };
        const chain: Record<string, jest.Mock> = {};
        ['select', 'eq', 'in', 'is', 'order', 'single', 'maybeSingle'].forEach(m => {
          chain[m] = jest.fn().mockReturnValue(chain);
        });
        chain.then = jest.fn((resolve) => Promise.resolve(countResult).then(resolve));
        return chain;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { name: 'Third Bed', type: 'raised_bed' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(403);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('limit');
    expect(body.limit).toBe(2);
    expect(body.upgradeUrl).toBe('/grow/premium');
  });

  it('creates bed successfully with auto-assigned color', async () => {
    mockAuth();

    const createdBed = { ...sampleBed, name: 'New Bed', color: 'terracotta' };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainBuilder({ data: { grow_subscription_tier: 'sprout' }, error: null });
      }
      if (table === 'grow_garden_beds') {
        const builder = chainBuilder();
        builder.select = jest.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact') {
            return { ...builder, then: jest.fn((resolve) => Promise.resolve({ count: 0, error: null }).then(resolve)) };
          }
          return builder;
        });
        builder.insert = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: createdBed, error: null }),
          }),
        });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { name: 'New Bed', type: 'raised_bed' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
    const body = JSON.parse(res._getData());
    expect(body.bed).toBeDefined();
    expect(body.bed.name).toBe('New Bed');
    expect(body.bed.plantCount).toBe(0);
  });

  it('allows unlimited beds for paid tiers', async () => {
    mockAuth();

    const createdBed = { ...sampleBed, name: 'Bed 100' };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return chainBuilder({ data: { grow_subscription_tier: 'sprout' }, error: null });
      }
      if (table === 'grow_garden_beds') {
        const builder = chainBuilder();
        builder.select = jest.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.count === 'exact') {
            return { ...builder, then: jest.fn((resolve) => Promise.resolve({ count: 99, error: null }).then(resolve)) };
          }
          return builder;
        });
        builder.insert = jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: createdBed, error: null }),
          }),
        });
        return builder;
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      body: { name: 'Bed 100', type: 'container' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
  });

  it('accepts all valid bed types', async () => {
    const validTypes = ['raised_bed', 'container', 'in_ground', 'greenhouse', 'polytunnel', 'other'];
    for (const type of validTypes) {
      jest.clearAllMocks();
      mockAuth();

      const createdBed = { ...sampleBed, type };

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return chainBuilder({ data: { grow_subscription_tier: 'bloom' }, error: null });
        }
        if (table === 'grow_garden_beds') {
          const builder = chainBuilder();
          builder.select = jest.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === 'exact') {
              return { ...builder, then: jest.fn((resolve) => Promise.resolve({ count: 0, error: null }).then(resolve)) };
            }
            return builder;
          });
          builder.insert = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: createdBed, error: null }),
            }),
          });
          return builder;
        }
        return chainBuilder();
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid' },
        body: { name: `My ${type}`, type },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(201);
    }
  });
});
