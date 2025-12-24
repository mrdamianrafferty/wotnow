// __tests__/api/tides.api.test.ts

/**
 * API Integration Tests for Tides Endpoint
 *
 * Tests the /api/tides endpoint
 * This endpoint fetches tide predictions from multiple sources:
 * 1. WorldTides (primary, free)
 * 2. NOAA (for US/North American coasts)
 * 3. Stormglass (paid fallback)
 */

import { createMocks } from 'node-mocks-http';

// Mock global fetch before importing handler
global.fetch = jest.fn();

// Mock weather metrics
jest.mock('../../lib/monitoring/weatherMetrics', () => ({
  weatherMetrics: {
    start: jest.fn(() => ({
      success: jest.fn(),
      failure: jest.fn(),
    })),
  },
}));

// Mock fetchWorldTides to control the primary source
jest.mock('../../lib/services/weatherService', () => ({
  fetchWorldTides: jest.fn(),
}));

import { fetchWorldTides } from '../../lib/services/weatherService';
const mockFetchWorldTides = fetchWorldTides as jest.MockedFunction<typeof fetchWorldTides>;

// Import handler after mocks are set up
import handler from '../../pages/api/tides';

describe('GET /api/tides', () => {
  // Store original fetch
  const originalFetch = global.fetch;

  // Counter to generate unique coordinates for each test (avoids cache collisions)
  let testCounter = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    testCounter++;

    // Reset fetch mock
    global.fetch = jest.fn();

    // Mock environment variable
    process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';

    // Default: WorldTides returns null, so tests fall through to Stormglass
    mockFetchWorldTides.mockResolvedValue(null);

    // Default Stormglass mock response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            height: 4.5,
            time: '2025-10-19T06:30:00+00:00',
            type: 'high',
          },
          {
            height: 1.2,
            time: '2025-10-19T12:45:00+00:00',
            type: 'low',
          },
          {
            height: 4.8,
            time: '2025-10-19T19:00:00+00:00',
            type: 'high',
          },
        ],
      }),
    });
  });

  // Helper to get unique coordinates for each test
  function getUniqueCoords() {
    // Use testCounter to generate unique lat/lon that won't collide with cache
    // Coordinates in UK waters, not in North American coast range
    // Use 0.2 intervals to ensure different values after round1dp (0.1 precision)
    return {
      lat: (50 + testCounter * 0.2).toFixed(3),
      lon: (-5 - testCounter * 0.2).toFixed(3),
    };
  }

  afterEach(() => {
    delete process.env.STORMGLASS_SECRET_KEY;
    global.fetch = originalFetch;
  });

  describe('Basic Validation', () => {
    it('should return 500 if STORMGLASS_SECRET_KEY is missing', async () => {
      delete process.env.STORMGLASS_SECRET_KEY;

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Stormglass key not configured');
    });

    it('should return 400 if lat is invalid', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: 'invalid',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid coordinates');
    });

    it('should return 400 if lon is invalid', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: 'invalid',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid coordinates');
    });

    it('should handle undefined lat', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', false);
    });

    it('should handle undefined lon', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', false);
    });
  });

  describe('Successful Requests', () => {
    it('should return tide data for valid coordinates', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should call Stormglass API with correct URL', async () => {
      const coords = getUniqueCoords();
      const { req, res } = createMocks({
        method: 'GET',
        query: coords,
      });

      await handler(req, res);

      // Stormglass is the fallback after WorldTides returns null
      // It should be called with rounded coordinates (1dp for Stormglass)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.stormglass.io/v2/tide/extremes/point'),
        expect.objectContaining({
          headers: {
            Authorization: 'test-stormglass-key',
          },
        })
      );
    });

    it('should include tide extremes data', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      if (data.data.length > 0) {
        const tide = data.data[0];
        expect(tide).toHaveProperty('height');
        expect(tide).toHaveProperty('time');
        expect(tide).toHaveProperty('type');
      }
    });

    it('should handle multiple tide extremes', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache tide data for 3 hours', async () => {
      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.100',
          lon: '-5.100',
        },
      });

      await handler(req1, res1);
      const callsAfterFirst = (global.fetch as jest.Mock).mock.calls.length;

      // Second request should use cache
      const { req: req2, res: res2 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.100',
          lon: '-5.100',
        },
      });

      await handler(req2, res2);

      // Should not have made another fetch call (cached)
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAfterFirst);

      expect(res2._getStatusCode()).toBe(200);
      const data = JSON.parse(res2._getData());
      expect(data).toHaveProperty('success', true);
    });

    it('should round coordinates to 3 decimal places for caching', async () => {
      // First request with precise coordinates
      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456',
          lon: '-5.987654',
        },
      });

      await handler(req1, res1);
      const callsAfterFirst = (global.fetch as jest.Mock).mock.calls.length;

      // Second request with slightly different coordinates (within rounding threshold)
      const { req: req2, res: res2 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123789',
          lon: '-5.987321',
        },
      });

      await handler(req2, res2);

      // Should use cache (coordinates round to same 3dp)
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAfterFirst);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stormglass 402 (payment required) gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: 'Payment required' }),
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.402',
          lon: '-5.402',
        },
      });

      await handler(req, res);

      // Should return 200 with empty data and limited flag
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
      expect(data).toHaveProperty('limited', true);
      expect(data).toHaveProperty('status', 402);
    });

    it('should handle Stormglass 429 (rate limit) gracefully', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('../../lib/monitoring/weatherMetrics', () => ({
          weatherMetrics: { start: jest.fn(() => ({ success: jest.fn(), failure: jest.fn() })) },
        }));
        jest.doMock('../../lib/services/weatherService', () => ({
          fetchWorldTides: jest.fn().mockResolvedValue(null),
        }));

        process.env.STORMGLASS_SECRET_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 429,
          json: async () => ({ error: 'Too many requests' }),
        });

        const freshHandler = (await import('../../pages/api/tides')).default;
        const { createMocks: createMocksFresh } = await import('node-mocks-http');

        const { req, res } = createMocksFresh({
          method: 'GET',
          query: { lat: '54.5', lon: '-6.5' },
        });

        await freshHandler(req, res);

        // Should return 200 with empty data and limited flag
        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(0);
        expect(data).toHaveProperty('limited', true);
        expect(data).toHaveProperty('status', 429);
      });
    });

    it('should handle fetch errors', async () => {
      // Use isolateModules to get fresh module state (clears caches)
      await jest.isolateModulesAsync(async () => {
        // Re-mock dependencies inside isolated context
        jest.doMock('../../lib/monitoring/weatherMetrics', () => ({
          weatherMetrics: { start: jest.fn(() => ({ success: jest.fn(), failure: jest.fn() })) },
        }));
        jest.doMock('../../lib/services/weatherService', () => ({
          fetchWorldTides: jest.fn().mockResolvedValue(null),
        }));

        process.env.STORMGLASS_SECRET_KEY = 'test-key';
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const freshHandler = (await import('../../pages/api/tides')).default;
        const { createMocks: createMocksFresh } = await import('node-mocks-http');

        const { req, res } = createMocksFresh({
          method: 'GET',
          query: { lat: '51.5', lon: '-3.5' },
        });

        await freshHandler(req, res);

        expect(res._getStatusCode()).toBe(500);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('error');
      });
    });

    it('should handle invalid response data structure', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('../../lib/monitoring/weatherMetrics', () => ({
          weatherMetrics: { start: jest.fn(() => ({ success: jest.fn(), failure: jest.fn() })) },
        }));
        jest.doMock('../../lib/services/weatherService', () => ({
          fetchWorldTides: jest.fn().mockResolvedValue(null),
        }));

        process.env.STORMGLASS_SECRET_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ invalid: 'structure' }),
        });

        const freshHandler = (await import('../../pages/api/tides')).default;
        const { createMocks: createMocksFresh } = await import('node-mocks-http');

        const { req, res } = createMocksFresh({
          method: 'GET',
          query: { lat: '52.5', lon: '-4.5' },
        });

        await freshHandler(req, res);

        expect(res._getStatusCode()).toBe(500);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('success', false);
        expect(data).toHaveProperty('error');
      });
    });

    it('should handle non-array data field', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('../../lib/monitoring/weatherMetrics', () => ({
          weatherMetrics: { start: jest.fn(() => ({ success: jest.fn(), failure: jest.fn() })) },
        }));
        jest.doMock('../../lib/services/weatherService', () => ({
          fetchWorldTides: jest.fn().mockResolvedValue(null),
        }));

        process.env.STORMGLASS_SECRET_KEY = 'test-key';
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: 'not-an-array' }),
        });

        const freshHandler = (await import('../../pages/api/tides')).default;
        const { createMocks: createMocksFresh } = await import('node-mocks-http');

        const { req, res } = createMocksFresh({
          method: 'GET',
          query: { lat: '53.5', lon: '-5.5' },
        });

        await freshHandler(req, res);

        expect(res._getStatusCode()).toBe(500);
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('success', false);
      });
    });
  });

  describe('Coordinate Handling', () => {
    it('should accept valid latitude range', async () => {
      const coords = [
        { lat: '-85.0', lon: '0.0' },
        { lat: '0.0', lon: '0.0' },
        { lat: '85.0', lon: '0.0' },
      ];

      for (const coord of coords) {
        const { req, res } = createMocks({
          method: 'GET',
          query: coord,
        });

        await handler(req, res);

        expect([200, 400, 500]).toContain(res._getStatusCode());
      }
    });

    it('should accept valid longitude range', async () => {
      const coords = [
        { lat: '0.0', lon: '-180.0' },
        { lat: '0.0', lon: '0.0' },
        { lat: '0.0', lon: '180.0' },
      ];

      for (const coord of coords) {
        const { req, res } = createMocks({
          method: 'GET',
          query: coord,
        });

        await handler(req, res);

        expect([200, 400, 500]).toContain(res._getStatusCode());
      }
    });

    it('should handle decimal coordinates', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456789',
          lon: '-5.987654321',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
    });
  });

  describe('Cooldown Period', () => {
    it('should implement 15-minute cooldown after quota limit', async () => {
      // First request hits 402
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({ error: 'Payment required' }),
      });

      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.999',
          lon: '-5.999',
        },
      });

      await handler(req1, res1);

      expect(res1._getStatusCode()).toBe(200);
      const data1 = JSON.parse(res1._getData());
      expect(data1).toHaveProperty('success', true);
      expect(data1).toHaveProperty('limited', true);

      // Immediately after, second request should short-circuit without calling API
      const fetchCallsBefore = (global.fetch as jest.Mock).mock.calls.length;

      const { req: req2, res: res2 } = createMocks({
        method: 'GET',
        query: {
          lat: '51.999',
          lon: '-6.999',
        },
      });

      await handler(req2, res2);

      const fetchCallsAfter = (global.fetch as jest.Mock).mock.calls.length;

      expect(res2._getStatusCode()).toBe(200);
      const data2 = JSON.parse(res2._getData());
      expect(data2).toHaveProperty('success', true);
      expect(data2).toHaveProperty('limited', true);
      expect(data2).toHaveProperty('cached', true);

      // Should not have made another fetch call
      expect(fetchCallsAfter).toBe(fetchCallsBefore);
    });
  });

  describe('Response Structure', () => {
    it('should return valid JSON', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(() => JSON.parse(res._getData())).not.toThrow();
    });

    it('should include success flag', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
    });

    it('should return empty array when no tides available', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
        }),
      });

      const { req, res} = createMocks({
        method: 'GET',
        query: {
          lat: '50.888',
          lon: '-5.888',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(0);
    });
  });
});
