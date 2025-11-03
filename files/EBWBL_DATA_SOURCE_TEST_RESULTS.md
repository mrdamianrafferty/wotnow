# EBWBL & EMODnet Data Source Test Results

**Date**: November 3, 2025
**Status**: ✅ Primary source verified, ⚠️ Secondary sources partially available

## Executive Summary

We've successfully verified that the **EBWBL (EMODnet Bathymetry World Base Layer) WMTS tiles are accessible and ready for implementation**. However, the implementation guide had **outdated URL patterns** that needed correction.

### Key Findings

| Data Source | Status | Response Time | Resolution | Notes |
|------------|--------|---------------|------------|-------|
| **EBWBL WMTS** | ✅ **Fully Operational** | 54-227ms avg | <100m | Primary high-res source |
| EMODnet Bathymetry WMS | ✅ Available | ~446ms | ~115m | Fallback for bathymetry |
| EMODnet Geology WMS | ❌ Currently Unavailable | - | Variable | Seabed substrate (needs investigation) |

---

## 1. EBWBL WMTS (Primary Source)

### ✅ Test Results: ALL PASSED (4/4)

```
🎉 All tests passed! EBWBL tiles are accessible and ready to use.
✅ Successful: 4/4
⏱️  Average Response Time: 103ms
🌐 CORS Enabled: ✅ Yes
```

### Correct URL Pattern (UPDATED)

**❌ Implementation Guide Had:**
```
https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png
```

**✅ Correct Pattern (Verified Nov 2025):**
```
https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png
```

**Critical Difference**: Must include `/web_mercator` TileMatrixSet for EPSG:3857 projection (Web Mercator).

### Test Details

| Tile Location | Zoom | Response | Size | Status |
|--------------|------|----------|------|--------|
| Europe Overview | z4 | 227ms | 139 KB | ✅ |
| Asturias Coast | z8 | 65ms | 135 KB | ✅ |
| Bay of Biscay | z10 | 65ms | 122 KB | ✅ |
| Maximum Detail | z14 | 54ms | 49 KB | ✅ |

### Service Features

- **Cache Headers**: Excellent (expires 2037!)
- **CORS**: Fully enabled for browser access
- **CDN**: Hosted on Wasabi CDN
- **Performance**: Fast and consistent
- **Coverage**: Global with European enhancement

### Available TileMatrixSets

From WMTS Capabilities:
- `web_mercator` - EPSG:3857 (recommended for Leaflet)
- `inspire_quad` - EPSG:4326 (lat/lon)
- `laea` - EPSG:3035 (INSPIRE compliant)
- `epsg_3031` - Antarctic Polar Stereographic
- `epsg_3996` - Arctic Polar Stereographic

---

## 2. EMODnet Bathymetry WMS (Fallback)

### ✅ Test Results: WORKING

```
Service: https://ows.emodnet-bathymetry.eu/wms
Layer: emodnet:mean_atlas_land
Status: ✅ Success
Response Time: 446ms
CORS: ✅ Enabled
```

### Use Cases

- Fallback when EBWBL tiles fail to load
- Alternative for non-Web Mercator projections
- Server-side tile generation for custom areas

### WMS Request Example

```
https://ows.emodnet-bathymetry.eu/wms?
  SERVICE=WMS&
  VERSION=1.3.0&
  REQUEST=GetMap&
  LAYERS=emodnet:mean_atlas_land&
  BBOX=-6.0,43.0,-5.0,44.0&
  CRS=EPSG:4326&
  WIDTH=256&
  HEIGHT=256&
  FORMAT=image/png&
  TRANSPARENT=true
```

### Available Bathymetry Layers

From GetCapabilities:
- `emodnet:mean_atlas_land` - Mean depth with land coverage ✅
- `emodnet:contours` - Depth contours
- `emodnet:download_tiles` - Downloadable tile index
- `coastlines` - Various coastline layers

**Note**: The `emodnet:mean_2024` layer mentioned in the implementation guide returned a service exception, suggesting it may not be publicly available or requires different parameters.

---

## 3. EMODnet Geology WMS (Seabed Substrate)

### ❌ Test Results: CURRENTLY UNAVAILABLE

```
Service: https://ows.emodnet-geology.eu/geoserver/emodnet/wms
Layer: seabed_substrate_1m
Status: ❌ Failed (fetch failed)
```

### Investigation Needed

The EMODnet Geology service appears to be:
1. **Temporarily down** - Network connection failed
2. **Behind authentication** - May require credentials
3. **Different URL structure** - GeoServer-based (different from Bathymetry)
4. **Geo-restricted** - May have geographic or institutional access controls

