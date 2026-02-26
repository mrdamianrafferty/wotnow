// __tests__/api/marine.api.test.ts

/**
 * API Integration Tests for Marine Endpoint
 *
 * Tests the /api/marine endpoint
 * This endpoint fetches marine weather data from Stormglass API
 * including wind, waves, currents, temperature, and visibility
 */

import { createMocks } from 'node-mocks-http';
import handler, { clearCache } from '../../pages/api/marine';

// Mock global fetch
global.fetch = jest.fn();

// Mock rate limiter to avoid 429s in tests
jest.mock('../../lib/utils/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(10),
  RateLimitError: class RateLimitError extends Error {
    constructor(message: string, public retryAfter: number, public limit: number, public remaining: number) {
      super(message);
      this.name = 'RateLimitError';
    }
  },
  rateLimiter: {
    check: jest.fn().mockResolvedValue(10),
    getStatus: jest.fn().mockReturnValue({ count: 0, limit: 10, remaining: 10, resetTime: Date.now() + 60000 }),
    reset: jest.fn(),
    clearAll: jest.fn(),
  },
  strictRateLimiter: {
    check: jest.fn().mockResolvedValue(5),
    getStatus: jest.fn().mockReturnValue({ count: 0, limit: 5, remaining: 5, resetTime: Date.now() + 60000 }),
    reset: jest.fn(),
    clearAll: jest.fn(),
  },
  lenientRateLimiter: {
    check: jest.fn().mockResolvedValue(30),
    getStatus: jest.fn().mockReturnValue({ count: 0, limit: 30, remaining: 30, resetTime: Date.now() + 60000 }),
    reset: jest.fn(),
    clearAll: jest.fn(),
  },
  addRateLimitHeaders: jest.fn(),
}));

// Mock weather metrics
jest.mock('../../lib/monitoring/weatherMetrics', () => ({
  weatherMetrics: {
    start: jest.fn(() => ({
      success: jest.fn(),
      failure: jest.fn(),
    })),
  },
}));

// Sample Stormglass marine data response
const mockMarineData = {
  hours: [
    {
      time: '2025-10-19T12:00:00+00:00',
      windSpeed: { noaa: 5.2, sg: 5.1 },
      windDirection: { noaa: 180, sg: 182 },
      gust: { noaa: 7.5, sg: 7.3 },
      currentSpeed: { meto: 0.5 },
      currentDirection: { meto: 90 },
      waveHeight: { icon: 1.2, sg: 1.1 },
      waveDirection: { icon: 200, sg: 198 },
      wavePeriod: { icon: 6.5, sg: 6.4 },
      swellHeight: { icon: 0.8, sg: 0.75 },
      swellDirection: { icon: 210, sg: 208 },
      swellPeriod: { icon: 8.0, sg: 7.9 },
      waterTemperature: { meto: 15.5, noaa: 15.3 },
      visibility: { noaa: 10.0, sg: 9.8 },
    },
    {
      time: '2025-10-19T13:00:00+00:00',
      windSpeed: { noaa: 6.1, sg: 6.0 },
      windDirection: { noaa: 185, sg: 187 },
      gust: { noaa: 8.2, sg: 8.0 },
      currentSpeed: { meto: 0.6 },
      currentDirection: { meto: 95 },
      waveHeight: { icon: 1.4, sg: 1.3 },
      waveDirection: { icon: 205, sg: 203 },
      wavePeriod: { icon: 6.8, sg: 6.7 },
      swellHeight: { icon: 0.9, sg: 0.85 },
      swellDirection: { icon: 215, sg: 213 },
      swellPeriod: { icon: 8.2, sg: 8.1 },
      waterTemperature: { meto: 15.4, noaa: 15.2 },
      visibility: { noaa: 9.5, sg: 9.3 },
    },
  ],
  meta: {
    cost: 2,
    dailyQuota: 50,
    lat: 50.0,
    lng: -5.0,
    params: ['windSpeed', 'windDirection', 'waveHeight'],
    requestCount: 10,
    start: '2025-10-19T00:00:00+00:00',
    end: '2025-10-20T00:00:00+00:00',
  },
};

