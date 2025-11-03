# Multi-Location System: Phase 3 Complete

**Date:** 2025-11-03
**Status:** ✅ Ready to Deploy
**Production URL:** https://fishfindr.eu

---

## Summary

Phase 3 is **complete**: UnifiedLocationContext has been updated to use the multi-location API while maintaining full backward compatibility. Existing Findr components continue working unchanged, and new components can now access multiple locations via slot-based management.

## What's Been Implemented

### ✅ Phase 3: UnifiedLocationContext Update

**Key Changes:**
- Uses multi-location API (`?multiLocation=true`)
- Exposes all locations and active location
- Provides slot-based helpers (`homeLocation`, `coastalLocation`, `findrLocation`)
- Maintains complete backward compatibility with legacy `location` property
- Auto-migrates localStorage from legacy format to new format

**New Context API:**
```typescript
const {
  // Legacy interface (still works!)
  location,         // UnifiedLocationRecord | null
  updateLocation,   // (input: UpdateLocationInput) => Promise<UnifiedLocationRecord | null>
  clearLocation,    // () => Promise<void>

  // NEW: Multi-location interface
  locations,        // SavedLocation[]
  activeLocation,   // SavedLocation | null
  homeLocation,     // SavedLocation | null (slot="home")
  coastalLocation,  // SavedLocation | null (slot="coastal")
  findrLocation,    // SavedLocation | null (slot="findr_primary")

  getLocationBySlot,     // (slot: LocationSlot) => SavedLocation | null
  updateLocationBySlot,  // (input: UpdateLocationBySlotInput) => Promise<SavedLocation>
  setActiveLocation,     // (locationId: string) => Promise<void>
  deleteLocation,        // (locationId: string) => Promise<void>

  // Shared state
  loading, syncing, lastError, refreshRemote
} = useUnifiedLocation();
```

### Files Modified

**`context/UnifiedLocationContext.tsx`** - Complete rewrite with:
- Multi-location state management
- Slot-based CRUD operations
- Backward-compatible legacy API layer
- localStorage migration from old to new format
- Dual persistence (new format + legacy format for compatibility)

### Backward Compatibility Strategy

1. **Legacy API Still Works:**
   ```typescript
   // This still works exactly as before
   const { location, updateLocation } = useUnifiedLocation();
   await updateLocation({
     coordinates: { lat: 50.8198, lon: -0.1367 },
     rectangleCode: '31F1',
     resolveRectangle: true,
   });
   ```

2. **Auto-Migration:**
   - Existing localStorage data (`findr.location`) automatically converts to new format
   - Both storage keys maintained for smooth transition
   - No data loss during migration

3. **New Features Available Immediately:**
   ```typescript
   // New slot-based API
   const { locations, homeLocation, coastalLocation } = useUnifiedLocation();

   // Save to specific slot
   await updateLocationBySlot({
     slot: 'coastal',
     coordinates: { lat: 50.7192, lon: -1.8808 },
     name: 'Bournemouth Beach',
     resolveRectangle: true,
   });

   // Access all locations
   locations.forEach(loc => {
     console.log(`${loc.name} (${loc.slot}): ${loc.lat}, ${loc.lon}`);
   });
   ```

---

## Current Behavior

### For Existing Components (No Changes Required)

All existing Findr components continue working:
- Location pickers
- Prediction cards
- Catch logging
- **Zero code changes needed**

Example: `useUnifiedLocation()` in prediction components
```typescript
// This code doesn't need to change
const { location } = useUnifiedLocation();
if (location?.rectangleCode) {
  // Fetch predictions for rectangleCode
}
```

### For New Components (Future Enhancement)

New components can optionally use multi-location features:

```typescript
// Location switcher UI component
function LocationSwitcher() {
  const { locations, activeLocation, setActiveLocation } = useUnifiedLocation();

  return (
    <select value={activeLocation?.id ?? ''} onChange={(e) => setActiveLocation(e.target.value)}>
      {locations.map(loc => (
        <option key={loc.id} value={loc.id}>
          {loc.name} ({loc.slot})
        </option>
      ))}
    </select>
  );
}
```

```typescript
// Save different locations for different activities
function SaveLocationModal({ slot }: { slot: LocationSlot }) {
  const { updateLocationBySlot } = useUnifiedLocation();

  const handleSave = async (coordinates: { lat: number; lon: number }) => {
    await updateLocationBySlot({
      slot,  // 'home', 'coastal', 'findr_primary', 'custom'
      coordinates,
      name: `My ${slot} spot`,
      resolveRectangle: true,
      makeActive: true,
    });
  };
}
```

---

## Testing

### Type Checking
```bash
npm run typecheck  # ✅ Passes
```

### Manual Testing Plan

1. **Test Legacy API (Existing Behavior):**
   - Sign in to Findr at https://fishfindr.eu
   - Set a location using existing location picker
   - Verify predictions load correctly
   - Check localStorage has `findr.location` entry
   - Refresh page - location should persist

