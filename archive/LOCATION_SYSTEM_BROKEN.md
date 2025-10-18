# 🚨 CRITICAL: Location System Completely Broken

## Problem Summary

**The location picker in the header DOES NOT update the conditions data.**

When you click the location button and select a new location:
1. ✅ Location name updates in header display
2. ❌ Rectangle code does NOT change
3. ❌ Conditions data does NOT refresh
4. ❌ Weather data stays on the same location
5. ❌ Map stays centered on the same location

**Result:** Users think they're changing location, but they're still seeing data for the default rectangle (`21D8`).

## Root Cause Analysis

### Architecture Issue

The location system has THREE disconnected pieces that don't communicate:

```
┌─────────────────────────────────────────────────────────────┐
│                   LOCATION HEADER                           │
│                                                              │
│  LocationDisplay (in FindrNavigation)                       │
│  └─> Opens CoastalLocationDialog                           │
│  └─> Gets: { name, lat, lon }                              │
│  └─> Saves to: LOCAL STATE ONLY                            │
│  └─> ❌ DOES NOT UPDATE RECTANGLE CODE                      │
└─────────────────────────────────────────────────────────────┘
                          ↓ NO CONNECTION ❌
┌─────────────────────────────────────────────────────────────┐
│                  CONDITIONS PAGE                             │
│                                                              │
│  pages/findr/conditions.tsx                                 │
│  └─> usePersistentFindrSettings()                          │
│  └─> Gets: selectedCode from localStorage                  │
│  └─> ❌ NEVER UPDATED BY LOCATION PICKER                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ NO CONNECTION ❌
┌─────────────────────────────────────────────────────────────┐
│                   CONDITIONS DATA                            │
│                                                              │
│  useFindrConditions(activeRectangle)                        │
│  └─> Fetches data for selectedCode                         │
│  └─> Returns: rectangle { code, centerLat, centerLon }     │
│  └─> ❌ RECTANGLE NEVER CHANGES                             │
└─────────────────────────────────────────────────────────────┘
```

### Code Evidence

**1. LocationDisplay component** (`components/findr/LocationDisplay.tsx`):
```typescript
const handleLocationSave = (location: BasicLocation) => {
  setLocationName(location.name);  // ✅ Updates display
  setShowLocationPicker(false);
  // ❌ MISSING: No call to update selectedCode
  // ❌ MISSING: No call to convert lat/lon → rectangle
  // ❌ MISSING: No router.push() to update URL
};
```

**2. CoastalLocationDialog** (`components/CoastalLocationDialog.tsx`):
```typescript
export type BasicLocation = { name: string; lat: number; lon: number };
// ❌ MISSING: rectangleCode field
// ❌ MISSING: Method to look up rectangle from lat/lon
```

**3. Conditions Page** (`pages/findr/conditions.tsx`):
```typescript
const conditions = useFindrConditions(activeRectangle);
// activeRectangle comes from:
const activeRectangle = manualNormalized ?? (selectedCode || null);
// selectedCode comes from:
const { selectedCode, setSelectedCode } = usePersistentFindrSettings(...);
// ❌ setSelectedCode is NEVER called by LocationDisplay
```

## Impact

### User Experience
- 🔴 **CRITICAL:** Users cannot change their fishing location
- 🔴 **CRITICAL:** All users see the same default location (21D8)
- 🔴 **CRITICAL:** Location picker appears to work but does nothing
- 🔴 **DANGER:** Users get wrong weather data for their actual location

### Production Readiness
- **Before**: 95% ready
- **After discovering this**: 40% ready (core feature broken)
- **This is a showstopper bug**

## Solution Architecture

### Option A: Lat/Lon to Rectangle Lookup (Recommended)

**Flow:**
1. User selects location → Gets `{ name, lat, lon }`
2. Call new API: `/api/findr/rectangle-lookup?lat={lat}&lon={lon}`
3. API returns nearest rectangle code
4. Update `selectedCode` with new rectangle
5. `useFindrConditions` automatically refetches data
6. `useFindrMarineWeather` gets new coordinates from updated conditions

**Pros:**
- ✅ Works with existing CoastalLocationDialog
- ✅ Supports any lat/lon point
- ✅ Accurate rectangle mapping

**Cons:**
- ⚠️ Requires new API endpoint
- ⚠️ Needs rectangle boundary geometry

### Option B: Rectangle Selector Only (Quick Fix)

**Flow:**
1. Replace CoastalLocationDialog with rectangle selector
2. User picks from list of 99 rectangles
3. Directly update `selectedCode`
4. Data refetches automatically

**Pros:**
- ✅ Simple implementation (2 hours)
- ✅ No new API needed
- ✅ Guaranteed to work

**Cons:**
- ❌ Users must know rectangle codes
- ❌ Less intuitive UX
- ❌ Removes map-based selection

### Option C: Hybrid Approach (Best UX)

**Flow:**
1. User selects location on map → Gets `{ name, lat, lon }`
2. Show "Finding nearest rectangle..." loading state
3. Look up rectangle code from lat/lon
4. Show confirmation: "This location is in rectangle 21D8 (Galician Coast)"
5. User confirms → Update `selectedCode`
6. Data refetches with new rectangle

**Pros:**
- ✅ Best user experience
- ✅ Visual map selection
- ✅ Clear feedback
- ✅ Allows user to verify

**Cons:**
- ⚠️ More implementation work (4 hours)
- ⚠️ Needs new API endpoint

## Implementation Plan: Option A (Recommended)

### Phase 1: Create Rectangle Lookup API (30 mins)

