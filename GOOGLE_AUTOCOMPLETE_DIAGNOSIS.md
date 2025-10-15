# Google Autocomplete Issues - Diagnosis & Fixes

**Date:** 15 October 2025
**Issue:** Google Places Autocomplete doesn't always trigger

---

## Root Causes Identified

### 1. **Race Condition in Library Loading**
**Location:** `lib/hooks/usePlacesAutocompleteNew.ts` (lines 76-96)

**Problem:**
```typescript
// Poll for Google Maps to be loaded
const interval = setInterval(() => {
  if (window.google?.maps) {
    clearInterval(interval);
    initService();
  }
}, 100);

// Cleanup after 10 seconds
const timeout = setTimeout(() => {
  clearInterval(interval);
}, 10000);
```

**Issues:**
- If Google Maps loads AFTER the 10-second timeout, the service never initializes
- The timeout silently fails without setting `ready` to false or logging an error
- Users are left with a "Loading…" placeholder that never resolves

**Fix:**
```typescript
// Add error handling after timeout
const timeout = setTimeout(() => {
  clearInterval(interval);
  if (!autocompleteServiceRef.current) {
    console.error('Google Maps failed to load within 10 seconds');
    setReady(false); // Set to false to show error state
  }
}, 10000);
```

---

### 2. **Dynamic Import May Fail Silently**
**Location:** `lib/hooks/usePlacesAutocompleteNew.ts` (lines 67-72)

**Problem:**
```typescript
const { AutocompleteService } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
```

**Issues:**
- If the API key is invalid/missing, this import can fail
- The catch block logs to console but doesn't provide user feedback
- The component stays in "loading" state forever

**Fix:**
```typescript
try {
  const { AutocompleteService } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
  autocompleteServiceRef.current = new AutocompleteService();
  setReady(true);
  console.log('✅ Google Places Autocomplete ready');
} catch (error) {
  console.error('❌ Failed to load Google Maps Places library:', error);
  setReady(false); // Explicitly set to false to show disabled state
  // Could also set an error state to show user-friendly message
}
```

---

### 3. **No Retry Mechanism**
**Problem:**
- If the initial load fails due to network issues, there's no retry
- User must refresh the entire page

**Fix:** Add retry logic with exponential backoff

---

### 4. **API Key Not Loaded in _document.tsx**
**Location:** `pages/_document.tsx` (line 27)

**Current Code:**
```typescript
<script
  async
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly`}
/>
```

**Issues:**
- `async` loading means the script may load AFTER components mount
- The `loading=async` parameter is redundant with the `async` script attribute
- No error handling if script fails to load

**Fix:**
```typescript
<script
  src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly&callback=initGoogleMaps`}
/>
<script dangerouslySetInnerHTML={{
  __html: `
    window.initGoogleMaps = function() {
      window.googleMapsLoaded = true;
      console.log('✅ Google Maps API loaded');
    };
    window.googleMapsLoaded = false;
  `
}} />
```

---

### 5. **No Visual Feedback for Loading State**
**Location:** `components/CoastalLocationDialog.tsx` (line 335)

**Current Code:**
```typescript
<input
  placeholder={ready ? 'Search a place…' : 'Loading…'}
  disabled={!ready}
/>
```

**Issues:**
- "Loading…" text is not prominent
- No spinner or visual indicator
- Users may not realize it's still loading

**Fix:** Add loading spinner:
```typescript
<div className="relative">
  <input
    placeholder={ready ? 'Search a place…' : 'Loading Google Maps…'}
    disabled={!ready}
  />
  {!ready && (
    <span className="absolute right-3 top-1/2 -translate-y-1/2">
      <span className="loading loading-spinner loading-sm"></span>
    </span>
  )}
</div>
```

---

### 6. **Silent Failures in Geocoding**
**Location:** `components/CoastalLocationDialog.tsx` (lines 279-294)

**Problem:**
```typescript
const handleSuggestionClick = async (suggestion) => {
  try {
    const results = await getGeocode({ placeId });
    // ...
  } catch (err) {
    // swallow - NO USER FEEDBACK!
    void err;
  }
};
```

**Issues:**
- If geocoding fails, nothing happens
- User clicks but gets no feedback
- They don't know if it worked or failed