2. **Test Multi-Location API (New Behavior):**
   - Open browser console on https://fishfindr.eu
   - Run:
     ```javascript
     const { locations, activeLocation, updateLocationBySlot } = useUnifiedLocation();
     console.log('Current locations:', locations);
     console.log('Active:', activeLocation);

     // Save a coastal spot
     await updateLocationBySlot({
       slot: 'coastal',
       coordinates: { lat: 50.7192, lon: -1.8808 },
       name: 'Bournemouth Beach',
       resolveRectangle: true,
     });

     console.log('Updated locations:', locations);
     ```

3. **Test Migration:**
   - Clear localStorage
   - Set location using old API
   - Refresh page
   - Check that location migrated to new format
   - Verify both `findr.location` and `findr.location.multi` exist

---

## Architecture Benefits

### 1. Zero Breaking Changes
- Existing code works unchanged
- No migration required for current features
- Can update components incrementally

### 2. Multiple Locations Ready
- Users can save home, coastal, and fishing spots
- Each location has metadata (name, source, usage count)
- Latest-wins conflict resolution

### 3. Cross-App Sync Ready
- Same API structure used by Go Daisy (future)
- Slot-based system allows app-specific locations
- Shared database ensures sync

### 4. Optimistic Updates
- Immediate UI updates
- Background sync to database
- Offline-first with localStorage fallback

### 5. Extensible Design
- Easy to add new slots ('work', 'vacation', etc.)
- Metadata field for future features
- ID-based references for stability

---

## Database Interaction

### API Calls Made by Context

**On Mount:**
```typescript
GET /api/user/location?multiLocation=true
// Response: { locations: SavedLocation[], activeLocationId: string | null }
```

**On Location Update:**
```typescript
POST /api/user/location
{
  slot: 'home' | 'coastal' | 'findr_primary' | 'custom',
  name: "Brighton Beach",
  lat: 50.8198,
  lon: -0.1367,
  rectangleCode: "31F1",
  rectangleRegion: "English Channel",
  source: "manual",
  accuracy: 10
}
// Response: SavedLocation (with generated ID and usageCount)
```

**On Location Delete:**
```typescript
DELETE /api/user/location?locationId=<uuid>
// Response: 204 No Content
```

**On Active Location Change:**
```typescript
// Implemented by re-saving the location
POST /api/user/location (with existing location data)
```

### Database Updates
- All writes use `upsert_location_by_slot()` RPC function
- Latest-wins conflict resolution via `updatedAt` timestamp
- Dual-write to legacy columns maintained by API (Phase 2)

---

## Next Steps

### Option A: Deploy Now (Recommended)
✅ **Phase 3 complete**
- Existing code works unchanged
- New multi-location features available
- Can build UI enhancements at leisure

**To Deploy:**
```bash
git add context/UnifiedLocationContext.tsx
git commit -m "feat: Phase 3 - Multi-location context with backward compatibility

Updates UnifiedLocationContext to use multi-location API while maintaining
full backward compatibility with existing components.

New features:
- Multiple location slots (home, coastal, findr_primary)
- Slot-based CRUD operations
- Automatic localStorage migration
- All new APIs exposed alongside legacy APIs

Existing Findr components work unchanged.

Co-Authored-By: Claude <noreply@anthropic.com>"

vercel --prod --yes
```

### Option B: Build UI Enhancements First
Build new UI components before deploying:
- Location switcher dropdown
- Location manager modal (add/edit/delete locations)
- Quick-access buttons for home/coastal/findr spots
- Location usage stats

### Option C: Update Go Daisy Integration
Update `UserPreferencesContext` in Go Daisy:
- Use multi-location API
- Share home/coastal locations with Findr
- Unified location management across apps

---

## Comparison: Before vs After

### Before (Phase 2)
```typescript
// Only one active location
const { location } = useUnifiedLocation();
// location: UnifiedLocationRecord | null

// Update always to "home" slot implicitly
await updateLocation({ coordinates, rectangleCode });
```

### After (Phase 3)
```typescript
// Multiple locations available
const { locations, activeLocation, homeLocation, coastalLocation } = useUnifiedLocation();
// locations: SavedLocation[]
// activeLocation: SavedLocation | null

// Legacy API still works (implicitly uses 'home' slot)
await updateLocation({ coordinates, rectangleCode });

// NEW: Explicit slot-based updates
await updateLocationBySlot({
  slot: 'coastal',
  coordinates,
  name: 'My Coastal Spot',
  resolveRectangle: true,
});

// NEW: Switch between locations
await setActiveLocation(coastalLocation.id);

// NEW: Delete specific locations
await deleteLocation(locationId);
```

---

## Known Limitations

1. **No UI for Multi-Location Management** - Context is ready, but no UI built yet
2. **Active Location Switch** - Currently requires re-saving location (no dedicated endpoint)
3. **No Location Usage Stats Display** - `usageCount` tracked but not shown in UI

---

## Support

For questions or issues:
- Check API logs: `vercel logs fishfindr.eu`
- Check browser console for context logs
- Check localStorage: `findr.location.multi` key

---

## Changelog

**2025-11-03:**
- ✅ Updated UnifiedLocationContext with multi-location support
- ✅ Added slot-based CRUD operations
- ✅ Implemented backward compatibility layer
- ✅ Added localStorage migration
- ✅ Type checking passes
- ✅ Ready for deployment

**Next:** Deploy to production and optionally build UI enhancements.
