// __tests__/helpers/testHelpers.ts
/**
 * Test helper utilities
 */

import { mockSupabaseClient, mockSupabaseQuery } from '../../__mocks__/@supabase/supabase-js';
import { mockSession, mockUser } from '../fixtures/mockData';

/**
 * Mock authenticated session for tests that require authentication
 */
export const mockAuthenticatedSession = () => {
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: mockSession },
    error: null,
  });

  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });
};

/**
 * Mock unauthenticated session (no user logged in)
 */
export const mockUnauthenticatedSession = () => {
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated', status: 401 },
  });
};

/**
 * Mock Supabase query response
 */
export const mockQueryResponse = (
  tableName: string,
  data: any,
  error: any = null
) => {
  mockSupabaseQuery(tableName, data, error);
};

/**
 * Mock Supabase error response
 */
export const mockQueryError = (tableName: string, errorMessage: string) => {
  mockSupabaseQuery(tableName, null, {
    message: errorMessage,
    code: '500',
    details: null,
    hint: null,
  });
};

/**
 * Reset all Supabase mocks to default state
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset to default unauthenticated state
  mockUnauthenticatedSession();
};

/**
 * Mock server-side Supabase client creation
 */
export const mockServerSupabaseClient = () => {
  jest.mock('../../../lib/supabase/serverClient', () => ({
    getSupabaseServerClient: jest.fn(() => mockSupabaseClient),
  }));
};

/**
 * Create mock request with headers
 */
export const createMockRequestWithAuth = (options: any = {}) => {
  return {
    ...options,
    headers: {
      ...options.headers,
      authorization: `Bearer ${mockSession.access_token}`,
      cookie: `sb-access-token=${mockSession.access_token}; sb-refresh-token=${mockSession.refresh_token}`,
    },
  };
};

/**
 * Wait for async operations in tests
 */
export const waitForAsync = () => new Promise((resolve) => setImmediate(resolve));