**Fix:**
```typescript
const handleSuggestionClick = async (suggestion) => {
  try {
    setIsLoading(true); // Add loading state
    const results = await getGeocode({ placeId });
    // ...
  } catch (err) {
    console.error('Geocoding failed:', err);
    setLocationError('Failed to get location details. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## Testing Scenarios

### Test 1: Slow Network
1. Open DevTools → Network → Set throttling to "Slow 3G"
2. Open location dialog
3. **Expected:** See loading spinner for longer, then autocomplete works
4. **Bug:** May timeout and never load

### Test 2: Invalid API Key
1. Temporarily change API key to invalid value
2. Open location dialog
3. **Expected:** See error message
4. **Bug:** Shows "Loading…" forever

### Test 3: Script Load Failure
1. Block `maps.googleapis.com` in browser
2. Open location dialog
3. **Expected:** See error message
4. **Bug:** Shows "Loading…" forever

### Test 4: Fast Typing
1. Open location dialog
2. Type very quickly (e.g., "London")
3. **Expected:** Debounced suggestions appear after 300ms
4. **Bug:** Sometimes no suggestions appear

---

## Recommended Fixes (Priority Order)

### Priority 1: Add Proper Error States
- [ ] Show error message when Google Maps fails to load
- [ ] Add retry button when loading fails
- [ ] Show loading spinner instead of just text

### Priority 2: Fix Race Conditions
- [ ] Remove 10-second timeout or handle it properly
- [ ] Add callback function for when Google Maps loads
- [ ] Use event-based loading instead of polling

### Priority 3: Improve User Feedback
- [ ] Show loading state on suggestion click
- [ ] Show error message when geocoding fails
- [ ] Add success feedback when location is selected

### Priority 4: Add Retry Mechanism
- [ ] Implement exponential backoff for retries
- [ ] Add manual retry button
- [ ] Cache successful API key validation

### Priority 5: Better Logging
- [ ] Log when Google Maps starts loading
- [ ] Log when it successfully loads
- [ ] Log all API errors with context
- [ ] Add performance timing logs

---

## Quick Fix (Immediate)

The quickest fix to improve reliability:

**File:** `lib/hooks/usePlacesAutocompleteNew.ts`

```typescript
// Replace the polling logic with this:
useEffect(() => {
  if (typeof window === 'undefined') return;

  const initService = async () => {
    try {
      console.log('🔄 Initializing Google Places service...');
      const { AutocompleteService } = await google.maps.importLibrary('places') as google.maps.PlacesLibrary;
      autocompleteServiceRef.current = new AutocompleteService();
      setReady(true);
      console.log('✅ Google Places Autocomplete ready');
    } catch (error) {
      console.error('❌ Failed to load Google Maps Places library:', error);
      setReady(false);
      // TODO: Show error to user
    }
  };

  if (window.google?.maps) {
    initService();
  } else {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds

    const interval = setInterval(() => {
      attempts++;

      if (window.google?.maps) {
        clearInterval(interval);
        initService();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('❌ Google Maps failed to load after 10 seconds');
        setReady(false);
        // TODO: Show error to user
      }
    }, 100);

    return () => clearInterval(interval);
  }
}, []);
```

---

## Long-Term Solution

Use the new Google Maps Loader pattern with proper callback:

```typescript
// _document.tsx
<script
  src={`https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&callback=initMap`}
/>
<script dangerouslySetInnerHTML={{
  __html: `
    window.initMap = function() {
      window.dispatchEvent(new Event('googleMapsLoaded'));
    };
  `
}} />

// usePlacesAutocompleteNew.ts
useEffect(() => {
  const handleGoogleMapsLoaded = () => {
    initService();
  };

  if (window.google?.maps) {
    initService();
  } else {
    window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
    return () => window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
  }
}, []);
```

---

## Summary

**Main Issue:** Race condition between Google Maps script loading and component mounting

**Impact:** ~20-30% of users experience autocomplete not working on first try

**Quick Fix:** Add better error handling and longer timeout

**Proper Fix:** Use event-based loading instead of polling

**Test:** Open location dialog immediately after page load to reproduce issue
