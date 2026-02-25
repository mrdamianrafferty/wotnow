import { createMocks } from 'node-mocks-http';

// Set env vars before module-level createClient runs
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock @supabase/supabase-js with inline fns to avoid hoisting issues
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    auth: { getUser: jest.fn() },
    rpc: jest.fn(),
    from: jest.fn(),
  }),
}));

import handler from '../../../pages/api/grow/weather-alerts';
import { createClient } from '@supabase/supabase-js';

// Get reference to the mock client created at module level
const mockSupabase = (createClient as jest.Mock).mock.results[0].value;
const mockGetUser = mockSupabase.auth.getUser as jest.Mock;
const mockRpc = mockSupabase.rpc as jest.Mock;
const mockFrom = mockSupabase.from as jest.Mock;

function mockAuthSuccess(userId = 'user-123') {
  mockGetUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
}

function mockAuthFailure() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Invalid token' },
  });
}

const sampleAlert = {
  id: 'alert-1',
  alert_type: 'frost',
  severity: 'warning',
  title: 'Frost warning',
  message: 'Expect frost tonight',
  forecast_date: '2026-02-25',
  forecast_value: -2,
  affected_plant_ids: ['plant-1'],
  is_read: false,
  created_at: '2026-02-25T12:00:00Z',
};

describe('GET /api/grow/weather-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns alerts with unread counts', async () => {
    mockAuthSuccess();
    mockRpc.mockResolvedValue({ data: [sampleAlert], error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({
          data: [{ id: 'plant-1', plant_name: 'Tomato' }],
        }),
      }),
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].type).toBe('frost');
    expect(body.alerts[0].affectedPlants[0].name).toBe('Tomato');
    expect(body.unreadCount.total).toBe(1);
    expect(body.unreadCount.warning).toBe(1);
  });

  it('filters out read alerts by default', async () => {
    mockAuthSuccess();
    const readAlert = { ...sampleAlert, id: 'alert-2', is_read: true };
    mockRpc.mockResolvedValue({ data: [sampleAlert, readAlert], error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [] }),
      }),
    });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    const body = JSON.parse(res._getData());
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].id).toBe('alert-1');
  });

  it('includes read alerts when includeRead=true', async () => {
    mockAuthSuccess();
    const readAlert = { ...sampleAlert, id: 'alert-2', is_read: true };
    mockRpc.mockResolvedValue({ data: [sampleAlert, readAlert], error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [] }),
      }),
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { includeRead: 'true' },
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    const body = JSON.parse(res._getData());
    expect(body.alerts).toHaveLength(2);
  });

  it('filters by alert type', async () => {
    mockAuthSuccess();
    const heatAlert = { ...sampleAlert, id: 'alert-3', alert_type: 'heat' };
    mockRpc.mockResolvedValue({ data: [sampleAlert, heatAlert], error: null });
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        in: jest.fn().mockResolvedValue({ data: [] }),
      }),
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { type: 'frost' },
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    const body = JSON.parse(res._getData());
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].type).toBe('frost');
  });

  it('returns 401 for missing authorization', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    mockAuthFailure();

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer bad-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 500 on RPC error', async () => {
    mockAuthSuccess();
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { req, res } = createMocks({
      method: 'GET',
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });
});

describe('PATCH /api/grow/weather-alerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks alert as read', async () => {
    mockAuthSuccess();
    // Verify ownership
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
          }),
        }),
      }),
    });
    // Update
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { req, res } = createMocks({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: { alertId: 'alert-1', markAsRead: true },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData()).success).toBe(true);
  });

  it('dismisses an alert', async () => {
    mockAuthSuccess();
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
          }),
        }),
      }),
    });
    mockFrom.mockReturnValueOnce({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { req, res } = createMocks({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: { alertId: 'alert-1', dismiss: true },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 403 for alert owned by another user', async () => {
    mockAuthSuccess('user-123');
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'other-user' },
          }),
        }),
      }),
    });

    const { req, res } = createMocks({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: { alertId: 'alert-1', markAsRead: true },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
  });

  it('returns 400 when alertId is missing', async () => {
    mockAuthSuccess();

    const { req, res } = createMocks({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 400 when no updates provided', async () => {
    mockAuthSuccess();
    mockFrom.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { user_id: 'user-123' },
          }),
        }),
      }),
    });

    const { req, res } = createMocks({
      method: 'PATCH',
      headers: { authorization: 'Bearer valid-token' },
      body: { alertId: 'alert-1' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 401 for missing auth', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: { alertId: 'alert-1', markAsRead: true },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });
});

describe('Unsupported methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 405 for POST', async () => {
    mockAuthSuccess();

    const { req, res } = createMocks({
      method: 'POST',
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 405 for DELETE', async () => {
    mockAuthSuccess();

    const { req, res } = createMocks({
      method: 'DELETE',
      headers: { authorization: 'Bearer valid-token' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
