# API Data Source Quick Reference

**Last Updated**: 2025-10-19

## Current vs Desired State

### Marine Weather Data

| Data Type | ❌ Current | ✅ Should Be | Status |
|-----------|-----------|-------------|--------|
| Sea Temperature | Stormglass | Copernicus DB → Met.no → Stormglass | 🔴 Fix urgent |
| Wave Height | Stormglass | Copernicus DB → Met.no → Stormglass | 🔴 Fix urgent |
| Currents | Stormglass | Copernicus DB → Stormglass | 🔴 Fix urgent |
| Salinity | Stormglass | Copernicus DB → Stormglass | 🔴 Fix urgent |
| Chlorophyll | Stormglass Bio | Copernicus DB only | 🔴 Fix urgent |
| Water Clarity | Stormglass Bio | Copernicus DB only | 🔴 Fix urgent |

### Tides

| Data Type | ❌ Current | ✅ Should Be | Status |
|-----------|-----------|-------------|--------|
| Tide Predictions | WorldTides → Stormglass | WorldTides only (Stormglass as emergency) | ✅ Mostly correct |
| `/api/tides` | Stormglass only | Deprecate endpoint | 🟡 Remove |
| `/api/unified-weather` | WorldTides → Stormglass | WorldTides only | ✅ Good |

### Astronomy (Sun/Moon)

| Data Type | ❌ Current | ✅ Should Be | Status |
|-----------|-----------|-------------|--------|
| Sunrise/Sunset | Stormglass + Open-Meteo | Open-Meteo only | 🟡 Consolidate |
| Moon Phase | Stormglass | moon-api.com → Open-Meteo | 🟡 Add moon-api |
| Moon Rise/Set | Stormglass | moon-api.com → Open-Meteo | 🟡 Add moon-api |

### General Weather

| Data Type | ❌ Current | ✅ Should Be | Status |
|-----------|-----------|-------------|--------|
| Temperature | Met.no | Met.no → Open-Meteo | ✅ Correct |
| Wind | Met.no | Met.no → Open-Meteo | ✅ Correct |
| Precipitation | Met.no | Met.no → Open-Meteo | ✅ Correct |
| Clouds | Met.no | Met.no → Open-Meteo | ✅ Correct |

### Specialty Data

| Data Type | ❌ Current | ✅ Should Be | Status |
|-----------|-----------|-------------|--------|
| Pollen | Open-Meteo | Open-Meteo (keep) | ✅ Correct |
| Air Quality | Open-Meteo | Open-Meteo (keep) | ✅ Correct |

---

## Caching Strategy

### Current Caching

| Source | Current TTL | Notes |
|--------|-------------|-------|
| Stormglass Marine | 30min - 6h | Variable, model-based |
| WorldTides | 24h | ✅ Good (tides are predictable) |
| Met.no | Dynamic | Respects cache headers ✅ |
| Open-Meteo | Varies | Per-endpoint |
| Copernicus DB | Daily refresh | ✅ Perfect for daily data |

### Recommended Caching

| Source | Should Be | Reason |
|--------|-----------|--------|
| Stormglass Marine | N/A | Don't use as primary! |
| WorldTides | 24h ✅ | Tides highly predictable |
| Met.no | Dynamic ✅ | Let Met.no decide |
| Open-Meteo Astronomy | **24h** | Sun/moon predictable |
| Open-Meteo Weather | 1-3h | Weather changes |
| Copernicus DB | Daily ✅ | Updates once per day |
| moon-api | **24h** | Moon phases change slowly |

---

## Coordinate Precision

### Current

| Endpoint | Precision | Impact |
|----------|-----------|--------|
| `/api/marine` | 3 decimal places ✅ | Good (~110m) |
| `/api/tides` | Full precision ❌ | Wastes API calls |
| `/api/unified-weather` | Varies | Inconsistent |
| Direct calls | Full precision ❌ | Expensive |

### Recommended: 3 Decimal Places (0.001°)

