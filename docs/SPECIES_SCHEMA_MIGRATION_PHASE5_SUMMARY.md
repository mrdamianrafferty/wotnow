# Species Schema Migration - Phase 5 Summary

**Date**: 2025-10-30
**Status**: Ready to implement
**Goal**: Update frontend to use `slug` and `aliases` fields from API

---

## Overview

Phase 5 updates the frontend code to consume the new `slug` and `aliases` fields that the predictions API now returns (thanks to Phase 4A API-layer enrichment).

**What's Working After Phase 4A**:
- API returns `slug` field (e.g., `"dicentrarchus-labrax"`)
- API returns `aliases` field (e.g., `["European Sea Bass", "european sea bass"]`)

**What Phase 5 Will Do**:
- Update TypeScript interfaces to include these fields
- Update mapping logic to extract `slug` and `aliases` from API responses
- Display aliases in the UI (species modal as "also known as")
- Use `slug` where appropriate (stable URLs, component keys)

---

## Implementation Plan

### 1. Update TypeScript Interfaces

**File**: `lib/findr/mapPrediction.ts`

Add to `CardData` interface (around line 58-130):
```typescript
export interface CardData {
  // ... existing fields ...
  slug?: string | null;              // ➕ ADD: URL-friendly identifier
  aliases?: string[] | null;         // ➕ ADD: Alternative common names
  // ... rest of interface ...
}
```

### 2. Update Mapping Logic

**File**: `lib/findr/mapPrediction.ts`

In `mapPrediction()` function (around line 525-700), extract slug and aliases:
```typescript
// Extract slug (around line 565, after scientificName)
const slug =
  firstString(prediction.slug) ||
  undefined;

// Extract aliases (as array)
const aliases = Array.isArray(prediction.aliases)
  ? prediction.aliases.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
  : undefined;
```

Then add to return object (where CardData is constructed):
```typescript
return {
  id,
  speciesId: rawSpeciesId,
  commonName,
  scientificName,
  slug,                    // ➕ ADD
  aliases,                 // ➕ ADD
  // ... rest of fields ...
};
```

### 3. Display Aliases in UI

**File**: `components/findr/FishSpeciesModal.tsx`

Add aliases display after localized names (around line 252-254):
```typescript
{localizedLine && (
  <p className="text-xs text-base-content/60">{localizedLine}</p>
)}
{card.aliases && card.aliases.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">
      Also known as:
    </span>
    {card.aliases.map((alias) => (
      <span key={alias} className="badge badge-sm badge-outline">
        {alias}
      </span>
    ))}
  </div>
)}
```

### 4. Optional: Use Slug for Component Keys

**Files**: Various prediction card components

Where we currently use `species.id` or construct IDs from `species_code`, consider using `slug` as a more stable identifier:

```typescript
// Example in GoodSpeciesCard.tsx
<div
  data-testid="species-card"
  data-species-slug={species.slug}  // ➕ ADD for debugging
  data-species-id={species.id}
  // ... rest of props ...
>
```

---

## Files to Modify

1. **`lib/findr/mapPrediction.ts`**
   - Add `slug?: string | null` and `aliases?: string[] | null` to `CardData` interface
   - Extract slug and aliases in `mapPrediction()` function
   - Include in return object

2. **`components/findr/FishSpeciesModal.tsx`**
   - Display aliases as badges after localized names
   - Style with "Also known as:" label

3. **Optional UI improvements** (other card components):
   - Add aliases to tooltips
   - Use slug for data attributes
   - Display aliases on hover or in expanded views

---

## Testing

### Verification Tests

**Test 1: Check type definitions compile**:
```bash
npm run typecheck
```

**Test 2: Verify aliases display in UI**:
1. Start dev server: `npm run dev`
2. Navigate to Findr predictions page
3. Click on a species like "Sea Bass" with aliases
4. Verify aliases display below localized names: "Also known as: European Sea Bass, european sea bass"

**Test 3: Check data flow**:
```bash
curl -s -X POST 'http://localhost:3004/api/findr/predictions' \
  -H 'Content-Type: application/json' \
  -d '{"latitude":43.5,"longitude":-5.25,"predictionDate":"2025-10-29","language":"en","bypassCache":true}' \
  | jq '.predictions[0] | {species_code, name_en, slug, aliases}'
```

Expected output:
```json
{
  "species_code": "BSS",
  "name_en": "Sea Bass",
  "slug": "dicentrarchus-labrax",
  "aliases": ["European Sea Bass", "european sea bass"]
}
```

---

## Benefits

1. **Better Search** (prepares for Phase 6): Frontend now has aliases data for search/autocomplete
2. **Stable URLs**: `slug` can be used for species detail pages (`/findr/species/dicentrarchus-labrax`)
3. **User-Friendly**: Users see alternative common names they might recognize
4. **i18n Ready**: Aliases complement localized names for better multilingual support

---

## Next Steps

After Phase 5 completion:
- **Phase 6**: Add species search/autocomplete using aliases
- **Phase 7**: Deprecate `species_code` display in UI, use `slug` and `scientific_name` instead

---

## Rollback Plan

If issues arise:
1. TypeScript changes are non-breaking (optional fields)
2. UI changes are additive (won't crash if fields missing)
3. Can hide aliases display with CSS if needed: `.species-aliases { display: none; }`

---

**Status**: 📝 Planning complete, ready to implement
