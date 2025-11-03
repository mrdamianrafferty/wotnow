# EBWBL Integration Verification Guide

**How to verify EBWBL tiles are loading successfully**

---

## Method 1: Browser DevTools (Network Tab) ✅ DEFINITIVE

### Step-by-Step

1. **Open Findr** in your browser
2. **Open DevTools**:
   - Chrome/Edge: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Firefox: `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. **Go to Network tab**
4. **Filter by "tiles.emodnet"** or just "emodnet"
5. **Click "Depth" button** in the map
6. **Look for requests to**:

```
✅ EBWBL tiles (should see these):
https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/10/501/381.png
https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/10/502/381.png
... (multiple tiles)

Status: 200 OK
Size: 50-140 KB
Time: 50-250ms
Type: png
```

**If you see these URLs with 200 status, EBWBL is working! ✅**

### What You Should See

**Network Tab Output**:
```
Name                                          Status  Type    Size      Time
─────────────────────────────────────────────────────────────────────────────
10/501/381.png                                200     png     122 KB    65ms
10/502/381.png                                200     png     135 KB    72ms
10/503/381.png                                200     png     118 KB    58ms
```

**Request Headers**:
- **Domain**: `tiles.emodnet-bathymetry.eu`
- **Path**: `/2020/baselayer/web_mercator/{z}/{x}/{y}.png`
- **Response**: Image data

---

## Method 2: Visual Comparison 👁️

### Before/After Comparison

**Test Location**: Bay of Biscay (coordinates: 43.5°N, -5.5°W)

1. **Navigate to test location**
2. **Set zoom to level 10**
3. **Click "Depth" button**

**What to Look For**:

| Feature | WMS Only (Old) | EBWBL + WMS (New) |
|---------|----------------|-------------------|
| **Tile Loading Speed** | 300-500ms | 50-150ms |
| **Depth Detail** | Moderate | High |
| **Edge Sharpness** | Slightly blurry | Crisp |
| **Zoom 12-14 Quality** | Pixelated | Detailed |

### Visual Indicators of Success

✅ **Sharp depth contours** at high zoom
✅ **Fast tile loading** (no long waits)
✅ **Detailed coastal bathymetry** (not blocky)
✅ **Smooth panning** with quick tile refresh

---

## Method 3: Console Logging (Developer Mode)

### Add Temporary Console Logs

Add this to `ConditionsMap.tsx` after line 399 for debugging:

```typescript
<TileLayer
  url="https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png"
  attribution='© <a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry Consortium (EBWBL)</a>'
  maxZoom={14}
  minZoom={2}
  opacity={0.6}
  errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
  eventHandlers={{
    loading: () => console.log('🗺️ EBWBL tile loading...'),
    load: () => console.log('✅ EBWBL tile loaded successfully'),
    tileerror: (error) => console.error('❌ EBWBL tile error:', error)
  }}
