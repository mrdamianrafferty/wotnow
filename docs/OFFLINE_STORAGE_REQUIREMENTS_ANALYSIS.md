# Offline Storage Requirements Analysis

**Date:** January 6, 2025
**Purpose:** Enable Findr to function with degraded but useful service when offline
**Status:** Requirements Analysis & Architecture Design

---

## Executive Summary

Fishing often occurs in remote coastal areas with poor or no cellular coverage. To provide value in these scenarios, Findr must cache critical data locally and provide a gracefully degraded offline experience.

**Key Requirements:**
- ✅ **Lightweight:** Only essential data cached, intelligent compression
- ✅ **Functional:** Core features work offline (view predictions, log catches, access favorites)
- ✅ **Graceful:** Clear indicators when data is stale, smart fallbacks
- ✅ **Sync:** Queue offline actions, sync seamlessly when back online

**Target:** < 10MB initial cache, < 50MB with extensive usage

---

## Current State Analysis

### Data Flows

**1. Predictions API** (`/api/findr/predictions`)
- **Server Cache:** 3-hour TTL in Supabase (`findr_prediction_sessions`)
- **Client Cache:** React Query with 30min staleTime, 3h gcTime
- **Data Size:** ~50-100KB per rectangle/date combination
- **Contains:** Species predictions, environmental scores, rationale, metadata

**2. Species Data** (Supabase `species` table)
- **Current:** Fetched on-demand, no explicit caching
- **Data Size:** ~2KB per species × ~100 species = ~200KB total
- **Contains:** Names (6 languages), preferences, bios, images (URLs)

**3. Species Images** (`/public/PNGS/`)
- **Current:** Standard Next.js image optimization
- **Data Size:** Varies, typically 50-200KB per image
- **Count:** ~100 species images
- **Total:** ~5-20MB uncompressed

**4. ICES Rectangles** (Supabase `ices_rectangles`)
- **Current:** Fetched via dropdown hook
- **Data Size:** ~1KB per rectangle × ~500 rectangles = ~500KB
- **Contains:** Code, region, center coordinates, geometry

**5. User Favorites** (Supabase `user_favourites`)
- **Current:** React Query cache, localStorage backup
- **Data Size:** ~100 bytes per favorite × ~20 favorites = ~2KB

**6. Environmental Data** (Supabase `copernicus_data`)
- **Current:** Part of predictions API, server-cached
- **Data Size:** Included in predictions payload
- **Freshness:** Critical for accuracy

**7. Translation Cache** (Supabase `translation_cache`)
- **Current:** DeepL API with database caching
- **Data Size:** ~500 bytes per translation
- **Usage:** Already cached server-side

---

## Critical Offline Data (MUST HAVE)

### 1. Predictions (Last Downloaded)
**Priority:** 🔴 CRITICAL
**Rationale:** Core app functionality

**What to Cache:**
- Last downloaded predictions for user's recent locations
- Include full prediction payload (species, scores, rationale)
- Store metadata (fetch time, rectangle, date)

**Storage Strategy:**
```typescript
interface CachedPrediction {
  rectangleCode: string;
  predictionDate: string;
  language: string;
  predictions: FishingPrediction[];
  metadata: {
    fetchedAt: string; // ISO timestamp
    expiresAt: string; // ISO timestamp
    region: string | null;
    conditions: {
      tide: TideInfo | null;
      weather: { windSpeedMS: number | null; pressureHPA: number | null };
    };
  };
}
```

**Size Estimate:**
- ~75KB per rectangle/date
- Cache 5 recent locations = ~375KB
- Cache 3 days per location = ~1.1MB total

**TTL:** 24 hours (show as stale after 6 hours)

---

### 2. Species Reference Data
**Priority:** 🔴 CRITICAL
**Rationale:** Display species names, images, basic info offline

**What to Cache:**
- Species IDs, codes, names (all languages)
- Slugs for image lookup
- Scientific names
- Basic preferences (temperature range, depth, habitat)
- Guild classifications

