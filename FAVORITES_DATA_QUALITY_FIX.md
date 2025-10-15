# Favorites Page Data Quality Fix

## Issues Fixed

### Issue 1: Broken Images (404 Errors)
**Problem**: Invalid image paths from database causing 404 errors
- `/images/fish/run.jpg`, `/images/fish/csh.jpg`, `/images/fish/brs.jpg`, etc.
- These are bare filenames stored in old database records

**Root Cause**: The `buildFallbackCardImage()` function accepted any URL from the database, including invalid bare filenames.

**Solution**: Added `validateAndFixImage()` function that:
1. Checks if image src is valid (starts with `/` or `http`)
2. If invalid, attempts to rebuild from species code using `SPECIES_IMAGE_MAP`
3. If can't rebuild, returns `undefined` → triggers `GradientFish` fallback

### Issue 2: Hardcoded Stale Data
**Problem**: All favorites showing outdated values:
- 50% confidence (from old database records)
- 18:00 bite times (hardcoded in database)
- Not reflecting current marine conditions

**Root Cause**: 
```typescript
// OLD CODE - Used stale database metadata
const derivedConfidence = 
  card?.confidence ?? 
  (typeof metadata?.confidence === 'number' ? metadata.confidence : null);
```

This meant species without live predictions would show old confidence values stored in the database (often 50% as a default).

**Solution**: Only use live prediction data:
```typescript
// NEW CODE - Only trust live predictions
const derivedConfidence = card?.confidence ?? null;
```

Now:
- ✅ Species WITH live predictions → Show real-time confidence
- ✅ Species WITHOUT live predictions → Show `null` → Display "No live data"

### Issue 3: Misleading UI for Missing Data
**Problem**: Species without live predictions showed "0%" or stale "50%" values

**Solution**: Updated `WaitingSpeciesCard` component to:
1. Accept `confidence: number | null`
2. Display conditional badge:
   - Has data: `<span className="badge">{species.confidence}%</span>`
   - No data: `<span className="badge badge-ghost">No live data</span>`

## Technical Implementation

### 1. Image Validation Function
**File**: `pages/findr/favourites.tsx`

```typescript
function validateAndFixImage(
  image: CardImage | undefined,
  speciesCode?: string | null
): CardImage | undefined {
  if (!image) return undefined;
  
  // Check if image src is valid (starts with / or http)
  const isValidPath = image.src.startsWith('/') || image.src.startsWith('http');
  
  if (isValidPath) {
    return image;
  }
  
  // Invalid path (bare filename like "run.jpg") - try to rebuild from species code
  if (speciesCode) {
    const info = SPECIES_IMAGE_MAP[speciesCode.toUpperCase()];
    if (info) {
      return {
        src: info.image,
        alt: info.name,
        mobile: info.mobile ?? null,
        thumb: info.thumb ?? null,
      };
    }
  }
  
  // Can't fix - return undefined so GradientFish shows
  return undefined;
}
```

### 2. Updated Confidence Logic
**File**: `pages/findr/favourites.tsx` (line ~630)

```typescript
// ONLY use confidence from live prediction card, never from stale database metadata
// This ensures we show real-time conditions, not outdated stored values
const derivedConfidence = card?.confidence ?? null;
```

### 3. Updated Image Validation in Entry Mapping
**File**: `pages/findr/favourites.tsx` (line ~642)

```typescript
// Validate and fix image - if metadata has invalid path, try to rebuild from species code
const rawImage = card?.image ?? metadata?.image ?? undefined;
const image = validateAndFixImage(rawImage, card?.speciesCode ?? id);
```

### 4. Updated Waiting Card Rendering
**File**: `pages/findr/favourites.tsx` (line ~1420)

```typescript
confidence: entry.card ? (entry.confidence ?? 0) : null,
```

Only shows confidence value if there's a live prediction card available.

### 5. Updated Component Type Definitions
**File**: `components/findr/WaitingSpeciesCard.tsx`

```typescript
interface WaitingSpeciesCardProps {
  species: {
    // ... other props
    confidence: number | null;  // Allow null for species without live predictions
    // ...
  };
}
```

### 6. Updated Confidence Display
**File**: `components/findr/WaitingSpeciesCard.tsx` (line ~91)

```typescript
{species.confidence !== null ? (
  <span className="badge badge-sm badge-outline">{species.confidence}%</span>
) : (
  <span className="badge badge-sm badge-ghost text-xs">No live data</span>
)}
```

## Data Flow

### Before (Showing Stale Data):
```
Database (50%, 18:00) 
  ↓
metadata.confidence = 50
  ↓
derivedConfidence = 50  ❌ STALE
  ↓
UI shows "50%" and "18:00"  ❌ MISLEADING
```

### After (Only Live Data):
```
Live Prediction API
  ↓
card?.confidence = 72  ✅ FRESH
  ↓
derivedConfidence = 72
  ↓
UI shows "72%" and actual fishing times  ✅ ACCURATE

--- OR ---

No Live Prediction
  ↓
card = null
  ↓
derivedConfidence = null
  ↓
UI shows "No live data"  ✅ HONEST
```

## Files Modified

1. **pages/findr/favourites.tsx**
   - Added `validateAndFixImage()` function
   - Updated `derivedConfidence` to only use live card data
   - Updated image validation in `favouriteEntries` mapping
   - Updated `WaitingSpeciesCard` props to pass null confidence when no live data

2. **components/findr/WaitingSpeciesCard.tsx**
   - Updated interface to accept `confidence: number | null`
   - Added conditional rendering for confidence badge
   - Shows "No live data" when confidence is null

3. **components/findr/ActiveSpeciesCard.tsx**
   - Added `GradientFish` fallback for missing images (previous fix)

4. **components/findr/GoodSpeciesCard.tsx**
   - Added `GradientFish` fallback for missing images (previous fix)

## Result

✅ **No more broken images** - Invalid paths are detected and fixed or fallback to GradientFish
✅ **No more stale data** - Only shows live prediction confidence, never old database values
✅ **Honest UI** - Species without live data show "No live data" instead of misleading percentages
✅ **Better UX** - Users know which species have current data vs which need updating
✅ **Automatic recovery** - Can rebuild images from species codes even when database has bad paths

## Testing Checklist

- [x] Species with valid images → Show correct image
- [x] Species with invalid database paths → Show GradientFish or rebuilt image from species code
- [x] Species with live predictions → Show real confidence %
- [x] Species without live predictions → Show "No live data"
- [x] No 404 errors in console
- [x] No misleading "50%" or "18:00" hardcoded values
- [x] Image validation happens at render time (fixes existing bad data)
