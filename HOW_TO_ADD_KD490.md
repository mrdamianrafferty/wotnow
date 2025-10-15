# How to Add kd490 (Water Clarity) to Your Copernicus Data

## Current Status 🔍

You're using **mock Copernicus data** from `/lib/copernicus/__fixtures__/asturias-mock.json`

**Current biogeochemical variables:**
```json
"variables": ["chl", "o2", "no3", "po4"]
```

**Need to add:** `kd490` for water clarity

---

## Step 1: Update Mock Data (5 minutes - Test First!)

### File: `lib/copernicus/__fixtures__/asturias-mock.json`

**Line 31 - Add kd490 to variables list:**
```json
"biogeochemical": {
  "datasetId": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
  "variables": ["chl", "o2", "no3", "po4", "kd490"],  // ← ADD kd490
  "source": "mock",
  "records": [
```

**Lines 37-61 - Add kd490 values to each record:**

```json
{
  "time": "2025-09-27T06:00:00Z",
  "depth": 0,
  "lat": 43.55,
  "lon": -6.25,
  "variables": { 
    "chl": 1.6, 
    "o2": 210.0, 
    "no3": 4.2, 
    "po4": 0.4,
    "kd490": 0.15  // ← ADD THIS (0.15 = clear coastal water)
  }
},
{
  "time": "2025-09-27T06:00:00Z",
  "depth": 20,
  "lat": 43.55,
  "lon": -6.25,
  "variables": { 
    "chl": 0.9, 
    "o2": 215.0, 
    "no3": 5.0, 
    "po4": 0.5,
    "kd490": 0.12  // ← ADD THIS (deeper = clearer)
  }
},
{
  "time": "2025-09-27T12:00:00Z",
  "depth": 0,
  "lat": 43.55,
  "lon": -6.25,
  "variables": { 
    "chl": 1.8, 
    "o2": 208.0, 
    "no3": 4.1, 
    "po4": 0.38,
    "kd490": 0.18  // ← ADD THIS (afternoon bloom = more turbid)
  }
}
```

**kd490 Value Guide:**
- `0.05-0.10` = Crystal clear (open ocean)
- `0.10-0.20` = Clear (offshore, coastal)
- `0.20-0.30` = Moderate (coastal, some plankton)
- `0.30-0.50` = Murky (estuary, bloom)
- `> 0.50` = Very murky (river outflow, dense bloom)

---

## Step 2: Verify Types Are Ready ✅

**Already done!** I've updated:
- ✅ `lib/copernicus/types.ts` - Has kd490 field
- ✅ `lib/copernicus/transformers.ts` - Extracts kd490
- ✅ `lib/utils/waterClarity.ts` - Calculates clarity

---

## Step 3: Use kd490 in Your Code (Where You Consume Copernicus Data)

### Find Where You Process Copernicus Snapshots

**Look for code like this:**

```typescript
// Somewhere in your conditions API or service
const snapshot = copernicusData.snapshots[0];
const chlorophyll = snapshot.chlorophyllSurface;
```

### Add kd490 and Calculate Clarity

```typescript
import { calculateWaterClarity } from '@/lib/utils/waterClarity';

// Get both metrics
const kd490 = snapshot.kd490Surface;  // ← NEW!
const chlorophyll = snapshot.chlorophyllSurface;

// Calculate clarity
const clarityData = calculateWaterClarity(kd490, chlorophyll);

if (clarityData) {
  conditions.water_clarity_m = clarityData.clarity_index;  // 0-1 scale
  
  // Optional: store method and confidence
  conditions.water_clarity_method = clarityData.method;
  conditions.water_clarity_confidence = clarityData.confidence;
}
```

---

## Step 4: Test With Mock Data (15 minutes)

### Test Case 1: Verify kd490 Is Being Extracted

```typescript
// In your test or console
import { MockCopernicusProvider } from '@/lib/copernicus/mockClient';
import { toCopernicusMarineData } from '@/lib/copernicus/transformers';

const provider = new MockCopernicusProvider();
const bundle = await provider.fetchBundle({
  lat: 43.55,
  lon: -6.25,
  start: '2025-09-27T00:00:00Z',
  end: '2025-09-27T23:59:59Z',
});

const data = toCopernicusMarineData(bundle);
console.log('kd490 Surface:', data.snapshots[0].kd490Surface);
// Expected: 0.15 (from mock data)
```

### Test Case 2: Verify Clarity Calculation

```typescript
import { calculateWaterClarity, interpretClarity } from '@/lib/utils/waterClarity';

const clarity = calculateWaterClarity(0.15, 1.6);
console.log('Clarity Index:', clarity?.clarity_index);  // Expected: ~0.625 (clear)
console.log('Method:', clarity?.method);  // Expected: 'combined'
console.log('Interpretation:', interpretClarity(clarity!.clarity_index));
// Expected: { label: 'Clear', description: 'Good visibility', ... }
```

### Test Case 3: Verify Bite Score Integration

```typescript
import { getBiteScore } from '@/hooks/useBiteScore';

const conditions = {
  water_clarity_m: 0.625,  // From clarity calculation
  // ... other conditions
};

const speciesParams = {
  waterClarityWeight: 0.18,  // Plaice (sight feeder)
  // ... other params
};

const result = getBiteScore(speciesParams, conditions);
console.log('Clarity Sub-Score:', result.breakdown.clarity);
// Expected: ~0.625 (proportional to clarity)
console.log('Overall Score:', result.score);
// Should be higher than without clarity data
```