**Storage Strategy:**
```typescript
interface CachedSpecies {
  id: string;
  code: string;
  slug: string;
  scientificName: string;
  names: {
    en: string;
    fr?: string;
    es?: string;
    de?: string;
    it?: string;
    pt?: string;
  };
  preferences: {
    tempMin: number;
    tempMax: number;
    depthMin: number;
    depthMax: number;
    habitat: string[];
    guild: string;
  };
  // Exclude: bios (large), advice (large)
}
```

**Size Estimate:**
- ~2KB per species
- 100 species = ~200KB

**TTL:** 7 days (relatively static)

---

### 3. Species Images (Thumbnails)
**Priority:** 🟡 HIGH
**Rationale:** Visual recognition of species

**What to Cache:**
- Thumbnail versions (200x200px, optimized)
- Only for species in user's favorites + recent predictions
- Progressive loading strategy

**Storage Strategy:**
- Use IndexedDB Blob storage
- WebP format for compression
- Generate thumbnails server-side

**Size Estimate:**
- ~15KB per thumbnail (WebP compressed)
- 20 species (favorites + recent) = ~300KB
- Full library (100 species) = ~1.5MB (optional)

**TTL:** 30 days

---

### 4. ICES Rectangles (Metadata Only)
**Priority:** 🟡 HIGH
**Rationale:** Location selection, basic mapping

**What to Cache:**
- Rectangle codes and regions
- Center coordinates
- **Exclude:** Full geometry (large, not needed offline)

**Storage Strategy:**
```typescript
interface CachedRectangle {
  code: string;
  region: string;
  centerLat: number;
  centerLon: number;
  // Exclude: geometry (PostGIS data)
}
```

**Size Estimate:**
- ~100 bytes per rectangle
- 500 rectangles = ~50KB

**TTL:** 30 days (static data)

---

### 5. User Favorites
**Priority:** 🔴 CRITICAL
**Rationale:** Core personalization feature

**What to Cache:**
- Species IDs/codes
- User's favorite list
- Already cached in localStorage

**Storage Strategy:**
- Continue using localStorage
- Sync with Supabase when online

**Size Estimate:**
- ~100 bytes per favorite
- 20 favorites = ~2KB

**TTL:** Never expires (synced when online)

---

### 6. Pending Catch Logs (Write Queue)
**Priority:** 🔴 CRITICAL
**Rationale:** Users must be able to log catches offline

**What to Cache:**
- Catch entry data waiting to sync
- Photos as Blobs
- Timestamp for ordering

**Storage Strategy:**
```typescript
interface PendingCatchLog {
  tempId: string; // Local UUID
  speciesId: string;
  rectangleCode: string;
  date: string;
  quantity: number;
  size: string | null;
  bait: string | null;
  habitat: string | null;
  notes: string | null;
  photos: Blob[]; // IndexedDB
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'error';
}
```

**Size Estimate:**
- ~10KB per log (without photos)
- ~500KB per photo × 5 photos = ~2.5MB
- 10 pending logs = ~25MB worst case

**TTL:** Until synced

---

## Nice-to-Have Offline Data

### 1. Species Bios & Advice
**Priority:** 🟢 MEDIUM
**Rationale:** Helpful but not essential

**Strategy:**
- Cache only for favorited species
- Full bios can be 1-2KB each
- ~10 favorites × 2KB = ~20KB

---

### 2. Tide Predictions
**Priority:** 🟢 MEDIUM
**Rationale:** Can be calculated client-side for common constituents

**Strategy:**
- Cache tide station data for user's locations
- Use harmonic constituents for client-side calculation
- ~5KB per station

---

### 3. Weather Forecasts
**Priority:** 🟢 LOW
**Rationale:** Quickly becomes stale

**Strategy:**
- Show last cached weather with age warning
- Don't actively cache beyond predictions payload

---

## Storage Technology Selection

### IndexedDB (Primary Storage)
**Use For:**
- Predictions data
- Species data
- Species images (Blobs)
- Pending catch logs with photos
- ICES rectangles

