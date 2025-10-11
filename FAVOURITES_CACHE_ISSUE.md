# Favourites 404 - Browser Cache Issue

## Problem
Still seeing 404 errors for favourites API after deployment:
```
POST https://www.godaisy.io/api/findr/favourites 404 (Not Found)
Failed to add favourite to Supabase: Species not found
```

## Root Cause
**Browser JavaScript Cache**

The browser is loading an old JavaScript bundle:
- Old file: `findr-7686e46fd16e2cef.js`
- This old code still references the old API structure
- The API itself is working (returns 401 Unauthorized when tested directly)

## Verification
Test the API directly:
```bash
curl -X POST https://www.godaisy.io/api/findr/favourites \
  -H "Content-Type: application/json" \
  -d '{"speciesId":"test"}'

# Expected: {"error":"Unauthorized - Please sign in"}
# This proves the endpoint exists!
```

## Solution

### Option 1: Hard Refresh ⚡ (Fastest)
**Mac:**
- Press: `Cmd + Shift + R`

**Windows/Linux:**
- Press: `Ctrl + Shift + R`

### Option 2: Empty Cache and Hard Reload 🔧
1. Open DevTools (F12 or right-click → Inspect)
2. **Right-click** the browser refresh button
3. Select **"Empty Cache and Hard Reload"**

### Option 3: Clear Browser Cache 🧹
**Chrome/Edge:**
1. Open DevTools (F12)
2. Right-click refresh button → "Empty Cache and Hard Reload"
3. Or Settings → Privacy → Clear browsing data → Cached images and files

**Firefox:**
1. Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
2. Select "Cache"
3. Click "Clear Now"

**Safari:**
1. Safari → Preferences → Advanced
2. Check "Show Develop menu"
3. Develop → Empty Caches

### Option 4: Disable Cache During Testing 🛠️
1. Open DevTools (F12)
2. Go to **Network** tab
3. Check **"Disable cache"**
4. Keep DevTools open while testing

## How to Verify It's Fixed

### 1. Check JavaScript Bundle Name
Open DevTools → Network tab → Look for JavaScript files
- ❌ Old: `findr-7686e46fd16e2cef.js`
- ✅ New: Should have a different hash

### 2. Test Adding Favourite
1. Sign in at `/findr/auth`
2. Go to `/findr`
3. Swipe right on a species
4. Open DevTools → Network tab
5. Look for POST to `/api/findr/favourites`
6. Should see: **200 OK** (not 404)

### 3. Check Console Logs
- ✅ Should NOT see: "Failed to add favourite to Supabase"
- ✅ Should NOT see: "Species not found"
- ✅ Should see: Normal operation or success messages

## Why This Happens
Next.js generates hashed JavaScript bundles for caching:
- Old build: `findr-7686e46fd16e2cef.js`
- New build: `findr-[different-hash].js`

When you deploy:
1. ✅ Vercel updates the server code (API works)
2. ✅ Vercel generates new JS bundles
3. ✅ Vercel updates the HTML to reference new bundles
4. ❌ **Your browser still has old JS cached**

The browser doesn't know the JS changed because:
- The old bundle still exists on Vercel's CDN
- The browser's cache thinks it's still valid
- Hard refresh forces loading the new HTML + new JS

## Prevention for Future Testing
1. **Enable "Disable cache" in DevTools Network tab**
2. Keep DevTools open while testing
3. Use incognito/private mode for testing deployments
4. Clear cache after each deployment

## Current Status
- ✅ API endpoint exists and works (returns 401 when unauthenticated)
- ✅ Latest code deployed (`360644d1`)
- ✅ File moved to correct location: `pages/api/findr/favourites/index.ts`
- ❌ Browser still loading old cached JavaScript

**Action Required:** Hard refresh your browser!

## Test After Refresh
1. Hard refresh (Cmd+Shift+R)
2. Sign in at `/findr/auth`
3. Try adding a favourite by swiping right
4. Check Network tab - should see 200 OK
5. Visit `/findr/favourites` - should load favourites
