# Google Maps API - AutocompleteService vs PlacesService

## Why Autocomplete Worked But Tackle Shop Finder Didn't

### CoastalLocationDialog (Location Search)
**File:** `lib/hooks/usePlacesAutocompleteNew.ts`

**Uses:** `AutocompleteService.getPlacePredictions()`
```typescript
const { AutocompleteService } = await google.maps.importLibrary('places');
autocompleteService.getPlacePredictions(request, callback);
```

**API Required:** ✅ **Maps JavaScript API ONLY**
- This is part of the core JavaScript library
- Works with just Maps JavaScript API enabled
- **This is why autocomplete worked before**

---

### Tackle Shop Finder (Nearby Search)
**File:** `lib/findNearbyTackleShops.ts`

**Uses:** `PlacesService.nearbySearch()`
```typescript
const service = new google.maps.places.PlacesService(document.createElement('div'));
service.nearbySearch(request, callback);
```

**API Required:** ✅ **Maps JavaScript API + Places API (backend)**
- This makes backend web service calls to Places API
- Requires the separate **Places API** to be enabled
- **This is why tackle shop finder failed before**

---

## What Changed 30 Minutes Ago

You enabled the **Places API** (backend web service), which unlocked:
- ✅ `PlacesService.nearbySearch()` - Tackle shop finder
- ✅ `PlacesService.getDetails()` - Detailed place information
- ✅ `PlacesService.textSearch()` - Text-based searches

## Current Status

Now that Places API is enabled, both features should work... **BUT** we still have the referrer restriction blocking requests.

The error you're seeing is likely:
```
RefererNotAllowedMapError
Your site URL to be authorized: https://fishfindr.eu/findr/log
```

## Next Steps

1. **Add path-specific referrers** in Google Cloud Console:
   ```
   https://fishfindr.eu/*
   https://fishfindr.eu/findr/*
   https://godaisy.io/*
   ```

2. **OR** if API restrictions are set to specific APIs (not "Don't restrict key"):
   - Make sure BOTH are selected:
     - Maps JavaScript API ✅
     - Places API ✅

3. **Test** at fishfindr.eu/findr/log after 2-3 minutes

## Summary

| Feature | API Service | Required APIs | Status Before | Status Now |
|---------|-------------|---------------|---------------|------------|
| Location Autocomplete | `AutocompleteService` | Maps JavaScript API | ✅ Working | ✅ Working |
| Tackle Shop Finder | `PlacesService` | Maps JavaScript API + **Places API** | ❌ Failed | ⏳ Should work (need referrer fix) |

The tackle shop finder should work now that Places API is enabled, once we fix the referrer restrictions!