/>
```

**Then check Browser Console**:
- ✅ Should see: `✅ EBWBL tile loaded successfully` (many times)
- ❌ Should NOT see: `❌ EBWBL tile error` (frequently)

---

## Method 4: Compare with Fallback WMS

### Test Fallback Mechanism

**Scenario 1: Both Working**
1. Click "Depth" button
2. Network tab shows:
   - ✅ EBWBL tiles loading (200 OK)
   - ✅ WMS requests (underneath, also 200 OK)
3. Map shows high-resolution EBWBL tiles

**Scenario 2: EBWBL Fails (Testing)**

To test fallback, temporarily break EBWBL URL:

```typescript
// TEMPORARY - for testing only
url="https://tiles.emodnet-bathymetry.eu/2020/baselayer/BROKEN/{z}/{x}/{y}.png"
```

Expected behavior:
- ❌ EBWBL tiles fail (404)
- ✅ WMS layer visible underneath
- Map still shows depth (lower resolution)

**Then revert to correct URL**.

---

## Method 5: Lighthouse Performance Test

### Before EBWBL
```bash
npm run dev
# Open http://localhost:3000/findr
# Chrome DevTools → Lighthouse → Run Performance Audit
```

**Metrics to compare**:
- **Largest Contentful Paint (LCP)**: Should improve
- **Network payload**: Similar or slightly higher (tiles are cached)
- **Time to Interactive**: Should improve

### After EBWBL
- **Faster tile loading** should improve LCP
- **CDN caching** should reduce subsequent loads

---

## Method 6: Test at Different Zoom Levels

EBWBL quality is most visible at **high zoom levels**.

### Zoom Level Comparison

| Zoom | EBWBL Quality | WMS Quality | Difference |
|------|---------------|-------------|------------|
| z4-6 | Good | Good | Minimal |
| z7-9 | Excellent | Good | Noticeable |
| z10-12 | Excellent | Fair | Very noticeable |
| z13-14 | Excellent | Pixelated | **Significant** |

**Test at zoom 12**:
1. Navigate to any coastal area
2. Zoom to level 12
3. Click "Depth"
4. Look for sharp, detailed bathymetry (not blocky)

If you see **crisp, high-resolution depth contours**, EBWBL is working! ✅

---

## Quick Verification Checklist

Before deploying to production, verify:

- [ ] Network tab shows `tiles.emodnet-bathymetry.eu` requests
- [ ] Tile URLs include `/web_mercator/` in the path
- [ ] HTTP status is `200 OK` (not 404)
- [ ] Tile sizes are 50-140 KB (PNG format)
- [ ] Response times are <250ms on first load
- [ ] Map shows sharp depth details at zoom 10+
- [ ] No console errors related to tile loading
- [ ] WMS fallback layer renders underneath (check with different opacities)

---

## Troubleshooting

### Issue: No EBWBL tiles in Network tab

**Possible causes**:
1. ❌ `layerMode` not set to `'depth'` (check state)
2. ❌ Component not rendering (check React DevTools)
3. ❌ URL incorrect (check for `/web_mercator/`)

**Fix**: Check `layerMode === 'depth'` when "Depth" button clicked

### Issue: 404 errors for EBWBL tiles

**Possible causes**:
1. ❌ Missing `/web_mercator/` in URL
2. ❌ Invalid zoom level (outside z2-z14)
3. ❌ Incorrect tile coordinates

**Fix**: Verify URL pattern matches:
```
https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png
```

### Issue: EBWBL tiles load but map looks the same

**Possible causes**:
1. ⚠️ Opacity too low (check `opacity={0.6}`)
2. ⚠️ WMS layer on top (check render order)
3. ⚠️ Zoom level too low (test at z10+)

**Fix**: Increase opacity or zoom in to see detail difference

---

## Expected Production Behavior

### Normal Operation

1. User clicks "Depth" button
2. EBWBL tiles load first (50-150ms per tile)
3. WMS layer loads underneath as fallback
4. Map shows high-resolution bathymetry
5. User zooms/pans → new EBWBL tiles load quickly

### Fallback Scenario (Rare)

1. User clicks "Depth" button
2. EBWBL tile request fails (network issue, service down)
3. Transparent pixel shown (errorTileUrl)
4. WMS layer visible underneath
5. Map still shows bathymetry (lower resolution)

---

## Verification Command

Run test scripts to verify EBWBL service is accessible:

```bash
# Test EBWBL tile availability
npx tsx scripts/test-ebwbl-availability.ts

# Expected output:
# ✅ Europe Overview (z4)   - 227ms, 139 KB
# ✅ Asturias Coast (z8)    - 65ms, 135 KB
# ✅ Bay of Biscay (z10)    - 65ms, 122 KB
# ✅ Maximum Detail (z14)   - 54ms, 49 KB
# 🎉 All tests passed!
```

If tests pass, EBWBL service is working! ✅

---

## Summary: Quick Visual Test

**Easiest way to verify EBWBL is working**:

1. Open Findr in Chrome/Firefox
2. Open DevTools Network tab (`F12`)
3. Filter by "tiles.emodnet"
4. Click "Depth" button in map
5. **Look for**: `tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/...`

**If you see these URLs with 200 OK status, EBWBL integration is successful! ✅**

No full-screen mode needed - the integration is working in the existing ConditionsMap component.