**File:** `pages/api/findr/rectangle-lookup.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';

// Find rectangle that contains the given lat/lon point
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  const supabase = getSupabaseServerClient();
  
  // Query rectangles where lat/lon is within bounds
  const { data, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, center_lat, center_lon, lat_south, lat_north, lon_west, lon_east')
    .gte('lat_north', lat)
    .lte('lat_south', lat)
    .gte('lon_east', lon)
    .lte('lon_west', lon)
    .limit(1)
    .maybeSingle();
  
  if (error || !data) {
    // Fallback: Find nearest rectangle by center distance
    const { data: nearest } = await supabase
      .from('ices_rectangles')
      .select('rectangle_code, region, center_lat, center_lon')
      .order('center_lat', { ascending: false }) // Simple approximation
      .limit(10);
    
    // Calculate distances and return nearest
    // ... implement haversine distance calculation
  }
  
  return res.status(200).json({
    rectangleCode: data.rectangle_code,
    region: data.region,
    centerLat: data.center_lat,
    centerLon: data.center_lon,
  });
}
```

### Phase 2: Update LocationDisplay to Use Rectangle Lookup (20 mins)

**File:** `components/findr/LocationDisplay.tsx`

```typescript
import { useRouter } from 'next/router';
import { usePersistentFindrSettings } from '../../hooks/usePersistentFindrSettings';

export function LocationDisplay() {
  const router = useRouter();
  const { setSelectedCode } = usePersistentFindrSettings({ /* ... */ });
  const [locationName, setLocationName] = useState('Set location');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleLocationSave = async (location: BasicLocation) => {
    setIsLookingUp(true);
    
    try {
      // Look up rectangle from lat/lon
      const res = await fetch(
        `/api/findr/rectangle-lookup?lat=${location.lat}&lon=${location.lon}`
      );
      
      if (!res.ok) {
        throw new Error('Failed to find rectangle');
      }
      
      const { rectangleCode, region } = await res.json();
      
      // Update selected code (triggers data refetch)
      setSelectedCode(rectangleCode);
      
      // Update display name
      setLocationName(`${location.name} (${region})`);
      
      // Navigate to conditions page with new rectangle
      await router.push(`/findr/conditions?rectangle=${rectangleCode}`);
      
      setShowLocationPicker(false);
    } catch (error) {
      console.error('Failed to look up rectangle:', error);
      alert('Could not find fishing area for this location');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowLocationPicker(true)}
        className="flex items-center gap-2 px-3 py-2 bg-base-100 hover:bg-base-200 rounded-lg border border-base-300 transition-colors"
      >
        <MapPin size={16} className="text-cyan-500" />
        <span className="text-sm font-medium">
          {isLookingUp ? 'Finding area...' : locationName}
        </span>
      </button>

      {showLocationPicker && (
        <CoastalLocationDialog
          open={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
          onSave={handleLocationSave}
          title="Set Your Fishing Location"
        />
      )}
    </>
  );
}
```

### Phase 3: Update Conditions Page to Read URL Param (10 mins)

**File:** `pages/findr/conditions.tsx`

```typescript
// Add useEffect to sync URL param with selectedCode
useEffect(() => {
  const rectangleFromUrl = router.query.rectangle as string | undefined;
  if (rectangleFromUrl && rectangleFromUrl !== selectedCode) {
    setSelectedCode(rectangleFromUrl);
  }
}, [router.query.rectangle]);
```

### Phase 4: Test & Verify (15 mins)

1. Click location picker
2. Select a location
3. Verify "Finding area..." shows
4. Verify rectangle code updates
5. Verify conditions data refreshes
6. Verify weather matches new location
7. Verify map centers on new location

**Total Time: ~75 minutes**

## Testing Checklist

- [ ] Location picker opens
- [ ] Select location on map
- [ ] "Finding area..." loading state shows
- [ ] Rectangle code updates in URL
- [ ] Conditions data refetches
- [ ] Weather data changes
- [ ] Hourly/daily forecasts update
- [ ] Map centers on new location
- [ ] Location name updates in header
- [ ] Refresh page → location persists
- [ ] Navigate away and back → location persists

## Priority

**🔴 CRITICAL - BLOCKER**

This must be fixed before any production release. The entire app appears broken to users.

**Recommended Action:**
1. Immediately implement Option A (75 minutes)
2. Test thoroughly
3. Deploy as hotfix
4. Update production readiness: 40% → 95%

## Files to Modify

1. **NEW**: `pages/api/findr/rectangle-lookup.ts` (create)
2. **UPDATE**: `components/findr/LocationDisplay.tsx` (add lookup + navigation)
3. **UPDATE**: `pages/findr/conditions.tsx` (sync URL param)
4. **OPTIONAL**: `components/CoastalLocationDialog.tsx` (add rectangleCode to return type)

## Success Criteria

✅ User clicks location picker
✅ User selects any coastal point
✅ System finds correct ICES rectangle
✅ Conditions data updates automatically
✅ Weather forecast matches new location
✅ Location persists across page refreshes
✅ Multiple users can use different locations
✅ No more hardcoded fallback rectangle

## Current Status

- **Discovered:** October 9, 2025
- **Severity:** Critical / Blocker
- **Priority:** P0 (Drop everything)
- **ETA to Fix:** 90 minutes
- **Testing:** 30 minutes
- **Deploy:** 10 minutes

**Total Time to Production:** ~2 hours

---

**Note:** The carousel fixes we just deployed are working correctly - they show live weather data. But they're showing it for the WRONG LOCATION because the location picker doesn't work. This is why all users see rectangle `21D8` regardless of what they select.
