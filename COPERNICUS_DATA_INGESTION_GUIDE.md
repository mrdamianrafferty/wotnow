# Copernicus Data Ingestion Guide

**Status:** ✅ `cmems_region` column populated in `ices_rectangles` table  
**Next Step:** Fetch and populate Copernicus marine data

---

## 📋 Current Status

### ✅ Completed
1. **Database schema ready** - All Copernicus columns exist in `findr_conditions_snapshots`
2. **CMEMS region mapping done** - `ices_rectangles.cmems_region` column populated with region codes (IBI, NWS, BAL, MED, etc.)
3. **Regional dataset routing** - `lib/copernicus/regionRouter.ts` maps regions to appropriate datasets
4. **Ingestion script ready** - `scripts/ingest-copernicus-data.ts` ready to fetch data

### 🔄 Current Challenge
Choosing the right datasets and CMEMS regions for each ICES rectangle to ensure:
- Data availability (not all areas have data in all datasets)
- Correct regional model usage (Baltic Sea ≠ North Sea physics)
- Appropriate resolution for coastal vs offshore areas

---

## 🗺️ CMEMS Regional Models

### Available Regional Models

| Code | Region | Dataset | Resolution | Coverage |
|------|--------|---------|------------|----------|
| **BAL** | Baltic Sea | `cmems_mod_bal_phy_my_0.0167deg_P1D-m` | ~2km | 53-66°N, 10-30°E |
| **MED** | Mediterranean | `cmems_mod_med_phy-tem_anfc_4.2km_P1D-m` | 4.2km | 30-46°N, 6°W-36°E |
| **IBI** | Iberia-Biscay-Ireland | `cmems_mod_ibi_phy_my_0.083deg_P1D-m` | ~9km | 36-54°N, 20°W-5°W |
| **NWS** | Northwest European Shelf | `cmems_mod_nws_phy_my_7km_P1D-m` | 7km | 48-63°N, 12°W-13°E |
| **ARC** | Arctic | `cmems_mod_arc_phy_my_0.04deg_P1D-m` | ~4km | >66°N |
| **BLK** | Black Sea | `cmems_mod_blk_phy_my_0.04deg_P1D-m` | ~4km | Black Sea |
| **GLO** | Global Ocean | `cmems_mod_glo_phy_my_0.083deg_P1D-m` | ~9km | Global |

### Dataset Types Per Region

Each region typically has three dataset types:

1. **Physics (PHY)** - Temperature, salinity, currents, mixed layer depth, sea surface height
2. **Biogeochemistry (BGC)** - Chlorophyll, nutrients, oxygen, phyto/zooplankton, water clarity (kd490)
3. **Waves (WAV)** - Wave height, direction, period, wind sea vs swell

---

## 🚀 Next Steps

### Step 1: Verify CMEMS Region Distribution

Check how rectangles are distributed across regions:

```bash
npx tsx scripts/check-cmems-distribution.ts
```

This will show:
- How many rectangles per CMEMS region
- Geographic coverage
- Potential issues (e.g., coastal rectangles that might have no data)

### Step 2: Test Data Availability

Before full ingestion, test a few rectangles from each region:

```bash
# Test with mock data first
npx tsx scripts/ingest-copernicus-data.ts

# Or test real API with limited rectangles
FINDR_CONDITIONS_LIMIT=10 npx tsx scripts/ingest-copernicus-data.ts
```

**What to watch for:**
- ❌ **"No valid data"** - Location too close to shore or outside model domain
- ❌ **Rate limiting** - Adjust `FINDR_CONDITIONS_DELAY_MS` (default 500ms)
- ❌ **Missing credentials** - Need `COPERNICUS_USERNAME` and `COPERNICUS_PASSWORD`

### Step 3: Handle Coastal Areas

Coastal rectangles (<10km from shore) may not have data in some regional models:

**Options:**
1. **Skip coastal areas** - Focus on offshore first (>50km from shore)
2. **Use Global model** - Fallback to GLO dataset for areas without regional data
3. **Accept nulls** - Store NULL values, interpolate from nearby rectangles later

### Step 4: Full Ingestion

Once testing is successful:

```bash
# Full ingestion (all rectangles)
npx tsx scripts/ingest-copernicus-data.ts

# With custom delay (slower = safer)
FINDR_CONDITIONS_DELAY_MS=1000 npx tsx scripts/ingest-copernicus-data.ts
```

