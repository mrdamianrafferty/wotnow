# Findr Location Cycling Bug - Root Cause Analysis

**Date:** 2025-01-26
**Status:** ✅ FIXED (2025-12-06)
**Severity:** High - Causes poor UX with flickering location and duplicate API calls

---

## ✅ Fix Summary (2025-12-06)

**All Findr pages now use `UnifiedLocationContext` as single source of truth.**

### What Changed:
1. **`pages/findr/index.tsx`** - Already fixed, uses `useMigrateFindrSettings()` + `useUnifiedLocation()`
2. **`pages/findr/conditions.tsx`** - Already fixed, uses `useMigrateFindrSettings()` + `useUnifiedLocation()`
3. **`pages/findr/favourites.tsx`** - ✅ Fixed 2025-12-06, removed `usePersistentFindrSettings`
4. **`pages/findr/favourites-auth.tsx`** - ✅ Fixed 2025-12-06, removed `usePersistentFindrSettings`
5. **`pages/findr/map.tsx`** - Already using `useUnifiedLocation()`

### Location Slot Architecture:
| Slot | App | Purpose |
|------|-----|---------|
| `home` | Go Daisy | User's home address |
| `coastal` | Go Daisy | Nearest coastal location |
| `findr` | Findr | Primary fishing spot |

### Key Principles:
- ✅ Users **never** see ICES rectangles - always calculated from lat/lon in background
- ✅ Signed-in users use **Supabase database** as single source of truth
- ✅ Cookies only for anonymous users + first-time registration migration
- ✅ `findr` slot is Findr's dedicated location (doesn't overwrite Go Daisy's `coastal`)

---

## Problem Statement

Users report that Findr's fishing location cycles/flickers between:
1. The location they saved
2. A default coastal location (probably from Go Daisy)

This causes:
- ❌ Confusing UX (location label keeps changing)
- ❌ Duplicate/unnecessary API calls to `/api/findr/predictions`
- ❌ Loss of user's intended location

---

## Root Cause: Competing Sources of Truth

Findr has **TWO independent location storage systems** that fight each other:

### System 1: `usePersistentFindrSettings` (localStorage)
**File:** `hooks/usePersistentFindrSettings.ts`

```typescript
const STORAGE_KEY = 'findrSettings';

interface StoredSettings {
  selectedCode?: string;  // ← Rectangle code (e.g., "28E5")
  predictionDate?: string;
}
```

- Stores `selectedCode` in **localStorage** (key: `findrSettings`)
- Loads **synchronously** on page mount
- Also checks cookies as fallback (`getLastLocationFromCookie()`)

### System 2: `UnifiedLocationContext` (remote database)
**File:** `context/UnifiedLocationContext.tsx`

```typescript
const STORAGE_KEY = 'findr.location.multi';

interface SavedLocation {
  id: string;
  slot: 'home' | 'coastal' | 'findr';
  rectangleCode: string | null;
  // ... more fields
}
```

- Stores locations in **Supabase** (`user_location_preferences` table)
- Also caches in localStorage (key: `findr.location.multi`)
- Loads **asynchronously** via API call on page mount
- Provides `coastalLocation` and `legacyLocation`

---

## The Race Condition

### Timeline of Events (pages/findr/index.tsx)

**T=0ms: Page loads**

```typescript
// UnifiedLocationContext starts async load
const { location: legacyLocation, coastalLocation } = useUnifiedLocation();
// ↑ coastalLocation = null (still loading)

// usePersistentFindrSettings loads from localStorage immediately
const { selectedCode, setSelectedCode } = usePersistentFindrSettings({...});
// ↑ selectedCode = "28E5" (from localStorage)
```

**Lines 769-772:**
```typescript
const contextRectangleSource = coastalLocation ?? legacyLocation; // null
const rectangleFromContext = contextRectangleSource?.rectangleCode ?? null; // null
const rectangleFromQuery = typeof router.query.rectangle === 'string' ? router.query.rectangle : null; // null
const effectiveSelectedCode = rectangleFromContext ?? rectangleFromQuery ?? selectedCode;
// ↑ effectiveSelectedCode = "28E5" (falls back to selectedCode)
```

**✅ Predictions API called with rectangle="28E5"**

