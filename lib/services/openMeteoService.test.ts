/**
 * Tests for openMeteoService.ts
 * 
 * These tests verify:
 * 1. API request optimization (batching, deduplication)
 * 2. Caching and rate limiting behavior
 * 3. Fallback handling for dates beyond API support
 * 4. Data aggregation (hourly → daily max)
 */
import {
  fetchUVIndex,
  fetchAirQuality,
  fetchEnvironmentalData,
  clearCache,
  getCacheStats
} from './openMeteoService';

// Mock global fetch
global.fetch = jest.fn();

describe('openMeteoService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearCache();
  });

  describe('fetchUVIndex', () => {
    it('should call Open-Meteo forecast endpoint with correct parameters', async () => {
      // Mock successful response
      const mockResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z', '2023-09-01T01:00:00Z'],
          uv_index: [0, 0],
          uv_index_clear_sky: [0, 0]
        },
        daily: {
          time: ['2023-09-01'],
          uv_index_max: [5],
          uv_index_clear_sky_max: [6]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchUVIndex(51.5074, -0.1278);

      // Verify fetch was called with correct URL params
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      
      expect(fetchUrl).toContain('api.open-meteo.com/v1/forecast');
      expect(fetchUrl).toContain('latitude=51.5074');
      expect(fetchUrl).toContain('longitude=-0.1278');
      expect(fetchUrl).toContain('hourly=uv_index,uv_index_clear_sky');
      expect(fetchUrl).toContain('daily=uv_index_max,uv_index_clear_sky_max');
      
      // Verify response transformation
      expect(result.hourly).toEqual(mockResponse.hourly);
      expect(result.daily).toEqual(mockResponse.daily);
      expect(result.isStale).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
      expect(result.updateFrequency).toBeDefined();
    });
    
    it('should return cached data on subsequent calls', async () => {
      // Mock successful response
      const mockResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z'],
          uv_index: [3]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call should fetch from API
      const result1 = await fetchUVIndex(51.5074, -0.1278);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Second call with same parameters should use cache
      const result2 = await fetchUVIndex(51.5074, -0.1278);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still just one fetch
      
      expect(result2.fromCache).toBe(true);
      expect(result2.cacheAge).toBeDefined();
      
      // Force refresh should fetch again
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });
      
      const result3 = await fetchUVIndex(51.5074, -0.1278, 7, true);
      expect(global.fetch).toHaveBeenCalledTimes(2); // Now two fetches
      expect(result3.fromCache).toBe(false);
    });
    
    it('should handle dates beyond Open-Meteo max date', async () => {
      // Mock date to be in the future beyond API support
      const realDate = Date;
      global.Date = class extends Date {
        constructor(date) {
          if (date) {
            return super(date);
          }
          return new realDate('2026-01-01T12:00:00Z'); // Future date
        }
      } as any;
      
      // Mock successful response
      const mockResponse = {
        hourly: {
          time: ['2025-08-24T00:00:00Z'],
          uv_index: [4]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchUVIndex(51.5074, -0.1278);
      
      // Verify fetch call includes max date
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('start_date=2025-08-24');
      expect(fetchUrl).toContain('end_date=2025-08-24');
      
      // Verify stale flag is set
      expect(result.isStale).toBe(true);
      
      // Restore original Date
      global.Date = realDate;
    });
  });

  describe('fetchAirQuality', () => {
    it('should select correct domain based on location', async () => {
      // Mock successful response
      const mockResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z'],
          us_aqi: [50]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // European location
      await fetchAirQuality(48.8566, 2.3522); // Paris
      let fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('domains=cams_europe');
      
      // Non-European location
      jest.resetAllMocks();
      await fetchAirQuality(40.7128, -74.006); // New York
      fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('domains=cams_global');
    });
    
    it('should include pollen data for European locations only', async () => {
      // Mock successful response
      const mockResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z'],
          us_aqi: [50]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // European location with pollen data
      await fetchAirQuality(48.8566, 2.3522, true); // Paris with pollen
      let fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).toContain('grass_pollen');
      
      // Non-European location should not request pollen
      jest.resetAllMocks();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      await fetchAirQuality(40.7128, -74.006, true); // New York with pollen
      fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(fetchUrl).not.toContain('grass_pollen');
    });
  });

  describe('fetchEnvironmentalData', () => {
    it('should optimize API calls based on needed data', async () => {
      // Mock successful responses
      const mockAirQualityResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z'],
          us_aqi: [50],
          uv_index: [3] // UVI included in air quality response
        }
      };

      const mockForecastResponse = {
        hourly: {
          time: ['2023-09-01T00:00:00Z'],
          uv_index: [3]
        }
      };

      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAirQualityResponse
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => mockForecastResponse
          });
        }
      });

      // Case 1: Need all data - should only call air quality since it has UVI too
      await fetchEnvironmentalData(51.5074, -0.1278, 7, {
        needUVI: true,
        needAQI: true,
        needPollen: true
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('air-quality');
      
      // Reset
      jest.resetAllMocks();
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAirQualityResponse
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => mockForecastResponse
          });
        }
      });
      
      // Case 2: Need only UVI - should call forecast endpoint
      await fetchEnvironmentalData(51.5074, -0.1278, 7, {
        needUVI: true,
        needAQI: false,
        needPollen: false
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('forecast');
      
      // Reset
      jest.resetAllMocks();
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('air-quality')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockAirQualityResponse
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: async () => mockForecastResponse
          });
        }
      });
      
      // Case 3: Need AQI and UVI - should only call air quality
      await fetchEnvironmentalData(51.5074, -0.1278, 7, {
        needUVI: true,
        needAQI: true,
        needPollen: false
      });
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('air-quality');
    });
    
    it('should aggregate hourly data into daily maximums', async () => {
      // Mock hourly data with multiple values per day
      const mockResponse = {
        hourly: {
          time: [
            '2023-09-01T00:00:00Z', '2023-09-01T12:00:00Z', 
            '2023-09-02T00:00:00Z', '2023-09-02T12:00:00Z'
          ],
          uv_index: [0, 5, 0, 6],
          us_aqi: [30, 50, 40, 60],
          grass_pollen: [1, 3, 2, 4]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchEnvironmentalData(48.8566, 2.3522); // Paris
      
      // Verify daily aggregation
      expect(result.daily).toHaveLength(2); // Two days
      
      // First day
      expect(result.daily[0].date).toBe('2023-09-01');
      expect(result.daily[0].uv_index_max).toBe(5);
      expect(result.daily[0].us_aqi_max).toBe(50);
      expect(result.daily[0].grass_pollen_max).toBe(3);
      
      // Second day
      expect(result.daily[1].date).toBe('2023-09-02');
      expect(result.daily[1].uv_index_max).toBe(6);
      expect(result.daily[1].us_aqi_max).toBe(60);
      expect(result.daily[1].grass_pollen_max).toBe(4);
    });
  });

  describe('Cache functions', () => {
    it('should track and report cache statistics', async () => {
      // Add items to cache
      const mockResponse = { hourly: { time: ['2023-09-01T00:00:00Z'] } };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      // Cache several items
      await fetchUVIndex(51.5074, -0.1278);
      await fetchUVIndex(48.8566, 2.3522);
      await fetchAirQuality(40.7128, -74.006);
      
      const stats = getCacheStats();
      
      expect(stats.entriesCount).toBe(3);
      expect(stats.sizeEstimate).toContain('KB');
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      
      // Clear cache
      clearCache();
      
      const emptyStats = getCacheStats();
      expect(emptyStats.entriesCount).toBe(0);
    });
  });
});
