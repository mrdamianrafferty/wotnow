# Species Schema Migration - Phase 7 Analysis

**Date**: 2025-10-30
**Status**: Analysis complete, implementation DEFERRED until post-launch
**Risk Level**: 🔴 HIGH (Breaking changes required)

---

## Overview

Phase 7 aims to deprecate `species_code` display in the UI, replacing it with `slug` and `scientific_name`. This analysis identifies the risks and proposes a safe migration path.

**TL;DR**: Don't remove `species_code` yet. It's deeply embedded in the favorites system, image lookups, and matching logic. Keep both fields in API responses and migrate gradually.

---

## Current State (After Phase 5)

✅ **What's Working**:
- API returns both `species_code` and `slug` (Phase 4A complete)
- Frontend TypeScript interfaces support both fields (Phase 5 complete)
- `aliases` array displayed in species modal (Phase 5 complete)
- All new fields are optional, non-breaking

❌ **What's Missing**:
- Frontend still depends on `species_code` for critical operations
- No slug-based image lookup mechanism
- Favorites matching uses `species_code` extensively
- Legacy alias mapping (`FLE` → `FLO`, etc.) requires code

---

## Risk Analysis: What Breaks if We Remove species_code

### 🔴 HIGH RISK: Favorites Matching System

**File**: `pages/findr/favourites.tsx`
**Lines**: 76-107, 349-433, 771-809

**Current Implementation**:
```typescript
// Legacy code alias mapping (lines 76-84)
const SPECIES_CODE_ALIASES: Record<string, string> = {
  'FLE': 'FLO',  // Flounder
  'CSH': 'DOG',  // Catshark
  'BRS': 'BBR',  // Black Bream
  'BLL': 'WRA',  // Ballan Wrasse
  'FGM': 'GMU',  // Grey Mullet
  'SQC': 'SQU',  // Squid
  'RUN': 'GUR',  // Gurnard
};

// Normalization function (lines 93-107)
function normalizeSpeciesId(id: string, speciesCode?: string | null): string {
  if (!speciesCode) return id.toLowerCase();

  const upperCode = speciesCode.toUpperCase();
  const mappedCode = SPECIES_CODE_ALIASES[upperCode];

  if (mappedCode) {
    const normalizedId = mappedCode.toLowerCase();
    console.log(`Normalized ${id} (code: ${upperCode}) -> ${normalizedId}`);
    return normalizedId;
  }

  return id.toLowerCase();
}

// Prediction matching (lines 794-801)
for (const code of tryCodes) {
  card = cards.find((item) =>
    (item.speciesCode && item.speciesCode.toUpperCase() === code.toUpperCase()) ||
    (item.id && item.id === code)
  ) ?? null;
  if (card) {
    matchReason = code;
    break;
  }
}
```

**Why This Breaks**:
1. Favorites are stored with legacy codes (FLE, BLL, CSH)
2. Live predictions use correct codes (FLO, WRA, DOG)
3. Without `species_code`, no way to map old favorites to new predictions
4. Users lose all their favorites overnight

**Impact**: 🔴 **BREAKING** - All existing favorites stop matching predictions

---

### 🔴 HIGH RISK: Image Lookup System

**Files**: Multiple (`favourites.tsx`, `SessionLogModal.tsx`, `index.tsx`, `QuickLogModal.tsx`)

**Current Implementation**:
```typescript
// Image map keyed by 3-letter codes (data/speciesImageMap.ts)
export const SPECIES_IMAGE_MAP: Record<string, SpeciesImageInfo> = {
  'MAC': {
    name: 'Atlantic Mackerel',
    image: '/webp/species/mackerel.webp',
    scientificName: 'Scomber scombrus',
  },
  'BSS': {
    name: 'Sea Bass',
    image: '/webp/species/sea-bass.webp',
    scientificName: 'Dicentrarchus labrax',
  },
  // ... 100+ more species
};

// Lookup function (favourites.tsx:349-369)
function buildFallbackCardImage(
  speciesCode?: string | null,
  explicitUrl?: string | null,
  fallbackName?: string | null
): CardImage | null {
  if (speciesCode) {
    const upperCode = speciesCode.toUpperCase();
    const mappedCode = SPECIES_CODE_ALIASES[upperCode] ?? upperCode;
    const info = SPECIES_IMAGE_MAP[mappedCode];
    if (info) {
      return {
        src: info.image,
        alt: info.name,
        mobile: info.mobile ?? null,
        thumb: info.thumb ?? null,
      };
    }
  }
  // ... fallback logic
}
```

