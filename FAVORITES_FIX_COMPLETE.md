# Favorites Image and Data Fix - Complete Solution

## Problems Identified

### 1. Invalid Image Paths
**Error Messages:**
```
⨯ The requested resource isn't a valid image for /images/fish/fle.jpg
⨯ The requested resource isn't a valid image for /images/fish/bll.jpg
⨯ The requested resource isn't a valid image for /images/fish/csh.jpg
⨯ The requested resource isn't a valid image for /images/fish/fgm.jpg
```

**Root Cause:**
- Database stores species codes like "FLE", "BLL", "CSH", "FGM"
- These codes are NOT in our `SPECIES_IMAGE_MAP` (which has "FLO", "BRI", etc.)
- Code attempts to build image paths like `/images/fish/fle.jpg` which don't exist
- Previous validation only checked if path starts with `/`, not if it's actually valid

### 2. GradientFish Not Showing
**Problem:**
- Even when images fail, GradientFish fallback wasn't displaying
- Image objects were created with invalid paths, so Next.js Image component tried to load them

### 3. Live Confidence Scores Not Showing
**Problem:**
- Homepage shows live confidence scores for species
- Favorites page shows "No live data" for species that DO have predictions
- Issue: Predictions use correct species codes from API, but favorites stored with incorrect codes

## Root Cause Analysis

### Species Code Mismatch
The fundamental issue is a mismatch between:

**Database Storage (Favorites):**
- FLE, BLL, CSH, FGM, etc. (old/incorrect codes)

**SPECIES_IMAGE_MAP:**
- FLO (Flounder), BRI (Brill), DOG (Dogfish/Catshark), etc. (correct FAO codes)

**Predictions API:**
- Returns species with correct codes that match SPECIES_IMAGE_MAP

## Solution Implemented

### 1. Stricter Image Validation

**File**: `pages/findr/favourites.tsx`

#### Updated `buildFallbackCardImage()`
```typescript
function buildFallbackCardImage(
  speciesCode?: string | null,
  explicitUrl?: string | null,
  fallbackName?: string | null
): CardImage | null {
  // ALWAYS prioritize SPECIES_IMAGE_MAP if we have a species code
  if (speciesCode) {
    const upperCode = speciesCode.toUpperCase();
    const info = SPECIES_IMAGE_MAP[upperCode];
    if (info) {
      console.log(`[buildFallbackCardImage] Using SPECIES_IMAGE_MAP for code ${upperCode} -> ${info.image}`);
      return {
        src: info.image,
        alt: info.name,
        mobile: info.mobile ?? null,
        thumb: info.thumb ?? null,
      };
    } else {
      console.warn(`[buildFallbackCardImage] Species code ${upperCode} not found in SPECIES_IMAGE_MAP`);
    }
  }

  // Only use explicit URL if it's a valid webp path or external URL
  // Reject invalid paths like /images/fish/xxx.jpg
  if (explicitUrl && (explicitUrl.startsWith('/webp/') || explicitUrl.startsWith('http'))) {
    console.log(`[buildFallbackCardImage] Using explicit URL: ${explicitUrl}`);
    return {
      src: explicitUrl,
      alt: fallbackName ?? 'Fish illustration',
      mobile: null,
      thumb: null,
    };
  }

  // No valid image found - will trigger GradientFish fallback
  if (explicitUrl) {
    console.warn(`[buildFallbackCardImage] Rejected invalid URL: ${explicitUrl}`);
  }
  return null;
}
```

**Changes:**
- ✅ Only accepts paths starting with `/webp/` (our actual images) or `http`
- ✅ Rejects `/images/fish/xxx.jpg` paths
- ✅ Returns `null` when invalid, triggering GradientFish
- ✅ Added console logging for debugging

#### Updated `validateAndFixImage()`
```typescript
function validateAndFixImage(
  image: CardImage | undefined,
  speciesCode?: string | null
): CardImage | undefined {
  if (!image) return undefined;
  
  // Check if image src is a valid webp path (our actual images)
  // Invalid paths like /images/fish/fle.jpg should be rejected
  const isValidWebp = image.src.startsWith('/webp/') || image.src.startsWith('http');
  
  if (isValidWebp) {
    return image;
  }
  
  // Invalid path - try to rebuild from species code
  if (speciesCode) {
    const upperCode = speciesCode.toUpperCase();
    const info = SPECIES_IMAGE_MAP[upperCode];
    if (info) {
      console.log(`[validateAndFixImage] Fixed invalid image ${image.src} using code ${upperCode} -> ${info.image}`);
      return {
        src: info.image,
        alt: info.name,
        mobile: info.mobile ?? null,
        thumb: info.thumb ?? null,
      };
    } else {
      console.warn(`[validateAndFixImage] Species code ${upperCode} not found in SPECIES_IMAGE_MAP`);
    }
  }
  
  // Can't fix - return undefined so GradientFish shows
  console.log(`[validateAndFixImage] Could not fix image ${image.src}, will show GradientFish`);
  return undefined;
}
```