- **Precision**: ~110 meters
- **Impact**: Reduces unique API calls by ~90%
- **Example**: 
  - ❌ Before: 51.5074, -0.1278 (London exact)
  - ✅ After: 51.507, -0.128 (still London, fewer unique coords)

---

## API Call Volumes (Estimated)

### Before Optimization

| Provider | Calls/Day | Cost/Month | Notes |
|----------|-----------|------------|-------|
| Stormglass | ~10,000 | $100-200 | Primary marine source ❌ |
| WorldTides | ~1,000 | $0-20 | Primary tides ✅ |
| Met.no | ~5,000 | $0 | Free ✅ |
| Open-Meteo | ~2,000 | $0 | Free ✅ |
| **Total** | **~18,000** | **$100-220** | |

### After Optimization

| Provider | Calls/Day | Cost/Month | Notes |
|----------|-----------|------------|-------|
| Stormglass | ~50 | $0-10 | Emergency only ✅ |
| WorldTides | ~1,000 | $0-20 | Same ✅ |
| Met.no | ~5,000 | $0 | Free ✅ |
| Open-Meteo | ~3,000 | $0 | Free (increased usage) ✅ |
| moon-api | ~500 | $0 | Free (new) ✅ |
| Copernicus | 0 | $0 | From database ✅ |
| **Total** | **~9,550** | **$0-30** | **90% cost reduction!** |

---

## Critical Endpoints to Fix

### 🔴 URGENT (Fix This Week)

1. **`pages/api/marine.ts`**
   - Problem: Calls Stormglass as primary source
   - Fix: Use Copernicus DB → Met.no → Open-Meteo → Stormglass
   - Impact: -95% Stormglass calls

2. **`components/weather-cards/SeaTempCard.tsx`**
   - Problem: Direct Stormglass API calls from frontend
   - Fix: Use `/api/unified-weather` or Copernicus DB query
   - Impact: Security + cost savings

### 🟡 HIGH PRIORITY (Fix This Month)

3. **All astronomy endpoints**
   - Add: moon-api.com integration
   - Cache: 24h minimum for all astronomy data
   - Remove: Stormglass astronomy calls

4. **`pages/api/tides.ts`**
   - Deprecate: Legacy endpoint
   - Redirect: To `/api/unified-weather`

---

## Environment Variables Needed

### Current

```bash
# Required
WORLDTIDES_API_KEY=xxx           # ✅ Keep
STORMGLASS_SECRET_KEY=xxx        # ⚠️ Should be optional

# Free (no key needed)
# Met.no - no key
# Open-Meteo - no key
# Copernicus - handled by CLI auth
```

### After Refactor

```bash
# Required
WORLDTIDES_API_KEY=xxx           # Tides
# Met.no - no key needed
# Open-Meteo - no key needed
# Copernicus - no key needed (CLI auth)

# Optional (emergency fallback only)
STORMGLASS_SECRET_KEY=xxx        # Optional fallback
OPENWEATHER_API_KEY=xxx          # If still needed (audit first)

# New
MOON_API_KEY=xxx                 # If using paid tier (free tier sufficient)
```

---

## Quick Commands

### Test Current API Usage

```bash
# Check Stormglass calls (should see many)
grep -r "api.stormglass.io" pages/ lib/ components/ | wc -l

# Check Copernicus usage (should see few)
grep -r "copernicus_data" pages/ lib/ | wc -l
```

### After Refactor

```bash
# Stormglass calls should be minimal
grep -r "api.stormglass.io" pages/ lib/ components/ | wc -l
# Expected: <5 files (fallback only)

# Copernicus usage should be high
grep -r "copernicus_data" pages/ lib/ | wc -l
# Expected: >10 files
```

---

## See Also

- `API_USAGE_AUDIT_AND_REFACTOR_PLAN.md` - Full detailed audit
- `MARINE_API_REFACTOR_NEEDED.md` - Marine endpoint refactor guide
- `COPERNICUS_DATA_INGESTION_GUIDE.md` - How Copernicus works
