# Check Which Google APIs Are Enabled

Your API key might be working for the Maps JavaScript API but failing for the Places API calls.

## Quick Check

Go to your Google Cloud Console and verify BOTH these APIs are enabled:

### 1. Maps JavaScript API
https://console.cloud.google.com/apis/library/maps-backend.googleapis.com

Should show: **"API enabled"** with a green checkmark

### 2. Places API (NEW)
https://console.cloud.google.com/apis/library/places-backend.googleapis.com

Should show: **"API enabled"** with a green checkmark

### 3. Places API (Legacy - may also need this)
https://console.cloud.google.com/apis/api/places-backend.googleapis.com/overview

Should show: **"API enabled"**

## Why This Matters

The JavaScript API's `PlacesService.nearbySearch()` and `Autocomplete` make backend calls to the **Places API**.

You might see:
- ✅ Map loads successfully (Maps JavaScript API works)
- ✅ Autocomplete initializes (JavaScript loaded)
- ❌ Error when typing (Places API calls fail)

This matches your symptoms exactly!

## Fix

If either API is NOT enabled:

1. Click **"ENABLE"** button
2. Wait 1-2 minutes for propagation
3. Test again at fishfindr.eu/findr/log

## Also Check: API Restrictions

While you're there, verify your API key has these settings:

**Application restrictions** → **HTTP referrers (web sites)**

Add these patterns:
```
http://localhost:3000
https://fishfindr.eu
https://fishfindr.eu/*
https://fishfindr.eu/findr/*
https://*.fishfindr.eu
https://godaisy.io
https://godaisy.io/*
https://*.godaisy.io
```

**API restrictions** → **Don't restrict key** (or select both Maps JavaScript API + Places API)

## Test After Changes

1. Wait 2-3 minutes
2. Hard refresh (Cmd+Shift+R)
3. Try typing in location search at fishfindr.eu/findr/log
4. Check browser console for errors
