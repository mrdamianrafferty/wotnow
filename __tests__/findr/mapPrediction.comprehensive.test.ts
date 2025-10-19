/**
 * Comprehensive tests for mapPrediction.ts
 * Tests species image resolution, aliasing, environmental factor extraction,
 * and confidence score calculations
 *
 * Generated with AI assistance following QA Test Plan Phase 2
 */

import { describe, it, expect } from '@jest/globals';
import { mapPrediction, type CardData } from '../../lib/findr/mapPrediction';
import type { FishingPrediction } from '../../hooks/useFishingPredictions';

describe('mapPrediction', () => {
  describe('Species Image Resolution', () => {
    it('should resolve image by species code (exact match)', () => {
      const prediction: FishingPrediction = {
        species_code: 'BSS',
        species_common_name: 'Sea Bass',
        confidence_percent: 85,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image).toBeDefined();
      expect(result?.image?.src).toContain('sea-bass');
      expect(result?.image?.alt).toBe('Sea Bass');
    });

    it('should resolve image by species code (case insensitive)', () => {
      const prediction: FishingPrediction = {
        species_code: 'bss', // lowercase
        species_common_name: 'Sea Bass',
        confidence_percent: 85,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image).toBeDefined();
      expect(result?.image?.src).toContain('sea-bass');
    });

    it('should resolve image by common name when code missing', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Sea Bass',
        confidence_percent: 75,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image).toBeDefined();
      expect(result?.image?.alt).toContain('Bass');
    });

    it('should resolve image by scientific name', () => {
      const prediction: FishingPrediction = {
        species_scientific_name: 'Dicentrarchus labrax',
        species_common_name: 'Sea Bass',
        confidence_percent: 70,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image).toBeDefined();
    });

    it('should handle species with no image gracefully', () => {
      const prediction: FishingPrediction = {
        species_code: 'NONEXISTENT',
        species_common_name: 'Mystery Fish',
        confidence_percent: 50,
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.image).toBeUndefined();
      expect(result?.commonName).toBe('Mystery Fish');
    });

    it('should include blur data URL when available', () => {
      const prediction: FishingPrediction = {
        species_code: 'BSS',
        species_common_name: 'Sea Bass',
        confidence_percent: 85,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image?.blurDataURL).toBeDefined();
      expect(result?.image?.blurDataURL).toMatch(/^data:image/);
    });

    it('should include mobile and thumb variants', () => {
      const prediction: FishingPrediction = {
        species_code: 'BSS',
        species_common_name: 'Sea Bass',
        confidence_percent: 85,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.image?.mobile).toBeDefined();
      expect(result?.image?.thumb).toBeDefined();
      expect(result?.image?.mobile).toContain('-mobile');
      expect(result?.image?.thumb).toContain('-thumb');
    });
  });

  describe('Confidence Score Parsing', () => {
    it('should parse confidence_percent field (0-100)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 87,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(87);
    });

    it('should parse environmental_score field (0-10) and convert to percentage', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        environmental_score: 7.5,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(75); // 7.5 * 10 = 75
    });

    it('should parse confidence as probability (0-1) and convert to percentage', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mackerel',
        confidence: 0.92,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(92); // 0.92 * 100
    });

    it('should round confidence to nearest integer', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Plaice',
        confidence_percent: 77.6,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(78); // Rounded up
    });

    it('should cap confidence at 100', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Bass',
        confidence_percent: 150, // Invalid high value
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(100);
    });

    it('should ignore negative confidence values', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: -10,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBeNull();
    });

    it('should return null for missing confidence', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Haddock',
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBeNull();
    });

    it('should prioritize confidence_percent over other fields', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Pollock',
        confidence_percent: 85,
        environmental_score: 7.0, // Should be ignored
        confidence: 0.9, // Should be ignored
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.confidence).toBe(85);
    });
  });

  describe('Environmental Rationale Generation', () => {
    it('should generate temperature rationale for optimal match', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Bass',
        confidence_percent: 90,
        temperature_match: 'optimal',
        factors: {
          temperature: { actual: 15, match: 'optimal', score: 100 }
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.rationale.length).toBeGreaterThan(0);
      expect(result?.rationale.some(r => r.includes('15°C') && r.includes('bang on'))).toBe(true);
    });

    it('should generate salinity rationale for acceptable match', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 70,
        salinity_match: 'acceptable',
        factors: {
          salinity: { actual: 33, match: 'acceptable', score: 70 }
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.rationale.some(r => r.includes('33 ppt') && r.includes('fine'))).toBe(true);
    });

    it('should generate substrate rationale for poor match', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Plaice',
        confidence_percent: 40,
        substrate_match: 'poor',
        factors: {
          substrate: { actual: 'rock', match: 'poor', score: 20 }
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.rationale).toBeDefined();
      expect(result?.rationale.some(r => r.toLowerCase().includes('rock bottom'))).toBe(true);
      expect(result?.rationale.some(r => r.toLowerCase().includes('really their thing'))).toBe(true);
    });

    it('should handle missing environmental factors gracefully', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mackerel',
        confidence_percent: 60,
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(Array.isArray(result?.rationale)).toBe(true);
    });
  });

  describe('Environmental Factors Extraction', () => {
    it('should extract temperature factors from JSONB', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 80,
        factors: {
          temperature: { actual: 12.5, match: 'optimal', score: 95 }
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.environmental_factors?.temperature).toBeDefined();
      expect(result?.environmental_factors?.temperature?.actual).toBe(12.5);
      expect(result?.environmental_factors?.temperature?.match).toBe('optimal');
      expect(result?.environmental_factors?.temperature?.score).toBe(95);
    });

    it('should extract all environmental factors', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Bass',
        confidence_percent: 88,
        data_freshness: 'fresh',
        weight_profile: 'pelagic',
        factors: {
          temperature: { actual: 15, match: 'optimal', score: 100 },
          salinity: { actual: 34, match: 'optimal', score: 98 },
          depth: { actual: 15, match: 'acceptable', score: 75 },
          substrate: { actual: 'sand', match: 'suitable', score: 80 },
          data_age_hours: 2,
          data_source: 'CMEMS'
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.environmental_factors?.temperature?.actual).toBe(15);
      expect(result?.environmental_factors?.salinity?.actual).toBe(34);
      expect(result?.environmental_factors?.depth?.actual).toBe(15);
      expect(result?.environmental_factors?.substrate?.actual).toBe('sand');
      expect(result?.environmental_factors?.data_age_hours).toBe(2);
      expect(result?.environmental_factors?.data_source).toBe('CMEMS');
      expect(result?.data_freshness).toBe('fresh');
      expect(result?.weight_profile).toBe('pelagic');
    });

    it('should handle missing factors object', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Pollock',
        confidence_percent: 65,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.environmental_factors).toBeUndefined();
    });
  });

  describe('Depth Range Formatting', () => {
    it('should format shallow depth range (<20m)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Flounder',
        confidence_percent: 70,
        depth_optimal_min: 2,
        depth_optimal_max: 15,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.depthRange).toContain('Shallow');
      expect(result?.depthRange).toContain('2-15m');
    });

    it('should format deep depth range (>50m)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Ling',
        confidence_percent: 75,
        depth_optimal_min: 60,
        depth_optimal_max: 120,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.depthRange).toContain('Deep');
      expect(result?.depthRange).toContain('60-120m');
    });

    it('should format mid-depth range (20-50m)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 80,
        depth_optimal_min: 25,
        depth_optimal_max: 45,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.depthRange).toBe('25-45m');
      expect(result?.depthRange).not.toContain('Shallow');
      expect(result?.depthRange).not.toContain('Deep');
    });

    it('should fall back to min/max when optimal not available', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Plaice',
        confidence_percent: 60,
        depth_min: 5,
        depth_max: 18,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.depthRange).toContain('Shallow');
      expect(result?.depthRange).toContain('5-18m');
    });

    it('should handle missing depth data', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mystery Fish',
        confidence_percent: 50,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.depthRange).toBeUndefined();
    });
  });

  describe('Seasonality Formatting', () => {
    it('should identify summer-autumn species (warm water)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mackerel',
        confidence_percent: 85,
        temp_optimal_min: 16,
        temp_optimal_max: 20,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.seasonality).toBe('Summer-Autumn');
    });

    it('should identify winter-spring species (cold water)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 78,
        temp_optimal_min: 4,
        temp_optimal_max: 10,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.seasonality).toBe('Winter-Spring');
    });

    it('should identify year-round species (wide temp range)', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Bass',
        confidence_percent: 80,
        temp_optimal_min: 8,
        temp_optimal_max: 20, // >10°C range
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.seasonality).toBe('Year-round');
    });

    it('should use explicit season field when available', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Herring',
        confidence_percent: 70,
        best_season: 'Autumn-Winter',
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.seasonality).toBe('Autumn-Winter');
    });

    it('should default to year-round when no temp data', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Unknown Fish',
        confidence_percent: 50,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.seasonality).toBe('Year-round');
    });
  });

  describe('Habitat Type Formatting', () => {
    it('should format pelagic habitat', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mackerel',
        confidence_percent: 85,
        weight_profile: 'pelagic',
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.habitatType).toBe('Open water');
    });

    it('should format reef habitat', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Wrasse',
        confidence_percent: 75,
        weight_profile: 'reef_kelp',
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.habitatType).toBe('Rocky reefs & kelp');
    });

    it('should format habitat from substrate when profile missing', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Plaice',
        confidence_percent: 70,
        substrate_preferred: 'sand',
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.habitatType).toBe('Sandy bottom');
    });

    it('should default to coastal waters', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Unknown',
        confidence_percent: 50,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.habitatType).toBe('Coastal waters');
    });
  });

  describe('Species Emoji Selection', () => {
    it('should assign 🐟 emoji for common fish', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Atlantic Cod',
        confidence_percent: 80,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🐟');
    });

    it('should assign 🦑 emoji for squid/cuttlefish', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Common Cuttlefish',
        confidence_percent: 65,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🦑');
    });

    it('should assign 🪱 emoji for eels', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Conger Eel',
        confidence_percent: 70,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🪱');
    });

    it('should assign 🛸 emoji for rays', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Thornback Ray',
        confidence_percent: 60,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🛸');
    });

    it('should assign 🦈 emoji for sharks', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Smooth Hound Shark',
        confidence_percent: 55,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🦈');
    });

    it('should default to 🐟 for unknown species', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mystery Species',
        confidence_percent: 40,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.emoji).toBe('🐟');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle completely empty prediction object', () => {
      const prediction: FishingPrediction = {};

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.commonName).toBe('Unidentified species');
      expect(result?.id).toMatch(/^species-/);
      expect(result?.confidence).toBeNull();
    });

    it('should handle null/undefined values gracefully', () => {
      const prediction: FishingPrediction = {
        species_code: null,
        species_common_name: undefined,
        confidence_percent: null,
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.commonName).toBe('Unidentified species');
    });

    it('should handle malformed JSONB factors', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 70,
        factors: 'invalid json' as any, // Malformed
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.environmental_factors).toBeUndefined();
    });

    it('should generate unique IDs for multiple unknown species', () => {
      const prediction1: FishingPrediction = { confidence_percent: 50 };
      const prediction2: FishingPrediction = { confidence_percent: 60 };

      const result1 = mapPrediction(prediction1, 0);
      const result2 = mapPrediction(prediction2, 1);

      expect(result1?.id).not.toBe(result2?.id);
    });

    it('should sanitize species ID to create valid HTML ID', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Fish With Spaces & Special!Chars',
        confidence_percent: 70,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.id).toMatch(/^[a-z0-9-]+$/); // Only lowercase, numbers, hyphens
      expect(result?.id).not.toContain(' ');
      expect(result?.id).not.toContain('&');
      expect(result?.id).not.toContain('!');
    });

    it('should handle very long species names', () => {
      const longName = 'A'.repeat(200);
      const prediction: FishingPrediction = {
        species_common_name: longName,
        confidence_percent: 60,
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.commonName).toBe(longName);
    });

    it('should handle special characters in species names', () => {
      const prediction: FishingPrediction = {
        species_common_name: "L'Empereur (Emperor's Fish)",
        confidence_percent: 75,
      };

      const result = mapPrediction(prediction, 0);

      expect(result).not.toBeNull();
      expect(result?.commonName).toBe("L'Empereur (Emperor's Fish)");
    });
  });

  describe('Advice & Localized Names', () => {
    it('should extract advice array from prediction', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Bass',
        confidence_percent: 85,
        advice: [
          {
            type: 'General',
            regions: 'UK Coast',
            best_time: 'Dawn and dusk',
            favourite_baits_and_natural_diet: 'Sandeels, crabs',
          }
        ]
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.advice).toBeDefined();
      expect(Array.isArray(result?.advice)).toBe(true);
      expect(result?.advice?.[0].favourite_baits_and_natural_diet).toBe('Sandeels, crabs');
    });

    it('should extract localized species names', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Sea Bass',
        confidence_percent: 80,
        localized_names: {
          fr: 'Bar commun',
          es: 'Lubina',
          de: 'Wolfsbarsch',
        }
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.localizedNames).toBeDefined();
      expect(result?.localizedNames?.fr).toBe('Bar commun');
      expect(result?.localizedNames?.es).toBe('Lubina');
      expect(result?.localizedNames?.de).toBe('Wolfsbarsch');
    });

    it('should handle missing localized names gracefully', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Cod',
        confidence_percent: 75,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.localizedNames).toBeUndefined();
    });
  });

  describe('Weather Score Integration', () => {
    it('should extract weather score', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Mackerel',
        confidence_percent: 88,
        weather_score: 92,
        current_wind_speed_ms: 5.2,
        current_pressure_hpa: 1015,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.weather_score).toBe(92);
      expect(result?.current_wind_speed_ms).toBe(5.2);
      expect(result?.current_pressure_hpa).toBe(1015);
    });

    it('should handle missing weather data', () => {
      const prediction: FishingPrediction = {
        species_common_name: 'Pollock',
        confidence_percent: 70,
      };

      const result = mapPrediction(prediction, 0);

      expect(result?.weather_score).toBeNull();
      expect(result?.current_wind_speed_ms).toBeNull();
      expect(result?.current_pressure_hpa).toBeNull();
    });
  });
});
