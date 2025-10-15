# Favorites Heart Icon Fix

## Issue
The favorite heart icon would fill when clicked but then immediately revert back to outline. This made it appear like the favorite wasn't being saved, even though it was working correctly behind the scenes.

## Root Causes

### Problem 1: Stale Closure in toggleFavourite
The issue was in `hooks/useFavourites.ts` in the `toggleFavourite` function (lines 304-311).

```typescript
// ❌ OLD CODE - Had stale closure issue
const toggleFavourite = useCallback(async (speciesId: string, options?: ToggleFavouriteOptions) => {
  const normalizedId = normalizeFavouriteId(speciesId);
  if (favourites.includes(normalizedId)) {  // ← Stale favourites array from closure
    await removeFavourite(normalizedId, options?.favouriteId);
  } else {
    await addFavourite(normalizedId, options);
  }
}, [favourites, addFavourite, removeFavourite]);  // ← Depends on favourites
```

### Problem 2: Rapid Clicks Causing Race Conditions
When users rapidly clicked the heart icon multiple times:
1. Click 1: Sees not favorited → calls `addFavourite` → optimistically adds to state
2. Click 2 (before state updates): Still sees not favorited → calls `addFavourite` AGAIN
3. API returns 409 Conflict ("already favorited")
4. Hook treats 409 as error → reverts optimistic update → heart empties

### Problem 3: 409 Conflict Treated as Error
The API returns 409 when trying to add an already-favorited species. This is actually a success state (species is in database), but the hook was reverting the optimistic update.

## Solutions

### Solution 1: Use Ref for Current State
```typescript
// ✅ NEW CODE - Uses ref for current state
const favouritesRef = useRef<string[]>([]);

// Sync ref whenever favourites state changes
useEffect(() => {
  favouritesRef.current = favourites;
}, [favourites]);
```

### Solution 2: Prevent Concurrent Toggles
```typescript
const pendingTogglesRef = useRef<Set<string>>(new Set());

const toggleFavourite = useCallback(async (speciesId: string, options?: ToggleFavouriteOptions) => {
  const normalizedId = normalizeFavouriteId(speciesId);
  
  // Prevent concurrent toggles of the same species
  if (pendingTogglesRef.current.has(normalizedId)) {
    console.log('[useFavourites] Toggle already in progress for', normalizedId);
    return;
  }
  
  pendingTogglesRef.current.add(normalizedId);
  
  try {
    if (favouritesRef.current.includes(normalizedId)) {
      await removeFavourite(normalizedId, options?.favouriteId);
    } else {
      await addFavourite(normalizedId, options);
    }
  } finally {
    pendingTogglesRef.current.delete(normalizedId);
  }
}, [addFavourite, removeFavourite]);
```

### Solution 3: Treat 409 as Success
```typescript
// In addFavourite function
const data = await response.json();

// Treat 409 (already favorited) as success - species is in database
if (!data.success && response.status !== 409) {
  console.error('Failed to add favourite to Supabase:', data.error);
  // Revert optimistic update
  setFavourites((prev) => prev.filter((id) => id !== normalizedId));
} else {
  console.log('[useFavourites] Successfully added to Supabase (or already exists)');
}
```

## Why This Works
1. **`favouritesRef.current` always has the latest value** - updated by the `useEffect` every time `favourites` changes
2. **No stale closure** - `toggleFavourite` doesn't depend on `favourites` in its dependency array
3. **Immediate reads** - When user clicks, we check against the actual current state
4. **Prevents double-toggles** - The `pendingTogglesRef` Set prevents concurrent toggle operations on the same species
5. **409 treated as success** - If the species is already in the database, we don't revert the optimistic update
6. **Optimistic updates still work** - The `addFavourite` and `removeFavourite` functions already handle optimistic UI updates (lines 197-202 and 258-261)

## Files Changed
- `hooks/useFavourites.ts`:
  - Added `useRef` import
  - Added `favouritesRef` to track current state
  - Added `pendingTogglesRef` to prevent concurrent toggles
  - Added `useEffect` to sync ref with state
  - Updated `toggleFavourite` to:
    - Check and set pending state
    - Use ref instead of stale closure
    - Clear pending state in finally block
  - Updated `addFavourite` to:
    - Treat 409 status as success
    - Use `favouritesRef` for localStorage operations (unauthenticated users)
    - Removed `favourites` from dependency array
  - Updated `removeFavourite` to:
    - Use `favouritesRef` for localStorage operations (unauthenticated users)
    - Removed `favourites` from dependency array

## Testing
1. ✅ Click heart on card → should fill immediately and stay filled
2. ✅ Click filled heart → should empty immediately and stay empty
3. ✅ Rapid clicking → should not cause race conditions or 409 errors
4. ✅ Navigate away and back → favorites should persist
5. ✅ Works for both authenticated (Supabase) and unauthenticated (localStorage) users
6. ✅ No console errors or warnings
7. ✅ 409 Conflict responses are handled gracefully

## Related Context
This fix addresses three common React patterns:

1. **Closure stale state** - When you use state variables in a `useCallback` dependency array, you create a new function closure every time that state changes. Use refs for values you need to read at call-time.

2. **Race conditions in async operations** - When users can trigger the same async operation multiple times rapidly, track pending operations to prevent conflicts.

3. **Idempotency** - Operations that can be safely repeated (like "add to favorites") should treat "already exists" responses as success, not failure.

## Prevention
When creating `useCallback` functions that need to check **current** state at call time (not at definition time):
- Use refs instead of including state in dependencies
- Track pending operations to prevent concurrent calls
- Treat idempotent operation conflicts as success

This is especially important for:
- Toggle functions
- Event handlers called rapidly
- Functions that make async decisions based on current state
- Operations that might be triggered multiple times before completing

