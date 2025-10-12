# Phase 10.3: Precision Location Mode 🎯

**Status:** Planned  
**Priority:** High - Major UX improvement  
**Estimated Time:** 2-3 days  
**Dependencies:** Phase 10 complete ✅

---

## 🎯 Goal

When a user drops a pin or shares their GPS location, show **precise environmental conditions** for their exact fishing spot, while keeping biological predictions at rectangle level.

---

## 📊 Data Granularity Strategy

### Rectangle Level (Keep as-is):
- ✅ **Biological indicators** - ICES survey data
- ✅ **Catch reports** - angler submissions  
- ✅ **Species abundance** - DATRAS data
- ✅ **Species likelihood** - prediction engine

### Lat/Lon Level (4 decimal places = ~11m accuracy):
- 🆕 **Depth** - bathymetry data (very fine resolution available)
- 🆕 **Substrate/Seabed** - EMODnet 100m grid
- 🆕 **Sea surface temperature** - interpolated from satellite (1km resolution)
- 🆕 **Salinity** - interpolated from CMEMS model
- 🆕 **Tidal currents** - calculated from tidal models
- 🆕 **Distance to features** - nearest wreck, reef, structure
- 🆕 **Weather** - wind, waves, visibility at exact location

---

## 🏗️ Technical Implementation

### Step 1: Database Functions (1 day)

Create precision lookup functions:

```sql
-- Get depth at exact coordinates
CREATE FUNCTION get_depth_at_point(lat NUMERIC, lon NUMERIC)
RETURNS NUMERIC AS $$
  -- Query bathymetry data
  -- Sources: GEBCO, EMODnet Bathymetry
$$;

-- Get substrate at exact coordinates  
CREATE FUNCTION get_substrate_at_point(lat NUMERIC, lon NUMERIC)
RETURNS TEXT AS $$
  -- Query EMODnet seabed substrate
  -- Returns: rock, sand, mud, gravel, mixed, etc.
$$;

-- Interpolate temperature at coordinates
CREATE FUNCTION get_temperature_at_point(lat NUMERIC, lon NUMERIC, date DATE)
RETURNS NUMERIC AS $$
  -- Interpolate from nearby CMEMS data points
  -- Or use satellite SST data
$$;

-- Calculate tidal current
CREATE FUNCTION get_tidal_current_at_point(
  lat NUMERIC, 
  lon NUMERIC, 
  timestamp TIMESTAMPTZ
)
RETURNS JSONB AS $$
  -- Calculate tidal current speed and direction
  -- Returns: {speed: 0.8, direction: 'SW', knots: true}
$$;

-- Find nearest features
CREATE FUNCTION get_nearby_features(
  lat NUMERIC, 
  lon NUMERIC, 
  radius_km NUMERIC DEFAULT 5
)
RETURNS TABLE (
  feature_type TEXT,
  name TEXT,
  distance_km NUMERIC,
  bearing TEXT
) AS $$
  -- Find wrecks, reefs, structures within radius
$$;
```

### Step 2: Data Sources (1 day)

**Bathymetry/Depth:**
- GEBCO 2024 Grid (15 arc-second resolution = ~450m)
- EMODnet Bathymetry (higher resolution for European waters)
- Store in PostGIS table with spatial index

**Substrate:**
- EMODnet Seabed Habitats (100m resolution)
- Already have Folk classification data
- Create spatial lookup table

**Temperature/Salinity:**
- CMEMS satellite SST data (1km resolution)
- Interpolate between grid points
- Cache daily values

**Tidal Currents:**
- Use tidal harmonics (already have tide data)
- Calculate current from tide predictions
- Or integrate CMEMS ocean currents model

**Features (Wrecks/Reefs):**
- UKHO wreck database
- Dive site databases
- User-submitted spots
- Store in PostGIS with spatial index

### Step 3: API Endpoint (Half day)

```typescript
// pages/api/findr/precision-conditions.ts
export default async function handler(req, res) {
  const { lat, lon, timestamp } = req.body;
  
  // Get rectangle for biological data
  const rectangle = await getRectangleFromLatLon(lat, lon);
  
  // Get precise environmental data
  const conditions = await supabase.rpc('get_precision_conditions', {
    p_lat: lat,
    p_lon: lon,
    p_timestamp: timestamp
  });
  
  return res.json({
    location: { lat, lon },
    rectangle: rectangle.code,
    precision_conditions: conditions,
    species_predictions: await getPredictionsForRectangle(rectangle.code)
  });
}
```

### Step 4: Frontend Components (Half day)

```tsx
// components/findr/PrecisionLocationCard.tsx
interface PrecisionLocationCardProps {
  lat: number;
  lon: number;
  conditions: PrecisionConditions;
  rectangleData: RectangleData;
}

// Shows:
// - Exact coordinates
// - Precise depth vs rectangle average
// - Substrate type at spot vs rectangle general
// - Temperature with comparison
// - Current speed and direction
// - Nearby features (wrecks, reefs)
// - Species predictions (from rectangle)
```

