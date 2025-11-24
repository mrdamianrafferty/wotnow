import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/health/weather-status';

const originalFetch = global.fetch;

const basePayload = {
  current: { temp: 15 },
  daily: [{ dt: 1 }],
  hourly: [{ dt: 1 }],
  pollenByDate: { '2025-10-19': { grass: 2 } },
  source: 'test-source',
};

describe('GET /api/health/weather-status', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('returns 200 when weather endpoint is healthy', async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(basePayload), { status: 200 }));
    global.fetch = mockFetch as typeof fetch;

    const { req, res } = createMocks({
      method: 'GET',
      headers: { host: 'example.com' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns 503 when upstream returns error', async () => {
    const mockFetch = jest.fn().mockResolvedValue(new Response('error', { status: 500 }));
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
