import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/health/tides-status';

const originalFetch = global.fetch;

describe('GET /api/health/tides-status', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('returns 200 when tides endpoint provides predictions', async () => {
    const payload = {
      success: true,
      source: 'worldtides',
      data: [
        { time: '2025-10-19T00:00:00Z', height: 1.2, type: 'high' },
        { time: '2025-10-19T06:12:00Z', height: -0.4, type: 'low' },
      ],
    };

    const mockFetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    global.fetch = mockFetch as typeof fetch;

    const { req, res } = createMocks({
      method: 'GET',
      headers: { host: 'example.com' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when tides endpoint is empty', async () => {
    const payload = { success: true, source: 'worldtides', data: [] };
    const mockFetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    global.fetch = mockFetch as typeof fetch;

    const { req, res } = createMocks({
      method: 'GET',
      headers: { host: 'example.com' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(503);
  });

  it('returns 405 for non-GET methods', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
