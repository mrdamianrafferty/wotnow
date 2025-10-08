# EMODnet Data Integration Guide

Complete reference for EMODnet Bathymetry and Geology data layers used in WotNow.

## Overview

EMODnet (European Marine Observation and Data Network) provides marine data services through OGC-compliant WMS (Web Map Service) endpoints. We use two main services:

1. **EMODnet Bathymetry** - Depth data and seafloor topography
2. **EMODnet Geology** - Seabed substrate classification

---

## 1. EMODnet Bathymetry Service

### Service Details
- **WMS Endpoint**: `https://ows.emodnet-bathymetry.eu/wms`
- **Service Type**: OGC WMS 1.3.0
- **Documentation**: https://tiles.emodnet-bathymetry.eu/
- **Portal**: https://portal.emodnet-bathymetry.eu/

### Available Layers

#### Primary Layers (Used in Production)
| Layer Name | Description | Use Case |
|------------|-------------|----------|
| `emodnet:mean_rainbowcolour` | Rainbow-colored depth visualization | "Depth" mode - vibrant depth display |
| `emodnet:mean_atlas_land` | Subtle blue depth with land | Alternative depth display (not used) |
| `emodnet:mean_multicolour` | Multi-color depth scheme | Alternative (not used) |

### Current Implementation
```typescript
// Depth mode - Rainbow bathymetry
<WMSTileLayer
  url="https://ows.emodnet-bathymetry.eu/wms"
  params={{
    layers: 'emodnet:mean_rainbowcolour',
    format: 'image/png',
    transparent: true,
    version: '1.3.0'
  }}
  opacity={0.5}
  attribution='<a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry</a>'
/>
```

### Alternative Services
- **WMTS Tiles**: `https://tiles.emodnet-bathymetry.eu/wmts/` (pre-rendered, faster)
  - Note: WMTS coordinate system proved difficult with react-leaflet
  - Stick with WMS for reliability
- **WFS**: Available for vector data
- **WCS**: Available for raster downloads

---

## 2. EMODnet Geology Service

### Service Details
- **WMS Endpoint**: `https://drive.emodnet-geology.eu/geoserver/wms`
- **Service Type**: OGC WMS 1.3.0
- **Documentation**: https://emodnet.ec.europa.eu/en/geology
- **Metadata**: https://emodnet.ec.europa.eu/geonetwork/srv/api/records/6eaf4c6bf28815e973b9c60aab5734e3ef9cd9c4

### Folk Classification System

EMODnet uses Folk's sediment triangle classification with three hierarchies:
- **Folk-16**: 16 detailed substrate classes
- **Folk-7**: 7 substrate classes (what we use)
- **Folk-5**: 5 main substrate classes (simplified)

### Available Substrate Layers

#### Scale-Based Layers
| Layer Name | Scale | Coverage | Notes |
|------------|-------|----------|-------|
| `seabed_substrate_1m` | 1:1,000,000 | Pan-European | **Currently used** - reliable, broad coverage |
| `seabed_substrate_250k` | 1:250,000 | Regional | More detail, limited areas |
| `seabed_substrate_100k` | 1:100,000 | Local | High detail, very limited coverage |

#### Multiscale Layers (Zoom-Adaptive)
| Layer Name | Description | Status |
|------------|-------------|--------|
| `seabed_substrate_1k5_multiscale` | 1:1,500 high-res | ❌ Not working reliably |
| `seabed_substrate_5k_multiscale` | 1:5,000 | ❌ Not working reliably |
| `seabed_substrate_10k_multiscale` | 1:10,000 | ❌ Not working reliably |
| Various other multiscale layers | See GetCapabilities | ❌ Avoid for now |

**Note**: Multiscale layers have coverage/availability issues. Stick with `seabed_substrate_1m`.

### Available Styles

Each layer supports multiple Folk classification styles:
- **Default style**: Folk-5 classification (5 main types)
- `folk_7_substrate_class`: Folk-7 classification (7 types) - **We use this**
- `folk_16_substrate_class`: Folk-16 classification (16 detailed types)

### Folk-7 Substrate Classes