**Why This Breaks**:
- `SPECIES_IMAGE_MAP` is keyed by codes: `MAC`, `BSS`, `COD`
- No slug-based lookup exists
- All species images fail to load
- Fallback to gradient fish placeholders everywhere

**Impact**: 🔴 **BREAKING** - All species images disappear

---

### 🟡 MEDIUM RISK: Weather Messages

**File**: `pages/findr/index.tsx`
**Line**: 283

**Current Implementation**:
```typescript
<WeatherGuildMessage
  speciesCode={card.speciesCode || ''}
  scientificName={card.scientificName || ''}
  weatherScore={card.weather_score}
  windSpeedMS={card.current_wind_speed_ms}
  pressureHPA={card.current_pressure_hpa}
  isLoading={false}
/>
```

**Why This Breaks**:
- `getWeatherMessage()` function expects `speciesCode` parameter
- Guild-specific weather logic uses code-based lookup

**Impact**: 🟡 **DEGRADED** - Weather messages might not be species-specific

---

### 🟢 LOW RISK: Catch Logging

**Files**: `SessionLogModal.tsx`, `QuickLogModal.tsx`

**Current Implementation**:
```typescript
// Already uses abstraction (line 159 in SessionLogModal)
const result = await onSubmitCatch({
  speciesId: catch_.species_id,  // ✅ Uses generic ID, not hardcoded code
  speciesCommonName: speciesInfo.name,
  scientificName: speciesInfo.scientificName ?? null,
  rectangleCode,
  catchDate: sessionDate,
  // ...
});
```

**Why This Works**:
- Already uses generic `speciesId` field
- API endpoint accepts slugs or UUIDs
- No breaking change if we pass slugs

**Impact**: 🟢 **SAFE** - Already prepared for transition

---

## Migration Strategy: Keep Both Fields

**Recommendation**: Don't remove `species_code` from API responses. Implement gradual migration:

### Phase 7A: Add Slug Support (Non-Breaking) ✅ SAFE TO IMPLEMENT

1. **Create slug→code helper** (new file: `lib/findr/speciesCodeHelpers.ts`):
```typescript
/**
 * Temporary helper for backward compatibility
 * Maps slug to species_code for legacy systems
 * TODO: Remove after favorites migration complete
 */
export const SLUG_TO_CODE_MAP: Record<string, string> = {
  'dicentrarchus-labrax': 'BSS',
  'scomber-scombrus': 'MAC',
  'gadus-morhua': 'COD',
  // ... generated from species table
};

export function getCodeFromSlug(slug: string): string | null {
  return SLUG_TO_CODE_MAP[slug] ?? null;
}

export function getSpeciesIdentifier(
  card: { slug?: string | null; speciesCode?: string | null }
): string {
  // Prefer slug, fallback to code
  return card.slug ?? card.speciesCode ?? '';
}
```

2. **Update image lookup to accept both**:
```typescript
// Update buildFallbackCardImage() signature
function buildFallbackCardImage(
  slug?: string | null,
  speciesCode?: string | null,
  explicitUrl?: string | null,
  fallbackName?: string | null
): CardImage | null {
  // Try slug first
  if (slug) {
    const code = getCodeFromSlug(slug);
    if (code) {
      const info = SPECIES_IMAGE_MAP[code];
      if (info) return { src: info.image, alt: info.name, ... };
    }
  }

  // Fallback to code
  if (speciesCode) {
    const upperCode = speciesCode.toUpperCase();
    const mappedCode = SPECIES_CODE_ALIASES[upperCode] ?? upperCode;
    const info = SPECIES_IMAGE_MAP[mappedCode];
    if (info) return { src: info.image, alt: info.name, ... };
  }

  // ... existing fallback logic
}
```

