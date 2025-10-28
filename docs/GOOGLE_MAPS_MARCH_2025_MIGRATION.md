# Google Maps API Migration - March 2025 Deadline

## The Issue

As of **March 1st, 2025**, `google.maps.places.AutocompleteService` is **not available to new customers**.

### Error Message
```
As of March 1st, 2025, google.maps.places.AutocompleteService is not available to new customers.
Please use google.maps.places.AutocompleteSuggestion instead.
```

### Why This Affected Us

When you enabled the **Places API today (October 28, 2025)**, you became a "new customer" for the Places API - well after the March 2025 cutoff. This locked you out of the legacy `AutocompleteService` API.

## The Fix - Migrated to New API ✅

We've migrated from the old API to the new one:

### Old API (Deprecated)
```typescript
// ❌ Not available to new customers after March 1, 2025
const service = new google.maps.places.AutocompleteService();
service.getPlacePredictions(request, callback);
```

### New API (Current) ✅
```typescript
// ✅ New API - available to all customers
const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
  input: query,
  sessionToken: token,
});
```

## Key Changes in Migration

| Feature | Old API | New API |
|---------|---------|---------|
| **Method** | `AutocompleteService.getPlacePredictions()` | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` |
| **Pattern** | Callback-based | Promise-based |
| **Instance** | Create instance with `new` | Static method call |
| **Description** | Single `description` field | Compose from `mainText` + `secondaryText` |
| **Place ID** | `place_id` | `placeId` |
| **Region Filter** | `componentRestrictions.country` | `includedRegionCodes` (up to 15 codes) |
| **Types** | `types` array | `includedPrimaryTypes` array |

## Files Changed

- **`lib/hooks/usePlacesAutocompleteNew.ts`** - Migrated to new API
  - Now uses `AutocompleteSuggestion.fetchAutocompleteSuggestions()`
  - Transforms response to maintain backward compatibility
  - Uses session tokens for billing optimization
  - Promise-based async/await pattern

## Backward Compatibility

The hook maintains the same interface, so **no changes needed** in:
- ✅ `components/CoastalLocationDialog.tsx`
- ✅ Any other components using the hook

The migration is transparent to consumers of the hook.

## Testing After Deployment

1. Go to: https://fishfindr.eu/findr/log
2. Hard refresh: Cmd+Shift+R
3. Type in the location search
4. Should work without the deprecation warning
5. Check console - should see "✅ Google Places AutocompleteSuggestion ready"

## References

- [Official Migration Guide](https://developers.google.com/maps/documentation/javascript/places-migration-overview)
- [AutocompleteSuggestion API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [DEV.to Migration Article](https://dev.to/domanskyi/migrating-autocompleteservice-to-the-new-autocompletesuggestion-google-maps-api-2gan)

## Timeline

- **March 1, 2025**: Deadline - AutocompleteService no longer available to new customers
- **October 28, 2025**: You enabled Places API (became "new customer")
- **October 28, 2025**: Migrated to new API ✅
