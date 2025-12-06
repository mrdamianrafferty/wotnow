# Location System Comprehensive Review

**Date:** December 6, 2025  
**Scope:** Go Daisy and Findr apps

---

## 1. Location Slots Overview

The system supports multiple location "slots" that serve different purposes across the two apps:

| Slot | Purpose | Primary App | Description |
|------|---------|-------------|-------------|
| `home` | Primary home location | Go Daisy | Used for general land-based activities |
| `coastal` | Coastal/beach location | Go Daisy | Used for water activities (surfing, kayaking, etc.) |
| `findr` | Primary fishing spot | Findr | The main fishing location for Findr app |
| `custom` | Reserved for future | Both | Extensible for user-created slots |

**Type Definition** (`types/multiLocation.ts:16`):
```typescript
export type LocationSlot = 'home' | 'coastal' | 'findr' | 'custom';
```

---

## 2. Complete Data Model

### SavedLocation (New Multi-Location Format)

**Source:** `types/multiLocation.ts:27-58`

```typescript
interface SavedLocation {
  id: string;              // UUID - unique identifier
  slot: LocationSlot;      // 'home' | 'coastal' | 'findr' | 'custom'
  name: string;            // User-friendly display name ⚠️ KEY FIELD
  lat: number;             // Latitude (WGS84)
  lon: number;             // Longitude (WGS84)
  rectangleCode: string | null;   // ICES code (e.g., "31F1") - European waters only
  rectangleRegion: string | null; // Region name (e.g., "English Channel")
  accuracy: number | null;        // GPS accuracy in meters
  source: LocationSource;         // 'manual' | 'gps' | 'ip' | 'auto' | 'unknown'
  updatedAt: string;              // ISO timestamp
  usageCount: number;             // Popularity tracking
  metadata?: Record<string, unknown>;  // Extensible
}
```

### LegacyUnifiedLocationRecord (Backward Compatibility)

**Source:** `types/multiLocation.ts:175-186`

```typescript
interface LegacyUnifiedLocationRecord {
  lat: number | null;
  lon: number | null;
  rectangleCode: string | null;
  rectangleRegion: string | null;
  rectangleLabel: string | null;  // ⚠️ Maps to SavedLocation.name
  source: LocationSource;
  accuracy: number | null;
  updatedAt: string;
  pendingSync?: boolean;
}
```

### Go Daisy Location (UserPreferencesContext)

**Source:** `context/UserPreferencesContext.tsx:11-17`

```typescript
interface Location {
  name: string;           // User-friendly name
  lat: number;
  lon: number;
  type?: 'home' | 'coastal';
}
```

---

## 3. Storage Mechanisms

### A. Database Table: `user_location_preferences`

**Location:** Supabase PostgreSQL

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID | Foreign key to auth.users |
| `locations` | JSONB | **New: Array of SavedLocation objects** |
| `active_location_id` | TEXT | ID of currently active location |
| `last_modified_slot` | TEXT | Most recently modified slot |
| `home_coordinates` | JSONB | **Legacy:** Lat/lon + metadata |
| `home_region` | TEXT | **Legacy:** Region name |
| `home_place_name` | TEXT | **Legacy:** Place name |
| `home_location_name` | TEXT | **Legacy:** Display name |
| `preferred_rectangles` | TEXT[] | Array of ICES codes |
| `location_source` | TEXT | 'manual', 'gps', 'ip' |
| `updated_at` | TIMESTAMP | Last update time |

**Key Migration:** `20251103000001_add_multi_location_support.sql`

### B. localStorage Keys

| Key | Format | Used By | Description |
|-----|--------|---------|-------------|
| `findr.location.multi` | `StoredState` | UnifiedLocationContext | Multi-location state |
| `findr.location` | `UnifiedLocationRecord` | UnifiedLocationContext (legacy) | Single location backup |
| `preferences` | `Preferences` | UserPreferencesContext | Go Daisy preferences including locations |
| `coastal_recent_locations_v1` | `BasicLocation[]` | CoastalLocationDialog | Recent location history |
| `recentCoastalLocations` | `BasicLocation[]` | CoastalLocationDialog (legacy) | Legacy recent history |
| `godaisy.bootstrap-applied` | `'1'` or null | UserPreferencesContext | IP bootstrap tracking |
| `godaisy.bootstrap-source` | `'ip' \| 'fallback'` | UserPreferencesContext | How location was bootstrapped |

