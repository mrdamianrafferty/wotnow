# Water Clarity Integration - Implementation Guide

**Status:** 🟡 **90% Ready** - Infrastructure complete, needs kd490 fetching  
**Date:** 13 October 2025  
**Context:** All 79 species have water clarity weights. Copernicus credentials available.

---

## ✅ What's Already Done

### 1. **Species Parameters (100%)**
All 79 species have `water_clarity_weight` values:
- Sight feeders: 0.14-0.18 (Plaice, Mackerel, Pollack, Wrasse, Mullet, Bass)
- Mixed hunters: 0.08-0.13 (Gurnards, Seabreams)
- Scent feeders: 0.00 (Cod, Flounder, Rays, Sharks)

### 2. **Copernicus Infrastructure (100%)**
- ✅ `lib/copernicus/types.ts` - Updated with kd490 field
- ✅ `lib/copernicus/transformers.ts` - Updated to extract kd490
- ✅ Chlorophyll already being fetched
- ✅ Copernicus credentials available

### 3. **Clarity Calculation Library (100%)**
- ✅ `lib/utils/waterClarity.ts` - Complete implementation
  - `calculateWaterClarity()` - Auto-selects best method
  - `clarityFromKd490()` - Primary method
  - `clarityFromChlorophyll()` - Fallback method
  - `combinedClarity()` - Both metrics (best accuracy)
  - `interpretClarity()` - User-facing display

### 4. **useBiteScore Hook (Ready)**
- ✅ `water_clarity_m` field exists
- ✅ `clarityScore()` function ready
- ✅ Weight rebalancing when clarity available

---

## 🔧 What Needs to Be Done

### Step 1: Add kd490 to Copernicus Fetch Request

**Where your Copernicus client makes the API call**, add `kd490` to the variables list.

Currently fetching (example):
```typescript
const variables = ['thetao', 'so', 'o2', 'chl', 'no3', 'po4'];
```

Update to:
```typescript
const variables = ['thetao', 'so', 'o2', 'chl', 'kd490', 'no3', 'po4'];
//                                              ^^^^^^ ADD THIS
```

**Copernicus Dataset ID for kd490:**
```
cmems_obs-oc_glo_bgc-optics_my_l4-gapfree-multi-4km_P1D
```

**Or use the combined biogeochemical dataset that includes kd490:**
```
cmems_obs-oc_glo_bgc-reflectance_my_l4-gapfree-multi-4km_P1D
```

### Step 2: Update Conditions API to Include Clarity

**File:** `pages/api/findr/conditions.ts`

Add water clarity calculation:

```typescript
import { calculateWaterClarity } from '../../../lib/utils/waterClarity';

// ... existing code ...

// After you extract chlorophyll (line ~175):
const maybeChl = normaliseNumber(row.chlorophyll_mg_m3);
if (maybeChl !== undefined) marine.chlorophyllMgM3 = maybeChl;

// ADD THIS:
const maybeKd490 = normaliseNumber(row.kd490);  // If stored in DB
const clarity = calculateWaterClarity(maybeKd490, maybeChl);
if (clarity) {
  marine.waterClarityIndex = clarity.clarity_index;
  marine.waterClarityMethod = clarity.method;
  marine.waterClarityConfidence = clarity.confidence;
}
```

### Step 3: Update Database Schema (If Persisting)

**Option A:** Store in `conditions` or `marine_conditions` table:

```sql
ALTER TABLE conditions 
ADD COLUMN kd490 NUMERIC(6,4),
ADD COLUMN water_clarity_index NUMERIC(4,3),
ADD COLUMN water_clarity_method TEXT;

-- Index for queries
CREATE INDEX idx_conditions_clarity ON conditions(water_clarity_index) WHERE water_clarity_index IS NOT NULL;
```

**Option B:** Calculate on-the-fly (no storage):
- Fetch chlorophyll + kd490 from Copernicus
- Calculate clarity in real-time
- Pass to bite score hook

### Step 4: Update `useBiteScore` Hook

**File:** `hooks/useBiteScore.ts` (line ~95-105)

```typescript
const fetchConditions = async () => {
  setLoading(true);
  try {
    // Fetch conditions from API
    const res = await fetch(
      `/api/findr/conditions?lat=${location.lat}&lon=${location.lon}&date=${new Date().toISOString()}`
    );
    const data = await res.json();
    
    const cond: Conditions = {
      tide_stage: tideInfo?.currentPhase ? mapTidePhaseToStage(tideInfo.currentPhase) : null,
      current_speed_ms: tideInfo?.currentStrength ? mapStrengthToSpeed(tideInfo.currentStrength) : null,
      solar_elevation_deg: getSolarElevation(location.lat, location.lon),
      water_clarity_m: data.marine?.waterClarityIndex ?? null,  // ← ADD THIS
      // ... other fields
    };
    
    setConditions(cond);
  } catch (error) {
    console.error('Failed to fetch conditions:', error);
  } finally {
    setLoading(false);
  }
};
```

### Step 5: Update UI to Display Clarity

**Add to Marine Conditions Card:**

