# MET Norway + Open-Meteo Data Coverage Summary

**Date:** 15 October 2025

## Ingestion Strategy

We're using a two-tier approach for maximum free coverage:

1. **Primary**: MET Norway (free, high quality)
   - Covers: Arctic, Baltic, North Sea, parts of Atlantic
   - Data: Sea temp, waves, currents, salinity
   
2. **Fallback**: Open-Meteo Marine (free, global coverage)
   - Covers: Areas where MET Norway fails (Mediterranean, Iberian coast)
   - Data: Sea temp, waves, currents, wave period

## Coverage Results

### From Initial Audit (10 sample rectangles):
- **MET Norway**: 60% success (6/10)
  - ✅ Arctic (ARC)
  - ✅ Baltic (BAL)
  - ✅ North Atlantic (IBI/NWS)
  - ❌ Mediterranean (MED) - HTTP 422 errors

- **Open-Meteo**: 100% success (10/10)
  - ✅ All regions including Mediterranean

### Full Ingestion (284 rectangles)
Running now via `scripts/ingestFindrConditions.ts`

**Observations:**
- MET Norway failing on Portuguese/Spanish coast (IBI region)
- Open-Meteo successfully recovering these rectangles
- Some duplicate key errors (data already exists from today)
- Some foreign key errors (rectangles 21D7, 22L7 not in ices_rectangles table)

## Data Fields Comparison

| Field | MET Norway | Open-Meteo | Copernicus* |
|-------|-----------|------------|-------------|
| Sea Temperature | ✅ | ✅ | ✅ |
| Wave Height | ✅ | ✅ | ✅ |
| Wave Direction | ✅ | ✅ | ✅ |
| Wave Period | ❌ | ✅ | ❌ |
| Current Speed | ✅ | ✅ | ✅ |
| Current Direction | ✅ | ✅ | ✅ |
| Salinity | ✅ | ❌ | ✅ |
| **Water Clarity** | ❌ | ❌ | **✅** |
| **Nutrients (N/P/Chl)** | ❌ | ❌ | **✅** |

*Copernicus integration pending - awaiting support response on coastal data issues

## Cost Analysis

- **MET Norway**: FREE ✅
- **Open-Meteo**: FREE ✅
- **Copernicus**: FREE ✅ (but technical issues)
- **Stormglass**: $50+/month ❌ (not using)

**Total Cost: $0/month** 🎉

## Next Steps

1. ✅ Complete MET Norway + Open-Meteo ingestion for all 284 rectangles
2. ⏳ Wait for Copernicus support response re: coastal data
3. 📊 Analyze final coverage statistics
4. 🔄 Set up daily/hourly cron jobs for data refresh
5. 🎯 If Copernicus works: Add water clarity & nutrients (unique value-add)
6. 📱 Expose data via API for frontend consumption

## Database Schema

Table: `findr_conditions_snapshots`

Unique constraint: `(rectangle_code, snapshot_day)`

Key columns:
- `rectangle_code`: ICES rectangle ID
- `captured_at`: Timestamp of data capture
- `snapshot_day`: Date (for unique constraint)
- `sea_temp_c`: Sea temperature in Celsius
- `wave_height_m`: Wave height in meters
- `wind_speed_kts`: Wind speed in knots
- `source`: Data provider (`met-norway`, `open-meteo-marine`, `copernicus`)
- `hourly_marine_json`: Full hourly forecast data

## Issues to Resolve

1. **Foreign Key Errors**: Rectangles 21D7, 22L7 exist in ingestion source but not in `ices_rectangles` table
   - Need to clean up or add these rectangles

2. **Duplicate Key Handling**: Currently failing silently on duplicates
   - Consider using `captured_at` timestamp-based deduplication
   - Or change unique constraint to allow multiple snapshots per day

3. **MET Norway Coverage Gaps**: Some IBI rectangles consistently fail
   - Already solved by Open-Meteo fallback
   - No action needed

## Success Metrics

Target: **100% coverage** of 284 coastal rectangles (≤50km from shore)

Expected Result:
- ~170 rectangles via MET Norway (~60%)
- ~114 rectangles via Open-Meteo fallback (~40%)
- 0 rectangles requiring paid services

**All with FREE data sources!** 🎉
