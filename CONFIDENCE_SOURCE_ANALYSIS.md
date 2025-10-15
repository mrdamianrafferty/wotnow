# Confidence Score Source Analysis - Findr Main vs Favourites

## Date: 2025-10-13

---

## 🎯 Key Finding

**The Findr main page gets confidence scores DIRECTLY from the database predictions**, not from computed metadata or stale data.

---

## 📊 How Findr Main Page Works

### 1. Data Flow

```
useFishingPredictions Hook
  ↓
Raw database predictions (FishingPrediction[])
  ↓
mapPrediction() function
  ↓
CardData objects with confidence
  ↓
Cards displayed with live confidence badges
```

### 2. Source Code Evidence

**File: `pages/findr/index.tsx`**

```typescript
// Line 638: Fetch predictions from database
const { predictions, loading, error, lastUpdated, reload } = useFishingPredictions({
  rectangleCode: activeRectangle,
  predictionDate,
  language,
  enabled: Boolean(activeRectangle),
});

// Line 679: Map predictions to cards
const cards = useMemo(() => {
  if (!predictions) return [];
  const mapped = predictions
    .map((prediction, index) => mapPrediction(prediction, index))
    .filter((card): card is CardData => card !== null)
    .sort((a, b) => (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity));
  
  return mapped;
}, [predictions, activeRectangle]);

// Line 198: Display confidence
{card.confidence !== null && (
  <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
    {card.confidence}% <TranslatedText text="biting" />
  </span>
)}
```

**File: `lib/findr/mapPrediction.ts`**

```typescript
// Line 337: Parse confidence from prediction
function parseConfidence(prediction: FishingPrediction): number | null {
  const candidateKeys = [
    'confidence_percent',      // ✅ Phase 10: Primary field from get_environmental_predictions_basic
    'environmental_score',     // Phase 10: Fallback (0-10 scale, will be multiplied by 10)
    'confidence',
    'confidencePercentage',
    'confidence_score',
    'confidenceScore',
    'probability',
    'score',
  ];

  for (const key of candidateKeys) {
    const raw = extractNumber(prediction[key]);
    if (raw == null || Number.isNaN(raw)) continue;
    let value = raw;
    // If value is 0-1 (probability), convert to percentage
    if (value > 0 && value <= 1) {
      value *= 100;
    }
    // If value is 0-10 (environmental_score), convert to percentage
    if (key === 'environmental_score' && value >= 0 && value <= 10) {
      value *= 10;
    }
    if (value < 0) continue;
    return Math.round(Math.min(value, 100));
  }
  return null;
}

// Line 599: Assign confidence to card
return {
  id: speciesId,
  speciesId,
  commonName,
  scientificName,
  confidence: parseConfidence(prediction), // ✅ DIRECT from database
  summary,
  rationale: generateRationale(prediction),
  // ... rest of fields
};
```

---

## 🔍 How Favourites Page Currently Works (WRONG)

### 1. Current Broken Flow

```
User's favorites (from localStorage/Supabase)
  ↓
Load favorite metadata from user_favorite_species
  ↓
metadata.confidence = 50 (STALE HARDCODED VALUE) ❌
  ↓
Attempt to match with live predictions by ID
  ↓
ID mismatch due to species code aliases (FLE vs FLO) ❌
  ↓
card = null, so derivedConfidence = null
  ↓
Shows "No live data available" or falls back to stale 50%
```

### 2. Source Code Evidence

**File: `pages/findr/favourites.tsx`**

```typescript
// Line 633: Attempt to find matching live prediction card
const card = cards.find((item) => item.id === id) ?? null;

// Line 643: Use ONLY live card confidence (correct approach)
const derivedConfidence = card?.confidence ?? null;

// ❌ PROBLEM: card is null because IDs don't match
// - Favorite stored as: id = "fle" (from invalid code FLE)
// - Live prediction has: id = "flo" (from correct code FLO)
// - Result: No match found, card = null, confidence = null
```

---

## 🎯 The Root Problem

### Issue 1: Species Code Mismatch

**Database has invalid/legacy codes:**
- FLE, BLL, CSH, FGM, BRS, SQC, RUN

**Live predictions use correct FAO codes:**
- FLO, WRA, DOG, GMU, BBR, SQU, GUR

**Result:**
- Favorites stored with code "FLE" → ID becomes "fle"
- Live predictions have code "FLO" → ID becomes "flo"  
- `cards.find(item => item.id === id)` fails to match
- No confidence data shown

### Issue 2: Stale Database Metadata

