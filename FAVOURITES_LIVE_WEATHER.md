# Favourites System - Live Weather Integration Complete ✅

## What's Been Implemented

### 1. Live Weather Scoring Integration
**File:** `/pages/api/findr/favourites.ts`

The favourites API now uses your **existing `get_fishing_predictions` RPC** to calculate confidence scores with live weather data instead of mock calculations.

**Key Changes:**
```typescript
// Old approach (mock)
const confidence = calculateBasicConfidence(species); // Static formula
const forecast = generateMockForecast(confidence);    // Random variation

// New approach (live weather) ✅
const liveScores = await getLiveConfidenceScores(rectangleCode, speciesCodes);
const confidence = liveData?.confidence ?? 50;        // From get_fishing_predictions
const forecast = liveData?.forecast ?? [];            // 7-day weather forecast
```

**How It Works:**
1. User's favourites API receives `rectangleCode` query param (e.g., `?rectangleCode=31F2`)
2. Fetches user's saved species from `user_favourites` table
3. Calls `get_fishing_predictions` RPC with rectangle code and today's date
4. Matches returned predictions by species_code
5. Returns confidence scores calculated from **real weather conditions**:
   - Wind speed and direction
   - Water temperature
   - Barometric pressure
   - Tide state (high/low/rising/falling)
   - Moon phase
   - Wave height

### 2. Demo Page (No Authentication Required)
**File:** `/pages/findr/favourites-demo.tsx`
**URL:** `http://localhost:3000/findr/favourites-demo?rectangleCode=31F2`

This page demonstrates live confidence scoring without requiring user sign-in:
- Fetches top 5 species via `/api/findr/regional`
- Shows live confidence scores from `get_fishing_predictions`
- Updates daily as weather changes
- Allows testing different ICES rectangles

**Try it:**
```bash
npm run dev

# Then visit:
http://localhost:3000/findr/favourites-demo?rectangleCode=31F2  # Brighton
http://localhost:3000/findr/favourites-demo?rectangleCode=30F2  # Cornwall
http://localhost:3000/findr/favourites-demo?rectangleCode=37F4  # Norfolk
```

### 3. Regional Species API
**File:** `/pages/api/findr/regional.ts`
**Endpoint:** `GET /api/findr/regional?rectangleCode=31F2&limit=20`

Returns species common to a given ICES rectangle:
- Queries `species_frequency` table for most common species
- Falls back to all species if no frequency data
- Orders by frequency score or eating quality
- No authentication required

---

## Authentication Status

### Current Situation
You mentioned: **"we don't have sign in implemented yet for findr (only go daisy)"**

This means:
- ✅ Main app (Go Daisy) has authentication working
- ❌ Findr section doesn't have sign-in yet
- ❌ `/pages/api/findr/favourites.ts` requires authentication (will return 401)
- ✅ Demo page works without auth

### Options for Testing Favourites

#### Option 1: Test Without Auth (Recommended for Now)
Use the demo page to see live weather scoring:
```
http://localhost:3000/findr/favourites-demo?rectangleCode=31F2
```

**Pros:**
- No auth setup needed
- Shows confidence scoring working
- Tests `get_fishing_predictions` integration
- Verifies species data loading

**Cons:**
- Can't save/load personal favourites
- No user-specific data

#### Option 2: Temporarily Disable Auth
Remove auth check from `/pages/api/findr/favourites.ts`:

```typescript
// Comment out these lines temporarily:
/*
const { data: { session }, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !session) {
  return res.status(401).json({ error: 'Unauthorized - Please sign in' });
}
const userId = session.user.id;
*/

// Use hardcoded test user ID:
const userId = 'YOUR-TEST-USER-ID'; // Get from: SELECT id FROM auth.users LIMIT 1;
```

**Pros:**
- Can test full favourites CRUD (add/remove)
- Can verify database writes to `user_favourites`
- Tests authenticated flow without real login

**Cons:**
- Needs manual revert before production
- Security risk if forgotten
- Requires test user in `auth.users` table

#### Option 3: Implement Findr Authentication
Add authentication to Findr section (1-2 hours work):
1. Copy auth components from Go Daisy
2. Add `/findr/login` page
3. Use session context in Findr pages
4. Redirect unauthenticated users

**Pros:**
- Production-ready solution
- Proper user isolation
- Can track favourites per user

**Cons:**
- Requires immediate dev time
- May need to refactor Go Daisy auth

---

## What You Can Test Right Now

### 1. Live Weather Scoring (No Auth)
```bash
# Start dev server
npm run dev

# Visit demo page
open http://localhost:3000/findr/favourites-demo?rectangleCode=31F2
```

