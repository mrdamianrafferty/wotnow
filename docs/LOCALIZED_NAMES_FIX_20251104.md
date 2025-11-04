# Localized Species Names - English Fallback Filter Fix

**Date**: November 4, 2025
**Status**: ✅ Fixed
**Component**: Findr Predictions API (`pages/api/findr/predictions.ts`)

## Problem

Species names in other languages were showing English common names instead of proper translations. For example:
- Atlantic Salmon appeared as "Atlantic Salmon" in French, Spanish, and Portuguese instead of proper translations
- This happened for 70-79% of species depending on the language

## Root Cause

The database contains English fallback values stored in localized name fields (e.g., `name_fr`, `name_es`) when proper translations were unavailable. The `buildLocalizedNamePayload()` function in the predictions API was including these English fallback values as if they were real translations.

**Previous logic:**
```typescript
const defined = candidates
  .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
  .map(([key, value]) => [key, (value as string).trim()] as const);
```

This only checked for non-empty strings but didn't compare against the English name.

## Analysis Results

Running `scripts/check-localized-names.ts` revealed:

| Language | Proper Translations | English Fallback | Null/Missing | Total Issues |
|----------|---------------------|------------------|--------------|--------------|
| French (FR) | 45 (25%) | **129 (71%)** | 8 (4%) | 137 (75%) |
| Spanish (ES) | 47 (26%) | **127 (70%)** | 8 (4%) | 135 (74%) |
| German (DE) | 25 (14%) | 1 (1%) | 156 (86%) | 157 (86%) |
| Italian (IT) | 43 (24%) | 0 (0%) | 139 (76%) | 139 (76%) |
| Portuguese (PT) | 31 (17%) | **143 (79%)** | 8 (4%) | 151 (83%) |

**Key Finding**: **135 species (74% of all 182 species) had NO proper translations** across any language, showing only English fallbacks.

### Examples of Proper Translations (that were working)
- Atlantic Cod → "Morue franche" (FR), "Bacalao del Atlántico" (ES)
- Bluefish → "Tassergal" (FR), "Anjova" (ES)

### Examples of English Fallbacks (the problem)
- Atlantic Salmon → "Atlantic Salmon" (FR, ES, PT)
- Albacore Tuna → "Albacore Tuna" (FR, ES, PT)
- American Lobster → "American Lobster" (FR, ES, PT)

## Solution

Updated `buildLocalizedNamePayload()` function in `pages/api/findr/predictions.ts` (lines 219-243) to filter out localized names that match the English name:

```typescript
function buildLocalizedNamePayload(row: SpeciesLocalizationRow): LocalizedNameMap | null {
  const candidates: [keyof LocalizedNameMap, string | null][] = [
    ['fr', row.name_fr],
    ['es', row.name_es],
    ['de', row.name_de],
    ['it', row.name_it],
    ['pt', row.name_pt],
  ];

  // Filter out null/empty values AND English fallbacks (where localized name = English name)
  const defined = candidates
    .filter(([, value]) => {
      if (typeof value !== 'string' || value.trim().length === 0) return false;
      // Exclude if the localized name is identical to English (case-insensitive)
      if (row.name_en && value.trim().toLowerCase() === row.name_en.trim().toLowerCase()) return false;
      return true;
    })
    .map(([key, value]) => [key, (value as string).trim()] as const);

  if (defined.length === 0) {
    return null;
  }

  return Object.fromEntries(defined) as LocalizedNameMap;
}
```

## Impact

**Before Fix:**
- Species without translations showed `localizedNames: { fr: "Atlantic Salmon", es: "Atlantic Salmon", ... }`
- Frontend displayed these English fallbacks as if they were real translations

**After Fix:**
- Species without translations return `localizedNames: null`
- Frontend can use English name as fallback consistently
- Only genuine translations are included in `localizedNames` object

## User Experience

### Before
- User switches to French → sees "Atlantic Salmon"
- Confusing because it looks like the translation system failed
- Mixed experience: some species properly translated, others in English

### After
- User switches to French → sees "Atlantic Salmon" (when no French translation exists)
- Consistent fallback behavior for species without translations
- Clear distinction between translated and untranslated species
- Foundation for future translation improvements

## Files Modified

- `pages/api/findr/predictions.ts` (lines 219-243): Updated `buildLocalizedNamePayload()` function

## Files Added

- `scripts/check-localized-names.ts`: Analysis script to examine localized name coverage
- `docs/LOCALIZED_NAMES_FIX_20251104.md`: This document

## Testing

TypeScript validation: ✅ Passed
```bash
npm run typecheck
```

## Next Steps

This fix addresses the immediate problem of English fallbacks appearing as translations. To improve translation coverage, consider:

1. **Database cleanup**: Update database to set `name_fr`, `name_es`, etc. to `NULL` when they contain English fallbacks
2. **Translation pipeline**: Implement automated translation for the 135 species with no translations
3. **Manual review**: Verify and improve existing translations (some may be inaccurate)
4. **Monitoring**: Track which species users encounter in which languages to prioritize translation efforts

## Related

- Database schema: `species` table with columns `name_en`, `name_fr`, `name_es`, `name_de`, `name_it`, `name_pt`
- Frontend display: Uses `localizedNames` object from prediction cards
- Translation context: `context/LanguageContext.tsx` manages language selection
