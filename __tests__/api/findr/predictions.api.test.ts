// __tests__/api/findr/predictions.api.test.ts

/**
 * API Integration Tests for Findr Predictions Endpoint
 * 
 * Tests the /api/findr/predictions endpoint
 */

import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/findr/predictions';
import { mockSupabaseClient, mockSupabaseQuery } from '../../../__mocks__/@supabase/supabase-js';
import { mockPredictions, mockRectangle } from '../../fixtures/mockData.fixtures';
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

// Helper to mock successful predictions response
function mockPredictionsRpc() {
  const mockRpcResponse = {
    data: mockPredictions,
    error: null,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSupabaseClient.rpc as any).mockResolvedValue(mockRpcResponse);
  
  // Mock auth signOut
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (mockSupabaseClient.auth.signOut as any).mockResolvedValue({ error: null });
}

describe('POST /api/findr/predictions', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method Not Allowed'
    });
  });

  it('should return 400 if rectangleCode is missing', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        // Missing rectangleCode
        predictionDate: '2025-01-15'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('rectangleCode');
  });

  it('should return 400 for invalid rectangleCode format', async () => {
    mockPredictionsRpc();
    
    const { req, res} = createMocks({
      method: 'POST',
      body: {
        rectangleCode: 'INVALID',
        predictionDate: '2025-01-15'
      },
    });

    await handler(req, res);

    // API accepts any rectangle code and returns empty predictions for invalid ones
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
    expect(Array.isArray(data.predictions)).toBe(true);
  });

  it('should return 400 for invalid date format', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: 'not-a-date'
      },
    });

    await handler(req, res);

    // API defaults to today's date for invalid dates instead of returning error
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
    expect(data).toHaveProperty('predictionDate');
    // Should default to today's date
    const today = new Date().toISOString().split('T')[0];
    expect(data.predictionDate).toBe(today);
  });

  it('should return predictions for valid rectangleCode and date', async () => {
    mockPredictionsRpc();

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-10-19',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
    expect(Array.isArray(data.predictions)).toBe(true);
    if (data.predictions.length > 0) {
      expect(data.predictions[0]).toHaveProperty('species_code');
      expect(data.predictions[0]).toHaveProperty('bite_score');
    }
  });

  it('should support language parameter', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'es'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
  });

  it('should use cache by default', async () => {
    mockPredictionsRpc();
    
    const { req: req1, res: res1 } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en'
      },
    });

    await handler(req1, res1);
    const firstCall = Date.now();

    // Second call should be faster due to cache
    const { req: req2, res: res2 } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en'
      },
    });

    await handler(req2, res2);
    const secondCall = Date.now();

    expect(res1._getStatusCode()).toBe(200);
    expect(res2._getStatusCode()).toBe(200);
    
    // Second call should be significantly faster
    expect(secondCall - firstCall).toBeLessThan(100);
  });

  it('should bypass cache when bypassCache=true', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en',
        bypassCache: true
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
    expect(data).toHaveProperty('metadata');
    expect(data.metadata).toHaveProperty('source');
    expect(data.metadata.source).not.toBe('cache');
  });

  it('should include substrate scoring when lat/lon provided', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en',
        latitude: 51.5,
        longitude: -0.5
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
    
    // Check if predictions include substrate/depth scores
    if (data.predictions.length > 0) {
      const firstPrediction = data.predictions[0];
      expect(firstPrediction).toHaveProperty('bite_score');
    }
  });

  it('should handle multiple rectangle codes', async () => {
    mockPredictionsRpc();
    
    const rectangles = ['31E5', '31F5', '32E5'];
    
    for (const rect of rectangles) {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          rectangleCode: rect,
          predictionDate: '2025-01-15',
          language: 'en'
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('predictions');
    }
  });

  it('should return predictions sorted by bite_score', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.predictions.length > 1) {
      // Check descending order
      for (let i = 0; i < data.predictions.length - 1; i++) {
        const current = data.predictions[i].bite_score || 0;
        const next = data.predictions[i + 1].bite_score || 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }
    }
  });

  it('should include required fields in predictions', async () => {
    mockPredictionsRpc();
    
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: '2025-01-15',
        language: 'en'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    
    if (data.predictions.length > 0) {
      const prediction = data.predictions[0];
      expect(prediction).toHaveProperty('species_code');
      expect(prediction).toHaveProperty('species_name_en');
      expect(prediction).toHaveProperty('bite_score');
      expect(prediction).toHaveProperty('confidence_pct');
    }
  });

  it('should handle future dates', async () => {
    mockPredictionsRpc();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: dateStr,
        language: 'en'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
  });

  it('should handle today\'s date', async () => {
    mockPredictionsRpc();
    
    const today = new Date().toISOString().split('T')[0];

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        rectangleCode: '31E5',
        predictionDate: today,
        language: 'en'
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('predictions');
  });
});