**What to check:**
- [ ] Species load from database
- [ ] Confidence scores appear (should be 30-90%)
- [ ] Scores change for different rectangles
- [ ] Scores match weather conditions (check if windy = lower scores for wind-sensitive species)

### 2. Database Integration
```sql
-- In Supabase SQL Editor

-- Verify species table has data
SELECT COUNT(*) FROM species;
SELECT species_code, name_en, wind_sensitivity, temperature_sensitivity 
FROM species LIMIT 10;

-- Check if species_frequency exists (for regional API)
SELECT COUNT(*) FROM species_frequency;
SELECT rectangle_code, species_id, frequency_score 
FROM species_frequency 
WHERE rectangle_code = '31F2' 
LIMIT 10;
```

### 3. API Endpoints
```bash
# Test regional species API (no auth required)
curl "http://localhost:3000/api/findr/regional?rectangleCode=31F2&limit=5"

# Expected response:
[
  {
    "id": "uuid-here",
    "species_code": "RMU",
    "scientific_name": "Mullus surmuletus",
    "name_en": "Red Mullet",
    "eating_quality": 4,
    "conservation_status": "Least Concern",
    "typical_gear": ["shore", "boat"]
  },
  ...
]

# Test predictions API (no auth required)
curl -X POST "http://localhost:3000/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F2"}'

# Expected response:
{
  "rectangleCode": "31F2",
  "predictionDate": "2025-10-02",
  "predictions": [
    {
      "species_code": "RMU",
      "common_name": "Red Mullet",
      "confidence": 75,
      "headline": "Good conditions for Red Mullet today",
      ...
    }
  ]
}
```

---

## Next Steps

### Immediate (No Auth Needed)
1. **Test Demo Page:** Verify live scoring works across different rectangles
2. **Check Species Data:** Ensure species table has all 30+ species
3. **Verify Predictions:** Compare confidence scores to actual weather (windy day = lower scores?)

### Short Term (After Findr Auth)
1. **Test Full Favourites Flow:**
   - Sign in as test user
   - Visit `/findr/favourites-modern`
   - Add Red Mullet to favourites (heart icon)
   - Verify confidence score shows live weather data
   - Check dashboard view groups by Active/Good/Waiting

2. **Verify Database Writes:**
   ```sql
   SELECT uf.id, s.species_code, s.name_en, uf.added_at
   FROM user_favourites uf
   JOIN species s ON s.id = uf.species_id
   WHERE uf.user_id = 'YOUR-USER-ID';
   ```

3. **Test 7-Day Forecast:**
   - Click on a favourite species
   - Expand mini calendar
   - Verify forecast shows 7 days ahead with varying scores

### Medium Term (Image Migration)
1. Create `species-images` bucket in Supabase Storage
2. Upload images from `/public/images/fish/` to bucket
3. Update image URLs in API response:
   ```typescript
   image: `https://[project].supabase.co/storage/v1/object/public/species-images/${species.species_code.toLowerCase()}.jpg`
   ```

---

## Key Difference: Mock vs Live Scoring

### Before (Mock Scoring)
```typescript
// Used static species sensitivity values
const baseScore = (
  (1 - windSens) * 20 +      // Static weight
  tempSens * 30 +             
  tideSens * 25 +             
  (1 - pressureSens) * 25     
);
// Score never changed unless species changed
```

### After (Live Weather Scoring) ✅
```typescript
// Calls get_fishing_predictions RPC
const response = await fetch('/rpc/get_fishing_predictions', {
  body: JSON.stringify({
    rectangle_code_input: '31F2',
    prediction_date_input: '2025-10-02',
  })
});

// Returns confidence based on TODAY'S weather:
// - Current wind speed at location
// - Water temperature today
// - Barometric pressure now
// - Tide state (high/low/rising/falling)
// - Moon phase influence
// Score changes daily based on actual conditions!
```

**Impact:**
- Same species can have 85% confidence on Monday (calm, good conditions)
- Drop to 45% confidence on Tuesday (storm incoming, rough seas)
- Reflects **real fishing conditions** not just theoretical species preferences

---

## Summary

✅ **Completed:**
1. Integrated `get_fishing_predictions` RPC for live weather scoring
2. Created demo page showing live confidence scores (no auth needed)
3. Built regional species API endpoint
4. 7-day forecast using daily predictions
5. Confidence scores update with real weather conditions

⏳ **Pending:**
1. Authentication implementation for Findr section
2. Testing full favourites CRUD with authenticated users
3. Image migration to Supabase Storage

🎯 **Ready to Test:**
Visit `http://localhost:3000/findr/favourites-demo?rectangleCode=31F2` to see live weather scoring in action!