**Table: `user_favorite_species`**
- Contains old `confidence` field with hardcoded 50% values
- Not updated with live prediction data
- Used as fallback when live match fails

---

## ✅ The Solution (Already Partially Implemented)

### What We've Done So Far

1. **Added Species Code Aliases** (Line 51)
   ```typescript
   const SPECIES_CODE_ALIASES: Record<string, string> = {
     'FLE': 'FLO', 'CSH': 'DOG', 'BRS': 'BBR',
     'BLL': 'WRA', 'FGM': 'GMU', 'SQC': 'SQU', 'RUN': 'GUR'
   };
   ```

2. **Updated Image Functions to Use Aliases**
   - `buildFallbackCardImage()` - Maps invalid codes to valid ones before image lookup
   - `validateAndFixImage()` - Maps invalid codes to valid ones before rebuilding image

3. **Already Using Live Predictions Only**
   ```typescript
   // Line 643: ONLY use confidence from live prediction card
   const derivedConfidence = card?.confidence ?? null;
   ```

### What Still Needs Fixing

**ID Matching Must Use Aliases**

When favorites have invalid codes, we need to normalize them before matching with live predictions:

```typescript
// Current (BROKEN):
const card = cards.find((item) => item.id === id) ?? null;

// Should be:
function normalizeSpeciesId(id: string, speciesCode?: string): string {
  if (!speciesCode) return id;
  const upperCode = speciesCode.toUpperCase();
  const mappedCode = SPECIES_CODE_ALIASES[upperCode] ?? upperCode;
  // If code was mapped, return mapped code as new ID
  if (mappedCode !== upperCode) {
    console.log(`[normalizeSpeciesId] Normalized ${id} (code: ${upperCode}) -> ${mappedCode.toLowerCase()}`);
    return mappedCode.toLowerCase();
  }
  return id;
}

// Then use it:
const normalizedId = normalizeSpeciesId(id, fav.speciesCode);
const card = cards.find((item) => item.id === normalizedId) ?? null;
```

---

## 📋 Action Items

### High Priority (Blocks Confidence Display)

1. ✅ **Add species code aliases** - DONE
2. ✅ **Update image functions to use aliases** - DONE  
3. ⏳ **Add ID normalization function**
4. ⏳ **Update favorite entry mapping to normalize IDs before card lookup**
5. ⏳ **Test that FLE/BLL/CSH/FGM species now show live confidence**

### Medium Priority (Data Quality)

6. 🔄 **Database cleanup** - Consider updating invalid codes in production database
7. 📝 **Document species code aliases** - Add to species data documentation

---

## 🧪 Testing Checklist

After implementing ID normalization:

- [ ] Flounder (FLE → FLO) shows live confidence percentage
- [ ] Ballan Wrasse (BLL → WRA) shows live confidence percentage  
- [ ] Catshark (CSH → DOG) shows live confidence percentage
- [ ] Grey Mullet (FGM → GMU) shows live confidence percentage
- [ ] Console logs show ID normalization happening
- [ ] No more "No live data available" for species with valid predictions
- [ ] Images display correctly (already fixed)
- [ ] GradientFish shows for truly unknown species (already fixed)

---

## 💡 Key Insights

### Why Main Page Works But Favourites Doesn't

**Main Page:**
- ✅ Uses live predictions directly from database
- ✅ mapPrediction() extracts confidence_percent field
- ✅ No ID matching required - cards ARE the predictions
- ✅ Always shows current confidence scores

**Favourites Page:**
- ❌ Attempts to match favorites with live predictions by ID
- ❌ ID matching fails due to species code mismatch
- ❌ Falls back to stale database metadata or null
- ❌ Shows "No live data" or old 50% values

### The Fix is Simple

Don't fight the ID matching - just normalize the IDs using our alias mapping before comparing! The favorites page already correctly:
1. Fetches live predictions via useFishingPredictions ✅
2. Only uses card?.confidence, not metadata ✅
3. Has alias mapping defined ✅

We just need to apply the alias mapping to ID normalization, the same way we applied it to image lookups.

---

## 🎬 Next Steps

1. Implement `normalizeSpeciesId()` helper function
2. Apply normalization in favorite entry mapping (line ~650)
3. Test with real favorite species that have invalid codes
4. Verify console logs show ID normalization
5. Confirm all species show live confidence scores
6. Update this document with test results

---

**Status:** Ready to implement ID normalization fix
**Estimated Time:** 10 minutes
**Impact:** HIGH - Will fix all confidence display issues for affected species