---

## Step 5: Fetch Real kd490 from Copernicus (When Ready)

### Option A: Python Script (Recommended if using copernicusmarine)

**Install Copernicus Marine Client:**
```bash
pip install copernicusmarine
```

**Fetch kd490:**
```python
import copernicusmarine

# Optical/Biogeochemical dataset with kd490
dataset_id = "cmems_obs-oc_glo_bgc-optics_my_l4-gapfree-multi-4km_P1D"

data = copernicusmarine.subset(
    dataset_id=dataset_id,
    variables=["kd490", "chl"],  # ← Both metrics
    minimum_longitude=-6.5,
    maximum_longitude=-6.0,
    minimum_latitude=43.5,
    maximum_latitude=44.0,
    start_datetime="2025-10-13T00:00:00",
    end_datetime="2025-10-13T23:59:59",
    minimum_depth=0,
    maximum_depth=1,  # Surface only
)

print(data)
```

### Option B: Direct API (HTTP)

**Copernicus Marine Data Store API:**
```typescript
const COPERNICUS_API = 'https://data.marine.copernicus.eu/api';
const username = process.env.COPERNICUS_USERNAME;
const password = process.env.COPERNICUS_PASSWORD;

async function fetchKd490(lat: number, lon: number, date: string) {
  const datasetId = 'cmems_obs-oc_glo_bgc-optics_my_l4-gapfree-multi-4km_P1D';
  
  const response = await fetch(
    `${COPERNICUS_API}/dataset/${datasetId}/point?` +
    `lat=${lat}&lon=${lon}&time=${date}&variables=kd490,chl&depth=0`,
    {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      }
    }
  );
  
  return await response.json();
}
```

### Copernicus Datasets with kd490:

| Dataset ID | Description | Coverage | Update Frequency |
|------------|-------------|----------|------------------|
| `cmems_obs-oc_glo_bgc-optics_my_l4-gapfree-multi-4km_P1D` | **Optical properties (PRIMARY)** | Global | Daily |
| `cmems_obs-oc_glo_bgc-reflectance_my_l4-gapfree-multi-4km_P1D` | Reflectance + optics | Global | Daily |
| `cmems_mod_glo_bgc_my_0.083deg_P1D-m` | Biogeochemical model | Global | Daily |
| `cmems_obs-oc_med_bgc-optics_nrt_l3-multi-1km_P1D` | Mediterranean | Med Sea | Daily |

---

## Quick Reference: Where to Make Changes

### 1. Mock Data (Test First)
- **File:** `lib/copernicus/__fixtures__/asturias-mock.json`
- **Change:** Add `"kd490"` to variables array, add kd490 values to each record

### 2. Types (Already Done ✅)
- **Files:** `lib/copernicus/types.ts`, `lib/copernicus/transformers.ts`
- **Status:** Already updated with kd490 field

### 3. Clarity Calculation (Already Done ✅)
- **File:** `lib/utils/waterClarity.ts`
- **Status:** Complete implementation ready

### 4. Integration Point (Find This)
- **Likely files:** 
  - `pages/api/findr/conditions.ts`
  - `hooks/useBiteScore.ts`
  - Wherever you process `CopernicusMarineSnapshot`
- **Change:** Add `calculateWaterClarity(snapshot.kd490Surface, snapshot.chlorophyllSurface)`

### 5. Real Data (Future)
- **When:** After mock testing successful
- **Method:** Python script or HTTP API
- **Credentials:** Use existing Copernicus account

---

## Testing Checklist

- [ ] Updated mock data with kd490 values
- [ ] Verified kd490Surface is extracted from snapshots
- [ ] Clarity calculation returns 0-1 value
- [ ] Plaice (sight feeder) shows higher score in clear water
- [ ] Cod (scent feeder) shows no change with clarity variation
- [ ] UI displays clarity indicator (optional)
- [ ] Ready to fetch real kd490 from Copernicus

---

## Example: Complete Mock Data Update

```json
{
  "biogeochemical": {
    "datasetId": "GLOBAL_ANALYSISFORECAST_BGC_001_028",
    "variables": ["chl", "o2", "no3", "po4", "kd490"],
    "source": "mock",
    "records": [
      {
        "time": "2025-09-27T06:00:00Z",
        "depth": 0,
        "lat": 43.55,
        "lon": -6.25,
        "variables": { "chl": 1.6, "o2": 210.0, "no3": 4.2, "po4": 0.4, "kd490": 0.15 }
      },
      {
        "time": "2025-09-27T06:00:00Z",
        "depth": 20,
        "lat": 43.55,
        "lon": -6.25,
        "variables": { "chl": 0.9, "o2": 215.0, "no3": 5.0, "po4": 0.5, "kd490": 0.12 }
      },
      {
        "time": "2025-09-27T12:00:00Z",
        "depth": 0,
        "lat": 43.55,
        "lon": -6.25,
        "variables": { "chl": 1.8, "o2": 208.0, "no3": 4.1, "po4": 0.38, "kd490": 0.18 }
      }
    ]
  }
}
```

**Start here** → Update mock data → Test with Plaice → Verify it works → Then fetch real data! 🚀