---

## 4. Context Providers

### A. UnifiedLocationContext

**Source:** `context/UnifiedLocationContext.tsx`

**Purpose:** Primary location manager for both apps, handles multi-location with database sync.

**Key Exports:**
```typescript
interface UnifiedLocationContextValue {
  // Legacy interface (backward compatible)
  location: UnifiedLocationRecord | null;
  updateLocation: (input: UpdateLocationInput) => Promise<UnifiedLocationRecord | null>;
  clearLocation: () => Promise<void>;

  // Multi-location interface
  locations: SavedLocation[];
  activeLocation: SavedLocation | null;
  homeLocation: SavedLocation | null;
  coastalLocation: SavedLocation | null;
  findrLocation: SavedLocation | null;

  getLocationBySlot: (slot: LocationSlot) => SavedLocation | null;
  updateLocationBySlot: (input: UpdateLocationBySlotInput) => Promise<SavedLocation>;
  setActiveLocation: (locationId: string) => Promise<void>;
  deleteLocation: (locationId: string) => Promise<void>;

  // State
  loading: boolean;
  syncing: boolean;
  lastError: string | null;
  refreshRemote: () => Promise<void>;
}
```

**Data Flow:**
1. On mount: Read from `localStorage` (immediate)
2. Then fetch from database via `/api/user/location?multiLocation=true`
3. Database wins if it has data; localStorage kept as fallback
4. Updates go to database first, then localStorage

### B. UserPreferencesContext

**Source:** `context/UserPreferencesContext.tsx`

**Purpose:** Go Daisy-specific preferences including simplified location management.

**Key Features:**
- Stores `Location[]` in `preferences.locations`
- Syncs with `UnifiedLocationContext` (reads `unifiedHome` and `unifiedCoastal`)
- Does NOT sync user-chosen locations back to database (sync disabled for bootstrap protection)

---

## 5. Components That READ Locations

| Component | File | Slots Read | Context Used |
|-----------|------|------------|--------------|
| `LocationDisplay` | `components/findr/LocationDisplay.tsx` | findr → coastal → home | UnifiedLocationContext |
| `LocationPicker` | `components/LocationPicker.tsx` | active (via legacy) | UnifiedLocationContext |
| `AppHeader` | `components/AppHeader.tsx` | home, coastal | Props from page |
| Go Daisy Homepage | `pages/index.tsx` | home, coastal | UserPreferencesContext |
| Findr Index | `pages/findr/index.tsx` | findr, coastal, legacy | UnifiedLocationContext |
| Findr Conditions | `pages/findr/conditions.tsx` | findr, coastal, legacy | UnifiedLocationContext |
| Findr Settings | `pages/findr/settings.tsx` | home, coastal | UnifiedLocationContext |

### LocationDisplay Fallback Chain
```typescript
// components/findr/LocationDisplay.tsx:27-33
const effectiveLocation = findrLocation
  ? convertToLegacy(findrLocation)
  : coastalLocation
    ? convertToLegacy(coastalLocation)
    : homeLocation
      ? convertToLegacy(homeLocation)
      : legacyLocation;
```

---

## 6. Components That WRITE Locations

| Component | File | Slot Written | Method |
|-----------|------|--------------|--------|
| `LocationDisplay` | `components/findr/LocationDisplay.tsx` | `findr` | `updateLocationBySlot` |
| `LocationPicker` | `components/LocationPicker.tsx` | `home` (via legacy) | `updateLocation` |
| `CoastalLocationDialog` | `components/CoastalLocationDialog.tsx` | N/A (returns data) | `onSave` callback |
| Go Daisy Homepage | `pages/index.tsx` | home, coastal | `setPreferences` |
| Findr Settings | `pages/findr/settings.tsx` | home, coastal | `updateLocationBySlot` |
| Findr Index | `pages/findr/index.tsx` | `findr` | `updateLocationBySlot` |
| Findr Conditions | `pages/findr/conditions.tsx` | `findr` | `updateLocationBySlot` |

---

## 7. Data Flow: User Input → Storage → Display

### Flow 1: Findr Location (via LocationDisplay)

