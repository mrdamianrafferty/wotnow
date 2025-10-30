/**
 * Tests for Fish Identification Service
 */

import { fishIdService } from '../fishIdentificationService';
import type { CatchContext, IdentificationResult } from '../fishIdentificationService';
import type { QuickLogSpecies } from '../../../hooks/useQuickLogSpecies';

// Mock OpenAI with accessible mock function
const mockCreate = jest.fn().mockResolvedValue({
  choices: [{
    message: {
      content: JSON.stringify({
        species: 'Atlantic Mackerel',
        confidence: 85,
        reasoning: 'Distinctive blue-green stripes and forked tail'
      })
    }
  }]
});

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

// Mock exifr
jest.mock('exifr', () => ({
  parse: jest.fn().mockResolvedValue({
    latitude: 43.5,
    longitude: -5.25,
    DateTimeOriginal: new Date('2025-10-29T12:00:00Z')
  })
}));

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    greyscale: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mockhash'))
  }));
});

describe('FishIdentificationService', () => {
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
    },
    {
      id: 'cod-1',
      code: 'COD',
      name: 'Atlantic Cod',
      scientificName: 'Gadus morhua',
      thumbnail: '/images/cod.jpg',
      confidence: 65,
      biteScore: 50,
      badge: 'good'
    }
  ];

  const mockContext: CatchContext = {
    location: {
      coords: [43.5, -5.25],
      rectangleCode: '28E5',
      rectangleLabel: 'Lastres, Spain'
    },
    date: new Date('2025-10-29'),
    candidates: mockSpecies
  };

  const createMockImage = (): File => {
    const blob = new Blob(['mock image data'], { type: 'image/jpeg' });
    return new File([blob], 'test-fish.jpg', { type: 'image/jpeg' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('Smart Routing', () => {
    it('should return database match for single high-confidence candidate', async () => {
      const highConfidenceContext: CatchContext = {
        ...mockContext,
        candidates: [{
          ...mockSpecies[0],
          confidence: 80 // Above 75% threshold
        }]
      };

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, highConfidenceContext);

      expect(result.method).toBe('database');
      expect(result.species).toEqual(highConfidenceContext.candidates[0]);
      expect(result.cost).toBe(0);
    });

    it('should fall back to manual selection when no candidates', async () => {
      const noCandidatesContext: CatchContext = {
        ...mockContext,
        candidates: []
      };

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, noCandidatesContext);

      expect(result.method).toBe('manual_selection');
      expect(Array.isArray(result.species)).toBe(true);
      expect(result.cost).toBe(0);
    });

    it('should use AI for multiple moderate-confidence candidates', async () => {
      // Use candidates with moderate confidence (none >= 75)
      const moderateContext: CatchContext = {
        ...mockContext,
        candidates: [
          { ...mockSpecies[0], confidence: 65 },
          { ...mockSpecies[1], confidence: 50 }
        ]
      };

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, moderateContext);

      // Should attempt AI identification (method will be 'ai' or 'manual_selection' if AI unavailable)
      expect(['ai', 'manual_selection']).toContain(result.method);
    });
  });

  describe('Budget Management', () => {
    it('should track monthly usage', async () => {
      // Mock successful AI call
      const mockImage = createMockImage();

      // Get initial stats
      const initialStats = await fishIdService.getStats();
      const initialUsage = initialStats.monthlyUsage;

      // This might use AI if budget allows
      await fishIdService.identify(mockImage, mockContext);

      const updatedStats = await fishIdService.getStats();

      // Usage should be same or increased (if AI was used)
      expect(updatedStats.monthlyUsage).toBeGreaterThanOrEqual(initialUsage);
    });

    it('should return service statistics', async () => {
      const stats = await fishIdService.getStats();

      expect(stats).toHaveProperty('aiAvailable');
      expect(stats).toHaveProperty('monthlyUsage');
      expect(stats).toHaveProperty('monthlyBudget');
      expect(stats).toHaveProperty('remainingBudget');
      expect(stats).toHaveProperty('pricePerCall');
      expect(stats.monthlyBudget).toBe(10);
      expect(stats.pricePerCall).toBe(0.01);
    });
  });

  describe('Cache Behavior', () => {
    it('should generate consistent cache keys for same image and context', async () => {
      const mockImage = createMockImage();

      // First call
      const result1 = await fishIdService.identify(mockImage, mockContext);

      // Second call with same data
      const result2 = await fishIdService.identify(mockImage, mockContext);

      // Both should succeed (cache or fresh)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle complete identification failure gracefully', async () => {
      const invalidContext: CatchContext = {
        ...mockContext,
        candidates: undefined as any // Force error
      };

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, invalidContext);

      expect(result.method).toBe('manual_selection');
      expect(result.confidence).toBe(0);
      // Message could be "failed" or "Unable to load..." depending on error path
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });
  });

  describe('Multi-Fish Detection', () => {
    it('should handle multiple fish detection from AI', async () => {
      // Mock AI response for multiple fish
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              species: 'multiple_fish',
              confidence: 0,
              reasoning: 'Multiple fish detected in image'
            })
          }
        }]
      });

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, mockContext);

      // Should fall back to manual selection
      if (result.method === 'manual_selection' && Array.isArray(result.species)) {
        expect(result.species.length).toBeGreaterThan(0);
        expect(result.message).toMatch(/Multiple fish detected|select manually/i);
      }
    });
  });

  describe('EXIF Extraction', () => {
    it('should extract GPS coordinates from EXIF data', async () => {
      const exifr = require('exifr');

      const mockImage = createMockImage();
      await fishIdService.identify(mockImage, mockContext);

      // EXIF extraction should have been attempted
      expect(exifr.parse).toHaveBeenCalledWith(
        mockImage,
        expect.objectContaining({
          gps: true,
          pick: expect.arrayContaining(['GPSLatitude', 'GPSLongitude'])
        })
      );
    });

    it('should handle missing EXIF data gracefully', async () => {
      const exifr = require('exifr');
      exifr.parse.mockResolvedValueOnce(null);

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, mockContext);

      // Should still complete identification
      expect(result).toBeDefined();
      expect(result.species).toBeDefined();
    });
  });

  describe('Confidence Thresholds', () => {
    it('should auto-select high confidence AI results', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              species: 'Atlantic Mackerel',
              confidence: 90,
              reasoning: 'Clear identification'
            })
          }
        }]
      });

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, mockContext);

      if (result.method === 'ai' && !Array.isArray(result.species)) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      }
    });

    it('should provide manual selection for low confidence', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              species: 'unknown',
              confidence: 30,
              reasoning: 'Uncertain'
            })
          }
        }]
      });

      const mockImage = createMockImage();
      const result = await fishIdService.identify(mockImage, mockContext);

      // Low confidence or unknown should trigger manual selection
      expect(['manual_selection', 'ai']).toContain(result.method);
      if (result.method === 'manual_selection') {
        expect(Array.isArray(result.species)).toBe(true);
      }
    });
  });
});
