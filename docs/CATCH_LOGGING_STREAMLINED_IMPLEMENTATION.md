# Catch Logging Streamlined Implementation

**Date**: 2025-10-30
**Status**: Ready to implement
**Goal**: Simplify catch logging to 10-second goal using dynamic, location-aware species selection

---

## Overview

The user wants to streamline catch logging by reducing choices and using intelligent, location-aware species filtering. The goal is a 10-second flow: open app → select species → log catch.

### Key Discovery

**The predictions API already does everything needed!** No need to create separate Bay of Biscay species database or duplicate filtering logic.

**Current API capabilities**:
- ✅ Regional filtering (Atlantic vs Mediterranean vs North Sea)
- ✅ Seasonal activity scoring (spring/summer/autumn/winter)
- ✅ Temperature preference matching
- ✅ Depth range scoring
- ✅ Confidence/bite score sorting
- ✅ Real-time environmental data integration

**Tested locations**:
- **Asturias (43.5, -5.25)**: Returns Atlantic species (Sea Bass, Grey Mullet, Sea Bream, Picarel...)
- **Málaga (36.72, -4.42)**: Returns Mediterranean species (Sea Bass, Salema, Leerfish, Parrotfish...)

---

## Current Problems

### 1. Hardcoded Species List

**File**: `components/findr/QuickLogModal.tsx` (line ~127)

```typescript
const REGIONAL_QUICK_PICKS = ['MAC', 'SBA', 'POL', 'GMU', 'BBR', 'WHI'];
```

**Problems**:
- Same 6 species worldwide (not region-specific)
- No seasonal adjustment
- No environmental matching
- User must scroll through 100+ species if their catch isn't in the quick picks

### 2. Too Many Steps

Current flow:
1. Open modal
2. Scroll through hardcoded quick picks or search all species
3. Select species
4. Choose quantity
5. (Optional) Add photo
6. Submit

**Pain points**:
- If species not in quick picks, user faces 100+ species list
- No visual cues for regional likelihood
- No confidence indicators

---

## Proposed Solution

### Use Predictions API for Dynamic Species List

**Benefits**:
1. **Location-aware**: Málaga gets Mediterranean species, Asturias gets Atlantic species
2. **Seasonal**: October in Asturias highlights different species than March
3. **Environmental**: Real water temp, depth, substrate matching
4. **Smart sorting**: Top 12 species by confidence/bite score
5. **Always up-to-date**: Reuses existing prediction infrastructure
6. **No duplication**: Don't need separate species databases

### New Flow

1. **On modal open**: Fetch top 12 predictions for user's current location
2. **Display grid**: 3x4 grid of fish thumbnails with names (already have all images!)
3. **Visual indicators**: Confidence bars or badges (High/Medium)
4. **One tap**: User selects species from intelligent, context-aware list
5. **Quick submit**: Quantity + optional photo → done

**Time goal**: 10 seconds ✅
- API cached, loads ~500ms
- 12 relevant choices (not 100+)
- One-tap selection
- Progressive disclosure for details

---

## Implementation Plan

### Phase 1: Create Dynamic Species Hook

**New file**: `hooks/useQuickLogSpecies.ts`

```typescript
import { useFishingPredictions } from './useFishingPredictions';
import { SPECIES_IMAGE_MAP } from '@/data/speciesImageMap';

interface QuickLogSpecies {
  id: string;
  code: string;
  name: string;
  scientificName?: string;
  thumbnail: string | null;
  confidence: number;
  biteScore: number;
  badge?: 'hot' | 'good' | null; // Visual indicator
}

export function useQuickLogSpecies(
  latitude: number,
  longitude: number,
  options?: { maxSpecies?: number }
) {
  const maxSpecies = options?.maxSpecies ?? 12;

  // Fetch predictions for location
  const { data, isLoading, error } = useFishingPredictions({
    latitude,
    longitude,
    predictionDate: new Date().toISOString().split('T')[0],
    language: 'en',
  });

  // Transform predictions into quick-log format
  const species: QuickLogSpecies[] = useMemo(() => {
    if (!data?.predictions) return [];

    return data.predictions
      .slice(0, maxSpecies)
      .map((pred) => {
        // Get thumbnail from existing image map
        const imageInfo = SPECIES_IMAGE_MAP[pred.species_code];

        return {
          id: pred.slug || pred.species_code,
          code: pred.species_code,
          name: pred.name_en,
          scientificName: pred.scientific_name,
          thumbnail: imageInfo?.thumb || imageInfo?.image || null,
          confidence: pred.confidence,
          biteScore: pred.bite_score,
          badge: pred.bite_score >= 60 ? 'hot' : pred.bite_score >= 45 ? 'good' : null,
        };
      });
  }, [data?.predictions, maxSpecies]);

  return {
    species,
    isLoading,
    error,
    metadata: data?.metadata,
  };
}
```