**Ingestion Strategy:**
- Processes offshore rectangles first (most likely to have data)
- Updates existing `findr_conditions_snapshots` records (doesn't create new ones)
- Populates 14 Copernicus-specific columns:
  - Ocean currents (speed, direction, components)
  - Thermocline depth (mixed layer)
  - Upwelling (sea surface height)
  - Water clarity (kd490)
  - Food chain (zooplankton, phytoplankton, production)
  - Waves (direction, period, wind sea, swell)

---

## 🔧 Troubleshooting

### Issue: "No valid data for location"

**Cause:** Rectangle is too close to shore or outside the regional model domain

**Solutions:**
1. Check if rectangle is coastal: `SELECT * FROM ices_rectangles WHERE is_coastal = true;`
2. Try different CMEMS region or use GLO (Global) model
3. Accept NULL values for that location

### Issue: Rate Limiting / 429 Errors

**Cause:** Too many requests to Copernicus API

**Solutions:**
1. Increase delay: `FINDR_CONDITIONS_DELAY_MS=2000`
2. Process in smaller batches: `FINDR_CONDITIONS_LIMIT=100`
3. Run during off-peak hours

### Issue: "Dataset not found"

**Cause:** Wrong dataset ID or region code

**Solutions:**
1. Verify dataset IDs in `lib/copernicus/regionRouter.ts`
2. Check Copernicus Marine catalog: https://data.marine.copernicus.eu/products
3. Update dataset IDs if they've changed

### Issue: Missing Biogeochemistry Data

**Cause:** BGC datasets have different coverage than physics

**Solutions:**
1. Physics data (temp, currents) is usually more complete than BGC
2. Use available data, store NULLs for missing fields
3. Consider using satellite-derived kd490 for water clarity instead of model data

---

## 📊 Data Quality Checks

After ingestion, verify data quality:

```bash
# Check ingestion success rate
npx tsx scripts/verify-database-status.ts

# Check data coverage per field
SELECT 
  COUNT(*) as total_records,
  COUNT(current_speed_ms) as has_currents,
  COUNT(kd490) as has_clarity,
  COUNT(mixed_layer_depth_m) as has_thermocline,
  COUNT(zooplankton_mmol_m3) as has_food_chain
FROM findr_conditions_snapshots
WHERE captured_at > NOW() - INTERVAL '7 days';
```

**Expected Results:**
- ✅ **>80% coverage** for physics (currents, thermocline) in offshore areas
- ✅ **50-70% coverage** for BGC (food chain, clarity) - less complete than physics
- ⚠️ **<50% coverage** in coastal areas - expected due to model limitations

---

## 🎯 Key Variables & Their Importance

### High Priority (for bite scores)

| Variable | Column | Impact | Species Affected |
|----------|--------|--------|------------------|
| **Ocean Currents** | `current_speed_ms` | ⭐⭐⭐ Critical | ALL species (79/79) |
| **Water Clarity** | `kd490` | ⭐⭐ Important | Sight feeders (14/79) |
| **Thermocline** | `mixed_layer_depth_m` | ⭐⭐ Important | Pelagic species |

### Medium Priority (environmental insights)

| Variable | Column | Use Case |
|----------|--------|----------|
| **Sea Surface Height** | `sea_surface_height_m` | Upwelling detection |
| **Zooplankton** | `zooplankton_mmol_m3` | Food availability |
| **Primary Production** | `primary_production_mg_c_m3_day` | Ecosystem health |

### Lower Priority (advanced features)

| Variable | Column | Use Case |
|----------|--------|----------|
| **Wave Period** | `wave_period_s` | Surf fishing timing |
| **Wave Direction** | `wave_direction_deg` | Beach positioning |
| **Swell Height** | `swell_height_m` | Deep ocean swell |

---

## 🔄 Ongoing Maintenance

### Daily Updates
Set up GitHub Action to fetch fresh data daily:

```yaml
# .github/workflows/findr-copernicus-ingest.yml
name: Findr Copernicus Data Ingestion
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx tsx scripts/ingest-copernicus-data.ts
        env:
          COPERNICUS_USERNAME: ${{ secrets.COPERNICUS_USERNAME }}
          COPERNICUS_PASSWORD: ${{ secrets.COPERNICUS_PASSWORD }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Monitoring
- Check ingestion logs daily
- Monitor data freshness: `SELECT MAX(captured_at) FROM findr_conditions_snapshots;`
- Alert if data is >3 days old

---

## 📚 Additional Resources

- **Copernicus Marine Service:** https://data.marine.copernicus.eu
- **Dataset Catalog:** https://data.marine.copernicus.eu/products
- **API Documentation:** https://help.marine.copernicus.eu/en/
- **Python Client Docs:** https://github.com/mercator-ocean/copernicus-marine-toolbox

---

## 💡 Quick Commands

```bash
# Check current CMEMS region distribution
SELECT cmems_region, COUNT(*) 
FROM ices_rectangles 
GROUP BY cmems_region 
ORDER BY COUNT(*) DESC;

# Check Copernicus data coverage
SELECT 
  COUNT(*) FILTER (WHERE current_speed_ms IS NOT NULL) as has_currents,
  COUNT(*) FILTER (WHERE kd490 IS NOT NULL) as has_clarity,
  COUNT(*) as total
FROM findr_conditions_snapshots;

# Test ingestion (10 rectangles, mock data)
FINDR_CONDITIONS_LIMIT=10 npx tsx scripts/ingest-copernicus-data.ts

# Test ingestion (10 rectangles, real API)
COPERNICUS_USERNAME=your-user \
COPERNICUS_PASSWORD=your-pass \
FINDR_CONDITIONS_LIMIT=10 \
npx tsx scripts/ingest-copernicus-data.ts
```
