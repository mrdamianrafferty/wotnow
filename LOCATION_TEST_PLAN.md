# Location Selection Test Plan

## Quick Test in Production

### Step 1: Open Browser Console
Open https://wotnow.fish/findr/conditions with DevTools open (F12)

### Step 2: Check Initial State
Look for console logs:
```javascript
[Findr Conditions] Conditions source { source: '...', rectangle: '...' }
```
Note the current rectangle code.

### Step 3: Select New Location
1. Click "Set location" in navbar
2. Use map picker (click on map)
3. Or use autocomplete (if you have API key)

### Step 4: Watch Console During Selection
Expected logs in order:
```javascript
// 1. Location picker finds rectangle
[LocationDisplay] Found rectangle: {
  rectangleCode: '37R2',
  region: 'Greek Peloponnese',
  distance: 392.76...
}

// 2. Navigation happens
[LocationDisplay] Location updated successfully: {
  rectangleCode: '37R2',
  region: 'Greek Peloponnese',
  pathname: '/findr/conditions'
}

// 3. URL sync (KEY - if missing, URL reading is broken)
[Conditions] Syncing rectangle from URL: 37R2

// 4. Data refetch
[Findr Conditions] Conditions source {
  source: 'supabase',
  rectangle: '37R2'
}
```

### Step 5: Check URL
After selection, URL should be:
```
https://wotnow.fish/findr/conditions?rectangle=37R2
```

### Step 6: Check Weather Data
- Wave heights should match new location
- Wind speeds should match new location
- Tide times should match new location

---

## 🔴 If Console Log #3 is Missing

**Problem:** useEffect in conditions.tsx not triggering

**Possible causes:**

### Cause A: router.query not updating
**Test:**
```javascript
// Paste in browser console after selecting location:
console.log('router.query:', window.next?.router?.query);
```
**Expected:** `{ rectangle: '37R2' }`
**If empty:** Router not updating query params

### Cause B: router.isReady timing
**Test:**
```javascript
// Check if router is ready:
console.log('router.isReady:', window.next?.router?.isReady);
```
**Expected:** `true`
**If false:** Need to add router.isReady check

### Cause C: Shallow routing not working
**Test:** Check if page actually reloads or just URL changes
**If URL doesn't change:** Navigation not working

---

## 🔴 If Console Log #4 Shows Wrong Rectangle

**Problem:** activeRectangle not updating

**Debug steps:**

1. Add temporary debug log to conditions.tsx:
```typescript
console.log('[DEBUG] State:', {
  rectangleFromUrl,
  selectedCode,
  manualCode,
  manualNormalized,
  activeRectangle
});
```

2. Check which value is stale

---

## 💡 Quick Fix Options

### Fix 1: Add router.isReady check
```typescript
useEffect(() => {
  if (!router.isReady) {
    console.log('[Conditions] Router not ready yet');
    return;
  }
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    console.log('[Conditions] Syncing rectangle from URL:', rectangleFromUrl);
    setSelectedCode(rectangleFromUrl);
    setManualCode('');
  }
}, [router.isReady, rectangleFromUrl, selectedCode, setSelectedCode, setManualCode]);
```

### Fix 2: Force hard navigation
```typescript
// In LocationDisplay.tsx
// Replace router.push with:
window.location.href = `/findr/conditions?rectangle=${rectangleCode}`;
```

### Fix 3: Add more aggressive logging
```typescript
// In conditions.tsx, add after line 45:
useEffect(() => {
  console.log('[Conditions] URL Query Debug:', {
    isReady: router.isReady,
    query: router.query,
    rectangleFromUrl,
    selectedCode,
    pathname: router.pathname
  });
}, [router.isReady, router.query, router.pathname, rectangleFromUrl, selectedCode]);
```

---

## Test Cases

| Test | Action | Expected Result | Pass/Fail |
|------|--------|----------------|-----------|
| 1 | Open /findr/conditions | Shows default location | |
| 2 | Click "Set location" | Modal opens | |
| 3 | Click on map | Shows "Finding area..." | |
| 4 | Wait for lookup | Location name updates | |
| 5 | Check URL | Contains ?rectangle= | |
| 6 | Check console | Shows sync log | |
| 7 | Check weather | Data updates | |
| 8 | Refresh page | Location persists | |
| 9 | Share URL | Opens to correct location | |

---

## Expected Console Output (Full)

```javascript
// Page load
[Findr Conditions] Using fallback ICES rectangle options. Swap in Supabase catalogue.
[Findr Conditions] Conditions source { source: 'fallback', rectangle: null }
[ConditionsDashboard] marineWeather state: { loading: true, ... }

// After initial data load
[Findr Conditions] Conditions source { source: 'supabase', rectangle: '21D8' }
[ConditionsDashboard] marineWeather state: { loading: false, source: 'openmeteo', ... }

// User clicks location picker
// (map picker opens)

// User clicks on Athens
[LocationDisplay] Found rectangle: {
  rectangleCode: '37R2',
  region: 'Greek Peloponnese',
  distance: 392.76,
  location: { name: 'Athens', lat: 37.98, lon: 23.73 }
}

// Navigation happens
[LocationDisplay] Location updated successfully: {
  rectangleCode: '37R2',
  region: 'Greek Peloponnese',
  pathname: '/findr/conditions'
}

// THIS IS THE CRITICAL LOG - if missing, URL sync is broken
[Conditions] Syncing rectangle from URL: 37R2

// Data refetch
[Findr Conditions] Conditions source { source: 'supabase', rectangle: '37R2' }
[ConditionsDashboard] marineWeather state: { loading: true, ... }
[ConditionsDashboard] marineWeather state: { loading: false, source: 'openmeteo', hourlyCount: 48, ... }
```

---

## If All Else Fails

### Nuclear Option: Full Page Reload
```typescript
// In LocationDisplay.tsx, replace router.push with:
window.location.href = `/findr/conditions?rectangle=${rectangleCode}`;
```

**Pros:**
- Guaranteed to work
- Simple implementation
- Forces fresh state

**Cons:**
- Poor UX (full page reload)
- Loses any unsaved state
- Slower than client-side navigation

---

## Report Back

Please run the test and report:

1. ✅ or ❌ for each console log (1-4)
2. Final URL after selection
3. Any error messages
4. Whether weather data updates

This will tell us exactly where the issue is!