---

**T=500ms: UnifiedLocationContext finishes loading**

```typescript
// Remote data loaded!
coastalLocation = {
  rectangleCode: "31F2",  // ← DIFFERENT from localStorage!
  name: "Dublin Bay",
  // ...
}
```

**Lines 781-785 (THE BUG):**
```typescript
// Sync selectedCode when location context changes
useEffect(() => {
  if (rectangleFromContext && rectangleFromContext !== selectedCode) {
    setSelectedCode(rectangleFromContext);  // ← OVERWRITES localStorage!
  }
}, [rectangleFromContext, selectedCode, setSelectedCode]);
```

**🔥 This fires:** `"31F2" !== "28E5"` → calls `setSelectedCode("31F2")`

**Result:**
- `selectedCode` changes from `"28E5"` → `"31F2"`
- `effectiveSelectedCode` recalculates
- New predictions API call with rectangle="31F2"
- **User sees location flicker from "28E5" to "31F2"**

---

**T=600ms: localStorage writes**

```typescript
// usePersistentFindrSettings.ts lines 89-102
useEffect(() => {
  if (typeof window === 'undefined' || !hasHydrated.current) return;

  const payload: StoredSettings = {
    selectedCode: selectedCode || undefined,  // "31F2" now
    predictionDate: predictionDate || undefined,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}, [predictionDate, selectedCode]);
```

Now localStorage has `"31F2"`, but **UnifiedLocationContext's localStorage** (key: `findr.location.multi`) still has the old data!

---

## Why It Cycles Forever

On **next page load**:
1. `usePersistentFindrSettings` reads localStorage → gets `"31F2"`
2. `UnifiedLocationContext` reads its **own** localStorage → gets `"28E5"` (old data)
3. Then loads remote → gets `"31F2"`
4. But the auto-select logic (lines 787-816) might fire before remote loads
5. **Cycle repeats!**

---

## Code Locations

### The Bug
**File:** `pages/findr/index.tsx:781-785`
```typescript
// THIS IS THE BUG - removes it or fix the logic
useEffect(() => {
  if (rectangleFromContext && rectangleFromContext !== selectedCode) {
    setSelectedCode(rectangleFromContext);  // ← Don't blindly overwrite!
  }
}, [rectangleFromContext, selectedCode, setSelectedCode]);
```

### Contributing Factors

1. **Dual storage systems:**
   - `findrSettings` (localStorage) - managed by `usePersistentFindrSettings`
   - `findr.location.multi` (localStorage) - managed by `UnifiedLocationContext`
   - These are NOT synchronized!

2. **Async vs Sync loading:**
   - `selectedCode` loads instantly (sync)
   - `coastalLocation` loads after API call (async)

3. **Priority logic (lines 769-772):**
   ```typescript
   const effectiveSelectedCode = rectangleFromContext ?? rectangleFromQuery ?? selectedCode;
   ```
   This **changes** when `coastalLocation` loads, triggering re-renders

---

## Solution Options

### ✅ Option 1: Single Source of Truth (RECOMMENDED)

**Remove** `usePersistentFindrSettings` and use **only** `UnifiedLocationContext`:

```typescript
// pages/findr/index.tsx

const { coastalLocation, findrLocation, updateLocationBySlot } = useUnifiedLocation();

// Use findrLocation slot specifically for Findr
const findrRect = findrLocation?.rectangleCode;

// Fallback to coastalLocation if no findr-specific location
const effectiveSelectedCode = findrRect ?? coastalLocation?.rectangleCode ?? null;

// When user selects location, save to 'findr' slot
const handleLocationSelect = async (rectangleCode: string) => {
  await updateLocationBySlot({
    slot: 'findr',  // ← Use dedicated Findr slot
    coordinates: { lat, lon },
    rectangleCode,
    makeActive: true,
  });
};
```

**Benefits:**
- ✅ One source of truth (UnifiedLocationContext)
- ✅ No race conditions
- ✅ Persists to database (syncs across devices)
- ✅ Falls back to coastalLocation from Go Daisy if user hasn't set Findr location
- ✅ Can still use cookies for incognito users

