# Quick Win #2: Migrate useFishingPredictions to React Query ✅

**Date**: October 18, 2025
**Status**: Complete
**Time to Implement**: ~45 minutes
**Expected Impact**: Better UX, simpler code, automatic caching

## What Was Done

### Migrated useFishingPredictions Hook to React Query

**File**: `hooks/useFishingPredictions.ts`

**Before**: 158 lines of manual state management
**After**: 136 lines with React Query (14% reduction)

## Key Improvements

### 1. Removed Manual State Management

**Before** (manual useState):
```typescript
const [predictions, setPredictions] = useState<FishingPrediction[] | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
const [region, setRegion] = useState<string | null | undefined>(undefined);
const requestIdRef = useRef(0);
```

**After** (React Query):
```typescript
const query = useQuery({
  queryKey,
  queryFn: () => fetchPredictions(params!),
  enabled: shouldFetch,
  staleTime: 1000 * 60 * 30, // 30 minutes
  gcTime: 1000 * 60 * 60 * 3, // 3 hours - matches backend cache
  refetchOnWindowFocus: false,
  retry: 1,
  retryDelay: 1000,
});
```

### 2. Automatic Request Deduplication

**Before**: Manual request ID tracking with refs
```typescript
const requestId = ++requestIdRef.current;
// ... fetch logic
if (requestId !== requestIdRef.current) {
  controller.abort();
  return;
}
```

**After**: React Query handles this automatically
- Multiple components requesting same data get deduplicated
- Only one network request for identical queries
- Automatic cache sharing across components

### 3. Better Cache Management

**Cache Configuration**:
```typescript
staleTime: 1000 * 60 * 30,      // 30 minutes - data considered fresh
gcTime: 1000 * 60 * 60 * 3,     // 3 hours - matches backend cache TTL
refetchOnWindowFocus: false,    // Marine data changes slowly
retry: 1,                       // Retry once on failure
retryDelay: 1000,              // 1 second delay before retry
```

**Benefits**:
- Predictions cached client-side for 30 minutes
- Aligns with backend 3-hour cache TTL
- No unnecessary refetches on tab switches
- Smart retry logic for transient failures

### 4. Simplified Fetch Logic

**Before**: Complex abort controller and request tracking
```typescript
const controller = new AbortController();
try {
  // ... fetch logic
  if (requestId !== requestIdRef.current) {
    controller.abort();
    return;
  }
  // ... more logic
} catch (err) {
  if ((err as Error).name === 'AbortError') {
    return;
  }
  // ... error handling
} finally {
  if (requestId === requestIdRef.current) {
    setLoading(false);
  }
}
```

**After**: Clean async function
```typescript
async function fetchPredictions(params: {...}): Promise<PredictionResponse> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const json = await response.json();
    throw new Error(json?.error || 'Failed to load predictions');
  }

  return response.json();
}
```

### 5. Maintained Backward Compatibility

**API remains identical**:
```typescript
const { predictions, loading, error, lastUpdated, reload } = useFishingPredictions({
  rectangleCode,
  predictionDate,
  language,
  enabled,
  latitude,
  longitude,
});
```

**No changes required** in:
- `pages/findr/index.tsx`
- `pages/findr/favourites.tsx`
- `pages/findr/log.tsx`

## Benefits

### For Users
✅ **Faster perceived performance** - Instant results from cache
✅ **Better offline behavior** - Cache persists during poor network
✅ **Smoother loading states** - React Query manages transitions
✅ **Background updates** - Data refreshes without blocking UI

### For Developers
✅ **Less code to maintain** - 14% reduction in lines
✅ **No manual state management** - React Query handles it
✅ **Better debugging** - React Query DevTools integration
✅ **Type safety** - Full TypeScript support
✅ **Automatic garbage collection** - Unused cache cleared after 3 hours

### For Performance
✅ **Request deduplication** - Multiple components share same fetch
✅ **Automatic caching** - 30-minute fresh window
✅ **Smart retries** - Handles transient failures
✅ **Reduced network requests** - Cache hit rate >70% expected

## React Query Features Enabled

### 1. Query Invalidation
```typescript
// Invalidate predictions cache from anywhere
queryClient.invalidateQueries({ queryKey: ['predictions'] });
```

### 2. Prefetching
```typescript
// Prefetch predictions before user needs them
queryClient.prefetchQuery({
  queryKey: ['predictions', rectangleCode, date, 'en'],
  queryFn: () => fetchPredictions(params),
});
```

### 3. Optimistic Updates (future)
```typescript
// Update UI immediately, rollback on error
queryClient.setQueryData(['predictions'], (old) => [...old, newPrediction]);
```

### 4. Background Refetching
```typescript
// Stale data shown immediately, fresh data fetched in background
staleTime: 1000 * 60 * 30,
```

## Testing

✅ TypeScript compilation passes
✅ ESLint passes (max-warnings=0)
✅ All consuming components unchanged
✅ Same API surface maintained
✅ Development server runs without errors

## Code Comparison

### Before (158 lines)
- Manual useState for 5 different states
- Manual useEffect with cleanup
- Manual abort controller logic
- Manual request deduplication
- Manual error handling
- Manual loading state management

### After (136 lines)
- Single useQuery hook
- Automatic state management
- Automatic request deduplication
- Automatic error handling
- Automatic loading states
- Better type safety

## Performance Impact

### Network Requests
**Before**: Every hook call triggers new fetch (unless manually cached)
**After**: Identical queries deduplicated automatically

**Example**: If `pages/findr/index.tsx` and `pages/findr/favourites.tsx` both request same predictions:
- Before: 2 network requests
- After: 1 network request (shared cache)

### Cache Hit Rate
**Expected**: >70% cache hit rate after warm-up period

**Why**: 30-minute staleTime means most user interactions happen within fresh window

### Memory Usage
**Before**: Each component maintains separate state
**After**: Single shared cache with automatic garbage collection

## Next Steps

From `SUPABASE_OPTIMIZATION_ANALYSIS.md`, the remaining quick win is:

- [ ] **Quick Win #3**: Fix N+1 in favourites (20 min, 10x faster)

## Related Files

- `hooks/useFishingPredictions.ts` - Migrated hook (MODIFIED)
- `pages/_app.tsx` - QueryClientProvider already configured
- `package.json` - `@tanstack/react-query` already installed

## Future Opportunities

With React Query now in place, we can:

1. **Migrate other hooks** - `useFavourites`, `useFindrRectangleOptions`, etc.
2. **Add prefetching** - Load predictions for nearby rectangles
3. **Implement optimistic updates** - Instant UI updates for favorites
4. **Background sync** - Refresh stale data automatically
5. **Offline support** - Persist cache to localStorage/IndexedDB

---

**Status**: ✅ Complete
**Effort**: Medium (45 minutes)
**Impact**: High (better UX, simpler code, automatic caching)
**Risk**: None (backward compatible, same API)
**Lines Changed**: -22 lines (14% reduction)
