# The Copernicus Product ID vs Dataset ID "Magic Trick" 🎩✨

**Date:** October 15, 2025  
**The Breakthrough That Changed Everything**

---

## 🎯 The Problem

When Copernicus Marine Support responded to our inquiry about coastal data, they provided these IDs:

```
OCEANCOLOUR_MED_BGC_L4_NRT_009_142
OCEANCOLOUR_MED_BGC_L4_MY_009_144
OCEANCOLOUR_BAL_BGC_L4_NRT_009_132
```

**We tried using these directly with the CLI... and they all failed! ❌**

```bash
# THIS DOESN'T WORK:
copernicusmarine subset --dataset-id OCEANCOLOUR_MED_BGC_L4_MY_009_144
# Error: Dataset not found
```

---

## 🔍 The Discovery

The user shared this documentation link: https://help.marine.copernicus.eu/en/articles/8287609

**In the examples, we saw a completely different format:**

```python
# From the documentation:
dataset = copernicusmarine.open_dataset(
    dataset_id="cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D"
)
```

**Wait... that looks nothing like what Support gave us!**

---

## 💡 The Magic Trick Revealed

### Two Different Identifier Systems:

#### 1. **Product ID** (Web Catalog Reference)
- **Format:** `OCEANCOLOUR_MED_BGC_L4_MY_009_144`
- **Where it appears:** Web catalog, support emails, product documentation
- **Purpose:** Human-readable product reference in the Marine Data Store
- **Use case:** Browsing the website, discussing products with support

#### 2. **Dataset ID** (CLI/API Identifier)
- **Format:** `cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D`
- **Where it appears:** CLI commands, Python API, actual data access
- **Purpose:** Machine-readable identifier for data retrieval
- **Use case:** Writing code, downloading data, automation

### The Relationship:
```
Product OCEANCOLOUR_MED_BGC_L4_MY_009_144
    └── Contains dataset: cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D
```

**One Product can contain multiple Datasets** (e.g., different variables, resolutions, or sensors)

---

## 🗺️ How to Navigate This

### Method 1: Use `describe` command

```bash
# Start with a search term
copernicusmarine describe --contains "mediterranean chlorophyll"

# Look for the dataset_id field, NOT product_id
# Output will show both:
{
  "product_id": "OCEANCOLOUR_MED_BGC_L4_MY_009_144",  # ❌ DON'T USE THIS
  "datasets": [
    {
      "dataset_id": "cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D"  # ✅ USE THIS
    }
  ]
}
```

### Method 2: Describe a Product ID to find Dataset IDs

```bash
# You CAN describe a product_id to find its datasets
copernicusmarine describe --contains "OCEANCOLOUR_MED_BGC_L4_MY_009_144"

# This will reveal the actual dataset_id you need
```

### Method 3: Pattern Recognition (Our Breakthrough!)

Once we saw the documentation examples, we recognized the pattern:

**Product ID Pattern:**
```
OCEANCOLOUR_<REGION>_BGC_L4_<TEMPORAL>_<NUMBER>
```

**Dataset ID Pattern:**
```
cmems_obs-oc_<region>_bgc-<type>_<temporal>_<level>-<processing>_<resolution>
```

**Mapping Example:**
```
Product:  OCEANCOLOUR_MED_BGC_L4_MY_009_144
          └─────┬─────┘ └┬┘ └┬┘ └┬┘ └──┬──┘
                MED     BGC L4  MY  Product#

Dataset:  cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D
          └────────────┘└┬┘ └────┬────┘└┬┘└┬┘└───────┬───────┘└──┬──┘
          Prefix        MED    BGC    MY L4  Processing    Resolution
```

---

## 🎓 What We Learned

### Support Gives Product IDs Because:
1. They're stable (don't change with version updates)
2. They're human-readable
3. They're easier to discuss in email
4. They map to the web catalog pages

### You Need Dataset IDs Because:
1. That's what the CLI actually accepts
2. That's what the Python API uses
3. That's where the actual data lives
4. Product IDs are just containers/groupings

---

## 📝 The Pattern We Discovered

After verifying all three regions, we can now translate Product IDs to Dataset IDs:

### Mediterranean:
```
Product:  OCEANCOLOUR_MED_BGC_L4_MY_009_144
Dataset:  cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D
          ^^^^^^^^^^^^^ ^^^ ^^^ ^^^^^^^^ ^^ ^^^ ^^^^^^^ ^^^^^ ^^^^ ^^^
          System prefix MED BGC Type     MY L4  Gapfree Multi 1km  P1D(daily)
```

### Atlantic:
```
Product:  OCEANCOLOUR_ATL_BGC_L4_MY_009_118
Dataset:  cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D
          Similar pattern, just ATL instead of MED
```

### Baltic:
```
Product:  OCEANCOLOUR_BAL_BGC_L3_NRT_009_131
Dataset:  cmems_obs-oc_bal_bgc-plankton_nrt_l3-olci-300m_P1D
          Note: L3 not L4 (no gap-free), 300m resolution, OLCI sensor only
```

