/**
 * Go Daisy+ Subscription Status Cache (IndexedDB)
 *
 * Offline-first caching for subscription status with 24-hour TTL.
 * Reduces database queries and provides instant feedback on subscription state.
 *
 * @module lib/offline/goDaisySubscriptionCache
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { GoDaisyTier, GoDaisySubscriptionType } from '@/lib/godaisy/subscription';

interface GoDaisySubscriptionCacheSchema extends DBSchema {
  subscriptions: {
    key: string; // user_id
    value: {
      userId: string;
      tier: GoDaisyTier;
      subscriptionType: GoDaisySubscriptionType | null;
      stripeSubscriptionId: string | null;
      subscriptionStart: string | null;
      subscriptionEnd: string | null;
      cachedAt: number;
    };
  };
}

const DB_NAME = 'godaisy_subscription_cache';
const DB_VERSION = 1;
const STORE_NAME = 'subscriptions';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

let dbPromise: Promise<IDBPDatabase<GoDaisySubscriptionCacheSchema>> | null = null;

/**
 * Initialize or get the IndexedDB instance.
 */
async function getDB(): Promise<IDBPDatabase<GoDaisySubscriptionCacheSchema>> {
  // SSR guard
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is not available on the server');
  }

  if (!dbPromise) {
    dbPromise = openDB<GoDaisySubscriptionCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Get cached subscription status for a user.
 * Returns null if no cache exists or cache is stale (older than 24h).
 */
export async function getCachedGoDaisySubscription(userId: string) {
  try {
    const db = await getDB();
    const cached = await db.get(STORE_NAME, userId);

    if (!cached) return null;

    // Check if cache is stale
    const age = Date.now() - cached.cachedAt;
    if (age > CACHE_TTL_MS) {
      await db.delete(STORE_NAME, userId);
      return null;
    }

    return cached;
  } catch {
    // IndexedDB may not be available (SSR, private browsing, etc.)
    return null;
  }
}

/**
 * Update cached subscription status for a user.
 */
export async function setCachedGoDaisySubscription(data: {
  userId: string;
  tier: GoDaisyTier;
  subscriptionType: GoDaisySubscriptionType | null;
  stripeSubscriptionId: string | null;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
}) {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, {
      ...data,
      cachedAt: Date.now(),
    });
  } catch {
    // Silently fail - cache is a performance optimization, not a requirement
  }
}

/**
 * Clear cached subscription for a user.
 */
export async function clearCachedGoDaisySubscription(userId: string) {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, userId);
  } catch {
    // Silently fail
  }
}
