# Location Selection Issue - Diagnostic Summary

## 🔴 Current Problem

**User Report:** "Location name changes but weather data doesn't update to the new location"

**Date:** October 9, 2025  
**Status:** STILL BROKEN (after multiple fix attempts)

---

## 📊 What I Found

### Issue #1: Location Picker Was Purely Cosmetic
**Discovery:** The location picker modal was never actually connected to data fetching.
- User could select locations, but the selection never triggered data updates
- Rectangle code wasn't being passed to the data fetching hooks
- `setSelectedCode()` was being called, but nothing was listening to it

**Fix Applied:** Created `/api/findr/rectangle-lookup` API
- Converts lat/lon → ICES rectangle code
- Uses haversine distance calculation
- Returns nearest rectangle with region name

**Commit:** `a5f1b7ba` - "feat: Integrate location picker with rectangle lookup"

---

### Issue #2: Router Reload Race Condition
**Discovery:** After selecting location, rectangle would briefly change then revert to Galicia.
- `router.reload()` was causing page refresh
- localStorage write was racing with page reload
- State would revert to previous value

**Fix Applied:** Removed `router.reload()` call
- Let React hooks handle the data refetch naturally
- Dependencies trigger re-fetch when `selectedCode` changes

**Commit:** `d9896a66` - "fix: Remove router.reload() to prevent rectangle reset"

---

### Issue #3: Location Name Disappears After Selection
**Discovery:** Location name would reset to "Set location" after selecting.
- `LocationDisplay` component rendered TWICE (desktop + mobile nav)
- Each instance had independent local state
- No synchronization between instances

**Fix Applied:** localStorage persistence for location name
```typescript
const [locationName, setLocationName] = useState(() => {
  if (typeof window === 'undefined') return 'Set location';
  return localStorage.getItem('findr_location_name') || 'Set location';
});
```

**Commit:** `25517d66` - "fix: Persist location name across component instances"

---

### Issue #4: React State Doesn't Sync Across Components
**Discovery:** `usePersistentFindrSettings` hook used by multiple components independently.

**The Problem:**
```typescript
// LocationDisplay component
const { setSelectedCode } = usePersistentFindrSettings(...);
setSelectedCode('37R2');  // Updates THIS component's state
// ↓ localStorage updated
// ✅ locationName changes to "Athens"

// Conditions page component (DIFFERENT instance)
const { selectedCode } = usePersistentFindrSettings(...);
// ❌ Still has old value: '21D8'
// ❌ localStorage.setItem() doesn't trigger React re-renders
// ❌ Weather data fetches with wrong rectangle
```

**Fix Applied:** Use URL query parameters as source of truth
```typescript
// LocationDisplay: Always navigate with rectangle in URL
await router.push(`/findr/conditions?rectangle=${rectangleCode}`, ...);

// Conditions page: Read rectangle from URL, sync to state
const rectangleFromUrl = router.query.rectangle;
useEffect(() => {
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    setSelectedCode(rectangleFromUrl);
  }
}, [rectangleFromUrl, selectedCode]);
```

**Commit:** `ff4ca786` - "fix: Sync location selection via URL query parameter"

---

## 🛠️ What I Tried

### Attempt 1: Direct Hook Communication ❌
**Method:** Call `setSelectedCode()` from LocationDisplay
**Result:** Failed - each component has separate hook instance
**Why it failed:** React hooks don't share state across components

### Attempt 2: localStorage Only ❌
**Method:** Write to localStorage, expect other components to read
**Result:** Failed - localStorage doesn't trigger React re-renders
**Why it failed:** No event listener or mechanism to detect changes

### Attempt 3: Remove router.reload() ✅ Partial Success
**Method:** Let React hooks naturally refetch when state changes
**Result:** Fixed race condition, but didn't solve cross-component sync
**Why partial:** Only works within same component instance

### Attempt 4: localStorage Persistence for Name ✅ Success
**Method:** Store location name in localStorage, both instances read it
**Result:** Location name now persists correctly
**Why it worked:** Simple read-only pattern, no state synchronization needed

