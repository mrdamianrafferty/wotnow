import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFishingPredictions, UseFishingPredictionsOptions } from '@/hooks/useFishingPredictions';
import React from 'react';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create a QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for tests
        gcTime: 0, // Disable cache persistence
      },
    },
  });
}

// Helper to create a wrapper with QueryClientProvider
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useFishingPredictions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    console.log = jest.fn(); // Suppress console.log
    console.error = jest.fn(); // Suppress console.error
  });

  describe('Basic Hook Behavior', () => {
    it('should return null predictions when not enabled', () => {
      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1', enabled: false }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.predictions).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return null predictions when rectangleCode is missing', () => {
      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: null }),
        { wrapper: createWrapper(queryClient) }
      );

      expect(result.current.predictions).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch predictions when rectangleCode is provided', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [
          {
            species_id: 'bss',
            species_common_name: 'Sea Bass',
            confidence: 85,
            rationale: ['Good temperature', 'Optimal salinity'],
          },
        ],
        metadata: {
          requestedAt: '2025-10-19T12:00:00Z',
          region: 'met_norway',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.predictions).toBeNull();

      // Wait for data to load
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.predictions).toEqual(mockResponse.predictions);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBe('2025-10-19T12:00:00Z');
      expect(result.current.region).toBe('met_norway');

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/findr/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rectangleCode: '31F1',
          language: 'en',
          latitude: undefined,
          longitude: undefined,
          predictionDate: undefined,
        }),
      });
    });

    it('should use custom language parameter', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'fr',
        predictions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1', language: 'fr' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.language).toBe('fr');
    });

    it('should include latitude and longitude when provided', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () =>
          useFishingPredictions({
            rectangleCode: '31F1',
            latitude: 48.8566,
            longitude: 2.3522,
          }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.latitude).toBe(48.8566);
      expect(requestBody.longitude).toBe(2.3522);
    });

    it('should include predictionDate when provided', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-20',
        language: 'en',
        predictions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () =>
          useFishingPredictions({
            rectangleCode: '31F1',
            predictionDate: '2025-10-20',
          }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.predictionDate).toBe('2025-10-20');
    });
  });

  describe('Error Handling', () => {
    it('should handle API error with error field', async () => {
      // Mock will be called twice due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: 'Internal server error',
            details: { message: 'Database connection failed' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({
            error: 'Internal server error',
            details: { message: 'Database connection failed' },
          }),
        });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.predictions).toBeNull();
      expect(result.current.error).toBe('Internal server error');
    });

    it('should handle API error with details.message fallback', async () => {
      // Mock will be called twice due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            details: { message: 'Rectangle not found' },
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({
            details: { message: 'Rectangle not found' },
          }),
        });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: 'INVALID' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.error).toBe('Rectangle not found');
    });

    it('should handle generic error response', async () => {
      // Mock will be called twice due to retry: 1
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({}),
        });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.error).toBe('Failed to load fishing predictions');
    });

    it('should handle network errors', async () => {
      // Mock will be called twice due to retry: 1
      mockFetch
        .mockRejectedValueOnce(new Error('Network request failed'))
        .mockRejectedValueOnce(new Error('Network request failed'));

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

      expect(result.current.predictions).toBeNull();
      expect(result.current.error).toBe('Network request failed');
    });
  });

  describe('Caching and Refetching', () => {
    it('should cache predictions and avoid refetching', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Sea Bass', confidence: 85 }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();

      // First render
      const { result, unmount } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      unmount();

      // Second render with same parameters - should use cache
      const { result: result2 } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result2.current.loading).toBe(false));

      // Should still be 1 call (cached)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result2.current.predictions).toEqual(mockResponse.predictions);
    });

    it('should fetch new data when query key changes', async () => {
      const mockResponse1 = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Sea Bass', confidence: 85 }],
      };

      const mockResponse2 = {
        rectangleCode: '32F2',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Cod', confidence: 75 }],
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse1 })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse2 });

      const queryClient = createTestQueryClient();

      const { result, rerender } = renderHook(
        (props: UseFishingPredictionsOptions) => useFishingPredictions(props),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { rectangleCode: '31F1' } as UseFishingPredictionsOptions,
        }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.predictions).toEqual(mockResponse1.predictions);

      // Change rectangle code
      rerender({ rectangleCode: '32F2' });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.predictions).toEqual(mockResponse2.predictions);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should support manual refetch via reload()', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Sea Bass', confidence: 85 }],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();

      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Manual reload
      result.current.reload();

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(mockFetch).toHaveBeenCalledTimes(2); // Should refetch
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty predictions array', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.predictions).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle response without metadata', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Mackerel', confidence: 70 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();
      const { result } = renderHook(
        () => useFishingPredictions({ rectangleCode: '31F1' }),
        { wrapper: createWrapper(queryClient) }
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.predictions).toEqual(mockResponse.predictions);
      expect(result.current.lastUpdated).toBeUndefined();
      expect(result.current.region).toBeUndefined();
    });

    it('should transition from enabled=false to enabled=true', async () => {
      const mockResponse = {
        rectangleCode: '31F1',
        predictionDate: '2025-10-19',
        language: 'en',
        predictions: [{ species_common_name: 'Plaice', confidence: 60 }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const queryClient = createTestQueryClient();

      const { result, rerender } = renderHook(
        (props: UseFishingPredictionsOptions) => useFishingPredictions(props),
        {
          wrapper: createWrapper(queryClient),
          initialProps: { rectangleCode: '31F1', enabled: false } as UseFishingPredictionsOptions,
        }
      );

      // Initially not fetching
      expect(result.current.loading).toBe(false);
      expect(result.current.predictions).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();

      // Enable fetching
      rerender({ rectangleCode: '31F1', enabled: true });

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.predictions).toEqual(mockResponse.predictions);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