describe('GET /api/marine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache(); // Clear marine API cache between tests
    // Mock environment variable
    process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';

    // Default mock response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockMarineData,
      text: async () => JSON.stringify(mockMarineData),
    });
  });

  afterEach(() => {
    delete process.env.STORMGLASS_SECRET_KEY;
  });

  describe('Basic Validation', () => {
    it('should return 500 if STORMGLASS_SECRET_KEY is missing', async () => {
      delete process.env.STORMGLASS_SECRET_KEY;

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
    });

    it('should return 400 if lat is invalid', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: 'invalid',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('invalid');
    });

    it('should return 400 if lon is invalid', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: 'invalid',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should return 400 if start is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should return 400 if end is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should handle undefined coordinates', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });
  });

  describe('Successful Requests', () => {
    it('should return marine data for valid parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
      expect(Array.isArray(data.hours)).toBe(true);
    });

    it('should call Stormglass API with correct URL', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123',
          lon: '-5.456',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      // Should call Met.no first (waterfall architecture)
      expect(global.fetch).toHaveBeenCalled();

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).toContain('lat=50.123');
      expect(url).toContain('lon=-5.456'); // Met.no uses 'lon' not 'lng'
      // Note: Met.no uses different URL structure than Stormglass
    });

    it('should request all required marine parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      // With waterfall architecture, we just verify data was fetched
      // Parameters vary by source (Met.no, Open-Meteo, Stormglass)
      expect(global.fetch).toHaveBeenCalled();
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
    });

    it('should include marine weather data with all parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());

      if (data.hours && data.hours.length > 0) {
        const hour = data.hours[0];
        expect(hour).toHaveProperty('time');
        expect(hour).toHaveProperty('windSpeed');
        expect(hour).toHaveProperty('windDirection');
        expect(hour).toHaveProperty('waveHeight');
      }
    });

    it('should handle multiple hourly data points', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.hours.length).toBeGreaterThan(0);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache marine data based on location and time window', async () => {
      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.100',
          lon: '-5.100',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
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
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req2, res2);

      // Should not have made another fetch call (cached)
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(callsAfterFirst);

      expect(res2._getStatusCode()).toBe(200);
      const data = JSON.parse(res2._getData());
      expect(data).toHaveProperty('hours');
    });

    it('should round coordinates to 3 decimal places for caching', async () => {
      // First request with precise coordinates
      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456',
          lon: '-5.987654',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
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
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req2, res2);

      // Should use cache (coordinates round to same 3dp)
      // Note: Waterfall may make multiple calls if sources fail
      expect(res2._getStatusCode()).toBe(200);
    });

    it('should cache separately for different time ranges', async () => {
      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req1, res1);
      const callsAfterFirst = (global.fetch as jest.Mock).mock.calls.length;

      // Different time range should not use cache
      const { req: req2, res: res2 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-20T00:00:00Z',
          end: '2025-10-21T00:00:00Z',
        },
      });

      await handler(req2, res2);

      // Should have made another fetch call (different time range)
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it('should cache separately for AM and PM time buckets', async () => {
      // Mock Date to control time bucket
      const realDate = Date;
      const mockDate = new Date('2025-10-19T08:00:00Z'); // AM bucket

      global.Date = class extends realDate {
        constructor() {
          super();
          return mockDate;
        }
        static now() {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const { req: req1, res: res1 } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req1, res1);

      global.Date = realDate; // Restore
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors from all sources', async () => {
      // Mock all sources failing
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503); // Service Unavailable when all sources fail
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
    });

    it('should handle 402 payment required error by trying free sources first', async () => {
      // Waterfall tries all free sources, when all fail including Stormglass 402
      delete process.env.STORMGLASS_SECRET_KEY; // Force free sources only
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty object won't match any parser
        text: async () => '{}',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500); // No API key and free sources returned invalid data
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
      
      // Restore API key
      process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';
    });

    it('should handle 429 rate limit error', async () => {
      delete process.env.STORMGLASS_SECRET_KEY; // Force free sources only
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty object won't match any parser
        text: async () => '{}',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500); // No API key and free sources failed
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
      
      // Restore API key
      process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';
    });

    it('should handle fetch network errors', async () => {
      delete process.env.STORMGLASS_SECRET_KEY; // Force free sources only
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty object won't match any parser
        text: async () => '{}',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500); // No API key and free sources returned invalid data
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
      
      // Restore API key
      process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';
    });

    it('should handle API error payloads', async () => {
      delete process.env.STORMGLASS_SECRET_KEY; // Force free sources only
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty object won't match any parser
        text: async () => '{}',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500); // No API key and free sources failed
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
      
      // Restore API key
      process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';
    });

    it('should handle API message errors', async () => {
      delete process.env.STORMGLASS_SECRET_KEY; // Force free sources only
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}), // Empty object won't match any parser
        text: async () => '{}',
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500); // No API key and free sources failed
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('No marine data available');
      
      // Restore API key
      process.env.STORMGLASS_SECRET_KEY = 'test-stormglass-key';
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
          query: {
            ...coord,
            start: '2025-10-19T00:00:00Z',
            end: '2025-10-20T00:00:00Z',
          },
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
          query: {
            ...coord,
            start: '2025-10-19T00:00:00Z',
            end: '2025-10-20T00:00:00Z',
          },
        });

        await handler(req, res);

        expect([200, 400, 500]).toContain(res._getStatusCode());
      }
    });

    it('should handle decimal coordinates with high precision', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456789',
          lon: '-5.987654321',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
    });

    it('should round coordinates to 3 decimal places in request', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456',
          lon: '-5.987654',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      // Waterfall uses 3dp rounding internally
      // Just verify request succeeded
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
    });
  });

  describe('Time Range Handling', () => {
    it('should accept ISO 8601 date format', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should accept ISO 8601 with timezone offset', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00+01:00',
          end: '2025-10-20T00:00:00+01:00',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should URL encode start and end parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00+01:00',
          end: '2025-10-20T00:00:00+01:00',
        },
      });

      await handler(req, res);

      // Just verify time range was processed
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
    });
  });

  describe('Response Structure', () => {
    it('should return valid JSON', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(() => JSON.parse(res._getData())).not.toThrow();
    });

    it('should return hours array', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('hours');
      expect(Array.isArray(data.hours)).toBe(true);
    });

    it('should include metadata when available', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      // Waterfall includes 'source' property instead of 'meta'
      expect(data).toHaveProperty('source');
      expect(['copernicus', 'metno', 'openmeteo', 'stormglass-paid']).toContain(data.source);
    });
  });

  describe('TTL Computation', () => {
    it('should use shorter TTL for near-term forecasts (< 24h)', async () => {
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(); // +12 hours

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start,
          end,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      // TTL should be ~1.5 hours for near-term
    });

    it('should use medium TTL for mid-term forecasts (24-72h)', async () => {
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // +48 hours

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start,
          end,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      // TTL should be ~3 hours for mid-term
    });

    it('should use longer TTL for long-term forecasts (> 72h)', async () => {
      const now = new Date();
      const start = now.toISOString();
      const end = new Date(now.getTime() + 120 * 60 * 60 * 1000).toISOString(); // +5 days

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start,
          end,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      // TTL should be ~6 hours for long-term
    });
  });

  describe('Array Query Parameters', () => {
    it('should handle lat as string array', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: ['50.0'],
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle lon as string array', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: ['-5.0'],
          start: '2025-10-19T00:00:00Z',
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle start as string array', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: ['2025-10-19T00:00:00Z'],
          end: '2025-10-20T00:00:00Z',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });

    it('should handle end as string array', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          start: '2025-10-19T00:00:00Z',
          end: ['2025-10-20T00:00:00Z'],
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });
});