### Attempt 5: URL Query Parameters ⏳ DEPLOYED (Testing)
**Method:** Use URL as single source of truth
**Result:** Code deployed, waiting for verification
**Expected:** Should work because URL changes trigger router updates

---

## 🧪 Current Code State

### LocationDisplay.tsx (Lines 63-80)
```typescript
// Update selected code (triggers data refetch via usePersistentFindrSettings)
// This updates localStorage and the selectedCode state
setSelectedCode(rectangleCode);
setManualCode(''); // Clear manual input

// Update display name and persist to localStorage
const displayName = distance && distance > 10
  ? `${location.name} (~${Math.round(distance)}km to ${region})`
  : `${location.name} (${region})`;
updateLocationName(displayName);

// Close the picker
setShowLocationPicker(false);

// Navigate to conditions page with rectangle code in URL
// This ensures the page re-reads the selected code
// Use replace to avoid adding to browser history
await router.push(`/findr/conditions?rectangle=${rectangleCode}`, undefined, { shallow: false });
```

### conditions.tsx (Lines 45-56)
```typescript
// Read rectangle from URL query param if present
const rectangleFromUrl = typeof router.query.rectangle === 'string' ? router.query.rectangle : null;

// Sync URL rectangle to selectedCode
useEffect(() => {
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    console.log('[Conditions] Syncing rectangle from URL:', rectangleFromUrl);
    setSelectedCode(rectangleFromUrl);
    setManualCode(''); // Clear manual input when changing location
  }
}, [rectangleFromUrl, selectedCode, setSelectedCode, setManualCode]);
```

---

## 🔍 Why It Might Still Be Broken

### Hypothesis 1: useEffect Dependency Issue
**Problem:** The useEffect might not be triggering
**Test:** Check console for `[Conditions] Syncing rectangle from URL:` log
**If missing:** Dependencies aren't triggering re-render

### Hypothesis 2: Shallow Routing Issue
**Problem:** `shallow: false` might not be working as expected
**Test:** Check if URL actually changes to include `?rectangle=`
**If missing:** Router navigation isn't happening

### Hypothesis 3: Router Query Not Ready
**Problem:** `router.query.rectangle` might be undefined on first render
**Test:** Add `router.isReady` check
**Fix:** 
```typescript
useEffect(() => {
  if (!router.isReady) return;
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    setSelectedCode(rectangleFromUrl);
  }
}, [router.isReady, rectangleFromUrl, selectedCode]);
```

### Hypothesis 4: Hook Dependency Array Missing router
**Problem:** useEffect doesn't re-run when router changes
**Current:** `[rectangleFromUrl, selectedCode, setSelectedCode, setManualCode]`
**Missing:** `router` object itself?

### Hypothesis 5: Data Fetching Hook Not Responding
**Problem:** Even if `selectedCode` updates, data fetching doesn't trigger
**Test:** Check if `useFindrConditions` has `selectedCode` in dependencies
**Investigation needed:** Read `useFindrConditions` hook implementation

### Hypothesis 6: Deployment Not Complete
**Problem:** Changes not yet live on production
**Test:** Check Vercel deployment logs
**Timeline:** Deployed ~5 minutes ago, might need cache clear

---

## 🐛 Debugging Steps Needed

### Step 1: Verify Deployment
```bash
# Check production source
curl -s 'https://wotnow.fish/findr/conditions' | grep 'rectangleFromUrl'
```

### Step 2: Test URL Navigation
1. Open https://wotnow.fish/findr/conditions
2. Open browser DevTools → Network tab
3. Click "Set location"
4. Select new location
5. **Check:** Does URL change to `/findr/conditions?rectangle=37R2`?
6. **Check:** Does page reload or just update?

### Step 3: Check Console Logs
Expected sequence:
```javascript
[LocationDisplay] Found rectangle: { rectangleCode: '37R2', ... }
[LocationDisplay] Location updated successfully: { rectangleCode: '37R2', ... }
[Conditions] Syncing rectangle from URL: 37R2  // ← KEY LOG
[Findr Conditions] Conditions source { rectangle: '37R2' }
```

If missing `[Conditions] Syncing rectangle from URL:` → useEffect not triggering

