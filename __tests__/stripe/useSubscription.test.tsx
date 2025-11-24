/**
 * Tests for useSubscription hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useSubscription } from '@/hooks/useSubscription';
import { createClient } from '@/lib/supabase/client';
import {
  getCachedSubscription,
  setCachedSubscription,
  clearCachedSubscription,
} from '@/lib/offline/subscriptionCache';

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/offline/subscriptionCache', () => ({
  getCachedSubscription: jest.fn(),
  setCachedSubscription: jest.fn(),
  clearCachedSubscription: jest.fn(),
}));

type SupabaseOverrides = {
  profileData?: Record<string, unknown> | null;
  profileError?: { message: string } | null;
  user?: { id: string } | null;
};

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetCachedSubscription = getCachedSubscription as jest.MockedFunction<typeof getCachedSubscription>;
const mockSetCachedSubscription = setCachedSubscription as jest.MockedFunction<typeof setCachedSubscription>;
const mockClearCachedSubscription = clearCachedSubscription as jest.MockedFunction<typeof clearCachedSubscription>;

function setupSupabaseMock(overrides: SupabaseOverrides = {}) {
  const user = overrides.user ?? { id: 'user-123' };
  const mockGetUser = jest.fn().mockResolvedValue({
    data: { user },
    error: null,
  });

  const mockSingle = jest.fn().mockResolvedValue({
    data: overrides.profileData ?? {
      subscription_status: 'premium',
      payment_platform: 'web',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      subscription_start_date: new Date().toISOString(),
      subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      trial_ends_at: null,
    },
    error: overrides.profileError ?? null,
  });

  const mockEq = jest.fn(() => ({ single: mockSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation(() => mockChannel),
    unsubscribe: jest.fn(),
  };

  mockCreateClient.mockReturnValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    channel: jest.fn(() => mockChannel),
  });

  return { mockGetUser, mockSingle, mockChannel };
}

describe('useSubscription hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReset();
    mockGetCachedSubscription.mockReset();
    mockSetCachedSubscription.mockReset();
    mockClearCachedSubscription.mockReset();
    mockGetCachedSubscription.mockResolvedValue(null);
  });

  it('should return loading state initially', () => {
    setupSupabaseMock();
    const { result } = renderHook(() => useSubscription());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.subscription).toBe(null);
  });

  it('should detect premium user correctly', async () => {
    setupSupabaseMock();

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.isTrial).toBe(false);
  });

  it('should detect trial user correctly', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setupSupabaseMock({
      profileData: {
        subscription_status: 'premium',
        payment_platform: 'web',
        trial_ends_at: futureDate,
      },
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPremium).toBe(true);
    expect(result.current.isTrial).toBe(true);
  });

  it('should detect free user correctly', async () => {
    setupSupabaseMock({
      profileData: {
        subscription_status: 'free',
        payment_platform: 'web',
      },
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isPremium).toBe(false);
    expect(result.current.isTrial).toBe(false);
  });

  it('should use cached subscription first', async () => {
    mockGetCachedSubscription.mockResolvedValue({
      userId: 'user-123',
      subscriptionStatus: 'premium',
      paymentPlatform: 'web',
    });

    setupSupabaseMock();

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.subscription).not.toBe(null);
    });

    expect(mockGetCachedSubscription).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    setupSupabaseMock({
      profileData: null,
      profileError: { message: 'Database error' },
    });

    const { result } = renderHook(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.subscription).toBe(null);
  });
});