**Why this works**:
- `useFishingPredictions` already exists and is well-tested
- `SPECIES_IMAGE_MAP` already has 100+ species with thumbnails
- Predictions API returns sorted by confidence (best matches first)
- Badge thresholds (60+ = hot, 45+ = good) give visual cues

---

### Phase 2: Update QuickLogModal UI

**File**: `components/findr/QuickLogModal.tsx`

#### Changes to make:

**1. Replace hardcoded species with dynamic hook** (line ~127):

```typescript
// REMOVE:
const REGIONAL_QUICK_PICKS = ['MAC', 'SBA', 'POL', 'GMU', 'BBR', 'WHI'];

// ADD:
const { latitude, longitude } = useUnifiedLocation(); // Get user location
const { species: quickPicks, isLoading: loadingSpecies } = useQuickLogSpecies(
  latitude,
  longitude,
  { maxSpecies: 12 }
);
```

**2. Update species grid rendering** (around line ~250):

```typescript
{/* Species Grid */}
{loadingSpecies ? (
  <div className="grid grid-cols-3 gap-3">
    {[...Array(12)].map((_, i) => (
      <div key={i} className="aspect-square bg-base-200 animate-pulse rounded-lg" />
    ))}
  </div>
) : (
  <div className="grid grid-cols-3 gap-3">
    {quickPicks.map((species) => (
      <button
        key={species.code}
        onClick={() => setSelectedSpecies(species)}
        className={cn(
          'relative flex flex-col items-center p-3 rounded-lg',
          'border-2 transition-all hover:scale-105',
          selectedSpecies?.code === species.code
            ? 'border-primary bg-primary/10'
            : 'border-base-300 hover:border-primary/50'
        )}
      >
        {/* Thumbnail */}
        <div className="relative w-20 h-12 mb-2">
          {species.thumbnail ? (
            <Image
              src={species.thumbnail}
              alt={species.name}
              fill
              className="object-cover rounded"
              sizes="80px"
            />
          ) : (
            <div className="w-full h-full bg-base-200 rounded flex items-center justify-center text-2xl">
              🐟
            </div>
          )}

          {/* Confidence badge */}
          {species.badge && (
            <div className="absolute -top-1 -right-1">
              {species.badge === 'hot' && (
                <span className="badge badge-sm badge-error">🔥</span>
              )}
              {species.badge === 'good' && (
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Name */}
        <span className="text-xs font-medium text-center line-clamp-2">
          {species.name}
        </span>
      </button>
    ))}
  </div>
)}
```

**3. Keep "Other Species" fallback** (existing search remains for edge cases):

```typescript
{/* Fallback search if species not in top 12 */}
<div className="divider text-xs">Or search all species</div>
<SpeciesCombobox
  onSelect={(selected) => setSelectedSpecies({
    id: selected.id,
    code: selected.code,
    name: selected.name,
    scientificName: selected.scientificName,
    thumbnail: SPECIES_IMAGE_MAP[selected.code]?.thumb,
  })}
/>
```

---

### Phase 3: Handle Edge Cases

#### 1. **Location Permission Denied**

```typescript
const { latitude, longitude, hasPermission } = useUnifiedLocation();

if (!hasPermission) {
  // Fall back to user's last known location or default region
  const fallbackLat = localStorage.getItem('lastLat') || 43.5; // Default: Asturias
  const fallbackLon = localStorage.getItem('lastLon') || -5.25;

  const { species: quickPicks } = useQuickLogSpecies(
    parseFloat(fallbackLat),
    parseFloat(fallbackLon)
  );
}
```

#### 2. **API Error / Offline**

```typescript
const { species, error } = useQuickLogSpecies(latitude, longitude);

if (error) {
  // Fall back to cached predictions or default species list
  const cachedPredictions = localStorage.getItem('lastPredictions');
  const fallbackSpecies = cachedPredictions
    ? JSON.parse(cachedPredictions).slice(0, 12)
    : REGIONAL_QUICK_PICKS; // Keep old hardcoded list as last resort
}
```

#### 3. **New Users (No Location Yet)**

```typescript
// Show modal asking for location permission first
// Or use IP geolocation as initial guess
// Or show generic "Popular Species" (MAC, BSS, SBA...)
```

---

## Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `hooks/useQuickLogSpecies.ts` | Dynamic species fetching hook |

### Modified Files

| File | Lines | Changes | Risk |
|------|-------|---------|------|
| `components/findr/QuickLogModal.tsx` | ~127, ~250 | Replace hardcoded list, update grid UI | 🟡 Medium |
| `hooks/useCatchLogger.ts` | No changes | Already supports slug/code/scientificName ✅ | 🟢 None |
| `data/speciesImageMap.ts` | No changes | Already has all thumbnails ✅ | 🟢 None |