```tsx
import { interpretClarity } from '../../../lib/utils/waterClarity';

// In your marine conditions component:
{waterClarityIndex != null && (
  <div className="clarity-indicator">
    <span className="label">Water Clarity:</span>
    <span className="value">
      {interpretClarity(waterClarityIndex).label}
    </span>
    <span className="fishing-impact text-xs text-muted-foreground">
      {interpretClarity(waterClarityIndex).fishingImpact}
    </span>
  </div>
)}
```

---

## 🧪 Testing Checklist

### Test Case 1: Clear Offshore Water
**Location:** Open Atlantic (50.5°N, -4.5°W)  
**Expected kd490:** < 0.1  
**Expected clarity:** > 0.8 (Crystal Clear)  
**Expected impact:** Plaice bite score +15%

### Test Case 2: Coastal Spring Bloom
**Location:** English Channel (50.7°N, -1.3°W)  
**Expected chlorophyll:** 3-5 mg/m³  
**Expected kd490:** 0.3-0.4  
**Expected clarity:** 0.2-0.4 (Murky)  
**Expected impact:** Mackerel bite score -10%, Cod unaffected

### Test Case 3: Mediterranean Clear Water
**Location:** Spanish Costa Brava (41.9°N, 3.2°E)  
**Expected kd490:** < 0.08  
**Expected clarity:** > 0.85 (Crystal Clear)  
**Expected impact:** Seabream bite score +12%

### Test Case 4: Estuary/River Outflow
**Location:** Thames Estuary (51.5°N, 0.9°E)  
**Expected kd490:** > 0.5  
**Expected clarity:** < 0.2 (Very Murky)  
**Expected impact:** Flounder unaffected, Bass -18%

---

## 📊 Expected Impact (Real Examples)

### Plaice (0.18 clarity weight)
| Water Clarity | kd490 | Clarity Index | Bite Score Change |
|---------------|-------|---------------|-------------------|
| Crystal Clear | 0.05  | 0.95          | **+18%** ⬆️ |
| Clear         | 0.15  | 0.75          | +10% ⬆️ |
| Moderate      | 0.25  | 0.50          | No change |
| Murky         | 0.35  | 0.20          | -12% ⬇️ |
| Very Murky    | 0.50  | 0.00          | **-18%** ⬇️ |

### Bass (0.10 clarity weight)
| Water Clarity | Clarity Index | Bite Score Change |
|---------------|---------------|-------------------|
| Crystal Clear | 0.95          | +10% ⬆️ |
| Clear         | 0.75          | +5% ⬆️ |
| Moderate      | 0.50          | No change |
| Murky         | 0.20          | -5% ⬇️ |

### Cod (0.00 clarity weight)
| Water Clarity | Clarity Index | Bite Score Change |
|---------------|---------------|-------------------|
| Any condition | Any value     | **No change** (scent hunter) |

---

## 🎯 Deployment Plan

### Phase 1: Fetch kd490 (1 hour)
1. Update Copernicus client to include `kd490` in variables
2. Verify data is being received in API responses
3. Test in development environment

### Phase 2: Calculate Clarity (30 minutes)
1. Import `calculateWaterClarity` in conditions API
2. Add clarity calculation after chlorophyll extraction
3. Verify clarity_index is in 0-1 range

### Phase 3: Integrate with Bite Score (1 hour)
1. Update `useBiteScore` to fetch clarity from API
2. Test with sight feeders (Plaice, Mackerel)
3. Test with scent feeders (Cod, Flounder)
4. Verify weights are properly applied

### Phase 4: UI Display (1 hour)
1. Add clarity indicator to marine conditions card
2. Show interpretation and fishing impact
3. Test across different locations and conditions

### Phase 5: Validation (2 hours)
1. Compare with manual observations
2. Cross-reference with catch reports
3. Validate against known clear/murky locations
4. Monitor for anomalies

**Total Time:** ~5-6 hours to full production

---

## 🔍 Troubleshooting

### Issue: kd490 always returns null
**Solution:** Check Copernicus dataset ID. kd490 is in optical/reflectance datasets, not physics.

### Issue: Clarity seems inverted (high kd490 = clear)
**Solution:** Verify formula: `clarity = 1 - kd490/0.4` (higher kd490 = more turbid = lower clarity)

### Issue: Sight feeders not getting boost
**Solution:** Check `water_clarity_weight` in species table. Should be > 0 for sight feeders.

### Issue: Chlorophyll fallback not working
**Solution:** Verify chlorophyll is being passed to `calculateWaterClarity()`. Check null handling.

---

## 📝 Quick Implementation (5 Lines)

**Minimal integration - just get it working:**

```typescript
// 1. In Copernicus fetch: add 'kd490' to variables array

// 2. In conditions API:
import { calculateWaterClarity } from '../../../lib/utils/waterClarity';
const clarity = calculateWaterClarity(row.kd490, row.chlorophyll_mg_m3);

// 3. In useBiteScore:
water_clarity_m: data.marine?.waterClarityIndex ?? null,

// 4. Deploy and test with Plaice in clear water

// DONE! 🎉
```

---

## 🎉 Success Criteria

✅ kd490 data successfully fetched from Copernicus  
✅ Clarity index calculated (0-1 range)  
✅ `useBiteScore` receives clarity data  
✅ Plaice in clear water shows +10-18% boost  
✅ Cod in murky water shows no change  
✅ UI displays clarity with fishing impact  

**You're ready to implement!** Start with Step 1 (add kd490 to Copernicus fetch). 🚀
