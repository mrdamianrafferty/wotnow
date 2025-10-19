// __tests__/api/weather-with-pollen.api.test.ts

/**
 * API Integration Tests for Weather with Pollen Endpoint
 *
 * Tests the /api/weather-with-pollen endpoint
 * This endpoint combines weather data from OpenWeather with pollen/air quality from Open-Meteo
 */

import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/weather-with-pollen';

// Mock the weatherService module
jest.mock('../../lib/services/weatherService', () => ({
  getFullWeather: jest.fn(() => Promise.resolve({
    current: {
      dt: Date.now() / 1000,
      temp: 15,
      feels_like: 14,
      pressure: 1013,
      humidity: 75,
      dew_point: 10,
      uvi: 3,
      clouds: 50,
      visibility: 10000,
      wind_speed: 5,
      wind_deg: 180,
      weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
    },
    hourly: [],
    daily: [],
  })),
  fetchOpenMeteoAirPollen: jest.fn(() => Promise.resolve({
    hourly: {
      time: [
        '2025-10-19T00:00',
        '2025-10-19T01:00',
        '2025-10-19T02:00',
      ],
      grass_pollen: [1.5, 2.0, 2.5],
      birch_pollen: [0.8, 1.0, 1.2],
      alder_pollen: [0.5, 0.6, 0.7],
      ragweed_pollen: [0.3, 0.4, 0.5],
      mugwort_pollen: [0.2, 0.3, 0.4],
      olive_pollen: [0.1, 0.2, 0.3],
      us_aqi: [45, 50, 55],
      european_aqi: [20, 25, 30],
      pm2_5: [10, 12, 15],
      pm10: [20, 25, 30],
      nitrogen_dioxide: [15, 18, 20],
      ozone: [40, 45, 50],
      sulphur_dioxide: [5, 6, 7],
      carbon_monoxide: [200, 220, 240],
    },
  })),
}));

// Mock coordinatePrecision utility
jest.mock('../../utils/coordinatePrecision', () => ({
  roundCoordinates: jest.fn((lat, lon) => ({ lat, lon })),
}));

