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

    // Mock default stats
    (fishIdService.getStats as jest.Mock).mockResolvedValue({
      aiAvailable: true,
      monthlyUsage: 2.5,
      monthlyBudget: 10,
      remainingBudget: 7.5,
      pricePerCall: 0.01,
      cacheSize: 5
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
      const { result } = renderHook(() => useFishIdentification());

      await waitFor(() => {
        expect(fishIdService.getStats).toHaveBeenCalled();
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

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

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
      (fishIdService.identify as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          species: mockSpecies[0],
          method: 'ai',
          confidence: 0.85,
          cost: 0.01
        }), 100))
      );

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

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      const initialCallCount = (fishIdService.getStats as jest.Mock).mock.calls.length;

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        // Stats should be called again after identification
        expect((fishIdService.getStats as jest.Mock).mock.calls.length).toBeGreaterThan(initialCallCount);
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

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

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
      const mockError = new Error('Identification failed');

      (fishIdService.identify as jest.Mock).mockRejectedValue(mockError);

      const { result } = renderHook(() => useFishIdentification({ onError }));
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(mockError);
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

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

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
        expect(fishIdService.identify).toHaveBeenCalledWith(
          mockImage,
          expect.objectContaining({
            location: contextParam.location,
            date: contextParam.date,
            depth: contextParam.depth,
            candidates: mockSpecies
          })
        );
      });
    });

    it('should use current date when date not provided', async () => {
      const mockResult = {
        species: mockSpecies[0],
        method: 'ai' as const,
        confidence: 0.85,
        cost: 0.01
      };

      (fishIdService.identify as jest.Mock).mockResolvedValue(mockResult);

      const { result } = renderHook(() => useFishIdentification());
      const mockImage = createMockImage();

      await act(async () => {
        await result.current.identify(mockImage, mockSpecies);
      });

      await waitFor(() => {
        const callArgs = (fishIdService.identify as jest.Mock).mock.calls[0][1];
        expect(callArgs.date).toBeInstanceOf(Date);
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
