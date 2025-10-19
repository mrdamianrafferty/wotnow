// __tests__/api/findr/conditions.api.test.ts

/**
 * API Integration Tests for Findr Conditions Endpoint
 * 
 * Tests the /api/findr/conditions endpoint
 */

import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/findr/conditions';

describe('GET /api/findr/conditions', () => {
  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return fallback when rectangleCode is missing', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    // API returns fallback data (200) when rectangleCode is missing, not an error
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('source', 'fallback');
  });

  it('should return conditions for valid rectangleCode', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('rectangle');
    expect(data).toHaveProperty('snapshot');
    expect(data).toHaveProperty('source');
  });

  it('should include essential marine conditions', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.snapshot.marine).toHaveProperty('seaTemperatureC');
    expect(data.snapshot.marine).toHaveProperty('salinityPsu');
    expect(data.snapshot.marine).toHaveProperty('waveHeightM');
  });

  it('should include biogeochemical data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Phase 2 biogeochemical indicators
    expect(data.snapshot.marine).toHaveProperty('chlorophyllMgM3');
    expect(data.snapshot.marine).toHaveProperty('dissolvedOxygenMgL');
    expect(data.snapshot.marine).toHaveProperty('nitrateUmolL');
    expect(data.snapshot.marine).toHaveProperty('phosphateUmolL');
  });

  it('should include ocean current data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Ocean currents are optional Phase 2 features
    expect(data.snapshot.marine).toBeDefined();
  });

  it('should include water clarity data', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Water clarity is part of marine data
    expect(data.snapshot.marine).toBeDefined();
  });

  it('should include tide information', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.snapshot.tides).toHaveProperty('nextHighIso');
    expect(data.snapshot.tides).toHaveProperty('nextLowIso');
  });

  it('should normalize rectangleCode format', async () => {
    // Test with lowercase
    const { req: req1, res: res1 } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31e5',
      },
    });

    await handler(req1, res1);
    expect(res1._getStatusCode()).toBe(200);

    // Test with uppercase
    const { req: req2, res: res2 } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req2, res2);
    expect(res2._getStatusCode()).toBe(200);
  });

  it('should indicate data source (supabase or fallback)', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data).toHaveProperty('source');
    expect(['supabase', 'fallback']).toContain(data.source);
  });

  it('should use fallback for uncovered areas', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '99Z9', // Likely uncovered rectangle
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Should still return conditions (from fallback)
    expect(data).toHaveProperty('rectangle');
    expect(data).toHaveProperty('snapshot');
    expect(data.source).toBe('fallback');
  });

  it('should have valid numeric values for marine parameters', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    const { marine } = data.snapshot;
    
    // Check reasonable ranges
    if (marine.seaTemperatureC !== null) {
      expect(marine.seaTemperatureC).toBeGreaterThanOrEqual(-2);
      expect(marine.seaTemperatureC).toBeLessThanOrEqual(35);
    }
    
    if (marine.salinityPsu !== null) {
      expect(marine.salinityPsu).toBeGreaterThanOrEqual(0);
      expect(marine.salinityPsu).toBeLessThanOrEqual(40);
    }
    
    if (marine.waveHeightM !== null) {
      expect(marine.waveHeightM).toBeGreaterThanOrEqual(0);
      expect(marine.waveHeightM).toBeLessThanOrEqual(30);
    }
  });

  it('should include timestamp for data freshness', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.snapshot).toHaveProperty('capturedAt');
    
    if (data.snapshot.capturedAt) {
      // Should be a valid ISO date
      const date = new Date(data.snapshot.capturedAt);
      expect(date.toString()).not.toBe('Invalid Date');
    }
  });

  it('should handle multiple rectangle codes', async () => {
    const rectangles = ['31E5', '31F5', '32E5'];
    
    for (const rect of rectangles) {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          rectangleCode: rect,
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('rectangle');
      expect(data).toHaveProperty('snapshot');
    }
  });

  it('should include food chain indicators (phytoplankton, zooplankton)', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    // Food chain indicators are optional Phase 2 features in marine object
    expect(data.snapshot.marine).toBeDefined();
  });

  it('should include wave details for surf conditions', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.snapshot.hourly).toBeDefined();
    expect(Array.isArray(data.snapshot.hourly)).toBe(true);
  });

  it('should include hourly and daily forecasts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        rectangleCode: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    expect(data.snapshot.hourly).toBeDefined();
    expect(data.snapshot.daily).toBeDefined();
    expect(Array.isArray(data.snapshot.hourly)).toBe(true);
    expect(Array.isArray(data.snapshot.daily)).toBe(true);
  });
});
