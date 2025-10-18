# RPC QUICK REFERENCE CARD

**Print this and keep handy for emergencies** 🚨

---

## ⚡ Quick Diagnosis (30 seconds)

```bash
# Test RPC is working
npx tsx scripts/test-enhanced-with-without-gps.ts

# If fails, check function exists
npx supabase db push
```

---

## 🔧 RPC Function Details

**Name:** `get_environmental_predictions_enhanced`

**Parameters (IN ORDER):**
1. `target_rectangle` (text) - e.g., `'21D8'`
2. `target_date` (date) - e.g., `'2025-10-18'`
3. `user_lat` (numeric) - Can be NULL
4. `user_lon` (numeric) - Can be NULL
5. `substrate_type` (text) - Can be NULL
6. `depth_meters` (numeric) - Can be NULL
7. `current_wind_speed_ms` (numeric) - Can be NULL
8. `current_pressure_hpa` (numeric) - Can be NULL

**File:** `supabase/migrations/20251018009_update_enhanced_with_biogeographic_temp_scoring.sql`

---

## 📊 Key Database Tables

### `species`
- `temp_opt_c` - numeric[] `{12, 22}` - [min, max] temp
- `temp_weight` - numeric `0.25` - importance multiplier
- `biogeographic_regions` - text[] `{Atlantic}` - where it lives
- `lunar_weight`, `wind_weight`, `pressure_weight` - scoring weights

### `findr_conditions_snapshots`
- `rectangle_code` - text `'21D8'` - ICES rectangle
- `captured_at` - timestamptz - when captured
- `sea_temp_c` - numeric - sea temperature
- `chlorophyll_mg_m3`, `dissolved_oxygen_mg_l`, `salinity_psu`

---

## 🚨 Common Errors & Fixes

### Error: "Could not find function"
```bash
npx supabase db push  # Re-deploy migrations
```

### Error: "Parameter mismatch"
Check `pages/api/findr/predictions.ts` line ~590:
```typescript
const rpcParams = {
  target_rectangle: rectangleCode,
  target_date: predictionDate,
  user_lat: userLat || null,
  user_lon: userLon || null,
  substrate_type: substrateData?.substrate || null,
  depth_meters: bathymetryData?.depth_meters || null,
  current_wind_speed_ms: currentWindSpeedMS,
  current_pressure_hpa: currentPressureHPA,
};
```

### Error: "No predictions returned"
```sql
-- Check data exists
SELECT COUNT(*), MAX(captured_at) 
FROM findr_conditions_snapshots 
WHERE rectangle_code = '21D8'
  AND captured_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Error: "Bogue in Atlantic waters"
```sql
-- Fix Mediterranean species
UPDATE species
SET biogeographic_regions = ARRAY['Mediterranean', 'IBI']
WHERE name_en = 'Bogue';
```

---

## 🧪 Test Commands

```bash
# Full test suite
npx tsx scripts/test-enhanced-with-without-gps.ts
npx tsx scripts/test-5-regions-service.ts

# Check species data
npx tsx scripts/check-species-regions.ts

# Local API test
npm run dev
# Visit: http://localhost:3000/api/findr/predictions?rectangleCode=21D8&predictionDate=2025-10-18
```

---

## 📂 Critical Files

```
pages/api/findr/predictions.ts          - API endpoint (line 590)
supabase/migrations/20251018009*.sql    - Production RPC
supabase/migrations/20251018010*.sql    - Mediterranean fix
scripts/test-enhanced-with-without-gps.ts - Test script
```

---

## 🔍 Health Check SQL

```sql
-- Functions exist?
SELECT proname FROM pg_proc WHERE proname LIKE '%environmental%';

-- Recent data?
SELECT COUNT(*), MAX(captured_at) FROM findr_conditions_snapshots;

-- Species regions populated?
SELECT COUNT(*) FROM species WHERE biogeographic_regions IS NOT NULL;
```

---

## 📱 Emergency Contacts

- **Full Guide:** `RPC_TROUBLESHOOTING_GUIDE.md`
- **Deployment Docs:** `DEPLOYMENT_20251018_UNIFIED_RPC.md`
- **Test Scripts:** `scripts/test-*.ts`

---

## ⏱️ Recovery Times

- Function missing: **5 min** (re-run migration)
- Parameter mismatch: **10 min** (fix API code)
- No data: **30 min** (check ingestion)
- Full restore: **2 hours** (from backup)

---

**Last Updated:** 2025-10-18  
**Status:** ✅ Production
