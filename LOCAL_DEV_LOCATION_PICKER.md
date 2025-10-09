# Local Development Setup - Location Picker

## Issues You're Experiencing

### 1. Autocomplete Doesn't Work ❌
**Symptom:** Type in search box, no suggestions appear  
**Cause:** Missing Google Maps API key

### 2. Map Selection Reverts to Galicia ✅ FIXED
**Symptom:** Select location, briefly shows correct one, then reverts  
**Cause:** Race condition with router.reload() - FIXED in commit `d9896a66`

### 3. Navbar Shows "Set location" After Selection ✅ FIXED
**Symptom:** Location name doesn't persist  
**Cause:** Dual component instances (desktop/mobile) with independent state - FIXED in commit `25517d66`

---

## Quick Fix: Get Map Picker Working

The map picker **works without Google API key** (uses OpenStreetMap), but needs the recent fixes deployed.

### Option A: Test in Production (Easiest)

Wait ~5 minutes for Vercel to deploy all fixes, then test at:
```
https://wotnow.fish/findr/conditions
```

### Option B: Pull Latest Code Locally

```bash
cd ~/Projects/WotNow
git pull origin main
npm run dev

# Navigate to http://localhost:3000/findr/conditions
# Click "Set location"
# Use "Pick from map" tab
# Click on coastal area
# Should work now! ✅
```

---

## Full Fix: Enable Autocomplete Locally

### 1. Get Google Maps API Key

1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable these APIs:
   - **Maps JavaScript API**
   - **Places API**
   - **Geocoding API**
4. Create credentials → API Key
5. (Optional) Restrict key to localhost:
   - Application restrictions: HTTP referrers
   - Add: `http://localhost:*/*`

### 2. Add to Local Environment

Create or edit `.env.local`:

```bash
cd ~/Projects/WotNow
cat >> .env.local << 'EOF'

# Google Maps API Key (for location autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
EOF
```

### 3. Restart Dev Server

```bash
# Kill existing server (Ctrl+C)
npm run dev
```

### 4. Test Autocomplete

1. Navigate to http://localhost:3000/findr/conditions
2. Click "Set location"
3. Type "Oviedo" in search box
4. Should see Google Places suggestions ✅

---

## Testing Location Selection

### Without Google API Key (Map Only)

**What works:**
- ✅ "Pick from map" tab
- ✅ Click anywhere on map
- ✅ Rectangle lookup (lat/lon → ICES code)
- ✅ Location persists after selection
- ✅ Data updates for new location

**What doesn't work:**
- ❌ "Search" tab autocomplete (no suggestions)
- ⚠️ Can manually type coordinates if needed

### With Google API Key

**What works:**
- ✅ Everything above, plus:
- ✅ "Search" tab autocomplete
- ✅ Type city/beach names
- ✅ Get suggestions from Google Places
- ✅ Click suggestion → auto-fills location

---

## Manual Testing Without Autocomplete

You can manually test by editing coordinates in browser console:

```javascript
// Open browser console (F12)
// Simulate location selection:
const event = new CustomEvent('test-location', {
  detail: { name: 'Test Location', lat: 42.5, lon: -9.0 }
});
window.dispatchEvent(event);
```

Or use the map picker:
1. Click "Set location"
2. Switch to "Pick from map" tab
3. Zoom to your area
4. Click on coastal point
5. Should trigger rectangle lookup
6. Should persist location name

---

## Verifying Fixes Work

### Test Checklist

After pulling latest code OR waiting for production deploy:

- [ ] Location picker opens
- [ ] Map tab is functional
- [ ] Click on map → Shows loading spinner
- [ ] Loading text: "Finding area..."
- [ ] Location name updates: "Oviedo (Asturias)"
- [ ] Console shows: `[LocationDisplay] Found rectangle: { rectangleCode: '20C5', region: 'Asturias' }`
- [ ] Console shows: `[Findr Conditions] Conditions source { source: 'supabase', rectangle: '20C5' }`
- [ ] Weather data updates (wave heights, wind speeds change)
- [ ] Location persists in navbar
- [ ] Refresh page → Location still shows
- [ ] Desktop and mobile nav show same location