| Class | Name | Description | Color | Fish Species |
|-------|------|-------------|-------|--------------|
| 1 | Mud to muddy Sand | Fine sediments | Light blue (#ADD8E6) | Flatfish, rays, sole |
| 2 | Sand | Sandy substrates | Pale yellow (#FFFFE0) | Bass, plaice, dab |
| 3 | Coarse substrate | Gravel, pebbles | Sage green (#A8B896) | Bream, gurnard |
| 4 | Mixed sediment | Varied composition | Thistle/lavender (#D8BFD8) | Varied species (best variety) |
| 5 | Rock & Boulders | Hard substrates | Burgundy (#800020) | Bass, pollack, wrasse |
| 6 | *(not shown)* | Additional class | - | Not used in our legend |
| 7 | *(not shown)* | Additional class | - | Not used in our legend |

### Current Implementation

```typescript
// Seabed mode - Folk-7 substrate classification
<WMSTileLayer
  url="https://drive.emodnet-geology.eu/geoserver/wms"
  params={{
    layers: 'seabed_substrate_1m',
    styles: 'folk_7_substrate_class',
    format: 'image/png',
    transparent: true,
    version: '1.3.0'
  }}
  opacity={0.7}
  attribution='<a href="https://emodnet.ec.europa.eu/en/geology">EMODnet Geology</a>'
/>
```

### Important Notes

#### What Works
✅ HTTPS endpoint: `https://drive.emodnet-geology.eu/geoserver/wms`
✅ Layer name without namespace: `seabed_substrate_1m`
✅ Explicit style parameter: `styles: 'folk_7_substrate_class'`
✅ Version 1.3.0 WMS standard

#### What Doesn't Work
❌ HTTP endpoint (use HTTPS)
❌ Old endpoint: `http://drive.emodnet-geology.eu/geoserver/gtk/ows`
❌ Namespace prefix: `gtk:seabed_substrate_1m`
❌ Service parameter in params (not needed with `/wms` endpoint)
❌ Multiscale layers (coverage issues)
❌ Seabed Habitats endpoint for Folk data (wrong service)

---

## 3. Technical Implementation

### File Location
`components/findr/ConditionsMap.tsx`

### Layer Mode System
Three mutually exclusive modes:
- **clear**: Base OpenStreetMap only
- **depth**: Rainbow bathymetry overlay
- **seabed**: Folk-7 substrate overlay

```typescript
const [layerMode, setLayerMode] = useState<'clear' | 'depth' | 'seabed'>('clear');
```

### Map Controls
Located in top-right corner:
- **Clear** button (only shows when depth or seabed active)
- **Depth** button (blue when active)
- **Seabed** button (green when active)

### Legend
Located in bottom-left corner:
- Always visible
- Shows depth contours section
- Shows seabed substrate section with Folk-5 colors/names
- Note about mixed sediment being best for variety

---

## 4. Troubleshooting

### Substrate Layer Not Showing

**Symptoms**: Seabed button active but no layer visible on map

**Common Causes**:
1. Wrong endpoint URL (HTTP vs HTTPS)
2. Incorrect layer name or namespace
3. Missing or wrong style parameter
4. Using multiscale layer with no coverage in area
5. Opacity too low

**Solution**:
```typescript
// Use this exact configuration
url="https://drive.emodnet-geology.eu/geoserver/wms"
params={{
  layers: 'seabed_substrate_1m',
  styles: 'folk_7_substrate_class',
  format: 'image/png',
  transparent: true,
  version: '1.3.0'
}}
opacity={0.7}
```

### Checking Available Layers

Use curl to fetch GetCapabilities:
```bash
# Check available layers
curl -s "https://drive.emodnet-geology.eu/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0" | grep -i "seabed_substrate"

# Check available styles
curl -s "https://drive.emodnet-geology.eu/geoserver/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0" | grep -i "folk" | grep -i "style"
```

### Bathymetry Layer Issues

**Symptoms**: Depth button active but no rainbow colors

**Common Causes**:
1. Wrong layer name
2. Opacity too low
3. Missing transparent parameter

**Solution**:
```typescript
// Rainbow bathymetry configuration
url="https://ows.emodnet-bathymetry.eu/wms"
params={{
  layers: 'emodnet:mean_rainbowcolour',
  format: 'image/png',
  transparent: true,
  version: '1.3.0'
}}
opacity={0.5}
```

---

## 5. Testing the Layers

### Quick Test URLs

Test if layer is working by pasting in browser:

**Bathymetry Test** (should show rainbow depth map):
```
https://ows.emodnet-bathymetry.eu/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=42,9,43,10&CRS=EPSG:4326&WIDTH=600&HEIGHT=400&LAYERS=emodnet:mean_rainbowcolour&STYLES=&FORMAT=image/png&TRANSPARENT=true
```

**Substrate Test** (should show Folk-7 classification):
```
https://drive.emodnet-geology.eu/geoserver/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&BBOX=42,9,43,10&CRS=EPSG:4326&WIDTH=600&HEIGHT=400&LAYERS=seabed_substrate_1m&STYLES=folk_7_substrate_class&FORMAT=image/png&TRANSPARENT=true
```

Replace BBOX coordinates with your area of interest (Galician Coast example: `42,9,43,10`).

---

## 6. Performance Considerations

### Opacity Settings
- **Bathymetry**: 0.5 (lighter, subtle)
- **Substrate**: 0.7 (more visible, important for fishing)

### Layer Choice
- Stick with `seabed_substrate_1m` for consistent performance
- Avoid multiscale layers until EMODnet improves coverage
- Consider implementing zoom-based layer switching in future

### Caching
- WMS responses are generally cacheable
- Consider adding tile caching layer if performance becomes issue

---

## 7. Future Improvements

### Potential Enhancements
1. **Zoom-based layer switching**: Manually switch from 1M → 250k → 100k based on zoom level
2. **WMTS integration**: Better performance with pre-rendered tiles (requires coordinate system fix)
3. **GetFeatureInfo**: Click substrate areas to get detailed classification info
4. **Additional data layers**:
   - Shipwrecks (fishing spots)
   - Protected areas (Marine Protected Areas)
   - Ocean currents
   - Temperature gradients

### Known Limitations
- 1:1M scale lacks detail for coastal mud patches
- Folk-7 includes classes 6 & 7 we don't explain in legend
- No real-time data (static layers)
- Limited coverage in some coastal areas

---

## 8. Related Documentation

### EMODnet Resources
- [EMODnet Web Services Documentation](https://emodnet.ec.europa.eu/en/emodnet-web-service-documentation)
- [Bathymetry Portal](https://portal.emodnet-bathymetry.eu/)
- [Geology Portal](https://emodnet.ec.europa.eu/en/geology)
- [Seabed Habitats](https://www.emodnet-seabedhabitats.eu/)

### OGC Standards
- [WMS 1.3.0 Specification](https://www.ogc.org/standards/wms)
- [WMTS Specification](https://www.ogc.org/standards/wmts)

### Internal Documentation
- `DO_NOT_TOUCH_CSS_CONFIG.md` - CSS/DaisyUI configuration
- `CONDITIONS_FEATURE_STATUS.md` - Feature implementation status
- `RECTANGLE_TABLES_GUIDE.md` - ICES rectangle data structure

---

## 9. Quick Reference

### Current Working Configuration

```typescript
// Location: components/findr/ConditionsMap.tsx

// DEPTH MODE - Rainbow Bathymetry
{layerMode === 'depth' && (
  <WMSTileLayer
    url="https://ows.emodnet-bathymetry.eu/wms"
    params={{
      layers: 'emodnet:mean_rainbowcolour',
      format: 'image/png',
      transparent: true,
      version: '1.3.0'
    }}
    opacity={0.5}
    attribution='<a href="https://www.emodnet-bathymetry.eu/">EMODnet Bathymetry</a>'
  />
)}

// SEABED MODE - Folk-7 Substrate
{layerMode === 'seabed' && (
  <WMSTileLayer
    url="https://drive.emodnet-geology.eu/geoserver/wms"
    params={{
      layers: 'seabed_substrate_1m',
      styles: 'folk_7_substrate_class',
      format: 'image/png',
      transparent: true,
      version: '1.3.0'
    }}
    opacity={0.7}
    attribution='<a href="https://emodnet.ec.europa.eu/en/geology">EMODnet Geology</a>'
  />
)}
```

### Git History
Key commits for reference:
- `376949cc` - Folk-5 classification initial implementation
- `4e56f0dd` - Rainbow bathymetry toggle
- `c15d11b7` - Correct Geology endpoint
- `91a5e6b0` - Mutually exclusive layer modes
- `9b49553c` - Adjusted legend colors
- `b13aea89` - Folk-7 with explicit style
- `7f3cc24c` - Revert to stable 1m layer

---

## Last Updated
October 8, 2025

**Document Version**: 1.0
**Maintained by**: Development Team
**Next Review**: When EMODnet updates services or new layers become available
