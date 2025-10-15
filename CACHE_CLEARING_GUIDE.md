# 🔄 Cache Clearing Guide - Phase 10

**Date:** 12 October 2025  
**Issue:** Stale cached predictions without environmental data  
**Solution:** Clear database cache and browser cache

---

## 🐛 The Problem

When you update the prediction function (like we did for Phase 10), the **database cache table** (`findr_prediction_sessions`) still contains old predictions without environmental data.

The frontend fetches from cache first, so even though the API works correctly with `bypassCache: true`, the normal flow returns stale data.

---

## ✅ The Solution

### Step 1: Clear Database Cache

Choose one of these scripts depending on your needs:

**Option A: Clear specific rectangle**
```bash
node scripts/clear-prediction-cache.js <rectangle> <date>

# Example:
node scripts/clear-prediction-cache.js 31F1 2025-10-12
```

**Option B: Clear all rectangles for a date (recommended)**
```bash
node scripts/clear-all-cache-for-date.js <date>

# Example:
node scripts/clear-all-cache-for-date.js 2025-10-12

# Or clear today:
node scripts/clear-all-cache-for-date.js
```

### Step 2: Hard Refresh Browser

After clearing the database cache, do a **hard refresh** in your browser:

- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + F5`
- **Or:** Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

---

## 🧪 Verify It Worked

### Check 1: Browser Console
After refresh, you should see the network request fetch new data (not from cache):

```javascript
// Look for this in useFishingPredictions.ts logs:
[useFishingPredictions] Response: {rectangleCode: '21D8', predictionDate: '2025-10-12', predictionsCount: 12}
```

### Check 2: Server Logs
Check the server logs for a fresh RPC call (not cached):

```bash
tail -f /tmp/wotnow_dev.log | grep "Calling RPC\|Cache"
```

You should see:
```
[Findr API] Calling RPC with params: { p_rectangle_code: '21D8', p_date: '2025-10-12' }
[Findr API] RPC response via client: { hasError: false, dataLength: 12 }
```

**NOT:**
```
[Findr Cache] Returning cached data
```

### Check 3: Inspect Card Data
Open browser DevTools → Console:

```javascript
// Type this in the console to inspect card data:
document.querySelector('[data-card]')
```

Look for environmental data in the card props.

---

## 🔧 Scripts Created

### 1. `clear-prediction-cache.js`
**Purpose:** Clear cache for a specific rectangle and date  
**Usage:**
```bash
node scripts/clear-prediction-cache.js <rectangle> <date>
node scripts/clear-prediction-cache.js 31F1 2025-10-12
```

### 2. `clear-all-cache-for-date.js`
**Purpose:** Clear ALL cached predictions for a specific date  
**Usage:**
```bash
node scripts/clear-all-cache-for-date.js <date>
node scripts/clear-all-cache-for-date.js 2025-10-12

# Or clear today's cache:
node scripts/clear-all-cache-for-date.js
```

---

## 📋 Complete Cache Clear Workflow

When you've updated the prediction function and need fresh data everywhere:

```bash
# Step 1: Clear all database cache for today
node scripts/clear-all-cache-for-date.js

# Step 2: Restart dev server (if needed)
pkill -f "next dev"
npm run dev

# Step 3: Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

# Step 4: Verify in browser console
# Should see fresh data with environmental_factors
```

---

## 🎯 When to Clear Cache

Clear the cache when:

- ✅ You've updated a Supabase function (like `get_environmental_predictions_basic`)
- ✅ You've changed the prediction logic
- ✅ You've added new fields to predictions (like environmental data)
- ✅ Test data looks stale or doesn't match expected output
- ✅ After deploying Phase 10 or similar major updates

**Don't clear** for:
- ❌ Frontend-only changes (React components, styles)
- ❌ Minor bug fixes that don't affect data structure
- ❌ Regular testing (cache helps performance)

---

## 🚀 Quick Test Command

Test if a rectangle has fresh environmental data:

```bash
curl -s -X POST "http://localhost:3000/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"21D8","predictionDate":"2025-10-12","bypassCache":true}' | \
  jq '.predictions[0] | {species: .species_common_name, freshness: .data_freshness, guild: .weight_profile, has_factors: (.factors != null)}'
```

**Expected output with Phase 10:**
```json
{
  "species": null,
  "freshness": "fresh",
  "guild": "cephalopod",
  "has_factors": true
}
```

**If you see:**
```json
{
  "freshness": null,
  "guild": null,
  "has_factors": false
}
```
Then the cache needs clearing!

---

## ✅ Status After Cache Clear

After running `clear-all-cache-for-date.js` for 2025-10-12:

```
✅ Cleared 3 cached entries for 2025-10-12
📍 Rectangles cleared: 31F1, 20C5, 21D8
```

**Next step:** Hard refresh browser (Cmd+Shift+R) and you should see:
- 🪨 Guild badges
- 🟢 Data freshness badges
- 🌊 Environmental conditions section

---

## 🎉 You Should Now See

After cache clear + hard refresh:

1. **Guild Badges** after confidence:
   ```
   [96% biting] [🌊 Pelagic] [🟢 6h ago]
   ```

2. **Environmental Section** in cards:
   ```
   🌊 Current Conditions
   🌡️ Temp: 26.4°C ✅ (Optimal)
   🧂 Salinity: 34.2 ppt ✅ (Optimal)
   📏 Depth: 15m ⚠️ (Acceptable)
   🪨 Substrate: mixed ❌ (Poor)
   Data from ingest:openmeteo • Updated 6h ago
   ```

3. **Tooltips** on hover:
   - Guild badge → Environmental weighting
   - Freshness badge → Data source info

---

**If you STILL don't see badges after this:**
1. Check browser console for errors
2. Verify API response includes environmental data
3. Check that mapPrediction is extracting data correctly
4. Open DevTools → Network tab → Find predictions API call → Check response
5. Report what you see in the console/network tab

