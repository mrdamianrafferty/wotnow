# New Google Maps API Key

## Key Information

**New Key:** `AIzaSyAFRNBOsCDbyQgx4okTKTGdfIkexhZaRl0`
**Created:** October 28, 2025
**Name:** FishFindr Production Oct 2025

**Old Key (now deprecated):** `AIzaSyBvUzTUyaNiTufKVIMa5Wh087VMkxpf61Q`

## Why We Created a Fresh Key

The old key was blocked even with "None" restrictions, indicating corruption or cache issues in Google's system. Creating a completely fresh key bypasses any stuck state.

## Configuration

**Application Restrictions:** Websites

**Website Restrictions:**
```
http://localhost:3000
https://fishfindr.eu
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

**API Restrictions:** Don't restrict key (allows all Google Maps APIs)

**APIs Enabled:**
- ✅ Maps JavaScript API
- ✅ Places API (Legacy)
- ✅ Places API (New)
- ✅ Geocoding API

## Deployment Status

**Local:** ✅ Updated in `.env.local`
**Vercel Production:** ✅ Updated
**Vercel Preview:** ✅ Updated
**Vercel Development:** ✅ Updated

**Deployment triggered:** October 28, 2025

## Testing After Deployment

Wait 3-5 minutes for Vercel deployment to complete, then test:

### 1. Location Autocomplete
- URL: https://fishfindr.eu/findr/log
- Hard refresh: Cmd+Shift+R
- Type in location search
- Should work without errors ✅
- Console should show: "✅ Google Places AutocompleteSuggestion ready"

### 2. Tackle Shop Finder
- URL: https://fishfindr.eu/findr/info
- Scroll to tribute section
- Should see "Find Your Nearest Tackle Shop"
- Should load shops automatically when location is set ✅

### 3. Catch Logging
- URL: https://fishfindr.eu/findr/my-catches
- Location autocomplete should work
- Catch logging should succeed (foreign keys fixed) ✅

## Delete Old Key After Testing

Once the new key works successfully:
1. Go to: https://console.cloud.google.com/apis/credentials
2. Find old key: `AIzaSyBvUzTUyaNiTufKVIMa5Wh087VMkxpf61Q`
3. Click ⋮ → Delete

This prevents being billed for two keys.