### Step 4: Check Hook Dependencies
```typescript
// In useFindrConditions hook
useEffect(() => {
  // Does this have selectedCode in dependencies?
}, [selectedCode, ...]);  // ← Check this
```

### Step 5: Test Direct URL
```bash
# Bypass location picker, test URL param directly
open https://wotnow.fish/findr/conditions?rectangle=20C5
```
- If this works → LocationDisplay navigation is broken
- If this fails → Conditions page URL reading is broken

---

## 📋 Files Modified

1. **pages/api/findr/rectangle-lookup.ts** (NEW - 176 lines)
   - Rectangle lookup API with haversine distance
   
2. **components/findr/LocationDisplay.tsx**
   - Line 15-38: localStorage persistence for location name
   - Line 63-80: Rectangle lookup + URL navigation
   
3. **pages/findr/conditions.tsx**
   - Line 5: Added `useRouter` import
   - Line 24: Added `const router = useRouter()`
   - Line 45-56: Read rectangle from URL + sync to state

4. **lib/findr/fallbackConditions.ts**
   - Made optional fields: `tideMeters?`, `fishingScore?`, `summary?`

5. **pages/api/findr/conditions.ts**
   - Updated parsers to handle optional fields

---

## 🎯 Next Steps

### If Still Broken After Deploy:

1. **Add router.isReady check:**
```typescript
useEffect(() => {
  if (!router.isReady) return;
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    console.log('[Conditions] Syncing rectangle from URL:', rectangleFromUrl);
    setSelectedCode(rectangleFromUrl);
  }
}, [router.isReady, rectangleFromUrl, selectedCode, setSelectedCode, setManualCode]);
```

2. **Force page reload instead of shallow routing:**
```typescript
// In LocationDisplay
window.location.href = `/findr/conditions?rectangle=${rectangleCode}`;
```

3. **Use window.postMessage for cross-component communication:**
```typescript
// LocationDisplay
window.postMessage({ type: 'RECTANGLE_CHANGED', code: rectangleCode }, '*');

// Conditions page
useEffect(() => {
  const handler = (event) => {
    if (event.data.type === 'RECTANGLE_CHANGED') {
      setSelectedCode(event.data.code);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

4. **Add storage event listener:**
```typescript
useEffect(() => {
  const handler = (e: StorageEvent) => {
    if (e.key === 'findrSettings') {
      const newSettings = JSON.parse(e.newValue || '{}');
      if (newSettings.selectedCode) {
        setSelectedCode(newSettings.selectedCode);
      }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}, []);
```

---

## 📈 Success Criteria

- [ ] URL includes `?rectangle=` parameter after selection
- [ ] Console shows `[Conditions] Syncing rectangle from URL:`
- [ ] Console shows correct rectangle code in data fetch
- [ ] Wave heights change when location changes
- [ ] Wind speeds change when location changes
- [ ] Tide times change when location changes
- [ ] Location name persists in navbar
- [ ] Works on mobile and desktop

---

## 🤔 Alternative Approaches Not Yet Tried

### Option A: Context Provider
Create `LocationContext` to share state globally.
**Pros:** Clean React pattern
**Cons:** Overkill for single value

### Option B: Zustand Store
Global state management library.
**Pros:** Simple, lightweight
**Cons:** New dependency

### Option C: Server-Side Rendering
Force page reload to get fresh state.
**Pros:** Guaranteed to work
**Cons:** Poor UX (full page reload)

### Option D: React Query / SWR
Use data fetching library with global cache.
**Pros:** Built-in state management
**Cons:** Major refactor required

---

## 📝 Lessons Learned

1. **localStorage doesn't trigger React re-renders**
   - Need explicit mechanism (events, URL, context)

2. **Hook instances are independent**
   - Can't share state between components via same hook

3. **URL params are best for shareable page state**
   - Standard Next.js pattern
   - Works with SSR
   - Bookmarkable

4. **Router behavior is complex**
   - `shallow` routing doesn't reload page
   - Query params need special handling
   - `router.isReady` timing matters

---

**Current Status:** ⏳ DEPLOYED, AWAITING VERIFICATION  
**Next Action:** Test in production, check console logs, verify URL navigation  
**Estimated Fix Time:** 10-30 minutes depending on root cause
