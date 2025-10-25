# Google Places Autocomplete Timing Fix

**Date:** October 25, 2025
**Status:** ✅ DEPLOYED
**Commit:** 4288513d

## Problem

Google Places autocomplete worked in `/settings` but failed in other locations throughout Go Daisy and Findr.

### Root Cause

Timing issue between hook initialization and Google Maps API loading:

1. **CoastalLocationDialog** component mounts with `usePlacesAutocompleteNew` hook initialized at top level
2. Hook sets up event listeners waiting for `googleMapsLoaded` event
3. But `loadGoogleMapsAPI()` was only called when dialog opened (in a `useEffect` dependent on `open` prop)
4. If component mounted before dialog opened, hook would wait indefinitely for event that hadn't been dispatched yet

### Why It Worked in /settings

- Dialog likely opened immediately on that page, triggering the API load before user interaction
- Or Google Maps was already loaded from another source
- Timing happened to work out correctly

## Solution

Modified `usePlacesAutocompleteNew` hook to proactively load Google Maps API when hook initializes.

### Changes Made

**File:** `lib/hooks/usePlacesAutocompleteNew.ts`

1. **Added import:**
   ```typescript
   import { loadGoogleMapsAPI } from '../googleMapsLazy';
   ```

2. **Modified initialization logic:**
   ```typescript
   // Check if Google Maps is already loaded (fast page loads)
   if (window.google?.maps) {
     console.log('✅ Google Maps already loaded, initializing immediately');
     initService();
   } else {
     // Not loaded yet - proactively start loading AND listen for completion
     console.log('🚀 Proactively loading Google Maps API...');
     loadGoogleMapsAPI().catch(err => {
       console.error('Failed to load Google Maps for autocomplete:', err);
     });

     // Set up event listeners for when loading completes
     window.addEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
     window.addEventListener('googleMapsLoadError', handleGoogleMapsError);

     // Cleanup listeners on unmount
     return () => {
       window.removeEventListener('googleMapsLoaded', handleGoogleMapsLoaded);
       window.removeEventListener('googleMapsLoadError', handleGoogleMapsError);
     };
   }
   ```

### How It Works Now

1. **Component mounts** → Hook initializes
2. **Hook checks** if Google Maps already loaded
3. If not loaded → **Proactively calls** `loadGoogleMapsAPI()`
4. **Sets up event listeners** for completion
5. When API loads → **Event fires** → Hook initializes autocomplete service
6. User can now **search immediately** without waiting for dialog to open

### Safety Considerations

- `loadGoogleMapsAPI()` is **idempotent** - safe to call multiple times
- Returns existing promise if already loading
- Returns resolved promise if already loaded
- CoastalLocationDialog's own loading call remains (provides user feedback UI)

## Pages Fixed

This fix applies to all pages using `CoastalLocationDialog`:

- ✅ `pages/index.tsx` - Go Daisy home page
- ✅ `pages/account.tsx` - Account settings
- ✅ `pages/weather.tsx` - Weather dashboard
- ✅ Any Findr pages using location picker

## Testing

### Manual Test Plan

1. Navigate to Go Daisy home page (`/`)
2. Click location picker button
3. Type in search field (e.g., "San Francisco")
4. **Expected:** Autocomplete suggestions appear immediately
5. Repeat on other pages (weather, account, Findr conditions)

### What to Check

- ✅ Autocomplete suggestions appear when typing
- ✅ No console errors about Google Maps
- ✅ Console shows: "🚀 Proactively loading Google Maps API..."
- ✅ Followed by: "✅ Google Places Autocomplete ready"

## Related Documentation

- `GOOGLE_AUTOCOMPLETE_FIX_APPLIED.md` - Previous event-based loading fix
- `GOOGLE_AUTOCOMPLETE_DIAGNOSIS.md` - Original race condition diagnosis
- `GOOGLE_MAPS_LOADER_FIX.md` - Migration to @googlemaps/js-api-loader

## Technical Notes

### Why Event-Based Pattern Still Used

The hook maintains the event-based pattern from previous fixes:

1. **Proactive loading** ensures API loads early
2. **Event listeners** handle async completion
3. **Graceful handling** of multiple initialization paths
4. **Error recovery** through event-based error handling

### Performance Impact

- **Before:** Google Maps loaded only when dialog opened (on-demand)
- **After:** Google Maps loads as soon as location picker component mounts
- **Trade-off:** Slightly earlier loading (when component mounts vs. when dialog opens)
- **Benefit:** Eliminates timing issues, provides instant autocomplete

The performance impact is minimal because:
- Component typically mounts shortly before user interaction anyway
- Loading is still lazy (not on initial page load)
- Loader is smart about caching and preventing duplicate loads

## Future Improvements

Potential optimizations (not currently needed):

1. **Preload on page load** - Load Google Maps API globally on app startup
   - Pro: Instant autocomplete everywhere
   - Con: Increases initial page load time

2. **Service Worker caching** - Cache Google Maps API in service worker
   - Pro: Offline support, faster loads
   - Con: Additional complexity

3. **Intersection Observer** - Load when picker becomes visible
   - Pro: Even more lazy loading
   - Con: Still has timing issues if component not visible when needed
