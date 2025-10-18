# Targeted Re-ingestion Script for Copernicus Data

## Overview

This script provides a robust solution for re-ingesting biogeochemical data for specific ICES rectangles with comprehensive retry logic and fallback strategies.

## Created: October 18, 2025

Created to address missing data for rectangle 28E5 and provide a reusable tool for future data ingestion issues.

## Features

- **Retry Logic**: Up to 3 attempts per variable with exponential backoff
- **Date Fallback**: Automatically falls back up to 7 days if current data unavailable
- **Multi-Product Fallback**: Tries regional datasets first, then global datasets
- **Detailed Logging**: Track progress and identify issues
- **Flexible**: Works for any rectangle, not just 28E5

## Usage

### Re-ingest 28E5 (default)
```bash
npx tsx scripts/reingest-28e5.ts
```

### Re-ingest a different rectangle
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=29E5
```

### Specify a custom date
```bash
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-16
```

### Re-ingest with specific date
```bash
npx tsx scripts/reingest-28e5.ts --date=2025-10-17
```

## How It Works

### 1. Rectangle Lookup
Fetches rectangle metadata from `ices_rectangles` table including:
- Coordinates (lat/lon)
- CMEMS region mapping
- Coastal status

### 2. Regional Product Selection
Uses `lib/copernicus/regionRouterV2.ts` to get prioritized dataset list:
- **IBI** (Iberian-Biscay-Irish): Atlantic Spain/Portugal/Ireland
- **NWS** (North-West Shelf): North Sea, English Channel
- **MED** (Mediterranean): Mediterranean Sea
- **BAL** (Baltic): Baltic Sea

### 3. Variable Fetching with Retry
For each variable (chlorophyll, clarity, nutrients, etc.):
- Try primary regional dataset (3 attempts with backoff)
- If failed, try fallback regional dataset
- If failed, try global dataset
- Log all attempts and results

### 4. Date Fallback Strategy
If no data available for target date:
- Try yesterday (D-1)
- Try 2 days ago (D-2)
- Continue up to 7 days back
- Stop on first successful day

### 5. Data Storage
Insert successful data into `findr_conditions_snapshots` table with:
- All retrieved variables (even if some are null)
- Captured timestamp
- Source tag: `copernicus_targeted_reingest`

## Variables Retrieved

| Variable | Units | Description |
|----------|-------|-------------|
| `chlorophyll_mg_m3` | mg/m³ | Chlorophyll-a concentration (baitfish indicator) |
| `water_clarity_kd490` | m⁻¹ | Light attenuation (lure visibility) |
| `water_temp_c` | °C | Sea surface temperature |
| `salinity_psu` | PSU | Salinity (species distribution) |
| `nitrate_umol_l` | µmol/L | Nitrate concentration (productivity) |
| `phosphate_umol_l` | µmol/L | Phosphate concentration (productivity) |
| `dissolved_oxygen_mg_l` | mg/L | Dissolved oxygen (habitat quality) |

## Configuration

Edit script constants to adjust behavior:

```typescript
const MAX_RETRIES = 3;           // Attempts per variable
const MAX_DAYS_BACK = 7;         // How far to look back
const RETRY_DELAY_MS = 2000;     // Initial delay between retries
```

## Example Output

```
╔══════════════════════════════════════════════════════════════════╗
║         Targeted Rectangle Re-ingestion with Retry Logic        ║
╚══════════════════════════════════════════════════════════════════╝

📍 Fetching rectangle 28E5...
✅ Found: 56.50°N, 3.00°E (NWS)

📅 Using yesterday: 2025-10-17

📅 Fetching data for 2025-10-17...
   Rectangle: 28E5 (56.50°N, 3.00°E)
   Region: NWS

  📊 Chlorophyll...
  Trying cmems_obs-oc_atl_bgc-plankton_my_l4-gapfree-multi-1km_P1D (satellite)...
    Attempt 1/3 for CHL...
    ✅ Success: CHL = 2.453
    ✓ 2.453 mg/m³
  📊 Water clarity...
  Trying cmems_obs-oc_atl_bgc-transp_my_l3-multi-1km_P1D (satellite)...
    Attempt 1/3 for KD490...
    ✅ Success: KD490 = 0.0872
    ✓ 0.0872 m⁻¹
  
  ...
  
  ✅ Retrieved 7/7 variables

💾 Storing data...
  ✅ Data stored in database

╔══════════════════════════════════════════════════════════════════╗
║                    INGESTION SUCCESSFUL                          ║
╚══════════════════════════════════════════════════════════════════╝

✅ Successfully ingested 28E5
   Date: 2025-10-17
   Days back: 0
```

## Error Handling

### No Data Available
If no data found after trying all days:
```
╔══════════════════════════════════════════════════════════════════╗
║                      INGESTION FAILED                            ║
╚══════════════════════════════════════════════════════════════════╝

❌ Failed to ingest 28E5 after 7 days of attempts
```

### Rectangle Not Found
```
❌ Fatal error: Rectangle 99Z9 not found
```

### Copernicus Authentication Issues
Ensure environment variables are set:
```bash
COPERNICUS_USERNAME=your-username
COPERNICUS_PASSWORD=your-password
```

## Troubleshooting

### Script exits immediately
- Check Supabase credentials in `.env.local`
- Verify rectangle code exists in database

### All attempts fail for a variable
- Check Copernicus CLI is installed: `copernicusmarine --version`
- Verify authentication: `copernicusmarine login`
- Check dataset IDs in `lib/copernicus/regionRouterV2.ts`

### Data stored but not visible in app
- Ensure data is in `findr_conditions_snapshots`
- Check if `findr_conditions_latest` view needs refresh
- Verify captured_at timestamp is recent

## Related Files

- `scripts/targeted-reingest.ts` - Main implementation
- `scripts/reingest-28e5.ts` - Convenience wrapper for 28E5
- `lib/copernicus/regionRouterV2.ts` - Dataset routing logic
- `scripts/ingestCopernicusBiogeochemical.ts` - Bulk ingestion script

## Future Enhancements

- [ ] Parallel variable fetching (currently sequential for easier debugging)
- [ ] Configurable retry strategy (exponential vs fixed delay)
- [ ] Email notifications on failure
- [ ] Batch mode for multiple rectangles
- [ ] Dry-run mode to test without storing

## Background: Why This Script Was Needed

On October 18, 2025, rectangle 28E5 (North Sea, near Scotland) was missing from the daily ingestion. This caused the app to show "fish are quiet" for users in that area. Investigation revealed:

1. Rectangle was excluded from bulk ingestion (reason unclear)
2. No validation to catch missing rectangles
3. No way to quickly re-ingest a single rectangle

This script solves all three problems:
- Allows targeted re-ingestion
- Can be used for validation/verification
- Includes robust retry logic for unreliable data sources

## License

MIT - Part of WotNow fishing prediction platform
