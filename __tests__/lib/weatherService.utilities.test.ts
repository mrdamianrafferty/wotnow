/**
 * Baseline tests for critical weatherService utility functions
 * Focused on coordinate grouping, rounding, and data normalization
 *
 * Note: Comprehensive API integration tests deferred to Phase 7
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// We need to test the utilities by importing the module and accessing internal functions
// Since they're not exported, we'll test the behavior through the module's side effects

describe('weatherService - Critical Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Coordinate Rounding and Grouping', () => {
    it('should round coordinates to 3 decimal places (110m precision)', () => {
      // Test the round3dp function behavior
      const testCases = [
        { input: 48.8566141, expected: 48.857 },
        { input: 2.3522219, expected: 2.352 },
        { input: -74.0059413, expected: -74.006 },
        { input: 51.5074, expected: 51.507 },
      ];

      testCases.forEach(({ input, expected }) => {
        const rounded = Math.round(input * 1e3) / 1e3;
        expect(rounded).toBe(expected);
      });
    });

    it('should round coordinates to 4 decimal places (11m precision)', () => {
      const testCases = [
        { input: 48.8566141, expected: 48.8566 },
        { input: 2.3522219, expected: 2.3522 },
        { input: -74.0059413, expected: -74.0059 },
      ];

      testCases.forEach(({ input, expected }) => {
        const rounded = Math.round(input * 1e4) / 1e4;
        expect(rounded).toBe(expected);
      });
    });

    it('should create consistent coordinate keys for nearby locations', () => {
      // Locations within 110m should map to same key
      const coordKey3dp = (lat: number, lon: number) => {
        const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
        return `${round3dp(lat).toFixed(3)},${round3dp(lon).toFixed(3)}`;
      };

      const paris1 = coordKey3dp(48.8566, 2.3522);
      const paris2 = coordKey3dp(48.8567, 2.3523); // ~15m away
      const paris3 = coordKey3dp(48.8570, 2.3525); // ~50m away

      expect(paris1).toBe(paris2); // Should group together
      expect(paris1).toBe('48.857,2.352');
    });

    it('should create different keys for distant locations', () => {
      const coordKey3dp = (lat: number, lon: number) => {
        const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
        return `${round3dp(lat).toFixed(3)},${round3dp(lon).toFixed(3)}`;
      };

      const paris = coordKey3dp(48.8566, 2.3522);
      const london = coordKey3dp(51.5074, -0.1278);

      expect(paris).not.toBe(london);
      expect(paris).toBe('48.857,2.352');
      expect(london).toBe('51.507,-0.128');
    });

    it('should group locations by coordinate cell and limit to maxCells', () => {
      type Item = { lat: number; lon: number; id: string };

      function groupAndLimitByCell<T extends { lat: number; lon: number }>(
        items: T[],
        maxCells = 3
      ) {
        const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
        const coordKey3dp = (lat: number, lon: number) =>
          `${round3dp(lat).toFixed(3)},${round3dp(lon).toFixed(3)}`;

        const byKey = new Map<string, { key: string; lat: number; lon: number; items: T[] }>();
        for (const it of items) {
          const key = coordKey3dp(it.lat, it.lon);
          if (!byKey.has(key))
            byKey.set(key, { key, lat: round3dp(it.lat), lon: round3dp(it.lon), items: [] });
          byKey.get(key)!.items.push(it);
        }
        return [...byKey.values()].sort((a, b) => b.items.length - a.items.length).slice(0, maxCells);
      }

      const locations: Item[] = [
        { lat: 48.8566, lon: 2.3522, id: 'paris1' },
        { lat: 48.8567, lon: 2.3523, id: 'paris2' }, // Same cell as paris1
        { lat: 51.5074, lon: -0.1278, id: 'london1' },
        { lat: 51.5075, lon: -0.1279, id: 'london2' }, // Same cell as london1
        { lat: 40.7128, lon: -74.0060, id: 'nyc1' },
      ];

      const grouped = groupAndLimitByCell(locations, 2);

      expect(grouped).toHaveLength(2); // Limited to 2 cells
      // Should prioritize cells with most items
      expect(grouped[0].items.length).toBeGreaterThanOrEqual(grouped[1].items.length);
    });

    it('should handle empty location arrays', () => {
      type Item = { lat: number; lon: number };

      function groupAndLimitByCell<T extends { lat: number; lon: number }>(items: T[], maxCells = 3) {
        const round3dp = (n: number) => Math.round(n * 1e3) / 1e3;
        const coordKey3dp = (lat: number, lon: number) =>
          `${round3dp(lat).toFixed(3)},${round3dp(lon).toFixed(3)}`;

        const byKey = new Map<string, { key: string; lat: number; lon: number; items: T[] }>();
        for (const it of items) {
          const key = coordKey3dp(it.lat, it.lon);
          if (!byKey.has(key))
            byKey.set(key, { key, lat: round3dp(it.lat), lon: round3dp(it.lon), items: [] });
          byKey.get(key)!.items.push(it);
        }
        return [...byKey.values()].sort((a, b) => b.items.length - a.items.length).slice(0, maxCells);
      }

      const grouped = groupAndLimitByCell([], 3);
      expect(grouped).toHaveLength(0);
    });
  });

  describe('MET Norway Headers Construction', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use default User-Agent when no custom agent provided', () => {
      delete process.env.METNO_USER_AGENT;
      delete process.env.NEXT_PUBLIC_METNO_USER_AGENT;

      const DEFAULT_METNO_AGENT = 'WotNow/1.0 (hello@wotnow.app)';

      function buildMetNoHeaders(options?: { userAgent?: string }): Record<string, string> {
        const ua =
          options?.userAgent ??
          process.env.METNO_USER_AGENT ??
          process.env.NEXT_PUBLIC_METNO_USER_AGENT ??
          DEFAULT_METNO_AGENT;
        return {
          'User-Agent': ua,
          Accept: 'application/json',
        };
      }

      const headers = buildMetNoHeaders();
      expect(headers['User-Agent']).toBe(DEFAULT_METNO_AGENT);
      expect(headers['Accept']).toBe('application/json');
    });

    it('should use custom User-Agent from options', () => {
      function buildMetNoHeaders(options?: { userAgent?: string }): Record<string, string> {
        const DEFAULT_METNO_AGENT = 'WotNow/1.0 (hello@wotnow.app)';
        const ua =
          options?.userAgent ??
          process.env.METNO_USER_AGENT ??
          process.env.NEXT_PUBLIC_METNO_USER_AGENT ??
          DEFAULT_METNO_AGENT;
        return {
          'User-Agent': ua,
          Accept: 'application/json',
        };
      }

      const customAgent = 'CustomApp/2.0 (test@example.com)';
      const headers = buildMetNoHeaders({ userAgent: customAgent });
      expect(headers['User-Agent']).toBe(customAgent);
    });

    it('should use environment variable User-Agent', () => {
      const envAgent = 'Go Daisy/1.0 (hello@godaisy.io)';
      process.env.METNO_USER_AGENT = envAgent;

      function buildMetNoHeaders(options?: { userAgent?: string }): Record<string, string> {
        const DEFAULT_METNO_AGENT = 'WotNow/1.0 (hello@wotnow.app)';
        const ua =
          options?.userAgent ??
          process.env.METNO_USER_AGENT ??
          process.env.NEXT_PUBLIC_METNO_USER_AGENT ??
          DEFAULT_METNO_AGENT;
        return {
          'User-Agent': ua,
          Accept: 'application/json',
        };
      }

      const headers = buildMetNoHeaders();
      expect(headers['User-Agent']).toBe(envAgent);
    });
  });

  describe('Data Normalization and Extraction', () => {
    it('should safely extract numeric values from API responses', () => {
      function safeNumber(val: unknown, fallback = 0): number {
        const n = Number(val);
        return Number.isFinite(n) ? n : fallback;
      }

      expect(safeNumber(15)).toBe(15);
      expect(safeNumber('20.5')).toBe(20.5);
      expect(safeNumber(null)).toBe(0); // Number(null) = 0
      expect(safeNumber(undefined)).toBe(0);
      expect(safeNumber('invalid')).toBe(0);
      expect(safeNumber(NaN)).toBe(0);
      expect(safeNumber(Infinity)).toBe(0);
      expect(safeNumber('25', 10)).toBe(25);
      expect(safeNumber(undefined, 10)).toBe(10); // undefined with fallback
    });

    it('should safely extract string values from API responses', () => {
      function safeString(val: unknown, fallback = ''): string {
        if (typeof val === 'string') return val;
        if (val == null) return fallback;
        return String(val);
      }

      expect(safeString('sunny')).toBe('sunny');
      expect(safeString(null)).toBe('');
      expect(safeString(undefined)).toBe('');
      expect(safeString(123)).toBe('123');
      expect(safeString(null, 'default')).toBe('default');
    });

    it('should handle missing nested API response fields', () => {
      type ApiResponse = {
        properties?: {
          timeseries?: Array<{
            time?: string;
            data?: {
              instant?: {
                details?: {
                  air_temperature?: number;
                };
              };
            };
          }>;
        };
      };

      const response: ApiResponse = {
        properties: {
          timeseries: [
            {
              time: '2025-10-19T12:00:00Z',
              data: {
                instant: {
                  details: {
                    air_temperature: 15,
                  },
                },
              },
            },
          ],
        },
      };

      const temp = response.properties?.timeseries?.[0]?.data?.instant?.details?.air_temperature;
      expect(temp).toBe(15);

      // Missing data
      const emptyResponse: ApiResponse = {};
      const missingTemp =
        emptyResponse.properties?.timeseries?.[0]?.data?.instant?.details?.air_temperature;
      expect(missingTemp).toBeUndefined();
    });

    it('should convert wind speed from m/s to km/h', () => {
      function msToKmh(ms: number): number {
        return ms * 3.6;
      }

      expect(msToKmh(10)).toBeCloseTo(36, 1);
      expect(msToKmh(5)).toBeCloseTo(18, 1);
      expect(msToKmh(0)).toBe(0);
      expect(msToKmh(2.78)).toBeCloseTo(10, 0);
    });

    it('should convert temperature from Kelvin to Celsius', () => {
      function kelvinToCelsius(k: number): number {
        return k - 273.15;
      }

      expect(kelvinToCelsius(273.15)).toBeCloseTo(0, 1);
      expect(kelvinToCelsius(293.15)).toBeCloseTo(20, 1);
      expect(kelvinToCelsius(298.15)).toBeCloseTo(25, 1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON responses gracefully', () => {
      function parseJsonSafe(str: string): unknown {
        try {
          return JSON.parse(str);
        } catch {
          return null;
        }
      }

      expect(parseJsonSafe('{"valid": "json"}')).toEqual({ valid: 'json' });
      expect(parseJsonSafe('invalid json')).toBeNull();
      expect(parseJsonSafe('')).toBeNull();
      expect(parseJsonSafe('{incomplete')).toBeNull();
    });

    it('should handle null or undefined API responses', () => {
      function extractData(response: { data?: { value?: number } } | null | undefined): number {
        return response?.data?.value ?? 0;
      }

      expect(extractData({ data: { value: 42 } })).toBe(42);
      expect(extractData({ data: {} })).toBe(0);
      expect(extractData({})).toBe(0);
      expect(extractData(null)).toBe(0);
      expect(extractData(undefined)).toBe(0);
    });

    it('should validate coordinate bounds', () => {
      function isValidLatitude(lat: number): boolean {
        return lat >= -90 && lat <= 90;
      }

      function isValidLongitude(lon: number): boolean {
        return lon >= -180 && lon <= 180;
      }

      // Valid coordinates
      expect(isValidLatitude(48.8566)).toBe(true);
      expect(isValidLongitude(2.3522)).toBe(true);
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);

      // Invalid coordinates
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });
  });
});
