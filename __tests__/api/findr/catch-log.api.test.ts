// __tests__/api/findr/catch-log.api.test.ts

/**
 * API Integration Tests for Findr Catch Log Endpoint
 * 
 * Tests the /api/findr/catch-log endpoint
 */

import { createMocks } from 'node-mocks-http';
import { mockUser } from '../../fixtures/mockData';

// Mock the Supabase module - must be before any imports that use it
jest.mock('@supabase/supabase-js');

import handler from '../../../pages/api/findr/catch-log';
import { mockSupabaseClient } from '../../../__mocks__/@supabase/supabase-js';
import * as supabaseJs from '@supabase/supabase-js';

// Set up createClient to return our mock
(supabaseJs.createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Mock auth.getUser for Bearer token authentication
  if (mockSupabaseClient.auth && mockSupabaseClient.auth.getUser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  }
  
  // Mock successful insert for catch logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertBuilder: any = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'catch-123',
        user_id: mockUser.id,
        species_id: 'COD',
        species_common_name: 'Atlantic Cod',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        logged_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'average',
        bait_used: 'Mackerel',
        followed_findr_advice: true,
      },
      error: null,
    }),
  };
  
  // Mock query builder for impression lookups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBuilder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    then: jest.fn((resolve) => 
      Promise.resolve({ data: [], error: null }).then(resolve)
    ),
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSupabaseClient.from as any).mockImplementation((table: string) => {
    if (table === 'findr_catch_entries') {
      return insertBuilder;
    }
    if (table === 'findr_prediction_impressions') {
      return queryBuilder;
    }
    return insertBuilder;
  });
});

describe('POST /api/findr/catch-log', () => {
  it('should return 405 for non-POST and non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });

  it('should return 401 if authorization header is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        // No authorization header
      },
      body: {
        species_id: 'COD',
        rectangle_code: '31E5',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
  });

  it('should return 400 if required fields are missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        // Missing required fields
        species_id: 'COD',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('Missing required fields');
  });

  it('should log a successful catch with all required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'COD',
        species_common_name: 'Atlantic Cod',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'average',
        bait_used: 'Mackerel',
        followed_findr_advice: true,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('catch');
    expect(data.catch).toHaveProperty('id');
  });

  it('should accept optional weight and length', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'COD',
        species_common_name: 'Atlantic Cod',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'large',
        bait_used: 'Mackerel',
        followed_findr_advice: true,
        weight_kg: 3.2,
        length_cm: 50,
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should accept optional method and habitat_type', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'BSS',
        species_common_name: 'European Bass',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'average',
        bait_used: 'Lure',
        followed_findr_advice: true,
        method: 'shore',
        habitat_type: 'rocky',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should accept optional GPS coordinates', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'MAC',
        species_common_name: 'Atlantic Mackerel',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 5,
        size_category: 'mixed',
        bait_used: 'Feathers',
        followed_findr_advice: false,
        gps_latitude: 50.123,
        gps_longitude: -5.456,
        location_accuracy: 10,
        location_source: 'gps',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should accept notes field', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'BSS',
        species_common_name: 'European Bass',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'large',
        bait_used: 'Live Prawn',
        followed_findr_advice: true,
        notes: 'Great fight! Caught on outgoing tide.',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should accept environmental conditions', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'COD',
        species_common_name: 'Atlantic Cod',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'average',
        bait_used: 'Squid',
        followed_findr_advice: true,
        environmental_conditions: {
          sea_temp: 12.5,
          tide_phase: 'high',
          wind_speed: 10,
          wave_height: 1.2,
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should accept photo URLs', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
      },
      body: {
        species_id: 'BSS',
        species_common_name: 'European Bass',
        rectangle_code: '31E5',
        caught_at: new Date().toISOString(),
        quantity: 1,
        size_category: 'large',
        bait_used: 'Lure',
        followed_findr_advice: true,
        photo_urls: ['https://storage.example.com/catches/photo123.jpg'],
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
  });

  it('should handle multiple catches with different species', async () => {
    const species = [
      { id: 'COD', name: 'Atlantic Cod' },
      { id: 'MAC', name: 'Atlantic Mackerel' },
      { id: 'POL', name: 'Pollock' },
    ];

    for (const sp of species) {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer test-token',
        },
        body: {
          species_id: sp.id,
          species_common_name: sp.name,
          rectangle_code: '31E5',
          caught_at: new Date().toISOString(),
          quantity: 1,
          size_category: 'average',
          bait_used: 'Mackerel',
          followed_findr_advice: true,
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(201);
    }
  });
});

describe('GET /api/findr/catch-log', () => {
  it('should retrieve user catch history', async () => {
    // Mock successful query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryBuilder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'catch-1',
            species_id: 'COD',
            species_common_name: 'Atlantic Cod',
            rectangle_code: '31E5',
            caught_at: new Date().toISOString(),
            logged_at: new Date().toISOString(),
            quantity: 1,
            size_category: 'average',
            bait_used: 'Mackerel',
            followed_findr_advice: true,
            used_recommended_bait: true,
            used_recommended_habitat: false,
            prediction_impression_id: null,
            photo_urls: null,
          },
        ],
        error: null,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockSupabaseClient.from as any).mockImplementation(() => queryBuilder);

    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer test-token',
      },
      query: {
        limit: '10',
        offset: '0',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('catches');
    expect(Array.isArray(data.catches)).toBe(true);
  });
});