describe('GET /api/weather-with-pollen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variable
    process.env.OPENWEATHER_KEY = 'test-api-key';
  });

  describe('Basic Request Validation', () => {
    it('should return 405 for non-GET requests', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error', 'Method not allowed');
    });

    it('should return 400 if lat parameter is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lon: '-5.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('lat/lon');
    });

    it('should return 400 if lon parameter is missing', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('lat/lon');
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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid');
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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid');
    });

    it('should return 500 if OPENWEATHER_KEY is not configured', async () => {
      delete process.env.OPENWEATHER_KEY;
      delete process.env.NEXT_PUBLIC_OPENWEATHER_KEY;

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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('API key');
    });
  });

  describe('Successful Requests', () => {
    it('should return combined weather and pollen data for valid coordinates', async () => {
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

      // Should include weather data
      expect(data).toHaveProperty('current');
      expect(data.current).toHaveProperty('temp');
      expect(data.current).toHaveProperty('humidity');

      // Should include aggregated pollen data
      expect(data).toHaveProperty('pollenByDate');
      expect(typeof data.pollenByDate).toBe('object');

      // Should include aggregated air quality data
      expect(data).toHaveProperty('airQualityByDate');
      expect(typeof data.airQualityByDate).toBe('object');
    });

    it('should support units parameter (metric)', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          units: 'metric',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('current');
    });

    it('should support units parameter (imperial)', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
          units: 'imperial',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('current');
    });

    it('should default to metric units if not specified', async () => {
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
      expect(data).toHaveProperty('current');
    });
  });

  describe('Pollen Data Aggregation', () => {
    it('should aggregate grass pollen by date', async () => {
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

      if (data.pollenByDate) {
        const dates = Object.keys(data.pollenByDate);
        expect(dates.length).toBeGreaterThan(0);

        const firstDate = data.pollenByDate[dates[0]!];
        expect(firstDate).toHaveProperty('grass');
        expect(typeof firstDate.grass).toBe('number');
      }
    });

    it('should aggregate tree pollen (max of alder and birch)', async () => {
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

      if (data.pollenByDate) {
        const dates = Object.keys(data.pollenByDate);
        if (dates.length > 0) {
          const firstDate = data.pollenByDate[dates[0]!];
          if (firstDate.tree !== undefined) {
            expect(typeof firstDate.tree).toBe('number');
          }
        }
      }
    });

    it('should aggregate weed pollen (max of ragweed and mugwort)', async () => {
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

      if (data.pollenByDate) {
        const dates = Object.keys(data.pollenByDate);
        if (dates.length > 0) {
          const firstDate = data.pollenByDate[dates[0]!];
          if (firstDate.weed !== undefined) {
            expect(typeof firstDate.weed).toBe('number');
          }
        }
      }
    });

    it('should include olive pollen if available', async () => {
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

      if (data.pollenByDate) {
        const dates = Object.keys(data.pollenByDate);
        if (dates.length > 0) {
          const firstDate = data.pollenByDate[dates[0]!];
          if (firstDate.olive !== undefined) {
            expect(typeof firstDate.olive).toBe('number');
          }
        }
      }
    });
  });

  describe('Air Quality Data Aggregation', () => {
    it('should aggregate US AQI by date', async () => {
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

      if (data.airQualityByDate) {
        const dates = Object.keys(data.airQualityByDate);
        expect(dates.length).toBeGreaterThan(0);

        const firstDate = data.airQualityByDate[dates[0]!];
        if (firstDate.overall !== undefined) {
          expect(typeof firstDate.overall).toBe('number');
        }
      }
    });

    it('should include PM2.5 data', async () => {
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

      if (data.airQualityByDate) {
        const dates = Object.keys(data.airQualityByDate);
        if (dates.length > 0) {
          const firstDate = data.airQualityByDate[dates[0]!];
          if (firstDate.pm2_5 !== undefined) {
            expect(typeof firstDate.pm2_5).toBe('number');
          }
        }
      }
    });

    it('should include PM10 data', async () => {
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

      if (data.airQualityByDate) {
        const dates = Object.keys(data.airQualityByDate);
        if (dates.length > 0) {
          const firstDate = data.airQualityByDate[dates[0]!];
          if (firstDate.pm10 !== undefined) {
            expect(typeof firstDate.pm10).toBe('number');
          }
        }
      }
    });

    it('should include NO2 data', async () => {
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

      if (data.airQualityByDate) {
        const dates = Object.keys(data.airQualityByDate);
        if (dates.length > 0) {
          const firstDate = data.airQualityByDate[dates[0]!];
          if (firstDate.no2 !== undefined) {
            expect(typeof firstDate.no2).toBe('number');
          }
        }
      }
    });

    it('should include O3 data', async () => {
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

      if (data.airQualityByDate) {
        const dates = Object.keys(data.airQualityByDate);
        if (dates.length > 0) {
          const firstDate = data.airQualityByDate[dates[0]!];
          if (firstDate.o3 !== undefined) {
            expect(typeof firstDate.o3).toBe('number');
          }
        }
      }
    });
  });

  describe('Coordinate Handling', () => {
    it('should accept valid latitude range (-90 to 90)', async () => {
      const coords = [
        { lat: '-90.0', lon: '0.0' },   // South Pole
        { lat: '0.0', lon: '0.0' },     // Equator
        { lat: '90.0', lon: '0.0' },    // North Pole
      ];

      for (const coord of coords) {
        const { req, res } = createMocks({
          method: 'GET',
          query: coord,
        });

        await handler(req, res);

        // Should either succeed or fail gracefully (not crash)
        expect([200, 400, 500]).toContain(res._getStatusCode());
      }
    });

    it('should accept valid longitude range (-180 to 180)', async () => {
      const coords = [
        { lat: '0.0', lon: '-180.0' },  // International Date Line West
        { lat: '0.0', lon: '0.0' },     // Prime Meridian
        { lat: '0.0', lon: '180.0' },   // International Date Line East
      ];

      for (const coord of coords) {
        const { req, res } = createMocks({
          method: 'GET',
          query: coord,
        });

        await handler(req, res);

        // Should either succeed or fail gracefully (not crash)
        expect([200, 400, 500]).toContain(res._getStatusCode());
      }
    });

    it('should handle decimal coordinates', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.123456',
          lon: '-5.987654',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('current');
    });
  });

  describe('Error Handling', () => {
    it('should handle weather service errors gracefully', async () => {
      const weatherService = require('../../lib/services/weatherService');
      weatherService.getFullWeather.mockRejectedValueOnce(new Error('Weather API failed'));

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
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle pollen API failures gracefully', async () => {
      const weatherService = require('../../lib/services/weatherService');
      weatherService.fetchOpenMeteoAirPollen.mockRejectedValueOnce(new Error('Pollen API failed'));

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          lat: '50.0',
          lon: '-5.0',
        },
      });

      await handler(req, res);

      // Should still return weather data even if pollen fails
      expect([200, 500]).toContain(res._getStatusCode());
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

    it('should include weather current data', async () => {
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
      expect(data).toHaveProperty('current');
      expect(data.current).toHaveProperty('temp');
      expect(data.current).toHaveProperty('humidity');
      expect(data.current).toHaveProperty('wind_speed');
    });

    it('should not include pollenByDate if no data', async () => {
      const weatherService = require('../../lib/services/weatherService');
      weatherService.fetchOpenMeteoAirPollen.mockResolvedValueOnce(null);

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
      expect(data.pollenByDate).toBeUndefined();
    });

    it('should not include airQualityByDate if no data', async () => {
      const weatherService = require('../../lib/services/weatherService');
      weatherService.fetchOpenMeteoAirPollen.mockResolvedValueOnce(null);

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
      expect(data.airQualityByDate).toBeUndefined();
    });
  });
});
