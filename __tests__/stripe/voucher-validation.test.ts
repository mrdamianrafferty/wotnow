/**
 * Tests for Voucher Validation API
 */

import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/vouchers/validate';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn(),
  })),
}));

describe('/api/vouchers/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Method not allowed',
    });
  });

  it('should require voucher code', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userId: 'user-123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Voucher code is required',
    });
  });

  it('should require user ID', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        voucherCode: 'TEST123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'User ID is required',
    });
  });

  it('should validate voucher code format', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        voucherCode: 123, // Invalid type
        userId: 'user-123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should call RPC function with correct parameters', async () => {
    const { createClient } = require('@supabase/supabase-js');
    const mockRpc = jest.fn().mockResolvedValue({
      data: { valid: true, discount_value: 25 },
      error: null,
    });

    createClient.mockReturnValue({
      rpc: mockRpc,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        voucherCode: 'EARLYBIRD25',
        userId: 'user-123',
      },
    });

    await handler(req, res);

    expect(mockRpc).toHaveBeenCalledWith('validate_voucher', {
      voucher_code_input: 'EARLYBIRD25',
      user_id_input: 'user-123',
    });
  });

  it('should return validation result on success', async () => {
    const { createClient } = require('@supabase/supabase-js');
    const mockRpc = jest.fn().mockResolvedValue({
      data: {
        valid: true,
        voucher_id: 'voucher-123',
        discount_type: 'percentage',
        discount_value: 25,
        description: '25% off',
      },
      error: null,
    });

    createClient.mockReturnValue({
      rpc: mockRpc,
    });

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        voucherCode: 'EARLYBIRD25',
        userId: 'user-123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.valid).toBe(true);
    expect(data.discount_value).toBe(25);
  });
});