```
User clicks location button
    ↓
CoastalLocationDialog opens
    ↓
User selects location → onSave({ name, lat, lon })
    ↓
LocationDisplay.handleLocationSave()
    ↓
Fetch /api/findr/rectangle-lookup (ICES metadata)
    ↓
updateLocationBySlot({ slot: 'findr', name: displayName, ... })
    ↓
┌─────────────────────────────────────────────┐
│ UnifiedLocationContext.updateLocationBySlot │
├─────────────────────────────────────────────┤
│ 1. Optimistic local update (setLocations)   │
│ 2. persistState() → localStorage            │
│ 3. POST /api/user/location (if authed)      │
│ 4. Database RPC: upsert_location_by_slot    │
│ 5. Update state with server response        │
└─────────────────────────────────────────────┘
    ↓
LocationDisplay reads findrLocation → displays name
```

### Flow 2: Go Daisy Location (via Homepage)

```
User clicks "Set location" in header
    ↓
CoastalLocationDialog opens
    ↓
User selects location → onSave({ name, lat, lon })
    ↓
setHomeLocation() or setCoastalLocation()
    ↓
setPreferences() → updates preferences.locations
    ↓
localStorage.setItem('preferences', ...)
    ↓
⚠️ NO sync to database (disabled for bootstrap protection)
```

---

## 8. The `name` Field Analysis

### Where `name` Gets SET

| Location | How `name` is Determined |
|----------|-------------------------|
| `CoastalLocationDialog` | From Google Places `main_text`, Nominatim `display_name`, or GPS reverse geocode |
| `LocationDisplay.handleLocationSave` | `displayName` = `location.name` with optional distance suffix |
| `LocationPicker` | From ICES rectangle (`code - region`) or Google reverse geocode |
| `UnifiedLocationContext.updateLocationBySlot` | `input.name ?? rectangleRegion ?? 'Saved Location'` |
| `/api/user/location` POST | `name: locationData.name ?? locationData.rectangleRegion ?? 'Saved Location'` |

### Where `name` Might Be LOST ⚠️

1. **Legacy API Format Conversion:**
   ```typescript
   // lib/multiLocation/apiHelpers.ts:88
   rectangleLabel: activeLocation.name,  // name → rectangleLabel
   ```
   When converting SavedLocation to legacy format, `name` becomes `rectangleLabel`.

2. **Legacy to Multi-Location Conversion:**
   ```typescript
   // context/UnifiedLocationContext.tsx:94-98
   const location: SavedLocation = {
     name: legacy.rectangleLabel ?? 'Saved Location',  // ⚠️ May be generic
     ...
   };
   ```

3. **Database Function (upsert_location_by_slot):**
   The SQL function merges `p_location` with existing data but preserves provided `name`:
   ```sql
   elem || p_location || jsonb_build_object('id', existing_id, ...)
   ```
   If `name` isn't in `p_location`, it's preserved from existing. If existing had generic name, it stays.

4. **Home Coordinates Migration:**
   ```sql
   -- supabase/migrations/20251103000001...sql:66-71
   'name', COALESCE(
     rec.home_location_name,
     rec.home_place_name,
     rec.home_region,
     'Home Location'
   ),
   ```
   Falls back through multiple columns, may result in generic name.

5. **IP Bootstrap in UserPreferencesContext:**
   ```typescript
   // context/UserPreferencesContext.tsx:355-358
   const displayName = [city, region].filter(Boolean).join(', ') || country || 'Your area';
   ```
   This creates a reasonable name, but it's only stored in localStorage `preferences`, NOT synced to database.

---

## 9. Which App Uses Which Slots

| App | Primary Slot | Secondary Slots | Storage |
|-----|--------------|-----------------|---------|
| **Findr** | `findr` | `coastal`, `home` (fallback) | Database + localStorage |
| **Go Daisy** | `home` | `coastal` | localStorage (`preferences`) mostly |

### Findr's Location Priority
```typescript
// components/findr/LocationDisplay.tsx
findrLocation → coastalLocation → homeLocation → legacyLocation
```

### Go Daisy's Location Structure
```typescript
// In preferences.locations array
[
  { name: "London", lat: 51.5, lon: -0.1, type: "home" },
  { name: "Brighton Beach", lat: 50.8, lon: -0.1, type: "coastal" }
]
```

