/**
 * Tests for Voucher Validation API
 */

import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/vouchers/validate';

// Track createClient calls to return different mocks for auth vs service role
const mockRpc = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: mockRpc,
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

function createAuthenticatedMocks(body: Record<string, unknown>) {
  return createMocks({
    method: 'POST',
    body,
    headers: {
      authorization: 'Bearer valid-token',
    },
  });
}

describe('/api/vouchers/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth succeeds
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    });
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

  it('should reject requests without auth', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        voucherCode: 'TEST123',
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should reject requests with invalid auth', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const { req, res } = createAuthenticatedMocks({
      voucherCode: 'TEST123',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should require voucher code', async () => {
    const { req, res } = createAuthenticatedMocks({});

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Voucher code is required',
    });
  });

  it('should validate voucher code format', async () => {
    const { req, res } = createAuthenticatedMocks({
      voucherCode: 123, // Invalid type
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });

  it('should call RPC function with correct parameters', async () => {
    mockRpc.mockResolvedValue({
      data: { valid: true, discount_value: 25 },
      error: null,
    });

    const { req, res } = createAuthenticatedMocks({
      voucherCode: 'EARLYBIRD25',
    });

    await handler(req, res);

    expect(mockRpc).toHaveBeenCalledWith('validate_voucher', {
      voucher_code_input: 'EARLYBIRD25',
      user_id_input: 'user-123',
    });
  });

  it('should return validation result on success', async () => {
    mockRpc.mockResolvedValue({
      data: {
        valid: true,
        voucher_id: 'voucher-123',
        discount_type: 'percentage',
        discount_value: 25,
        description: '25% off',
      },
      error: null,
    });

    const { req, res } = createAuthenticatedMocks({
      voucherCode: 'EARLYBIRD25',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.valid).toBe(true);
    expect(data.discount_value).toBe(25);
  });
});