3. **Update favorites matching**:
```typescript
// Try matching by slug first, fallback to code
const tryCodes: string[] = [];
if (card.slug) tryCodes.push(card.slug);
if (metadata?.speciesCode) {
  const upperCode = metadata.speciesCode.toUpperCase();
  tryCodes.push(upperCode);
  if (SPECIES_CODE_ALIASES[upperCode]) {
    tryCodes.push(SPECIES_CODE_ALIASES[upperCode]);
  }
}
tryCodes.push(id, id.toLowerCase());
```

4. **Add deprecation warnings** (console only, not user-facing):
```typescript
if (card.speciesCode && !card.slug) {
  console.warn(
    `[DEPRECATION] Species ${card.speciesCode} missing slug field. ` +
    `Update API to include slug for forward compatibility.`
  );
}
```

---

### Phase 7B: Monitor & Test (Post-Launch, 2-4 weeks) 🟡 RISKY

5. **Verify slug adoption**:
   - Monitor console warnings in production
   - Check that all predictions include slugs
   - Verify favorites still match correctly
   - Test image loading across all species

6. **User migration path**:
   - Create admin tool to migrate old favorites (FLE → FLO)
   - Add UI banner: "We've updated our species system. Your favorites are safe!"
   - Log migration analytics

---

### Phase 7C: Deprecation (Post-Launch, After Monitoring) 🔴 BREAKING

7. **Mark field as deprecated**:
```typescript
export interface CardData {
  // ... other fields

  /**
   * @deprecated Use slug instead. Will be removed in v2.0.
   */
  speciesCode?: string;

  slug: string; // Make required after migration
}
```

8. **Remove from API** (only after 100% slug adoption):
   - Wait 4-8 weeks minimum
   - Announce removal 2 weeks in advance
   - Remove from RPC function and API responses
   - Remove SPECIES_CODE_ALIASES mapping
   - Remove backward compat helpers

---

## Files Requiring Updates

### Phase 7A (Safe, Non-Breaking)

| File | Lines | Changes | Risk |
|------|-------|---------|------|
| `lib/findr/speciesCodeHelpers.ts` | NEW | Create slug→code mapping | 🟢 New file |
| `pages/findr/favourites.tsx` | 349-433 | Update `buildFallbackCardImage()` | 🟡 Test heavily |
| `pages/findr/favourites.tsx` | 771-809 | Update matching logic | 🟡 Test heavily |
| `components/findr/SessionLogModal.tsx` | 140, 245 | Already uses `speciesId` ✅ | 🟢 No changes |
| `components/findr/QuickLogModal.tsx` | 159 | Already uses `speciesId` ✅ | 🟢 No changes |
| `lib/utils/weatherMessages.ts` | Function signature | Add slug parameter (optional) | 🟢 Backward compat |

### Phase 7B (Monitoring)
- Add Sentry/logging to track migration issues
- Create admin dashboard for favorites health check

### Phase 7C (Breaking)
- Remove all `species_code` references
- Make `slug` required in TypeScript interfaces
- Update database schema to deprecate code column

---

## Testing Checklist (Phase 7A)

Before deploying slug support:

- [ ] **Unit tests**: slug→code mapping returns correct values
- [ ] **Integration tests**: Favorites match predictions using slugs
- [ ] **Visual tests**: Species images load correctly with slug lookups
- [ ] **Regression tests**: Existing favorites (with codes) still work
- [ ] **E2E tests**: Catch logging works with both slugs and codes
- [ ] **Performance tests**: No slowdown from double lookup (slug + code fallback)

---

## Why Defer Phase 7 Until Post-Launch?

**Reasons**:
1. **High risk of breaking favorites** - Users lose all their saved species
2. **Image system needs significant refactoring** - 100+ image lookups to update
3. **Legacy data migration required** - Old favorites use invalid codes (FLE, BLL)
4. **Not blocking other features** - API already returns both fields
5. **Better to monitor in production first** - Real user data will reveal edge cases