---

## 🎨 User Experience

### Before (Phase 10):
```
📍 Rectangle: 21D8
🌊 Average conditions
🐟 Species predictions
```

### After (Phase 10.3):
```
📍 Your Exact Spot: 51.2345, -4.5678
   In Rectangle: 21D8 (South Devon)

🎯 CONDITIONS AT YOUR LOCATION:
┌─────────────────────────────────────┐
│ 📏 Depth: 23m                       │
│    (Rectangle avg: 15m)             │
│                                     │
│ 🪨 Substrate: Rock with kelp        │
│    (Rectangle: Mixed)               │
│                                     │
│ 🌡️ Temperature: 16.2°C              │
│    (Rectangle: 15.85°C)             │
│                                     │
│ 🌊 Current: 0.8 knots SW            │
│    Slack tide in 2h 15m             │
│                                     │
│ 🚢 Nearby:                          │
│    • Wreck "SS Herzogin" 0.8km NE   │
│    • Reef "Outer Stones" 1.2km S    │
└─────────────────────────────────────┘

🐟 SPECIES PREDICTIONS (Rectangle 21D8):
• Common Squid: 100% biting
• Sand Eel: 98% biting
• Bass: 95% biting

💡 At your depth (23m), target squid 
   near the wreck on the falling tide.
```

---

## 🚀 Rollout Strategy

### Phase A: Core Precision Data
1. Deploy bathymetry lookup
2. Deploy substrate lookup  
3. Test with manual lat/lon entry

### Phase B: Enhanced Features
4. Add temperature interpolation
5. Add tidal current calculation
6. Add nearby features search

### Phase C: UI Polish
7. Comparison view (your spot vs rectangle)
8. Map view with features overlay
9. "Share this spot" functionality

---

## 📈 Expected Impact

### User Benefits:
- ✅ Know exact depth before heading out
- ✅ See if their spot has preferred substrate
- ✅ Understand local current conditions
- ✅ Find nearby wrecks/reefs to try
- ✅ Better predictions = more catches

### Technical Benefits:
- ✅ Differentiate from competitors
- ✅ Use high-resolution data we have access to
- ✅ Justify premium features later
- ✅ Build towards "precision fishing" brand

### Business Benefits:
- ✅ Higher engagement (users check before each trip)
- ✅ More accurate predictions = better reputation
- ✅ Premium feature potential
- ✅ Angler community sharing spots

---

## 🎯 Success Metrics

- Users drop pins on 60%+ of sessions
- Average session time increases 40%
- User-submitted spot reports increase 3x
- "This was spot on!" feedback increases

---

## ⚠️ Technical Considerations

### Data Storage:
- Bathymetry: ~50GB for UK waters (can use tiled approach)
- Substrate: ~5GB (EMODnet grid)
- Features: ~10MB (wreck/reef database)
- Total: Manageable with PostGIS + spatial indexing

### Performance:
- Spatial queries with GIST index: < 100ms
- Caching strategy for popular spots
- Pre-compute grids for common areas

### Data Freshness:
- Bathymetry: Static (updates yearly)
- Substrate: Static (updates rarely)
- Temperature: Daily (already have)
- Currents: Real-time calculation
- Features: Static with user submissions

---

## 🔗 Integration Points

### Existing Systems:
- ✅ Phase 10: Rectangle environmental data (keep for biological predictions)
- ✅ Map interface: Add precision mode toggle
- ✅ Favourites: Save precise locations
- ✅ Weather service: Enhance with point forecasts

### New Capabilities:
- 🆕 Precision mode toggle in UI
- 🆕 GPS location sharing
- 🆕 Manual lat/lon entry
- 🆕 Spot comparison tool
- 🆕 Feature discovery (wrecks/reefs nearby)

---

## 📝 Next Steps

1. **Research data sources:**
   - Confirm GEBCO/EMODnet access ✅
   - Find wreck database (UKHO, diver sites)
   - Check CMEMS SST resolution

2. **Prototype spatial queries:**
   - Set up PostGIS if not already
   - Test bathymetry lookup performance
   - Validate substrate grid accuracy

3. **Design UI mockups:**
   - Precision card layout
   - Comparison view design
   - Map integration

4. **Start with MVP:**
   - Depth + substrate only
   - Manual lat/lon entry
   - Get user feedback before full build

---

## 💡 Future Enhancements (Phase 10.4+)

- **AI spot recommendations:** "Best spots in this rectangle for bass today"
- **Historical catch heatmap:** Show where others caught fish
- **Real-time crowdsourcing:** "3 anglers nearby caught bass in last 2h"
- **Weather micro-forecasts:** Point-specific wind/wave predictions
- **AR mode:** Point phone at water, see depth/substrate overlay
- **Social features:** Share spots, create fishing groups
- **Premium features:** Advanced tidal modeling, structure scanning

---

**Status:** Ready to spec out when Phase 10 frontend testing is complete!