### Expected Console Output

```javascript
// After selecting location:
[LocationDisplay] Found rectangle: {
  rectangleCode: "20C5",
  region: "Asturias",
  distance: 3.2,
  location: { name: "Oviedo", lat: 43.36, lon: -5.84 }
}

[LocationDisplay] Location updated successfully: {
  rectangleCode: "20C5",
  region: "Asturias",
  pathname: "/findr/conditions"
}

// Then data refetch:
[Findr Conditions] Conditions source {
  source: "supabase",
  rectangle: "20C5"
}

[ConditionsDashboard] marineWeather state: {
  loading: false,
  source: "openmeteo",
  hourlyCount: 48,
  dailyCount: 7
}
```

---

## Common Issues & Solutions

### Issue: "Finding area..." Never Finishes

**Cause:** Rectangle lookup API failing  
**Check:** Browser console for errors  
**Fix:** Ensure Supabase is accessible

```bash
# Test API directly:
curl 'http://localhost:3000/api/findr/rectangle-lookup?lat=42.5&lon=-9'

# Should return:
{
  "rectangleCode": "21D8",
  "region": "Galician Coast",
  "centerLat": 42.5,
  "centerLon": -9,
  "distance": 0
}
```

### Issue: Location Reverts After Selection

**Cause:** Old production build (pre-fix)  
**Fix:** Wait for deploy or pull latest code

```bash
git pull origin main
npm run dev
```

### Issue: Navbar Shows "Set location"

**Cause:** Old code without localStorage persistence  
**Fix:** Ensure commit `25517d66` is deployed

```bash
git log --oneline | head -5
# Should show: 25517d66 fix: Persist location name across component instances
```

### Issue: Map Doesn't Load

**Cause:** MapPicker component error  
**Check:** Browser console for errors  
**Fix:** Check if OpenStreetMap tiles are loading

---

## Production vs Local Differences

| Feature | Production | Local (No API Key) | Local (With API Key) |
|---------|------------|-------------------|---------------------|
| Map Picker | ✅ Works | ✅ Works | ✅ Works |
| Rectangle Lookup | ✅ Works | ✅ Works | ✅ Works |
| Search Autocomplete | ✅ Works | ❌ No suggestions | ✅ Works |
| Location Persistence | ✅ Works | ✅ Works | ✅ Works |
| Data Updates | ✅ Works | ✅ Works | ✅ Works |

**Recommendation for local dev:** Map picker is sufficient for testing. Only add Google API key if you need to test autocomplete feature.

---

## Alternative: Test Specific Rectangles

If location picker is problematic, you can test specific rectangles by URL:

```bash
# Test Galician Coast
open http://localhost:3000/findr/conditions?rectangle=21D8

# Test Asturias
open http://localhost:3000/findr/conditions?rectangle=20C5

# Test Portuguese Coast
open http://localhost:3000/findr/conditions?rectangle=22D6

# Test Polish Baltic
open http://localhost:3000/findr/conditions?rectangle=22L5
```

Or use the conditions page selector:
1. Go to `/findr/conditions`
2. Scroll down to "Fishing area" section
3. Use dropdown to select rectangle
4. Or type rectangle code in manual input

---

## Summary

**Minimum to work locally:** Map picker (no Google API key needed)  
**For full experience:** Add Google Maps API key to `.env.local`  
**Quick test:** Use production site after deploy completes  
**Alternative:** Use rectangle code URL parameter

**Status of fixes:**
- ✅ Race condition fixed (commit `d9896a66`)
- ✅ Location persistence fixed (commit `25517d66`)
- ⏳ Deploy in progress (~5 minutes)
- 🧪 Ready for testing after deploy

---

## Next Steps

1. **Wait for deploy** (~5 mins) OR pull latest code
2. **Test map picker** (should work without API key)
3. **Verify location persists** in navbar
4. **Confirm data updates** when location changes
5. **(Optional) Add Google API key** for autocomplete

If issues persist after pulling latest code, check:
- Browser console for errors
- Network tab for failed API calls
- localStorage (F12 → Application → Local Storage → `findr_location_name`)