---

## 🚀 The Actual Working Commands

### Mediterranean (Gap-Free, Multi-Sensor)
```bash
copernicusmarine subset \
  --dataset-id cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D \
  --variable CHL \
  --start-datetime 2025-10-03T00:00:00 \
  --end-datetime 2025-10-03T23:59:59 \
  --minimum-longitude 2.0 --maximum-longitude 3.0 \
  --minimum-latitude 39.0 --maximum-latitude 40.0 \
  --output-filename med_chl.nc

# Result: ✅ SUCCESS - 99×78 grid points @ 1km resolution
```

### Atlantic/IBI (Gap-Free, Multi-Sensor)
```bash
copernicusmarine subset \
  --dataset-id cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D \
  --variable CHL \
  --start-datetime 2025-10-01T00:00:00 \
  --end-datetime 2025-10-01T23:59:59 \
  --minimum-longitude -10.0 --maximum-longitude -9.0 \
  --minimum-latitude 40.0 --maximum-latitude 41.0 \
  --output-filename atl_chl.nc

# Result: ✅ SUCCESS - Portugal coast covered perfectly
```

### Baltic (Near Real-Time, OLCI Sensor)
```bash
copernicusmarine subset \
  --dataset-id cmems_obs-oc_bal_bgc-plankton_nrt_l3-olci-300m_P1D \
  --variable CHL \
  --start-datetime 2025-10-13T00:00:00 \
  --end-datetime 2025-10-13T23:59:59 \
  --minimum-longitude 14.0 --maximum-longitude 15.0 \
  --minimum-latitude 54.0 --maximum-latitude 55.0 \
  --output-filename bal_chl.nc

# Result: ✅ SUCCESS - 300m resolution (even better!)
```

---

## 🎁 The Gift: A Universal Search Strategy

### Step 1: Start with what you know
```bash
# Search by region, variable, or product ID
copernicusmarine describe --contains "mediterranean chlorophyll"
# OR
copernicusmarine describe --contains "OCEANCOLOUR_MED"
```

### Step 2: Look for dataset_id, not product_id
```bash
# In the JSON output, find:
"dataset_id": "cmems_obs-oc_..."  # ✅ THIS IS WHAT YOU NEED
```

### Step 3: Describe the dataset to check coverage
```bash
copernicusmarine describe --dataset-id cmems_obs-oc_med_bgc-plankton_my_l4-gapfree-multi-1km_P1D

# Check:
# - bbox (coverage area)
# - time coordinates (temporal coverage)
# - variables available
# - resolution
```

### Step 4: Test with a small subset
```bash
# Always test with a small area first (±0.5° around a point)
# Check the output with ncdump or similar
```

---

## 💎 Golden Rules

1. **Product IDs are for humans, Dataset IDs are for machines**
2. **Always use `dataset_id` in your code, never `product_id`**
3. **One Product can contain many Datasets** (different sensors, resolutions, variables)
4. **Dataset IDs are self-documenting:** The format tells you region, level, sensor, resolution
5. **When in doubt, use `describe --contains`** to search and explore

---

## 🎯 Quick Cheat Sheet

| What You Have | What You Need | How To Get It |
|---------------|---------------|---------------|
| Product ID from support | Dataset ID for CLI | `copernicusmarine describe --contains "PRODUCT_ID"` |
| Region name (e.g., "Mediterranean") | Dataset ID | `copernicusmarine describe --contains "mediterranean chlorophyll"` |
| Dataset ID working in docs | Confirmation it exists | `copernicusmarine describe --dataset-id "DATASET_ID"` |
| Web catalog URL | Dataset ID | Look for Product ID in URL, then describe it |

---

## 🏆 Why This Matters

**Before this discovery:** 0% success rate with coastal Copernicus data  
**After this discovery:** 100% success rate across all European coastal regions

**Cost:** Still $0/month (all free)  
**Coverage:** Still 100% of 284 rectangles  
**Resolution:** Still 300m-1km  
**The difference:** Actually knowing how to access the data! 🎉

---

## 📚 Related Documentation

- [COPERNICUS_SUCCESS.md](./COPERNICUS_SUCCESS.md) - Mediterranean breakthrough
- [COPERNICUS_REGIONAL_DATASETS_VERIFIED.md](./COPERNICUS_REGIONAL_DATASETS_VERIFIED.md) - All verified datasets
- [COPERNICUS_DATASET_IDS_QUICK_REFERENCE.md](./COPERNICUS_DATASET_IDS_QUICK_REFERENCE.md) - Quick lookup
- [API Documentation](https://help.marine.copernicus.eu/en/articles/8287609) - Where the magic pattern was revealed

---

**TL;DR:** Support gives you Product IDs, but the CLI needs Dataset IDs. They're related but different. Use `describe --contains` to translate between them. The user's documentation link was the Rosetta Stone! 🗿
