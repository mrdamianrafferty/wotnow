/**
 * Tests for Subscription Cache
 */

import {
  getCachedSubscription,
  setCachedSubscription,
  clearCachedSubscription,
} from '@/lib/offline/subscriptionCache';

// Mock IndexedDB
const mockIDB = {
  data: new Map<string, any>(),
  get: jest.fn((_, key) => Promise.resolve(mockIDB.data.get(key))),
  put: jest.fn((_, value) => {
    mockIDB.data.set(value.userId, value);
    return Promise.resolve();
  }),
  delete: jest.fn((_, key) => {
    mockIDB.data.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockIDB.data.clear();
    return Promise.resolve();
  }),
};

jest.mock('idb', () => ({
  openDB: jest.fn(() =>
    Promise.resolve({
      get: mockIDB.get,
      put: mockIDB.put,
      delete: mockIDB.delete,
      clear: mockIDB.clear,
    })
  ),
}));

describe('Subscription Cache', () => {
  beforeEach(() => {
    mockIDB.data.clear();
    jest.clearAllMocks();
  });

  describe('getCachedSubscription', () => {
    it('should return cached subscription if fresh', async () => {
      const now = Date.now();
      mockIDB.data.set('user-123', {
        userId: 'user-123',
        subscriptionStatus: 'premium',
        cachedAt: now,
      });

      const result = await getCachedSubscription('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        subscriptionStatus: 'premium',
        cachedAt: now,
      });
    });

    it('should return null if cache is stale', async () => {
      const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
      mockIDB.data.set('user-123', {
        userId: 'user-123',
        subscriptionStatus: 'premium',
        cachedAt: twentyFiveHoursAgo,
      });

      const result = await getCachedSubscription('user-123');

      expect(result).toBeNull();
      // Should also delete the stale cache
      expect(mockIDB.delete).toHaveBeenCalledWith('subscriptions', 'user-123');
    });

    it('should return null if no cache exists', async () => {
      const result = await getCachedSubscription('user-999');

      expect(result).toBeNull();
    });
  });

  describe('setCachedSubscription', () => {
    it('should cache subscription with timestamp', async () => {
      const dateBefore = Date.now();

      await setCachedSubscription({
        userId: 'user-123',
        subscriptionStatus: 'premium',
        paymentPlatform: 'web',
      });

      const dateAfter = Date.now();

      expect(mockIDB.put).toHaveBeenCalled();
      const cachedData = mockIDB.data.get('user-123');
      expect(cachedData.userId).toBe('user-123');
      expect(cachedData.subscriptionStatus).toBe('premium');
      expect(cachedData.cachedAt).toBeGreaterThanOrEqual(dateBefore);
      expect(cachedData.cachedAt).toBeLessThanOrEqual(dateAfter);
    });
  });

  describe('clearCachedSubscription', () => {
    it('should remove cached subscription', async () => {
      mockIDB.data.set('user-123', {
        userId: 'user-123',
        subscriptionStatus: 'premium',
      });

      await clearCachedSubscription('user-123');

      expect(mockIDB.delete).toHaveBeenCalledWith('subscriptions', 'user-123');
    });
  });
});
