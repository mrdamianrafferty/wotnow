/**
 * Offline Storage Module
 *
 * Provides offline-first data storage and sync for mobile apps.
 */

// Database layers
export { offlineDb, type Plant, type CalendarEntry, type Species } from './database';

// Grow Daisy sync
export { growOfflineSync, type GrowSyncState } from './growSync';

// Mutation queue (persistent offline queue)
export { mutationQueue, type Mutation, type MutationType, type QueueState } from './mutationQueue';

// Image caching
export { imageCache } from './imageCache';
