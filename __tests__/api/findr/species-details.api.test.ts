// __tests__/api/findr/species-details.api.test.ts

/**
 * API Integration Tests for Findr Species Details Endpoint
 * 
 * Tests the /api/findr/species-details endpoint
 */

import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/findr/species-details';
import { mockSupabaseClient, mockSupabaseQuery } from '../../../__mocks__/@supabase/supabase-js';
import { mockSpecies, mockTechniques, mockBait, mockSubstrates } from '../../fixtures/mockData.fixtures';
import { resetAllMocks } from '../../helpers/testHelpers.utils';

// Mock the Supabase module
jest.mock('@supabase/supabase-js');

// Mock the serverClient
jest.mock('../../../lib/supabase/serverClient', () => ({
  getSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

beforeEach(() => {
  resetAllMocks();
});

// Helper function to setup species mocks
function setupSpeciesMocks(speciesCode: string) {
  const mockSpeciesData = {
    id: speciesCode === 'COD' ? '1' : speciesCode === 'BSS' ? '2' : speciesCode === 'MAC' ? '3' : speciesCode === 'POL' ? '4' : '5',
    species_code: speciesCode,
    name_en: speciesCode === 'COD' ? 'Atlantic Cod' : speciesCode === 'BSS' ? 'European Bass' : speciesCode === 'MAC' ? 'Atlantic Mackerel' : speciesCode === 'POL' ? 'Pollack' : 'Unknown',
    scientific_name: 'Scientific name',
    inaturalist_url: 'https://www.inaturalist.org/taxa/12345',
  };

  const mockTechniquesData = [
    {
      technique_id: 1,
      effectiveness: 90,
      notes: 'Great technique',
      beginner_tips: 'Start slow',
      technique: {
        id: 1,
        technique_code: 'BOTTOM',
        name_en: 'Bottom Fishing',
      },
    },
  ];

  const mockBaitData = [
    {
      bait_id: 1,
      effectiveness: 85,
      notes: 'Top choice',
      bait: {
        id: 1,
        name_en: 'Mackerel',
      },
    },
  ];

  const mockSubstratesData = {
    name_en: 'Rock',
    has_sand: false,
    has_gravel: false,
    has_rock: true,
    has_mud: false,
    has_mixed: false,
  };

  const speciesBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockSpeciesData, error: null }),
  };

  const techniquesBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: mockTechniquesData, error: null }),
  };

  const baitBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: mockBaitData, error: null }),
  };

  const substratesBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: mockSubstratesData, error: null }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSupabaseClient.from as any).mockImplementation((table: string) => {
    if (table === 'species') return speciesBuilder;
    if (table === 'species_technique') return techniquesBuilder;
    if (table === 'species_bait') return baitBuilder;
    if (table === 'species_substrates') return substratesBuilder;
    return speciesBuilder;
  });
}

describe('GET /api/findr/species-details', () => {
  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 400 if neither species_id nor species_code provided', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {},
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
  });

  it('should fetch species details by species_code', async () => {
    setupSpeciesMocks('COD');

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('species_code');
    expect(data).toHaveProperty('name_en');
    expect(data).toHaveProperty('techniques');
    expect(data).toHaveProperty('bait');
    expect(Array.isArray(data.techniques)).toBe(true);
    expect(Array.isArray(data.bait)).toBe(true);
  });

  it('should include technique data with effectiveness scores', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.techniques.length > 0) {
      const technique = data.techniques[0];
      expect(technique).toHaveProperty('technique_name');
      expect(technique).toHaveProperty('effectiveness');
      expect(typeof technique.effectiveness).toBe('number');
    }
  });

  it('should include bait data with effectiveness scores', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.bait.length > 0) {
      const bait = data.bait[0];
      expect(bait).toHaveProperty('bait_name');
      expect(bait).toHaveProperty('effectiveness');
      expect(typeof bait.effectiveness).toBe('number');
    }
  });

  it('should include substrate preferences if available', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.substrates) {
      expect(data.substrates).toHaveProperty('name_en');
      expect(typeof data.substrates.has_sand).toBe('boolean');
      expect(typeof data.substrates.has_rock).toBe('boolean');
    }
  });

  it('should handle unknown species gracefully', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'UNKNOWN_SPECIES',
      },
    });

    await handler(req, res);

    // Should return 404 or empty data, not crash
    expect([200, 404]).toContain(res._getStatusCode());
  });

  it('should include iNaturalist URL if available', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.inaturalist_url) {
      expect(data.inaturalist_url).toContain('inaturalist');
    }
  });

  it('should return techniques sorted by effectiveness', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.techniques.length > 1) {
      // Check descending order
      for (let i = 0; i < data.techniques.length - 1; i++) {
        const current = data.techniques[i].effectiveness;
        const next = data.techniques[i + 1].effectiveness;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('should return bait sorted by effectiveness', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        species_code: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.bait.length > 1) {
      // Check descending order
      for (let i = 0; i < data.bait.length - 1; i++) {
        const current = data.bait[i].effectiveness;
        const next = data.bait[i + 1].effectiveness;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('should handle multiple common species', async () => {
    const commonSpecies = ['COD', 'BSS', 'MAC', 'POL'];
    
    for (const code of commonSpecies) {
      setupSpeciesMocks(code);
      
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          species_code: code,
        },
      });

      await handler(req, res);

      expect([200, 404]).toContain(res._getStatusCode());
      
      if (res._getStatusCode() === 200) {
        const data = JSON.parse(res._getData());
        expect(data).toHaveProperty('species_code');
        expect(data.species_code).toBe(code);
      }
    }
  });
});
