# Favorites Image Loading Fix

## Issue
Favorites page was showing broken images for some species:
- `/images/fish/run.jpg` 404
- `/images/fish/brs.jpg` invalid
- `/images/fish/csh.jpg` invalid
- `/images/fish/fgm.jpg` invalid

These are bare filenames stored in the database that don't exist in the public directory.

## Root Cause
The `buildFallbackCardImage()` function in `pages/findr/favourites.tsx` was accepting any `explicitUrl` from the database, including bare filenames like "run.jpg" which are not valid image paths.

## Solution

### 1. Fixed Image Loading Logic
Updated `buildFallbackCardImage()` to only accept valid image URLs:

**Before:**
```typescript
if (explicitUrl) {
  return {
    src: explicitUrl,  // ❌ Accepts "run.jpg" - invalid!
    alt: fallbackName ?? 'Fish illustration',
    mobile: null,
    thumb: null,
  };
}
```

**After:**
```typescript
// Only use explicit URL if it looks like a valid path (starts with / or http)
// Ignore bare filenames like "run.jpg" which are invalid
if (explicitUrl && (explicitUrl.startsWith('/') || explicitUrl.startsWith('http'))) {
  return {
    src: explicitUrl,
    alt: fallbackName ?? 'Fish illustration',
    mobile: null,
    thumb: null,
  };
}
```

### 2. Added GradientFish Fallback to All Card Components
When species don't have images, instead of showing emojis, they now show the beautiful animated gradient fish icon:

**Updated Components:**
- `components/findr/ActiveSpeciesCard.tsx` (85%+ confidence cards)
- `components/findr/GoodSpeciesCard.tsx` (70-84% confidence cards)
- `components/findr/WaitingSpeciesCard.tsx` (<70% confidence cards)

**Before:**
```tsx
{species.image ? (
  <Image src={species.image.src} ... />
) : (
  <div className="...">
    {species.emoji}  {/* ❌ Plain emoji */}
  </div>
)}
```

**After:**
```tsx
{species.image ? (
  <Image src={species.image.src} ... />
) : (
  <div className="... bg-gradient-to-br from-info/10 to-primary/10">
    <GradientFish size={48} />  {/* ✨ Animated gradient fish */}
  </div>
)}
```

## Image Resolution Priority
Now follows this waterfall logic:

1. **SPECIES_IMAGE_MAP** (if species code exists)
   - These are the high-quality webp images like `/webp/plaice.webp`
   - Most reliable source
   
2. **Valid database URL** (if starts with `/` or `http`)
   - Full paths only
   - Ignores bare filenames
   
3. **GradientFish component** (fallback)
   - Beautiful animated ocean gradient
   - Thin stroke fish icon
   - Professional appearance

## Files Changed

1. **pages/findr/favourites.tsx**
   - Updated `buildFallbackCardImage()` function (lines 250-279)
   - Added validation for explicit URLs

2. **components/findr/ActiveSpeciesCard.tsx**
   - Added `GradientFish` import
   - Updated image fallback rendering (lines 90-108)

3. **components/findr/GoodSpeciesCard.tsx**
   - Added `GradientFish` import
   - Updated image fallback rendering (lines 70-87)

4. **components/findr/WaitingSpeciesCard.tsx**
   - Added `GradientFish` import
   - Updated image fallback rendering (lines 58-75)

## Result

✅ **No more broken images** - Bare filenames are ignored
✅ **Better fallback UI** - Animated gradient fish instead of emojis
✅ **Consistent with other pages** - Uses same SPECIES_IMAGE_MAP as swipable cards
✅ **Professional appearance** - Ocean-themed gradient fish matches app aesthetic

## Testing
1. ✅ Species with valid images (like plaice) → Show correct image
2. ✅ Species with invalid database filenames (like run, brs, csh, fgm) → Show GradientFish
3. ✅ Species with valid species codes → Resolve via SPECIES_IMAGE_MAP
4. ✅ GradientFish animation works smoothly
5. ✅ No console errors or 404s
