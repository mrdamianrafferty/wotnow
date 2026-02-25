import { createMocks } from 'node-mocks-http';

// Mock getAuthenticatedClient before importing handler
const mockSupabaseFrom = jest.fn();
const mockSupabase = {
  from: mockSupabaseFrom,
};

jest.mock('../../../lib/grow/server/auth', () => ({
  getAuthenticatedClient: jest.fn(),
}));

import handler from '../../../pages/api/grow/preferences';
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

describe('GET /api/grow/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns preferences for authenticated user', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              location: 'Dublin',
              latitude: 53.35,
              longitude: -6.26,
              elevation: 100,
              climate_zone: 'atlantic_mild',
              garden_features: ['lawn', 'raised beds'],
              soil_type: 'loam',
              sun_exposure: 'full_sun',
              moisture: 'medium',
              interests: ['vegetables', 'flowers'],
              skill_level: 'intermediate',
              content_depth: 'detailed',
              updated_at: '2026-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.preferences.location).toBe('Dublin');
    expect(body.preferences.climateZone).toBe('atlantic_mild');
    expect(body.preferences.gardenFeatures).toEqual(['lawn', 'raised beds']);
  });

  it('returns null preferences when no row exists (PGRST116)', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      }),
    });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.preferences).toBeNull();
  });

  it('returns 500 on database error', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        }),
      }),
    });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockAuthFail();

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});

describe('PUT /api/grow/preferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upserts preferences with camelCase to snake_case conversion', async () => {
    mockAuth();

    const upsertMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            location: 'Cork',
            latitude: 51.9,
            longitude: -8.47,
            elevation: null,
            climate_zone: 'atlantic_mild',
            garden_features: [],
            soil_type: null,
            sun_exposure: null,
            moisture: null,
            interests: [],
            skill_level: null,
            content_depth: null,
            updated_at: '2026-02-01T00:00:00Z',
          },
          error: null,
        }),
      }),
    });
    mockSupabaseFrom.mockReturnValue({ upsert: upsertMock });

    const { req, res } = createMocks({
      method: 'PUT',
      body: {
        location: 'Cork',
        latitude: 51.9,
        longitude: -8.47,
        climateZone: 'atlantic_mild',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.preferences.location).toBe('Cork');

    // Verify snake_case conversion in upsert call
    const upsertCall = upsertMock.mock.calls[0][0];
    expect(upsertCall).toHaveProperty('climate_zone', 'atlantic_mild');
    expect(upsertCall).toHaveProperty('user_id', 'user-123');
  });

  it('returns 500 on save error', async () => {
    mockAuth();
    mockSupabaseFrom.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Constraint violation' },
          }),
        }),
      }),
    });

    const { req, res } = createMocks({ method: 'PUT', body: { location: 'X' } });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });

  it('returns 401 for unauthenticated request', async () => {
    mockAuthFail();

    const { req, res } = createMocks({ method: 'PUT', body: {} });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});

describe('Unsupported methods', () => {
  it('returns 405 for POST', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toBe('GET, PUT');
  });

  it('returns 405 for DELETE', async () => {
    const { req, res } = createMocks({ method: 'DELETE' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