### Alternative Approaches

If geology data is critical:

1. **Use EMODnet's Data Portal**: Download static seabed substrate datasets
2. **Implement server-side proxy**: Fetch and cache geology tiles server-side
3. **Alternative data sources**:
   - GEBCO substrate classification
   - National geological surveys
   - Custom substrate mapping based on bathymetry

---

## 4. Implementation Recommendations

### Phase 1 MVP - Recommended Approach

**Primary**: EBWBL WMTS (verified working)
```typescript
const EBWBL_URL = 'https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png';

const ebwblLayer = L.tileLayer(EBWBL_URL, {
  attribution: '© EMODnet Bathymetry Consortium (EBWBL)',
  maxZoom: 14,
  minZoom: 2,
  opacity: 0.8,
  crossOrigin: 'anonymous'
});
```

**Fallback**: EMODnet Bathymetry WMS (verified working)
```typescript
const fallbackLayer = L.tileLayer.wms('https://ows.emodnet-bathymetry.eu/wms', {
  layers: 'emodnet:mean_atlas_land',
  format: 'image/png',
  transparent: true,
  attribution: '© EMODnet Bathymetry',
  opacity: 0.7
});
```

### Defer for Later

**Seabed Substrate (Geology)**:
- ⏳ Investigate access issues
- ⏳ Test alternative geology endpoints
- ⏳ Consider alternative data sources
- ⏳ Implement only if critical for MVP

---

## 5. Data Source Hierarchy (Updated)

```
User Request
     ↓
Is Full Screen?
     ↓
Check EBWBL WMTS
     ↓
  ✅ Available → Use EBWBL (fast, high-res)
     ↓
  ❌ Failed → Use WMS Fallback (slower, lower-res)
     ↓
  ❌ Both Failed → Use Cache (if available)
     ↓
  ❌ No Cache → Show "Offline" message
```

**Note**: Seabed substrate (geology) layer removed from immediate priority due to service availability issues.

---

## 6. Performance Expectations

### EBWBL WMTS
- **First tile load**: 100-250ms
- **Cached tiles**: <50ms
- **Tile size**: 50-140 KB (PNG)
- **Concurrent loading**: Excellent (CDN-backed)

### WMS Fallback
- **Tile generation**: 300-500ms (server-rendered)
- **Caching**: Less effective (dynamic generation)
- **Use sparingly**: Implement aggressive client-side caching

---

## 7. Next Steps

### ✅ Ready for Implementation

1. **Update implementation guide** with correct EBWBL URL pattern
2. **Start Phase 1 MVP**: Basic map with EBWBL tiles
3. **Implement fallback logic**: EBWBL → WMS → Cache
4. **Add performance monitoring**: Track load times and failures

### ⏳ Investigate Later

1. **EMODnet Geology access**: Contact support or find alternative
2. **Additional WMS layers**: Test other bathymetry products
3. **Offline strategy**: Implement service worker + IndexedDB
4. **Legend integration**: Fetch and display depth/substrate legends

---

## 8. Critical Corrections to Implementation Guide

### URL Patterns

| Guide Says | Actual Working URL | Change Required |
|-----------|-------------------|-----------------|
| `https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png` | `https://tiles.emodnet-bathymetry.eu/2020/baselayer/web_mercator/{z}/{x}/{y}.png` | Add `/web_mercator` |

### Layer Names

| Guide Says | Actual Status | Change Required |
|-----------|--------------|-----------------|
| `emodnet:mean_2024` | ❌ Service Exception | Use `emodnet:mean_atlas_land` |
| `seabed_substrate_1m` | ❌ Service Unavailable | Defer or find alternative |

---

## 9. Test Scripts Created

- `scripts/test-ebwbl-availability.ts` - EBWBL WMTS tile testing ✅
- `scripts/test-emodnet-wms.ts` - WMS service testing (bathymetry ✅, geology ❌)

Run tests:
```bash
npx tsx scripts/test-ebwbl-availability.ts
npx tsx scripts/test-emodnet-wms.ts
```

---

## 10. Conclusion

✅ **EBWBL WMTS is production-ready** with excellent performance
✅ **EMODnet Bathymetry WMS** provides a reliable fallback
⚠️ **EMODnet Geology WMS** needs further investigation or alternative approach

**Recommendation**: Proceed with Phase 1 MVP using EBWBL as primary source and standard Bathymetry WMS as fallback. Defer seabed substrate (geology) layer until access issues are resolved or alternative data source is identified.

The core bathymetry functionality (depth visualization) is fully operational and ready for implementation.