**Migration:**
1. Read old `findrSettings` localStorage on mount
2. If exists, save to `findr` slot in UnifiedLocationContext
3. Delete old `findrSettings` key

---

### Option 2: Fix the Race Condition (PARTIAL FIX)

Keep both systems but prevent the cycling:

```typescript
// pages/findr/index.tsx:781-785

useEffect(() => {
  // Only sync if:
  // 1. Context has loaded (not initial null state)
  // 2. User hasn't manually selected a location recently
  // 3. No explicit override exists

  if (!rectangleFromContext) return; // Don't sync null values

  // Check if selectedCode was just set by user action
  const wasJustSet = Date.now() - lastUserActionRef.current < 1000;
  if (wasJustSet) return;

  // Only sync on initial load, not on every change
  if (hasInitializedRef.current) return;
  hasInitializedRef.current = true;

  setSelectedCode(rectangleFromContext);
}, [rectangleFromContext]);
```

**Benefits:**
- ✅ Minimal code changes
- ✅ Fixes the cycling

**Drawbacks:**
- ⚠️ Still maintains dual storage (complexity)
- ⚠️ Requires careful state management
- ⚠️ Doesn't fix underlying architecture issue

---

### Option 3: Prioritize localStorage Over Remote (SIMPLE FIX)

Change the priority logic to prefer localStorage:

```typescript
// pages/findr/index.tsx:769-772

// Only use context location if NO localStorage value exists
const effectiveSelectedCode = selectedCode ?? rectangleFromContext ?? rectangleFromQuery ?? null;
```

And **remove** the syncing effect (lines 781-785).

**Benefits:**
- ✅ Very simple fix
- ✅ No cycling

**Drawbacks:**
- ❌ Ignores remote/database changes
- ❌ Can't sync across devices
- ❌ Doesn't leverage Go Daisy's coastal location

---

## Recommended Fix: Option 1

**Implementation Plan:**

### Phase 1: Add Migration Logic

```typescript
// hooks/useMigrateFindrSettings.ts (NEW FILE)
export function useMigrateFindrSettings() {
  const { findrLocation, updateLocationBySlot } = useUnifiedLocation();
  const hasMigrated = useRef(false);

  useEffect(() => {
    if (hasMigrated.current || findrLocation) return;
    hasMigrated.current = true;

    // Check old localStorage
    const oldSettings = localStorage.getItem('findrSettings');
    if (!oldSettings) return;

    try {
      const parsed = JSON.parse(oldSettings);
      if (parsed.selectedCode) {
        console.log('[Migration] Migrating findrSettings to UnifiedLocation:', parsed.selectedCode);

        // Save to UnifiedLocationContext
        void updateLocationBySlot({
          slot: 'findr',
          coordinates: { lat: 0, lon: 0 }, // Will be resolved by API
          rectangleCode: parsed.selectedCode,
          makeActive: true,
          resolveRectangle: true,
        });

        // Delete old key
        localStorage.removeItem('findrSettings');
      }
    } catch (error) {
      console.warn('[Migration] Failed to migrate findrSettings', error);
    }
  }, [findrLocation, updateLocationBySlot]);
}
```

### Phase 2: Update pages/findr/index.tsx

```typescript
// Remove this import:
// import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';

// Add migration hook
import { useMigrateFindrSettings } from '../../hooks/useMigrateFindrSettings';

const FindrPage: React.FC = () => {
  const router = useRouter();
  const { coastalLocation, findrLocation, updateLocationBySlot } = useUnifiedLocation();

  // Migrate old settings
  useMigrateFindrSettings();

  // Remove all usePersistentFindrSettings usage
  // const { selectedCode, setSelectedCode, ... } = usePersistentFindrSettings({...});

  // NEW: Use findrLocation or fall back to coastalLocation
  const rectangleFromContext = findrLocation?.rectangleCode ?? coastalLocation?.rectangleCode ?? null;
  const rectangleFromQuery = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;
  const effectiveSelectedCode = rectangleFromContext ?? rectangleFromQuery ?? null;

  // REMOVE lines 781-785 (the buggy sync effect)

  // Keep auto-select logic but update it to use updateLocationBySlot
  useEffect(() => {
    if (rectangleFromContext || rectangleFromQuery) return;
    if (!rectangleOptions.length) return;

    const firstOption = rectangleOptions[0];
    console.log('[Findr] AUTO-SELECTING first rectangle:', firstOption.code);

    void updateLocationBySlot({
      slot: 'findr',
      coordinates: { lat: firstOption.centerLat, lon: firstOption.centerLon },
      rectangleCode: firstOption.code,
      rectangleRegion: firstOption.region,
      name: firstOption.label,
      makeActive: true,
    });
  }, [rectangleFromContext, rectangleFromQuery, rectangleOptions, updateLocationBySlot]);

  // ... rest of component
};
```

