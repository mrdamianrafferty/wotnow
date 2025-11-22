/**
 * Tests for useFishIdentification hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useFishIdentification } from '../useFishIdentification';
import { fishIdService } from '../../lib/findr/fishIdentificationService';
import type { QuickLogSpecies } from '../useQuickLogSpecies';

// Mock the service
jest.mock('../../lib/findr/fishIdentificationService', () => ({
  fishIdService: {
    identify: jest.fn(),
    getStats: jest.fn()
  }
}));

describe('useFishIdentification', () => {
  const mockSpecies: QuickLogSpecies[] = [
    {
      id: 'mac-1',
      code: 'MAC',
      name: 'Atlantic Mackerel',
      scientificName: 'Scomber scombrus',
      thumbnail: '/images/mackerel.jpg',
      confidence: 85,
      biteScore: 70,
      badge: 'hot'
    }
  ];

  const createMockImage = (): File => {
    const blob = new Blob(['mock image data'], { type: 'image/jpeg' });
    return new File([blob], 'test-fish.jpg', { type: 'image/jpeg' });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for stats endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/findr/identify-stats') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            aiAvailable: true,
            monthlyUsage: 2.5,
            monthlyBudget: 10,
            remainingBudget: 7.5,
            pricePerCall: 0.01,
            cacheSize: 5
          })
        });
      }
      return Promise.reject(new Error('Unhandled fetch call: ' + url));
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', async () => {
      const { result } = renderHook(() => useFishIdentification());

      expect(result.current.isIdentifying).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for stats to load
      await waitFor(() => {
        expect(result.current.stats).not.toBeNull();
      });
    });

    it('should load service stats on mount', async () => {
      // Mock fetch for stats endpoint
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());

      await waitFor(() => {
        expect(result.current.stats).toEqual({
          aiAvailable: true,
          monthlyUsage: 2.5,
          monthlyBudget: 10,
          remainingBudget: 7.5,
          pricePerCall: 0.01,
          cacheSize: 5
        });
      });
    });
  });

  describe('Identification Flow', () => {
    it('should successfully identify a fish', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01,
        reasoning: 'Clear identification'
      };

      // Mock fetch for both endpoints
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(result.current.isIdentifying).toBe(false);
        expect(result.current.result).toEqual(mockResult);
        expect(result.current.error).toBeNull();
      });
    });

    it('should set isIdentifying during identification', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      // Mock fetch with delay to test isIdentifying state
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          return new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          }), 100));
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      act(() => {
        result.current.identify(mockImage, mockSpecies);
      });

      // Should be identifying
      expect(result.current.isIdentifying).toBe(true);

      await waitFor(() => {
        expect(result.current.isIdentifying).toBe(false);
      });
    });

    it('should update stats after successful identification', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      let statsCallCount = 0;

      // Mock fetch to track stats calls
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          statsCallCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      // Wait for initial stats load
      await waitFor(() => {
        expect(result.current.stats).not.toBeNull();
      });

      const initialStatsCallCount = statsCallCount;

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        // Stats should be called again after identification
        expect(statsCallCount).toBeGreaterThan(initialStatsCallCount);
      });
    });
  });

  describe('Callbacks', () => {
    it('should call onSuccess callback on successful identification', async () => {
      const onSuccess = jest.fn();
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      // Mock fetch for successful identification
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification({ onSuccess }));
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockResult);
      });
    });

    it('should call onError callback on identification failure', async () => {
      const onError = jest.fn();

      // Mock fetch to fail
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Identification failed' })
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification({ onError }));
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle identification errors gracefully', async () => {
      (fishIdService.identify as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(result.current.isIdentifying).toBe(false);
        expect(result.current.error).toBeDefined();
        expect(result.current.result).toBeDefined();
        expect(result.current.result?.method).toBe('manual_selection');
      });
    });

    it('should provide fallback result on error', async () => {
      (fishIdService.identify as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(result.current.result).toEqual({
          species: mockSpecies.slice(0, 8),
          method: 'manual_selection',
          confidence: 0,
          cost: 0,
          message: 'Identification failed - please select manually'
        });
      });
    });
  });

  describe('Context Building', () => {
    it('should build correct context from parameters', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      let capturedFormData: FormData | null = null;

      // Mock fetch to capture FormData
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          capturedFormData = options?.body;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      const contextParam = {
        location: {
          coords: [43.5, -5.25] as [number, number],
          rectangleCode: '28E5',
          rectangleLabel: 'Lastres'
        },
        date: new Date('2025-10-29'),
        depth: 50
      };

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies, contextParam);
      });

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
        if (capturedFormData) {
          const dataString = capturedFormData.get('data') as string;
          const parsedData = JSON.parse(dataString);
          expect(parsedData.context.location).toEqual(contextParam.location);
          expect(parsedData.context.depth).toBe(contextParam.depth);
          expect(parsedData.candidates).toEqual(mockSpecies);
        }
      });
    });

    it('should use current date when date not provided', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      let capturedFormData: FormData | null = null;

      // Mock fetch to capture FormData
      (global.fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
        if (url === '/api/findr/identify-stats') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              aiAvailable: true,
              monthlyUsage: 2.5,
              monthlyBudget: 10,
              remainingBudget: 7.5,
              pricePerCall: 0.01,
              cacheSize: 5
            })
          });
        }
        if (url === '/api/findr/identify-fish') {
          capturedFormData = options?.body;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResult)
          });
        }
        return Promise.reject(new Error('Unhandled fetch call: ' + url));
      });

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
        if (capturedFormData) {
          const dataString = capturedFormData.get('data') as string;
          const parsedData = JSON.parse(dataString);
          // Date should be set (either provided date or current date)
          expect(parsedData.context.date).toBeDefined();
        }
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should reset state when reset is called', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      // Perform identification
      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isIdentifying).toBe(false);
    });
  });
});
