import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/beds/[bedId]';
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

const sampleBed = {
  id: 'bed-1',
  user_id: 'user-123',
  name: 'Raised Bed 1',
  type: 'raised_bed',
  color: 'terracotta',
  sort_order: 0,
  sun_exposure: 'full_sun',
  soil_type: 'loam',
  size_label: '4x8',
  notes: 'South-facing',
  created_at: '2026-03-05T10:00:00Z',
  updated_at: '2026-03-05T10:00:00Z',
};

const samplePlanting = {
  id: 'planting-1',
  bed_id: 'bed-1',
  plant_id: 'plant-1',
  quantity: 3,
  planted_at: '2026-03-01',
  removed_at: null,
  harvest_data: null,
  created_at: '2026-03-01T10:00:00Z',
  grow_user_plants: {
    id: 'plant-1',
    name: 'Tomato',
    type: 'vegetable',
    species_slug: 'tomato',
    variety: null,
    photo_url: null,
  },
};

describe('GET /api/grow/beds/[bedId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 for missing bedId', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: '' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 404 for non-existent bed', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue(chainBuilder({ data: null, error: { message: 'not found' } }));

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'nonexistent' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns bed with plantings', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: [samplePlanting], error: null });
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.bed.name).toBe('Raised Bed 1');
    expect(body.bed.type).toBe('raised_bed');
    expect(body.bed.sunExposure).toBe('full_sun');
    expect(body.plantings).toHaveLength(1);
    expect(body.plantings[0].plantName).toBe('Tomato');
    expect(body.plantings[0].quantity).toBe(3);
    expect(body.plantings[0].plantId).toBe('plant-1');
  });

  it('returns bed with empty plantings array when no plants assigned', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: [], error: null });
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.bed.plantCount).toBe(0);
    expect(body.plantings).toEqual([]);
  });
});

describe('DELETE /api/grow/beds/[bedId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes bed and returns serialized bed', async () => {
    mockAuth();

    mockSupabaseFrom.mockReturnValue({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: sampleBed, error: null }),
            }),
          }),
        }),
      }),
    });

    const { req, res } = createMocks({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.success).toBe(true);
    expect(body.bed.id).toBe('bed-1');
  });

  it('returns 405 for PATCH method', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'PATCH' as 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});

describe('PUT /api/grow/beds/[bedId]', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when no valid fields provided', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'PUT',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: {},
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
    const body = JSON.parse(res._getData());
    expect(body.error).toContain('No valid fields');
  });

  it('updates bed name', async () => {
    mockAuth();

    const updatedBed = { ...sampleBed, name: 'Updated Name' };

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: updatedBed, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: null, error: null, count: 3 } as any);
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'PUT',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { name: 'Updated Name' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.bed.name).toBe('Updated Name');
  });

  it('rejects invalid sun_exposure values', async () => {
    mockAuth();
    const { req, res } = createMocks({
      method: 'PUT',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { sunExposure: 'super_sunny' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('accepts valid sun_exposure values', async () => {
    mockAuth();

    const updatedBed = { ...sampleBed, sun_exposure: 'partial_shade' };
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: updatedBed, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: null, error: null, count: 0 } as any);
      }
      return chainBuilder();
    });

    const { req, res } = createMocks({
      method: 'PUT',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
      body: { sunExposure: 'partial_shade' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });
});