**Timeline Recommendation**:
- Phase 5 ✅ Complete (slug/aliases in API and UI)
- Phase 6 ⏭️ Deferred (search is standalone feature)
- Phase 7A 🟡 Can start post-launch (add slug support, keep both fields)
- Phase 7B 🔴 Wait 2-4 weeks (monitor adoption, migrate favorites)
- Phase 7C 🔴 Wait 2-3 months (remove species_code from API)

---

## Why Was Phase 6 (Search) Deferred?

**Phase 6 Goal**: Add species search/autocomplete using aliases

**Deferred Because**:

### 1. **Scope Creep** - Not Core to Schema Migration
- Search is a **new feature**, not a schema change
- Migration goal: Use `slug` and `aliases` for identification
- Search goal: User can type "European Sea Bass" and find species
- These are **separate concerns**

### 2. **UX Decisions Required**
- **Where does search live?**
  - Global header? Per-page? Dedicated search page?
- **What does it search?**
  - Just aliases? Also include scientific names? Common names in all languages?
- **How does it behave?**
  - Autocomplete dropdown? Full search results page? Filter existing cards?
- **Mobile vs Desktop?**
  - Different UX for small screens vs large
  - Should it replace location picker on mobile? (limited screen space)

### 3. **Requires New Components**
- Search input component (with debouncing, loading states)
- Results dropdown/modal
- Keyboard navigation (arrow keys, enter, escape)
- Accessibility (ARIA labels, screen reader support)
- State management for search query

### 4. **Not Blocking Launch**
- Users can already browse all species in the swipe deck
- Users can already filter by location
- Search is a **nice-to-have**, not a **must-have** for MVP
- Better to get feedback on core prediction flow first

### 5. **Can Be Built Later with Full Context**
- After launch, we'll know:
  - How users actually navigate species
  - Whether they need search or if swipe deck is sufficient
  - What search patterns emerge (by name? by region? by season?)
- This informs better UX decisions

**Example of What Phase 6 Would Entail**:
```typescript
// New component: components/findr/SpeciesSearch.tsx
export function SpeciesSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Species[]>([]);

  // Debounced search using aliases
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length < 2) return;

      // Search through species.aliases array
      const matches = allSpecies.filter(species =>
        species.aliases?.some(alias =>
          alias.toLowerCase().includes(query.toLowerCase())
        ) ||
        species.name_en.toLowerCase().includes(query.toLowerCase()) ||
        species.scientific_name.toLowerCase().includes(query.toLowerCase())
      );

      setResults(matches);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ... render search input, results dropdown, keyboard nav
}
```

**When to Build Phase 6**:
- After Phase 5 deployed and stable (aliases data flowing to frontend) ✅
- After Phase 7A deployed (slug support added, both fields available)
- After 2-4 weeks of user feedback on core prediction flow
- As a **standalone feature story** with full UX design review

---

## Summary

### ✅ What's Safe Now
- Phase 5 complete: `slug` and `aliases` in frontend
- Both fields coexist peacefully in API responses
- No breaking changes to existing functionality

### 🔴 What's Risky
- Removing `species_code` from API responses
- Updating favorites matching without `species_code`
- Migrating image lookup system to slug-based

### 🎯 Recommended Path Forward
1. **Now**: Deploy Phase 5 changes (already complete)
2. **Post-launch**: Implement Phase 7A (add slug support, keep both fields)
3. **After 2-4 weeks**: Monitor adoption, migrate favorites, test thoroughly
4. **After 2-3 months**: Consider removing `species_code` if 100% slug adoption

### 📊 Risk Assessment
- **Phase 5**: 🟢 LOW risk (complete, tested, non-breaking)
- **Phase 6**: ⏭️ DEFERRED (standalone feature, not blocking)
- **Phase 7A**: 🟡 MEDIUM risk (can implement safely post-launch)
- **Phase 7B/C**: 🔴 HIGH risk (requires monitoring and migration period)

---

**Status**: Analysis complete. Phase 7 implementation deferred to post-launch monitoring period.

**Next Steps**:
1. Deploy Phase 5 changes (already complete)
2. Monitor `slug` and `aliases` data quality in production
3. Revisit Phase 7A after 1-2 weeks of stable production usage

**Last Updated**: 2025-10-30
