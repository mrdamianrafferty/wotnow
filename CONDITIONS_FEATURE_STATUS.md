# Conditions Page Feature Recovery Status
## Date: October 8, 2025

## ✅ FEATURES CURRENTLY WORKING

### 1. **Map Components**
- ✅ **EMODnet Depth Contours**: Real bathymetry contours from EMODnet WFS (10m, 20m, 50m, 100m, 200m depths)
- ✅ **WMS Bathymetry Layer**: Shaded depth visualization from `emodnet:mean_atlas_land`
- ✅ **Map Toggle**: Show/Hide map button functional
- ✅ **Map Position**: Located at bottom of ConditionsDashboard (lines 340-380)
- ✅ **ICES Rectangle Overlay**: Blue dashed rectangle showing fishing management zone
- ✅ **Fishing Spots**: Hot/OK/Poor indicators with depth and species data

### 2. **Marine Weather Components**
- ✅ **Daily Marine Carousel**: 7-day forecast component exists (`components/findr/weather/DailyMarineCarousel.tsx`)
- ✅ **Hourly Marine Carousel**: 12-hour marine conditions component exists
- ✅ **Wind Summary Card**: Wind speed and direction display
- ✅ **Wave Summary Card**: Wave height display  
- ✅ **Tide Summary Card**: Next high/low tides

### 3. **Marine Bio Indicators**
- ✅ **MarineBioIndicatorsCard**: Displays chlorophyll, oxygen, salinity, nitrate, phosphate
- ✅ **Component exists**: `/components/findr/weather/MarineBioIndicatorsCard.tsx`
- ✅ **Utility exists**: `/utils/bioMarineLevels.ts`
- ✅ **Expandable cards**: Each indicator can be expanded for details

### 4. **Other Features**
- ✅ **Moon Widget**: Fully functional with folklore mode
- ✅ **Google Places Autocomplete**: Working with correct CSS (white text fixed)
- ✅ **DaisyUI v5 + Tailwind v4**: CSS correctly configured with `@plugin "daisyui"`
- ✅ **EnvironmentalSummaryCard**: Shows pollen, air quality, UV index

### 5. **Page Layout**
- ✅ **Tidied layout**: Map at bottom, carousels above, summary cards at top
- ✅ **Responsive design**: Mobile-optimized with proper padding
- ✅ **Navigation**: FindrNavigation component working

## ❌ FEATURES MISSING OR UNVERIFIED

### 1. **Substrate/Seabed Maps**
- ❌ **Folk Classification Layers**: No WMS layers for seabed substrate types (sand, rock, mud, gravel)
- ❌ **Angler-Friendly Terminology**: No user-facing terms like "Sandy bottom good for flatfish"
- ❌ **EMODnet Substrate WMS**: Not currently loaded in ConditionsMap component

**Evidence**: 
- No `folk_5` or `folk_7` layers in ConditionsMap.tsx
- No substrate-related strings in git history
- Only bathymetry (depth) layers present, not substrate (seabed type) layers

### 2. **Live Weather Data Sources**  
- ⚠️ **Current**: All data comes from Supabase `findr_conditions_snapshot` table
- ❓ **WorldTides API**: Not verified if being called live or cached
- ❓ **OpenMeteo API**: Not verified if being called live or cached  
- ❓ **Copernicus/CMEMS**: Data appears cached in Supabase, no live ingestion script found
- ❓ **MoonAPI**: Called via Supabase function, unsure if cached

**Data Flow**:
```
/api/findr/conditions 
  → Supabase findr_conditions_snapshot table
    → Contains: sea_temp, chlorophyll, oxygen, salinity, nitrate, phosphate, 
                wave_height, wind, tides, hourly_marine_json, daily_marine_json
```

### 3. **"Stealth" Bio Indicator**
- ❓ **Not Found**: No component called "StealthBio" or similar
- ℹ️ **Current**: EnvironmentalSummaryCard shows pollen, air quality, UV
- ℹ️ **Possible**: May have meant MarineBioIndicatorsCard replaces air quality focus?

## 📊 DATA ARCHITECTURE CONFIRMED

### Supabase Tables Referenced:
1. `findr_conditions_snapshot` - Main conditions cache
2. `ices_rectangles` - Rectangle metadata (code, name, region, lat/lon)

### API Endpoints Working:
1. `/api/findr/conditions?rectangleCode=XX` - Returns conditions data
2. `/api/moon` - Moon data (via Supabase function)

### Data Ingestion:
- ✅ copernicusmarine Python package installed in venv
- ❓ No clear ingestion scripts found in root or scripts/
- ❓ Data update mechanism unclear

## 🎯 RESTORATION RECOMMENDATIONS

### Priority 1: Add Substrate Layers (If Needed)
If substrate maps were truly implemented before, we need to:

1. **Find the WMS layer URLs** for EMODnet substrate
   - Likely: `https://ows.emodnet-seabedhabitats.eu/geoserver/wms`
   - Layers: `folk5` or `folk7` classification

2. **Add to ConditionsMap.tsx**:
   ```tsx
   <WMSTileLayer
     url="https://ows.emodnet-seabedhabitats.eu/geoserver/wms"
     params={{
       layers: 'emodnet:folk_substrate',
       format: 'image/png',
       transparent: true
     }}
     opacity={0.6}
   />
   ```

3. **Add angler-friendly legend**:
   - Sand → "Sandy bottom - good for flatfish"
   - Rock → "Rocky bottom - good for bass"
   - Mud → "Muddy bottom - good for sole"
   - Gravel → "Gravelly bottom - mixed species"

### Priority 2: Verify Data Sources
1. Check if WorldTides is called live or cached
2. Check if OpenMeteo is called live or cached  
3. Document the data ingestion pipeline
4. Consider adding live API fallbacks if Supabase is stale

### Priority 3: Document "Stealth" Bio Indicator
1. Clarify what this feature actually is/was
2. If it's the MarineBioIndicatorsCard, document it as such
3. If it was something else, search older stashes

## ⚠️ CRITICAL: DO NOT BREAK

### CSS Configuration
- ✅ **Working**: `@plugin "daisyui"` in styles/index.css
- ✅ **Working**: `'@tailwindcss/postcss'` in postcss.config.js
- ⚠️ **DO NOT** change to `@import "daisyui"` or `module.exports` with `tailwindcss`

### Google Autocomplete
- ✅ **Working**: CoastalLocationDialog with `text-base-content` classes
- ⚠️ **DO NOT** remove color classes from autocomplete suggestions

## 📝 CONCLUSION

**Most features ARE working**. The main uncertainties are:

1. **Substrate maps**: Genuinely missing or never fully implemented?
2. **Live APIs**: Are they being called or is everything cached in Supabase?
3. **"Stealth" indicator**: What was this actually referring to?

**Next Steps**: You should clarify which of these missing features you actually had working, and we can restore them specifically without touching the working CSS and autocomplete.