**Why:**
- Large storage quota (50MB-1GB depending on browser)
- Supports Blobs (images)
- Async API (doesn't block UI)
- Structured querying
- Persistent across sessions

**Implementation:**
- Use `idb` library (lightweight wrapper)
- Create multiple object stores
- Index by key fields (rectangleCode, speciesId, etc.)

---

### LocalStorage (Secondary Storage)
**Use For:**
- User favorites (already implemented)
- Notification tracking (already implemented)
- App settings/preferences
- Small metadata

**Why:**
- Simple synchronous API
- Already in use
- Good for small data (<10MB)

**Limitations:**
- 5-10MB limit
- Synchronous (can block)
- String-only (must serialize)

---

### Service Worker Cache (Asset Storage)
**Use For:**
- Static assets (CSS, JS, fonts)
- App shell (HTML structure)
- **NOT** for dynamic data

**Why:**
- Built for offline PWA support
- Handles HTTP caching
- Network-first/cache-first strategies

**Implementation:**
- Use Workbox (Next.js PWA plugin)
- Cache app shell and routes
- Don't duplicate API data storage

---

## Graceful Degradation Strategy

### Data Freshness Indicators

**Levels:**
1. **Fresh** (< 3 hours): Green indicator, full confidence
2. **Recent** (3-12 hours): Yellow indicator, "Data from X hours ago"
3. **Stale** (12-24 hours): Orange indicator, "Older data - check when online"
4. **Very Stale** (> 24 hours): Red indicator, "Data may be outdated"

**UI Components:**
```tsx
<DataFreshnessBadge
  fetchedAt="2025-01-06T10:00:00Z"
  offlineMode={true}
/>
```

---

### Feature Degradation Matrix

| Feature | Online | Offline | Degraded Behavior |
|---------|--------|---------|-------------------|
| **View Predictions** | ✅ Full | ✅ Cached | Show last downloaded with age warning |
| **View Favorites** | ✅ Synced | ✅ Local | Show local copy, sync indicator |
| **Log Catches** | ✅ Instant | ✅ Queued | Queue for sync, show "pending" badge |
| **View Catch History** | ✅ Full | ✅ Local | Show synced logs only |
| **Set Notifications** | ✅ Full | ✅ Local | Schedule locally, track in localStorage |
| **View Species Details** | ✅ Full | ⚠️ Partial | Show cached data, hide real-time conditions |
| **Change Location** | ✅ Full | ⚠️ Limited | Recent locations only, no search |
| **View Conditions** | ✅ Live | ❌ N/A | Show "Online required" message |
| **Share Predictions** | ✅ Full | ✅ Full | Native share works offline |
| **Camera/Photos** | ✅ Full | ✅ Full | Native camera works, queue upload |

---

### Offline Mode UI

**Banner:**
```tsx
<div className="alert alert-warning">
  <svg>...</svg>
  <span>You're offline. Viewing cached data from 2 hours ago.</span>
  <button>Retry Connection</button>
</div>
```

**Sync Status Indicator:**
```tsx
<div className="badge badge-warning">
  <Cloud size={12} className="mr-1" />
  3 catches pending sync
</div>
```

---

## Sync Strategy

### Sync Queue Architecture

**Queue Types:**
1. **Write Queue:** Catch logs, favorites changes, user edits
2. **Download Queue:** Missing species images, updated predictions

**Queue Implementation:**
```typescript
interface SyncQueueItem {
  id: string;
  type: 'catch_log' | 'favorite_add' | 'favorite_remove' | 'catch_pin';
  data: unknown;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}
```

---

### Sync Triggers

**Automatic:**
1. App comes back online (navigator.onLine event)
2. App brought to foreground (visibilitychange event)
3. User navigates to new page (if online)

**Manual:**
1. User taps "Sync Now" button
2. User pulls to refresh

---

### Sync Conflict Resolution

**Catch Logs:**
- **Strategy:** Last-write-wins, no conflicts (append-only)
- **Rationale:** Catch logs are immutable once created

**Favorites:**
- **Strategy:** Merge local and remote, deduplicate
- **Rationale:** Simple list, no complex state

**User Edits:**
- **Strategy:** Show conflict dialog if detected
- **Rationale:** Rare, user should decide

---

### Sync Progress UI

**During Sync:**
```tsx
<div className="toast toast-center toast-middle">
  <div className="alert alert-info">
    <span className="loading loading-spinner"></span>
    <span>Syncing 3 catches... (1 of 3)</span>
  </div>
</div>
```

**After Sync:**
```tsx
<div className="toast toast-end">
  <div className="alert alert-success">
    <svg>...</svg>
    <span>Synced successfully!</span>
  </div>
</div>
```

---

## Storage Size Budget

### Initial Download (First Launch)
| Data Type | Size | Priority |
|-----------|------|----------|
| Species Reference | 200KB | Critical |
| ICES Rectangles | 50KB | Critical |
| App Shell (Service Worker) | 500KB | Critical |
| **Total Initial** | **750KB** | |

### Per-Location Cache
| Data Type | Size | Priority |
|-----------|------|----------|
| Predictions (1 day) | 75KB | Critical |
| Species Images (20 thumbnails) | 300KB | High |
| **Total Per Location** | **375KB** | |

### Maximum Usage (Power User)
| Data Type | Size | Limit |
|-----------|------|-------|
| Predictions (5 locations × 3 days) | 1.1MB | Critical |
| Species Images (full library) | 1.5MB | Optional |
| Species Reference | 200KB | Critical |
| ICES Rectangles | 50KB | Critical |
| Pending Catch Logs | 25MB | Critical |
| **Total Maximum** | **~28MB** | |

**Target:** Stay under 50MB total for typical usage

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Basic offline infrastructure

✅ **Tasks:**
1. Add `idb` library for IndexedDB wrapper
2. Create offline storage service (`lib/offline/storage.ts`)
3. Implement IndexedDB schemas:
   - `predictions` store
   - `species` store
   - `rectangles` store
   - `catch_queue` store
4. Add online/offline detection hook (`useOnlineStatus()`)
5. Create network status banner component

**Deliverables:**
- Working IndexedDB storage
- Online/offline detection
- Basic UI indicators

---

### Phase 2: Prediction Caching (Week 2)
**Goal:** Cache predictions for offline viewing

✅ **Tasks:**
1. Intercept prediction API responses
2. Store in IndexedDB automatically
3. Serve from cache when offline
4. Add freshness indicators to prediction cards
5. Implement cache TTL and cleanup

**Deliverables:**
- Predictions work offline
- Clear freshness indicators
- Automatic cache management

---

### Phase 3: Species Data Caching (Week 2)
**Goal:** Species info available offline

✅ **Tasks:**
1. Cache species reference data on first load
2. Generate thumbnail service (server-side or client-side)
3. Progressive image caching strategy
4. Serve species data from cache when offline

**Deliverables:**
- Species names/info offline
- Thumbnails cached
- Graceful image loading

---

### Phase 4: Offline Catch Logging (Week 3)
**Goal:** Log catches offline, sync later

✅ **Tasks:**
1. Implement write queue in IndexedDB
2. Store photos as Blobs
3. Create sync service (`lib/offline/sync.ts`)
4. Add sync triggers (online event, visibility change)
5. Build sync status UI
6. Handle sync errors and retries

**Deliverables:**
- Catch logging works offline
- Automatic sync when online
- Sync status visible to user

---

### Phase 5: Polish & Optimization (Week 4)
**Goal:** Production-ready offline experience

✅ **Tasks:**
1. Add Service Worker for app shell caching
2. Implement cache size monitoring
3. Add cache cleanup strategies (LRU)
4. Build offline settings page (manage cache)
5. Add analytics for offline usage
6. Performance testing and optimization

**Deliverables:**
- Complete offline experience
- Cache management tools
- Performance optimized

---

## Technical Architecture

### Storage Service API

```typescript
// lib/offline/storage.ts

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void>;

  // Predictions
  async cachePrediction(data: CachedPrediction): Promise<void>;
  async getPrediction(rectangleCode: string, date: string): Promise<CachedPrediction | null>;
  async listPredictions(): Promise<CachedPrediction[]>;
  async clearOldPredictions(olderThan: Date): Promise<void>;

  // Species
  async cacheSpecies(species: CachedSpecies[]): Promise<void>;
  async getSpecies(id: string): Promise<CachedSpecies | null>;
  async getAllSpecies(): Promise<CachedSpecies[]>;

  // Images
  async cacheImage(speciesSlug: string, blob: Blob): Promise<void>;
  async getImage(speciesSlug: string): Promise<Blob | null>;

  // Catch Queue
  async queueCatchLog(log: PendingCatchLog): Promise<void>;
  async getPendingCatchLogs(): Promise<PendingCatchLog[]>;
  async removeCatchLog(tempId: string): Promise<void>;

  // Maintenance
  async getCacheSize(): Promise<number>;
  async clearAll(): Promise<void>;
}

export const offlineStorage = new OfflineStorage();
```

---

### Sync Service API

```typescript
// lib/offline/sync.ts

export class SyncService {
  private syncing = false;
  private queue: SyncQueueItem[] = [];

  async sync(): Promise<SyncResult>;

  private async syncCatchLogs(): Promise<void>;
  private async syncFavorites(): Promise<void>;

  async addToQueue(item: SyncQueueItem): Promise<void>;
  getQueueLength(): number;

  onSyncStart(callback: () => void): void;
  onSyncComplete(callback: (result: SyncResult) => void): void;
  onSyncError(callback: (error: Error) => void): void;
}

export const syncService = new SyncService();
```

---

### Offline Hook

```typescript
// hooks/useOfflineData.ts

export function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    cacheTTL?: number;
    cacheKey?: string;
  }
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  offlineMode: boolean;
  refresh: () => Promise<void>;
}
```

---

## User Experience Scenarios

### Scenario 1: Plan Trip at Home (Online)
1. User browses predictions for 3 different locations
2. App automatically caches predictions + species images
3. User favorites 5 species
4. **Cache Size:** ~1.5MB

**Offline Later:**
- All 3 locations viewable offline
- Favorites accessible
- Species images display

---

### Scenario 2: At Remote Beach (Offline)
1. User opens app, sees "Offline Mode" banner
2. Views cached predictions from this morning (4 hours old)
3. Freshness badge shows "Recent - 4 hours ago"
4. Logs 2 catches with photos
5. Catches queue with "Pending Sync" badge

**Back Online:**
- App detects connection
- Automatically syncs 2 catch logs
- Toast notification: "Synced successfully!"
- Predictions refresh automatically

---

### Scenario 3: Lost Coverage Mid-Session (Seamless)
1. User browsing predictions (online)
2. Network drops
3. App seamlessly switches to cached data
4. Banner appears: "You're offline. Viewing cached data."
5. User continues browsing without interruption

---

### Scenario 4: Extended Offline Trip (2 days)
1. User on fishing trip, no coverage for 48 hours
2. Cached predictions become "Stale" after 24 hours
3. Orange warning: "Data may be outdated"
4. User can still:
   - View cached predictions (with warning)
   - Log catches (queue grows to 10 entries)
   - View favorites
   - Set notifications

**Back Online:**
- Large sync (10 catches with 30 photos)
- Progress indicator shows "Syncing... 3 of 10"
- Takes 2 minutes on slow connection
- All catches uploaded successfully
- Fresh predictions downloaded

---

## Performance Considerations

### Initial Load Time
**Without Offline Storage:**
- Predictions API: 500-1000ms
- Species data: 200-400ms
- Images: 1-3s (lazy loaded)
- **Total:** 2-4s

**With Offline Storage (Cached):**
- IndexedDB read: 50-100ms
- Image Blobs: 100-200ms
- **Total:** 150-300ms ⚡ **75% faster**

---

### Memory Usage
**IndexedDB:**
- Operates outside main JS heap
- Minimal memory impact
- Async operations don't block

**Concern:**
- Loading many large images into memory
- **Solution:** Lazy load, virtualize lists

---

### Storage Quota Management

**Browser Limits:**
- Chrome: Up to 60% of available disk space
- Safari: 1GB initially, can request more
- Firefox: 2GB max

**Our Strategy:**
- Target 10-30MB typical usage
- Monitor with `navigator.storage.estimate()`
- Warn user at 80% quota
- Offer cache cleanup tools

---

## Testing Strategy

### Offline Scenarios
1. **Simulate offline:** Chrome DevTools Network tab
2. **Test Service Worker:** Chrome Application tab
3. **IndexedDB inspection:** Chrome Application > IndexedDB
4. **Stress test:** Large catch logs, many photos
5. **Network flapping:** Toggle online/offline repeatedly

---

### Test Cases
✅ Load app while offline (should show cached data)
✅ Go offline mid-session (should seamlessly switch)
✅ Log catch while offline (should queue)
✅ Come back online (should sync automatically)
✅ Sync conflicts (should handle gracefully)
✅ Storage quota exceeded (should show warning)
✅ Old cache data (should show staleness indicators)
✅ Cache cleanup (should remove old data)

---

## Security & Privacy

### Sensitive Data Handling
- **User credentials:** Never cache (Supabase handles)
- **Auth tokens:** Secure storage (Capacitor Secure Storage on native)
- **User catches:** Encrypted in IndexedDB? (optional enhancement)

### Cache Encryption
**Native Apps:**
- Use Capacitor Secure Storage for sensitive data
- IndexedDB automatically encrypted on iOS

**Web:**
- IndexedDB not encrypted
- Acceptable for fishing data (not medical/financial)

---

## Success Metrics

### Technical Metrics
- **Cache Hit Rate:** > 80% for predictions
- **Sync Success Rate:** > 95%
- **Offline Load Time:** < 500ms
- **Storage Usage:** < 30MB typical, < 50MB max

### User Metrics
- **Offline Usage:** Track % of sessions that go offline
- **Offline Feature Usage:** Track catch logs queued, predictions viewed offline
- **Sync Completion Time:** < 30s for typical queue
- **User Satisfaction:** Survey feedback on offline experience

---

## Risks & Mitigation

### Risk 1: Storage Quota Exceeded
**Impact:** Can't cache more data, feature degradation
**Mitigation:**
- Implement aggressive cache cleanup
- Warn user at 80% quota
- Allow manual cache management
- Prioritize critical data (predictions > images)

### Risk 2: Sync Failures
**Impact:** User loses catch logs, frustration
**Mitigation:**
- Persistent retry logic (exponential backoff)
- Never delete queued items until confirmed sync
- Show clear error messages
- Allow manual retry

### Risk 3: Stale Data Confusion
**Impact:** User makes decisions on outdated predictions
**Mitigation:**
- Clear freshness indicators everywhere
- Warning banners for stale data
- Prompt to refresh when online
- Educate users on data age

### Risk 4: Complex State Management
**Impact:** Bugs, data inconsistencies
**Mitigation:**
- Single source of truth (IndexedDB)
- Well-tested sync logic
- Comprehensive error handling
- Rollback on sync failures

---

## Conclusion

Offline storage is essential for Findr's success in real-world fishing scenarios. By caching predictions, species data, and enabling offline catch logging, we can provide a useful experience even without coverage.

**Key Principles:**
1. **Lightweight:** Target < 10MB initial, < 30MB typical
2. **Transparent:** Clear indicators of data age and sync status
3. **Reliable:** Persistent queues, guaranteed sync
4. **Performant:** Faster than online when cached

**Next Steps:**
1. Review this analysis with team
2. Prioritize phases based on user needs
3. Begin Phase 1 implementation (Foundation)
4. Iterate based on user feedback

---

**Status:** ✅ Requirements Analysis Complete
**Ready For:** Technical Design & Implementation
**Estimated Effort:** 4 weeks (1 week per phase)