---

## Why This Approach is Better Than Bay-of-Biscay-Species.ts

### Comparison

| Feature | Bay-of-Biscay-Species.ts | Predictions API |
|---------|--------------------------|-----------------|
| **Regional filtering** | ❌ Hardcoded to Bay of Biscay | ✅ Works worldwide |
| **Seasonal activity** | ⚠️ Static multipliers | ✅ Real-time seasonal scoring |
| **Temperature matching** | ⚠️ Static ranges | ✅ Real-time CMEMS data |
| **Depth scoring** | ⚠️ Static ranges | ✅ Real-time depth matching |
| **Maintenance** | ❌ Need to update file | ✅ Auto-updates from database |
| **Accuracy** | ⚠️ 16 species only | ✅ 100+ species with full data |
| **Caching** | ❌ No caching | ✅ 3-hour cache, fast response |
| **Infrastructure** | ❌ New component | ✅ Reuses existing system |

**Verdict**: Predictions API is superior in every way. Bay-of-Biscay-Species.ts would be technical debt.

---

## Testing Plan

### Unit Tests

```typescript
// hooks/useQuickLogSpecies.test.ts
describe('useQuickLogSpecies', () => {
  it('returns top 12 species for location', async () => {
    const { result } = renderHook(() =>
      useQuickLogSpecies(43.5, -5.25)
    );
    await waitFor(() => expect(result.current.species).toHaveLength(12));
  });

  it('includes thumbnails from SPECIES_IMAGE_MAP', async () => {
    const { result } = renderHook(() =>
      useQuickLogSpecies(43.5, -5.25)
    );
    await waitFor(() => {
      const firstSpecies = result.current.species[0];
      expect(firstSpecies.thumbnail).toBeTruthy();
    });
  });

  it('assigns correct badges based on bite score', async () => {
    const { result } = renderHook(() =>
      useQuickLogSpecies(43.5, -5.25)
    );
    await waitFor(() => {
      const hotSpecies = result.current.species.find(s => s.biteScore >= 60);
      expect(hotSpecies?.badge).toBe('hot');
    });
  });
});
```

### E2E Tests

```typescript
// e2e/catch-logging-quick.spec.ts
test('quick log flow completes in under 10 seconds', async ({ page }) => {
  const startTime = Date.now();

  // 1. Open quick log modal
  await page.goto('/findr');
  await page.click('[data-testid="quick-log-button"]');

  // 2. Wait for species grid to load
  await page.waitForSelector('[data-testid="species-grid"]');

  // 3. Click first species
  await page.click('[data-testid="species-button"]:first-child');

  // 4. Set quantity
  await page.fill('[data-testid="quantity-input"]', '2');

  // 5. Submit
  await page.click('[data-testid="submit-button"]');

  // 6. Wait for success
  await page.waitForSelector('[data-testid="success-message"]');

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  expect(duration).toBeLessThan(10); // 10-second goal ✅
});

test('shows region-specific species for different locations', async ({ page }) => {
  // Test Asturias (Atlantic)
  await page.goto('/findr?lat=43.5&lon=-5.25');
  await page.click('[data-testid="quick-log-button"]');
  const atlanticSpecies = await page.locator('[data-testid="species-button"]').allTextContents();
  expect(atlanticSpecies).toContain('Sea Bass');
  expect(atlanticSpecies).toContain('Grey Mullet');

  // Test Málaga (Mediterranean)
  await page.goto('/findr?lat=36.72&lon=-4.42');
  await page.click('[data-testid="quick-log-button"]');
  const medSpecies = await page.locator('[data-testid="species-button"]').allTextContents();
  expect(medSpecies).toContain('Salema');
  expect(medSpecies).toContain('Leerfish'); // Mediterranean-specific
});
```

### Manual Testing Checklist

- [ ] Open quick log modal in Asturias → See Atlantic species (Sea Bass, Picarel, Sardine...)
- [ ] Open quick log modal in Málaga → See Mediterranean species (Salema, Leerfish, Parrotfish...)
- [ ] Open quick log modal in North Sea → See cold-water species (Cod, Haddock, Plaice...)
- [ ] Species grid loads in <1s (predictions cached)
- [ ] Thumbnails display correctly (100x60px WebP)
- [ ] Confidence badges show correctly (🔥 for bite_score ≥60, green dot for ≥45)
- [ ] Selecting species highlights it (border changes)
- [ ] Complete flow takes <10 seconds
- [ ] Fallback search works if species not in top 12
- [ ] Works offline (uses cached predictions)
- [ ] Location permission denied → Uses last known location
- [ ] API error → Falls back gracefully

