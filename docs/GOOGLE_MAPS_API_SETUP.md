# Google Maps API Configuration Guide

## The Problem

You're seeing this error:
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: https://fishfindr.eu/findr/my-catches
```

This means the Google Maps API key has **HTTP referrer restrictions** enabled, but your domains aren't whitelisted.

## Quick Fix

### 1. Go to Google Cloud Console

1. Visit: https://console.cloud.google.com/google/maps-apis/credentials
2. Find your API key (the one in `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
3. Click on the key name to edit it

### 2. Update Application Restrictions

Scroll to **"Application restrictions"** section and ensure these referrers are added:

#### Production Domains
```
https://fishfindr.eu
https://*.fishfindr.eu
https://godaisy.io
https://*.godaisy.io
```

**Note:** Do NOT add paths like `/*` - Google only supports domain-level restrictions, not path-level.

#### Vercel Preview Deployments (optional but recommended)
```
https://*.vercel.app
```

#### Local Development (optional, for testing)
```
http://localhost:3000/*
http://localhost:*/*
```

### 3. Save Changes

Click **"Save"** at the bottom of the page.

⚠️ **Note:** Changes can take up to 5 minutes to propagate.

## Why This Happens

The Google Maps API key has security restrictions to prevent unauthorized use. When you set "HTTP referrers" restrictions, only requests from whitelisted domains will work.

### Your Current Domains

- **Findr**: `fishfindr.eu` (fishing predictions)
- **Go Daisy**: `godaisy.io` (general activities)

Both apps use the same Google Maps API key for location autocomplete.

## Testing the Fix

After updating the referrers:

1. Wait 5 minutes for changes to propagate
2. Hard refresh the page (Cmd/Ctrl + Shift + R)
3. Try the location picker again
4. Check browser console - the error should be gone

## What Gets Fixed

Once configured, these features will work:

✅ Location autocomplete in "Set Your Fishing Location" modal
✅ Place search in account settings
✅ Map-based location picker
✅ GPS-based location detection
✅ Rectangle code lookup from coordinates

## Alternative: Temporarily Remove Restrictions (NOT RECOMMENDED)

If you need an immediate fix for testing:

1. Go to API key settings
2. Change "Application restrictions" to **"None"**
3. Click "Save"

⚠️ **Warning:** This removes all security restrictions and allows anyone to use your API key. Only do this temporarily for testing, then re-enable restrictions!

## API Key Best Practices

1. **Always use referrer restrictions in production**
2. Use separate API keys for development and production
3. Enable only the APIs you need:
   - Maps JavaScript API
   - Places API (for autocomplete)
   - Geocoding API (if using reverse geocoding)
4. Set up billing alerts to avoid surprise charges
5. Regenerate keys if they're ever exposed publicly

## Troubleshooting

### Error still appears after 5 minutes?

- Clear browser cache completely
- Check the exact URL in the error matches what you whitelisted
- Verify you saved changes in Google Cloud Console
- Make sure you're editing the correct API key

### Different error codes?

- `ApiNotActivatedMapError` - Enable "Maps JavaScript API" in Google Cloud Console
- `InvalidKeyMapError` - Check your API key is correct in `.env` files
- `OverQueryLimitError` - You've exceeded your API quota

## Related Files

- `.env.example` - Template for environment variables
- `lib/googleMaps.ts` - Google Maps initialization
- `lib/googleMapsLazy.ts` - Lazy loading for maps
- `components/LocationPicker.tsx` - Location selection UI

## Need Help?

If you're still seeing errors after following this guide:

1. Check browser console for the exact error message
2. Verify the API key in Vercel environment variables matches Cloud Console
3. Test with API restrictions temporarily disabled to isolate the issue
4. Check Google Cloud Console > APIs & Services > Dashboard for usage/errors