### Phase 3: Update LocationDisplay.tsx

```typescript
// components/findr/LocationDisplay.tsx

const handleLocationSave = async (location: BasicLocation) => {
  // ... existing rectangle lookup logic ...

  // Change from updateLocation to updateLocationBySlot:
  await updateLocationBySlot({
    slot: 'findr',  // ← Save to findr slot, not coastal
    coordinates: { lat: location.lat, lon: location.lon },
    rectangleCode,
    rectangleRegion: region,
    name: displayName,
    source: 'manual',
    accuracy: typeof distance === 'number' ? distance : null,
    makeActive: true,
  });

  // ... rest of function
};
```

---

## Testing Plan

### Test Case 1: New User (No Saved Location)
1. Visit `/findr`
2. ✅ Should auto-select first rectangle
3. ✅ Should save to `findr` slot in UnifiedLocationContext
4. ✅ No cycling/flickering

### Test Case 2: Returning User (Has findr Location)
1. User previously saved location to `findr` slot
2. Visit `/findr`
3. ✅ Should load saved location immediately
4. ✅ No API call to change location
5. ✅ No cycling

### Test Case 3: Migration (Has Old localStorage)
1. User has old `findrSettings` in localStorage
2. Visit `/findr`
3. ✅ Should migrate to `findr` slot
4. ✅ Should delete old `findrSettings` key
5. ✅ Should use migrated location

### Test Case 4: Go Daisy User (Has Coastal Location)
1. User set coastal location in Go Daisy
2. Never used Findr before
3. Visit `/findr`
4. ✅ Should fall back to `coastalLocation`
5. ✅ Should NOT overwrite it (Findr uses its own slot)

### Test Case 5: Cross-Device Sync
1. User sets location on Device A
2. Opens Findr on Device B (logged in)
3. ✅ Should load location from Supabase
4. ✅ Should match Device A

---

## Files to Modify

1. **Create:**
   - `hooks/useMigrateFindrSettings.ts` (migration logic)

2. **Modify:**
   - `pages/findr/index.tsx` (remove usePersistentFindrSettings, use UnifiedLocationContext)
   - `components/findr/LocationDisplay.tsx` (save to `findr` slot)
   - `pages/findr/settings.tsx` (if it uses selectedCode)
   - `pages/findr/map.tsx` (if it uses selectedCode)
   - `pages/findr/conditions.tsx` (if it uses selectedCode)

3. **Delete (after migration period):**
   - `hooks/usePersistentFindrSettings.ts` (no longer needed)

---

## Rollout Plan

### Week 1: Implement Fix
- Day 1-2: Create migration hook
- Day 3-4: Update index.tsx to use UnifiedLocationContext
- Day 5: Update other Findr pages
- Day 6-7: Testing

### Week 2: Deploy & Monitor
- Deploy to staging
- Test migration with real user data
- Monitor for errors
- Deploy to production
- Monitor Sentry for issues

### Week 3-4: Deprecation
- Monitor old localStorage key usage
- After 2 weeks, most users will have migrated
- Can safely delete `usePersistentFindrSettings.ts`

---

## Success Metrics

- ✅ Zero reports of location cycling
- ✅ Prediction API calls reduced by ~50% (no duplicate calls)
- ✅ Location persistence works across devices
- ✅ Old localStorage successfully migrated (>95% of users)
- ✅ Fallback to Go Daisy coastal location works

---

## Related Issues

- UnifiedLocationContext architecture: `context/UnifiedLocationContext.tsx`
- Multi-location support: `types/multiLocation.ts`
- Cookie-based persistence: `lib/cookies.ts`

