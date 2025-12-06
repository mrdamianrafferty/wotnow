# Location System Architecture

## Overview

The location system supports multiple named locations across Go Daisy and Findr apps with a slot-based architecture.

---

## Location Slots

| Slot | App | Purpose | Example |
|------|-----|---------|---------|
| `home` | Go Daisy | Primary home location for land activities | "Dublin, Ireland" |
| `coastal` | Go Daisy | Beach/water location for water activities | "Sandycove Beach" |
| `findr` | Findr | Primary fishing spot | "Playa la Griega" |
| `custom` | Future | User-defined slots | "Work", "Holiday home" |

---

## Data Model

### `SavedLocation` (New System)
```typescript
interface SavedLocation {
  id: string;              // UUID
  slot: LocationSlot;      // 'home' | 'coastal' | 'findr' | 'custom'
  name: string;            // ✅ User-friendly display name (e.g., "Playa la Griega")
  lat: number;
  lon: number;
  rectangleCode: string | null;    // ICES code (e.g., "31E8")
  rectangleRegion: string | null;  // Region (e.g., "Bay of Biscay")
  accuracy: number | null;
  source: 'manual' | 'gps' | 'ip';
  updatedAt: string;
  usageCount: number;
}
```

### `LegacyUnifiedLocationRecord` (Old System)
```typescript
interface LegacyUnifiedLocationRecord {
  lat: number | null;
  lon: number | null;
  rectangleCode: string | null;
  rectangleRegion: string | null;
  rectangleLabel: string | null;   // ← Maps to `name` in new system
  source: LocationSource;
  accuracy: number | null;
  updatedAt: string;
}
```

---

## Storage Locations

### 1. Database: `user_location_preferences`
```sql
- user_id (UUID, PK)
- locations (JSONB[])           -- New: Array of SavedLocation objects
- active_location_id (TEXT)     -- Which location is currently active
- last_modified_slot (TEXT)     -- Which slot was last changed
- home_coordinates (JSONB)      -- Legacy: single location object
- home_region (TEXT)            -- Legacy: region name
- home_location_name (TEXT)     -- Legacy: user-friendly name
- preferred_rectangles (TEXT[]) -- Legacy: ICES codes
```

### 2. localStorage
| Key | Format | Used By |
|-----|--------|---------|
| `findr.location.multi` | `StoredState` | UnifiedLocationContext |
| `findr.location` | `LegacyUnifiedLocationRecord` | Legacy migration |
| `go-daisy-preferences` | `Preferences` | UserPreferencesContext |

### 3. Cookies (Anonymous users only)
| Cookie | Purpose |
|--------|---------|
| `findr_location` | Fallback for non-signed-in users |

---

## React Contexts

### 1. `UnifiedLocationContext` (Primary for Findr)
**File:** `context/UnifiedLocationContext.tsx`

**Provides:**
- `location` - Legacy format of active location
- `homeLocation` - Location in 'home' slot
- `coastalLocation` - Location in 'coastal' slot  
- `findrLocation` - Location in 'findr' slot
- `updateLocationBySlot()` - Save to specific slot
- `syncing` - Loading state

**Data Flow:**
1. Read from localStorage (fast, synchronous)
2. Fetch from `/api/user/location?multiLocation=true`
3. Remote data overwrites local
4. Changes sync back to both localStorage and database

### 2. `UserPreferencesContext` (Primary for Go Daisy)
**File:** `context/UserPreferencesContext.tsx`

**Provides:**
- `homeLocation` - Home location
- `coastalLocation` - Coastal location
- `updateHomeLocation()` 
- `updateCoastalLocation()`

**⚠️ Issue:** Does NOT sync to database by design (to prevent IP-bootstrapped locations from overwriting user data)

---

## Components

### Components that WRITE locations

| Component | Saves To | Slot | Notes |
|-----------|----------|------|-------|
| `LocationDisplay.tsx` (Findr) | Database via API | `findr` | ✅ Correctly saves `name` |
| `LocationPicker.tsx` (Go Daisy) | localStorage only | (none) | ⚠️ Uses legacy API, no slot |
| `CoastalLocationDialog.tsx` | Via parent callback | (varies) | Just returns `BasicLocation` |

### Components that READ locations

| Component | Reads From | Fallback Chain |
|-----------|------------|----------------|
| `LocationDisplay.tsx` | UnifiedLocationContext | findr → coastal → home → legacy |
| `LocationPicker.tsx` | UnifiedLocationContext | findr → coastal → legacy |
| `index.tsx` (Findr) | UnifiedLocationContext + URL query | URL → findr → coastal → legacy |

---

## The `name` Field Flow

### ✅ Where `name` is SET correctly:

1. **`CoastalLocationDialog`** - User types/selects a place name
2. **`LocationDisplay.handleLocationSave`** - Passes `location.name` to `updateLocationBySlot`
3. **`/api/user/location` POST** - Stores `name` in database JSONB

### ⚠️ Where `name` can be LOST:

1. **Legacy migration** - Old data may not have `name` field
2. **IP geolocation** - Auto-detected locations use generic names
3. **Fallback logic** - Falls back to "Saved Location" when name missing
4. **Cross-context sync** - UserPreferencesContext doesn't sync to database

---

## Current Issues

### Issue 1: Location in wrong slot
**Problem:** User's location might be in `home` slot instead of `findr` slot
**Symptom:** `findrLocation` is null, falls back to legacy
**Fix:** Added `homeLocation` to fallback chain in LocationDisplay

### Issue 2: Name not persisted
**Problem:** Old locations saved before `name` field was implemented
**Symptom:** Shows ICES code (31E8) instead of place name
**Fix:** Re-save location to capture name

### Issue 3: Go Daisy doesn't sync to DB
**Problem:** UserPreferencesContext intentionally doesn't sync to database
**Symptom:** Locations set in Go Daisy don't appear in Findr
**Status:** By design (prevents IP location overwrite)

---

## Recommendations

### Short-term (Quick fixes)
1. ✅ Add `homeLocation` to LocationDisplay fallback chain
2. ✅ Auto-lookup region name when only code exists
3. Users should re-save locations to capture names

### Medium-term (Better UX)
1. Add "Edit location name" feature
2. Show friendly region name when no user name exists
3. Migrate existing locations to add names from reverse geocoding

### Long-term (Architecture)
1. Unify Go Daisy and Findr location contexts
2. Add proper sync from Go Daisy to database
3. Remove legacy format entirely
4. Add location history/favorites feature

---

## API Reference

### GET `/api/user/location`
```
Query: ?multiLocation=true

Response: {
  locations: SavedLocation[],
  activeLocationId: string | null
}
```

### POST `/api/user/location`
```
Body: {
  slot: 'home' | 'coastal' | 'findr',
  name: string,           // ← User-friendly display name
  lat: number,
  lon: number,
  rectangleCode?: string,
  rectangleRegion?: string,
  source: 'manual' | 'gps' | 'ip',
  accuracy?: number
}

Response: SavedLocation
```

### GET `/api/findr/rectangle-lookup`
```
Query: ?lat=43.5&lon=-5.2

Response: {
  rectangleCode: "31E8",
  region: "Bay of Biscay",
  centerLat: 43.75,
  centerLon: -5.5,
  distance: 12.3
}
```