---

## Migration from Bay-of-Biscay-Species.ts

**Good news**: The `bay-of-biscay-species.ts` file provided by the user is NOT needed!

**Why**:
1. Predictions API already has all 16 species from that file
2. Predictions API has 100+ more species beyond Bay of Biscay
3. Predictions API works globally, not just one region
4. Predictions API has real-time data, not static multipliers

**What to do with the file**:
- Archive it as reference (shows user's intent/preferences)
- Use as validation: confirm all 16 species appear in predictions for Bay of Biscay coordinates
- Don't import it into the codebase

**Validation test**:

```bash
# Fetch Bay of Biscay predictions
curl -s -X POST 'http://localhost:3004/api/findr/predictions' \
  -H 'Content-Type: application/json' \
  -d '{"latitude":43.5,"longitude":-5.25,"predictionDate":"2025-10-30","language":"en"}' \
  | jq '.predictions[:16] | map(.name_en)'
```

**Expected**: All 16 species from bay-of-biscay-species.ts appear in top ~20 predictions ✅

---

## Performance Considerations

### 1. **API Response Time**

- **Without cache**: ~500ms (acceptable)
- **With cache**: ~50ms (excellent)
- **Goal**: <1s for species grid to appear

**Optimization**: Preload predictions when user navigates to Findr page (before modal opens)

```typescript
// pages/findr/index.tsx
export default function FindrPage() {
  const { latitude, longitude } = useUnifiedLocation();

  // Preload predictions for quick log
  useFishingPredictions({
    latitude,
    longitude,
    predictionDate: new Date().toISOString().split('T')[0],
    language: 'en',
  });

  // ... rest of page
}
```

### 2. **Image Loading**

- Use Next.js `<Image>` with `priority` for thumbnails
- Thumbnails are 100x60px WebP (~5-10KB each)
- 12 images = ~60-120KB total (fast on 3G)

### 3. **Caching Strategy**

```typescript
// React Query cache config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 60 * 1000, // 3 hours (matches API cache)
      cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  },
});
```

---

## Rollback Plan

### If Issues Arise

**Option 1**: Revert to hardcoded list

```typescript
// Quick rollback: comment out dynamic hook, uncomment old code
// const { species: quickPicks } = useQuickLogSpecies(latitude, longitude);
const quickPicks = ['MAC', 'SBA', 'POL', 'GMU', 'BBR', 'WHI']; // OLD
```

**Option 2**: Feature flag

```typescript
const USE_DYNAMIC_SPECIES = process.env.NEXT_PUBLIC_DYNAMIC_SPECIES === 'true';

const quickPicks = USE_DYNAMIC_SPECIES
  ? useQuickLogSpecies(latitude, longitude)
  : REGIONAL_QUICK_PICKS;
```

**Option 3**: Gradual rollout

- Deploy to 10% of users first
- Monitor error rates, completion times
- Scale to 100% if metrics good

---

## Success Metrics

### Primary Metrics

- ✅ **Speed**: Catch log flow completes in <10 seconds (median)
- ✅ **Relevance**: User catches match top 12 species >80% of time
- ✅ **Engagement**: Quick log usage increases >20%

### Secondary Metrics

- ✅ **Accuracy**: Species in quick picks are actually catchable (validated by catch logs)
- ✅ **Global**: Works correctly in Atlantic, Mediterranean, North Sea, Scandinavia
- ✅ **Seasonal**: Species change appropriately across seasons
- ✅ **Performance**: Species grid loads in <1s (95th percentile)

---

## Summary

### ✅ What We're Doing

1. Create `useQuickLogSpecies` hook that wraps predictions API
2. Update QuickLogModal to use dynamic species instead of hardcoded list
3. Show top 12 region-specific species with thumbnails and confidence badges
4. Keep fallback search for edge cases

### 🎯 What We're NOT Doing

1. ❌ Creating separate Bay-of-Biscay species database
2. ❌ Duplicating seasonal/temperature/depth logic
3. ❌ Maintaining static species lists per region
4. ❌ Building new image systems (already have 100+ thumbnails)

### 🚀 Why This is Better

- **Reuses existing infrastructure** (predictions API, image map, caching)
- **Works globally** (not just Bay of Biscay)
- **Always up-to-date** (real-time environmental data)
- **Lower maintenance** (no hardcoded species lists)
- **Faster development** (hooks already exist)
- **Better UX** (smart filtering, confidence indicators)

---

**Status**: ✅ Ready to implement
**Next Step**: Create `hooks/useQuickLogSpecies.ts` and test with Bay of Biscay coordinates

**Last Updated**: 2025-10-30