---

## 10. Inconsistencies and Bugs Found

### Bug 1: Name Field Not Propagated from Go Daisy to Findr

**Problem:** When a user sets a location in Go Daisy (via `setHomeLocation`), it's stored in `preferences.locations` with a `name` field. However, this is NOT synced to the database `user_location_preferences.locations` because the sync code is disabled:

```typescript
// context/UserPreferencesContext.tsx:503-509
// IMPORTANT: For old localStorage data without bootstrap flag, treat it as bootstrapped
// to prevent auto-syncing default/IP locations to database
// Only sync if user has explicitly updated locations after we deployed the bootstrap system
console.log('[UserPreferences] Old localStorage detected without bootstrap flag - treating as bootstrapped to prevent auto-sync');
return;
```

**Impact:** User sets "My Beach House" in Go Daisy, but when they use Findr, it shows "Saved Location" or the rectangle code.

### Bug 2: Different Location Types Between Contexts

**Problem:** `UserPreferencesContext.Location.type` uses `'home' | 'coastal'` while `UnifiedLocationContext.SavedLocation.slot` uses `'home' | 'coastal' | 'findr' | 'custom'`.

The conversion function doesn't preserve semantic meaning:
```typescript
// context/UserPreferencesContext.tsx:120-124
const savedToPreferenceLocation = (saved: SavedLocation, type: LocationType): Location => ({
  name: saved.name || saved.rectangleRegion || 'Saved Location',
  lat: saved.lat,
  lon: saved.lon,
  type,  // Forces to 'home' or 'coastal', loses 'findr' slot
});
```

### Bug 3: Generic Name Fallbacks

**Problem:** Multiple places fall back to generic names when specific name unavailable:

- `'Saved Location'` (most common fallback)
- `'Home Location'`
- `'Your area'`
- `'Current Location'`
- `'Selected location'`

These appear in UI when better information should be available.

### Bug 4: Duplicate Storage in localStorage

**Problem:** Location data is stored in multiple places:
- `findr.location.multi` (new format)
- `findr.location` (legacy, kept in sync)
- `preferences` (Go Daisy format)

This can lead to inconsistencies when one is updated but not others.

### Bug 5: Legacy Column Sync Only for home/coastal

```typescript
// pages/api/user/location.ts:221-234
// Also update legacy columns for backward compatibility
if (slot === 'home' || slot === 'coastal') {
  // ... update home_coordinates, home_region, etc.
}
```

**Problem:** `findr` slot doesn't sync to legacy columns, so legacy code paths won't see Findr locations.

### Bug 6: LocationPicker Uses Legacy API

```typescript
// components/LocationPicker.tsx:42
const { location, updateLocation, syncing, loading } = useUnifiedLocation();
```

**Problem:** Uses `updateLocation` (legacy) instead of `updateLocationBySlot`. This saves to `'home'` slot by default, not `'findr'`.

---

## 11. Recommendations

1. **Unify Storage:** Consider removing the separate `preferences.locations` and always read from `UnifiedLocationContext`.

2. **Enable Database Sync for User-Chosen Locations:** The sync is currently disabled. Add a flag to distinguish "user explicitly chose this" from "IP bootstrapped".

3. **Consistent Name Field:** Ensure `name` is always passed through the entire chain:
   - CoastalLocationDialog → page handler → updateLocationBySlot → API → database

4. **Update LocationPicker:** Change from `updateLocation` to `updateLocationBySlot` with appropriate slot.

5. **Add Debug Logging:** The `[LocationDisplay]` logging is helpful; add similar to other components.

---

## 12. Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `types/multiLocation.ts` | Type definitions |
| `context/UnifiedLocationContext.tsx` | Primary location state management |
| `context/UserPreferencesContext.tsx` | Go Daisy preferences (includes locations) |
| `components/findr/LocationDisplay.tsx` | Findr location UI + save |
| `components/LocationPicker.tsx` | Legacy location picker |
| `components/CoastalLocationDialog.tsx` | Location search modal |
| `pages/api/user/location.ts` | REST API for location CRUD |
| `lib/multiLocation/apiHelpers.ts` | Database row parsing |
| `supabase/migrations/20251103000001_add_multi_location_support.sql` | Database schema + functions |