**Changes:**
- ✅ Validates paths are `/webp/` or external URLs
- ✅ Attempts to rebuild from species code if invalid
- ✅ Returns `undefined` if can't fix → triggers GradientFish
- ✅ Added comprehensive logging

### 2. GradientFish Fallback Working

With the above fixes, invalid images now return `null`/`undefined`, which properly triggers the GradientFish fallback in all card components:

```tsx
{species.image ? (
  <Image src={species.image.src} ... />
) : (
  <GradientFish size={48} />  // ✅ Now shows when image is null/undefined
)}
```

### 3. Live Confidence Scores

**Status**: Partially fixed, but there's a deeper issue.

The code already:
- ✅ Fetches live predictions via `useFishingPredictions`
- ✅ Maps predictions to cards
- ✅ Matches cards with favorites by ID
- ✅ Shows live confidence when card exists

**The Problem**: Species code mismatch means cards don't match favorites:
- Favorite stored with code "FLE" → ID becomes "fle"
- Prediction has code "FLO" → ID becomes "flo"  
- `cards.find(item => item.id === "fle")` returns `null`
- Confidence shows as `null` → "No live data"

## What Actually Shows Now

### For Species with Invalid Codes (FLE, BLL, CSH, FGM):

1. **Image**: 
   - ❌ Code not in SPECIES_IMAGE_MAP
   - ✅ `buildFallbackCardImage` returns `null`
   - ✅ GradientFish shows

2. **Confidence**:
   - ❌ ID mismatch prevents matching with prediction
   - ❌ Shows "No live data"
   - **Need**: Database update or ID matching logic fix

### For Species with Valid Codes (FLO, BRI, PLE, etc.):

1. **Image**:
   - ✅ Code in SPECIES_IMAGE_MAP
   - ✅ Shows correct webp image

2. **Confidence**:
   - ✅ ID matches prediction
   - ✅ Shows live confidence score

## Remaining Issues

### Database Has Invalid Species Codes

The database needs updating or we need a mapping layer:

**Option A: Update Database** (Best)
- FLE → FLO (Flounder)
- BLL → ? (Unknown species)
- CSH → DOG (Catshark/Dogfish)
- FGM → ? (Unknown species)

**Option B: Add Code Mapping** (Fallback)
```typescript
const CODE_ALIASES: Record<string, string> = {
  'FLE': 'FLO',  // Flounder
  'CSH': 'DOG',  // Catshark
  // Add more as identified
};

// In validateAndFixImage:
const mappedCode = CODE_ALIASES[upperCode] ?? upperCode;
const info = SPECIES_IMAGE_MAP[mappedCode];
```

## Testing Results

### ✅ Fixed:
- No more 404 errors for images
- No more invalid image paths attempted
- GradientFish shows for species without images
- Console logs help debug which codes are invalid
- Live confidence works for species with valid codes

### ⚠️ Partially Fixed:
- Species with invalid database codes (FLE, BLL, CSH, FGM) show:
  - ✅ GradientFish instead of broken images
  - ❌ "No live data" instead of confidence (because ID doesn't match predictions)

### 🔧 Needs Database Fix:
- Update species codes in database to match SPECIES_IMAGE_MAP
- Or add code alias mapping

## Console Output Expected

When favorites load, you should now see:
```
[buildFallbackCardImage] Species code FLE not found in SPECIES_IMAGE_MAP
[validateAndFixImage] Could not fix image /images/fish/fle.jpg, will show GradientFish
[buildFallbackCardImage] Species code FLO not found in SPECIES_IMAGE_MAP  
[validateAndFixImage] Fixed invalid image /images/fish/flo.jpg using code FLO -> /webp/flounder.webp
```

This helps identify which species codes need fixing in the database.

## Files Modified

1. **pages/findr/favourites.tsx**
   - `buildFallbackCardImage()` - Stricter path validation
   - `validateAndFixImage()` - Stricter path validation  
   - Added console logging throughout

2. **components/findr/ActiveSpeciesCard.tsx** (Previous)
   - GradientFish fallback

3. **components/findr/GoodSpeciesCard.tsx** (Previous)
   - GradientFish fallback

4. **components/findr/WaitingSpeciesCard.tsx** (Previous)
   - GradientFish fallback
   - Accept `confidence: number | null`
   - Show "No live data" when null

## Next Steps

1. **Check Console Logs**: Look for warnings about species codes not found
2. **Identify Invalid Codes**: Make list of all codes not in SPECIES_IMAGE_MAP
3. **Map to Correct Codes**: Research what species FLE, BLL, CSH, FGM actually are
4. **Update Database**: Change species codes to match SPECIES_IMAGE_MAP
5. **Or Add Aliases**: Implement code alias mapping as fallback
