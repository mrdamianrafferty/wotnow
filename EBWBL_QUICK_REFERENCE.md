# EBWBL Quick Reference Guide

**Last Updated**: November 3, 2025
**Status**: Phase 1 MVP Complete ✅

---

## ✅ Correct EBWBL URL (Verified Nov 2025)

```
https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png
```

**CRITICAL**: Must include `/web_mercator` TileMatrixSet parameter for EPSG:3857 (Web Mercator).

❌ **WRONG** (outdated): `https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png`

---

## Quick Implementation (Leaflet)

```typescript
import { TileLayer } from 'react-leaflet';

<TileLayer
  url="https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png"
  attribution='© <a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry Consortium (EBWBL)</a>'
  maxZoom={14}
  minZoom={2}
  opacity={0.6}
  errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
/>
```

---

## Performance Metrics

- **Resolution**: <100m
- **Average tile load**: 103ms (first load), <50ms (cached)
- **Tile size**: 50-140 KB (PNG)
- **Zoom range**: z2-z14
- **Cache headers**: Expires 2037 (long-lived)
- **CORS**: ✅ Enabled
- **CDN**: Wasabi CDN

---

## Current Implementation

**File**: `components/findr/ConditionsMap.tsx` (lines 396-421)

**Architecture**:
```
When layerMode === 'depth':
  1. EBWBL WMTS tiles (primary, opacity 0.6)
  2. EMODnet WMS fallback (underneath, opacity 0.4)

If EBWBL tile fails → transparent pixel → WMS visible
```

---

## Data Sources

### Primary: EBWBL WMTS
- **URL**: `https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png`
- **Resolution**: <100m
- **Type**: Pre-rendered tiles (fast)
- **Coverage**: Global with European enhancement

### Fallback: EMODnet Bathymetry WMS
- **URL**: `https://ows.emodnet-bathymetry.eu/wms`
- **Layer**: `emodnet:mean_rainbowcolour`
- **Resolution**: ~115m
- **Type**: Server-rendered (slower)

### Substrate: EMODnet Geology WMS
- **URL**: `https://drive.emodnet-geology.eu/geoserver/wms`
- **Layer**: `seabed_substrate_1m`
- **Status**: ✅ Working (unchanged from existing implementation)

---

## Test Scripts

```bash
# Test EBWBL tile availability
npx tsx scripts/test-ebwbl-availability.ts

# Test WMS services (bathymetry + geology)
npx tsx scripts/test-emodnet-wms.ts
```

**Expected Results**:
- EBWBL: 4/4 tests pass, 103ms average
- Bathymetry WMS: Success, 446ms average
- Geology WMS: May fail (service intermittent)

---

## Alternative TileMatrixSets (Future Use)

From WMTS Capabilities XML:
- `web_mercator` - EPSG:3857 (current, recommended)
- `inspire_quad` - EPSG:4326 (lat/lon)
- `laea` - EPSG:3035 (INSPIRE compliant)
- `epsg_3031` - Antarctic Polar Stereographic
- `epsg_3996` - Arctic Polar Stereographic

**Capabilities URL**: `https://tiles.emodnet-bathymetry.eu/wmts/1.0.0/WMTSCapabilities.xml`

---

## Phase 1 Status: ✅ COMPLETE

**Implemented**:
- ✅ EBWBL high-resolution tiles in ConditionsMap
- ✅ Graceful fallback to WMS
- ✅ Backward compatibility maintained
- ✅ Production build successful
- ✅ Test scripts created

**Files Modified**:
- `components/findr/ConditionsMap.tsx`

**Documentation**:
- `EBWBL_PHASE1_IMPLEMENTATION_COMPLETE.md` - Full implementation summary
- `files/EBWBL_DATA_SOURCE_TEST_RESULTS.md` - Test results
- `EBWBL_QUICK_REFERENCE.md` - This file

---

## Next Phases

### Phase 2: Full-Screen Map Mode
- [ ] Create dedicated `/findr/map` route
- [ ] Full-screen map with enhanced controls
- [ ] Layer opacity sliders
- [ ] Enhanced legend with depth ranges
- [ ] Geolocation support
- [ ] URL state persistence

### Phase 3: Offline Support
- [ ] Service worker for EBWBL tiles
- [ ] IndexedDB for tile caching
- [ ] Offline indicator
- [ ] Cache management UI

### Phase 4: Testing & Polish
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)
- [ ] A/B testing for UI

---

## Troubleshooting

### EBWBL Tiles Not Loading

1. **Check URL pattern**: Must include `/web_mercator/`
2. **Check zoom level**: Valid range is z2-z14
3. **Check CORS**: Should be enabled (test with browser DevTools)
4. **Check fallback**: WMS layer should render underneath

### WMS Fallback Not Working

1. **Check service URL**: `https://ows.emodnet-bathymetry.eu/wms`
2. **Check layer name**: `emodnet:mean_rainbowcolour`
3. **Check WMS version**: Should be `1.3.0`
4. **Test with GetCapabilities**: Fetch capabilities XML to verify service

### Geology Substrate Not Loading

- EMODnet Geology WMS (`ows.emodnet-geology.eu`) is **intermittently unavailable**
- Existing fallback (`drive.emodnet-geology.eu`) remains functional
- No action required for Phase 1

---

## Useful Commands

```bash
# Type check
npm run typecheck

# Build production
npm run build

# Test EBWBL
npx tsx scripts/test-ebwbl-availability.ts

# Test WMS
npx tsx scripts/test-emodnet-wms.ts

# Start dev server
npm run dev
```

---

## References

- **EMODnet Bathymetry**: https://www.emodnet-bathymetry.eu/
- **WMTS Capabilities**: https://tiles.emodnet-bathymetry.eu/wmts/1.0.0/WMTSCapabilities.xml
- **WMS GetCapabilities**: https://ows.emodnet-bathymetry.eu/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities
- **Leaflet Docs**: https://leafletjs.com/reference.html
- **React-Leaflet**: https://react-leaflet.js.org/

---

## Contact & Support

For issues or questions about EBWBL implementation:
1. Check `EBWBL_PHASE1_IMPLEMENTATION_COMPLETE.md` for detailed implementation notes
2. Check `files/EBWBL_DATA_SOURCE_TEST_RESULTS.md` for test results
3. Run test scripts to verify service availability
4. Check EMODnet service status at https://www.emodnet-bathymetry.eu/
