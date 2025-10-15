# Copernicus Regional Coastal Products - Action Plan

**Date**: 15 October 2025  
**Status**: Testing phase - verifying product IDs

---

## Current Status

### ✅ Confirmed Working
- **MET Norway + Open-Meteo**: 100% coverage, surface conditions working
  - Currently ingesting successfully (background process running)
  - Data in `findr_conditions_snapshots` table
  - `rectangle_environmental_conditions` view exists with data

### ⚠️ Needs Verification
- **Copernicus Regional Products**: Product IDs from support may not be exact CLI names
  - Initial tests failing - need to find correct dataset IDs
  - Support mentioned products DO exist for coastal areas
  - Need to search catalog properly

---

## Immediate Action Items

### Priority 1: Deploy Missing RPC Function ⚡ CRITICAL

**Problem**: Frontend can't use real data because RPC function doesn't exist

**Evidence**:
```
❌ Error: Could not find the function public.get_environmental_predictions_basic
```

**Solution**: Run `DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql` in Supabase SQL Editor

**Impact**: 
- ✅ View `rectangle_environmental_conditions` exists with data
- ✅ Data ingestion working (MET Norway + Open-Meteo)
- ❌ Frontend can't access data (RPC missing)
- User sees "No dynamic predictions available yet"

**Action**: Copy DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql → Supabase Dashboard → SQL Editor → Run

---

### Priority 2: Find Correct Copernicus Product IDs

**Challenge**: Product IDs from support response may be product-level, not dataset-level

Example mismatch:
```
Support said: OCEANCOLOUR_MED_BGC_L4_NRT_009_142
CLI expects: cmems_obs-something or different format
```

**Next Steps**:
1. Search catalog with web interface: https://data.marine.copernicus.eu/products
2. Filter by:
   - Region: Mediterranean / IBI / Baltic
   - Variable: Chlorophyll
   - Temporal: Daily
3. Note the actual `dataset-id` (not product-id)
4. Test with CLI: `copernicusmarine describe --dataset-id <ID>`

**Alternative Approach**:
- Use `copernicusmarine describe --contains "mediterranean"` and parse JSON
- Look for datasets with chlorophyll variables
- Test each candidate with sample coordinates

---

### Priority 3: Decide on Data Source Strategy

**Option A: MET/Open-Meteo Only (Current)**
- ✅ Working now (100% coverage)
- ✅ Simple, reliable, free
- ✅ Surface conditions sufficient
- ❌ No biogeochemical data (chlorophyll, nutrients)

**Option B: Copernicus Primary**
- ✅ Best biogeochemical data
- ✅ Better resolution (1-9km vs current)
- ❌ Complex regional product mapping
- ❌ Still verifying coastal coverage

**Option C: Hybrid (RECOMMENDED)** ⭐
```
Biogeochemical (Copernicus):
- Chlorophyll-a (phytoplankton → baitfish → target species)
- Dissolved oxygen (habitat suitability)
- Nitrate/Phosphate (feeding activity)

Surface Conditions (MET/Open-Meteo):
- Sea temperature (real-time, reliable)
- Wave height/direction (fishing conditions)
- Currents, wind, air temp

Benefits:
- Leverages strengths of both systems
- Adds predictive power without breaking what works
- Free ($0/month for both)
```

---

## Technical Debt to Address

### Database Schema
- [x] View `rectangle_environmental_conditions` created
- [x] Ingestion to `findr_conditions_snapshots` working
- [ ] RPC function `get_environmental_predictions_basic()` deployed
- [ ] Cache table `findr_prediction_sessions` in use

### Frontend Integration
- [ ] Remove fallback messages once RPC deployed
- [ ] Show data source in UI (MET Norway, Open-Meteo, Copernicus)
- [ ] Display data freshness (hours old)
- [ ] Add biogeochemical indicators when available

### Data Ingestion
- [x] MET Norway integration complete
- [x] Open-Meteo fallback working
- [ ] Copernicus biogeochemical ingestion (pending product ID verification)
- [ ] Scheduled daily updates (cron job)

---

## Copernicus Product Search Strategy

### Method 1: Web Catalog Search
1. Go to: https://data.marine.copernicus.eu/products
2. Use filters:
   ```
   Geographic: Mediterranean Sea / Baltic Sea / Atlantic
   Variables: Chlorophyll-a concentration
   Product type: Satellite observations
   Temporal: Daily
   ```
3. Click on product → Copy `Dataset ID` (not Product ID)
4. Verify with CLI

### Method 2: CLI JSON Parsing
```bash
# Get all Mediterranean products as JSON
copernicusmarine describe --contains "med" --return-fields all > med_products.json

# Search for chlorophyll datasets
cat med_products.json | jq '.products[] | select(.datasets[].variables[].standard_name | contains("chlorophyll")) | {product_id, datasets: [.datasets[] | {dataset_id, variables: [.variables[].short_name]}]}'
```

### Method 3: Support Follow-up
Email Copernicus support:
```
"Thank you for the product IDs. When I try to use them with copernicusmarine CLI:

copernicusmarine subset --dataset-id OCEANCOLOUR_MED_BGC_L4_NRT_009_142 ...

I get an error. Could you provide the exact dataset-id format for CLI?
Or should I be using a different command?"
```

---

## Success Metrics

### Phase 1 (Deploy RPC - IMMEDIATE)
- [ ] Frontend shows real temperatures (not fallback)
- [ ] Predictions API returns data
- [ ] User sees "Data from MET Norway" or similar

### Phase 2 (Copernicus Biogeochemical - ENHANCEMENT)
- [ ] Find correct dataset IDs for MED, BAL, IBI
- [ ] Test coastal rectangle data retrieval
- [ ] Ingest chlorophyll data
- [ ] Show chlorophyll in predictions UI

### Phase 3 (Full Hybrid System)
- [ ] Surface conditions from MET/Open-Meteo
- [ ] Biogeochemical from Copernicus
- [ ] Algorithm uses both data sources
- [ ] Predictions show composite confidence scores

---

## Timeline Estimate

**Today (Priority 1)**:
- Deploy DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql
- Verify frontend shows real data
- Test predictions API with sample rectangles

**This Week (Priority 2)**:
- Find correct Copernicus dataset IDs
- Test coastal data retrieval
- Document working product IDs

**Next Week (Priority 3)**:
- Implement Copernicus biogeochemical ingestion
- Enhance prediction algorithm with new variables
- Deploy hybrid data source system

---

## Decision Points

### Do we need Copernicus at all?
**Short term**: NO - MET/Open-Meteo working perfectly
**Long term**: YES - Biogeochemical data adds significant predictive value

### Should we wait for Copernicus before deploying RPC?
**NO** - Deploy RPC immediately with MET/Open-Meteo data. Add Copernicus biogeochemical later as enhancement.

### What's the ROI of Copernicus biogeochemical data?
**HIGH** for fishing predictions:
- Chlorophyll indicates baitfish presence
- Oxygen affects fish habitat preference  
- Nutrients drive feeding behavior
- All free, just needs correct product IDs

---

## Next Steps (Ordered by Priority)

1. **Deploy DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql** ← DO THIS FIRST
2. Test frontend shows real environmental data
3. Search Copernicus catalog for correct dataset IDs (web + CLI)
4. Test one MED product with coastal rectangle
5. Document working approach for other regions
6. Plan biogeochemical data integration phase
