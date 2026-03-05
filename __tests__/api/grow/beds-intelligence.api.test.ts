import { createMocks } from 'node-mocks-http';

const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

const mockServiceFrom = jest.fn();
const mockServiceClient = {
  from: mockServiceFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

jest.mock('../../../lib/supabase/serverClient', () => ({
  getSupabaseServerClient: jest.fn(() => mockServiceClient),
}));

import handler from '../../../pages/api/grow/beds/[bedId]/intelligence';
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

function chainBuilder(resolveValue: { data: unknown; error: unknown; count?: number } = { data: null, error: null }) {
  const builder: Record<string, jest.Mock> = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'not', 'gte', 'lte', 'order', 'limit', 'single', 'maybeSingle'];
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
  sun_exposure: 'full_sun',
};

const sampleProfile = {
  gardening_climate_zone_code: 'atlantic_mild',
};

describe('GET /api/grow/beds/[bedId]/intelligence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toBe('GET');
  });

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

  it('returns 401 for unauthenticated requests', async () => {
    mockAuthFail();
    const { req, res } = createMocks({
      method: 'GET',
      headers: {},
      query: { bedId: 'bed-1' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 404 for non-existent bed', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue(
      chainBuilder({ data: null, error: { message: 'not found' } })
    );

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid' },
      query: { bedId: 'nonexistent' },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns intelligence response for bed with recent same-group plantings', async () => {
    mockAuth();

    // User client table routing
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'profiles') {
        return chainBuilder({ data: sampleProfile, error: null });
      }
      if (table === 'grow_bed_plantings') {
        // Return plantings for both the active check and the rotation history check
        return chainBuilder({
          data: [
            {
              planted_at: '2025-06-01',
              removed_at: null,
              grow_user_plants: { species_slug: 'tomato', name: 'Tomato' },
            },
          ],
          error: null,
        });
      }
      return chainBuilder();
    });

    // Service client table routing
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'plant_species') {
        return chainBuilder({
          data: [
            { slug: 'tomato', rotation_group: 'solanaceae', companions_with: ['basil'], companions_avoid: ['fennel'] },
          ],
          error: null,
        });
      }
      if (table === 'grow_planting_calendar') {
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
    expect(body.rotationWarnings).toBeDefined();
    expect(body.companionSets).toBeDefined();
    expect(body.successionPrompts).toBeDefined();
    expect(Array.isArray(body.rotationWarnings)).toBe(true);
    expect(body.companionSets.goodCompanions).toBeDefined();
    expect(body.companionSets.badCompanions).toBeDefined();
  });

  it('returns empty companionSets when bed has no active plantings', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'profiles') {
        return chainBuilder({ data: sampleProfile, error: null });
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({ data: [], error: null });
      }
      return chainBuilder();
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'plant_species') {
        return chainBuilder({ data: [], error: null });
      }
      if (table === 'grow_planting_calendar') {
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
    expect(body.companionSets.goodCompanions).toEqual([]);
    expect(body.companionSets.badCompanions).toEqual([]);
  });

  it('returns null quickFillSuggestions when bed has active plantings', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'profiles') {
        return chainBuilder({ data: sampleProfile, error: null });
      }
      if (table === 'grow_bed_plantings') {
        return chainBuilder({
          data: [
            {
              planted_at: '2026-03-01',
              removed_at: null,
              grow_user_plants: { species_slug: 'tomato', name: 'Tomato' },
            },
          ],
          error: null,
        });
      }
      return chainBuilder();
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'plant_species') {
        return chainBuilder({
          data: [{ slug: 'tomato', rotation_group: 'solanaceae', companions_with: [], companions_avoid: [] }],
          error: null,
        });
      }
      if (table === 'grow_planting_calendar') {
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
    expect(body.quickFillSuggestions).toBeNull();
  });

  it('returns empty succession prompts when no recently removed plantings', async () => {
    mockAuth();

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'grow_garden_beds') {
        return chainBuilder({ data: sampleBed, error: null });
      }
      if (table === 'profiles') {
        return chainBuilder({ data: sampleProfile, error: null });
      }
      if (table === 'grow_bed_plantings') {
        // No removed plantings
        return chainBuilder({ data: [], error: null });
      }
      return chainBuilder();
    });

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'plant_species') {
        return chainBuilder({ data: [], error: null });
      }
      if (table === 'grow_planting_calendar') {
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
    expect(body.successionPrompts).toEqual([]);
  });
});
