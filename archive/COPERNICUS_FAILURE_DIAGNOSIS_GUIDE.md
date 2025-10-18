# Copernicus Ingestion Failure Diagnosis & Fallback Strategy

## Created: October 18, 2025

This guide helps identify WHY Copernicus data ingestion fails and provides automatic fallback strategies.

## Quick Diagnosis

### Run the diagnostic tool first:
```bash
npx tsx scripts/diagnose-ingestion-failure.ts --rectangle=28E5
```

This will test:
1. ✅ Copernicus CLI authentication
2. ✅ Rectangle existence and metadata
3. ✅ Coordinate validity (not on land)
4. ✅ Dataset availability for region
5. ✅ Actual data fetch attempt

### Enable detailed logging:
```bash
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

## Common Failure Scenarios & Solutions

### 1. Authentication Failure

**Symptoms:**
- "Authentication failed" error
- "Login required" message
- 401/403 HTTP errors

**Solution:**
```bash
# Log in to Copernicus Marine
copernicusmarine login

# Enter credentials when prompted
Username: your-username
Password: your-password
```

**Prevention:**
- Store credentials in environment variables
- Check authentication before running large batches

---

### 2. Rectangle On/Near Land

**Symptoms:**
- "No data available" for all variables
- Very small output files (<500 bytes)
- All NetCDF values are fill values (`_`)

**Why it happens:**
- Copernicus datasets are ocean-only
- Rectangles too close to coast may fall in masked regions
- Land boundaries don't align perfectly with ICES rectangles

**Solutions:**

**Automatic (built-in):**
```typescript
// In targeted-reingest.ts - now enabled
const FALLBACK_TO_WIDER_MARGIN = true;
// Increases bbox from 0.5° to 0.7° for coastal rectangles
```

**Manual:**
```bash
# Try adjacent rectangle
npx tsx scripts/targeted-reingest.ts --rectangle=28E4  # One west
npx tsx scripts/targeted-reingest.ts --rectangle=28F5  # One east
```

**Long-term:**
- Flag problematic rectangles in database
- Use interpolation from nearby rectangles
- Implement coastal buffer zone handling

---

### 3. Data Not Yet Available

**Symptoms:**
- "No data for this date/time" error
- Success for older dates, failure for recent dates
- Works with `--date=2025-10-15` but not `--date=2025-10-17`

**Why it happens:**
- Copernicus has 1-2 day processing lag
- Forecast data may not be published yet
- Different datasets have different update schedules

**Solutions:**

**Automatic (built-in):**
```typescript
// In targeted-reingest.ts
const MAX_DAYS_BACK = 7;
// Automatically tries up to 7 days back
```

**Manual:**
```bash
# Specify older date explicitly
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-15
```

**Prevention:**
- Default to D-2 (2 days ago) instead of D-1
- Check Copernicus data availability calendar
- Add buffer days to cron jobs

---

### 4. Dataset Not Available for Region

**Symptoms:**
- "Dataset not found" error
- Works for some regions (e.g., MED) but not others (e.g., BAL)
- Missing specific variables only

**Why it happens:**
- Not all datasets cover all regions
- Baltic Sea has different datasets than Mediterranean
- Some variables only available in certain regions

**Solutions:**

**Automatic (built-in):**
```typescript
// In regionRouterV2.ts
// Products listed in priority order: [regional, fallback, global]
// Script tries each until success
```

**Manual:**
```bash
# Check what datasets are configured
cat lib/copernicus/regionRouterV2.ts | grep -A 10 "BAL:"
```

**Long-term:**
- Add more fallback datasets to regionRouterV2.ts
- Implement global-only mode for problematic regions
- Document dataset coverage gaps

---

### 5. Network/Timeout Issues

**Symptoms:**
- "Connection timeout" error
- Works sometimes, fails other times
- Slow responses

**Solutions:**

**Increase timeouts:**
```typescript
// In fetchCopernicusVariable
execSync(cmd, { 
  stdio: 'pipe', 
  encoding: 'utf-8',
  timeout: 120000  // 2 minutes instead of default 30s
});
```

**Add exponential backoff:**
```typescript
// Already implemented
const RETRY_DELAY_MS = 2000;  // 2s, 4s, 8s delays
```

---

### 6. Corrupted/Invalid NetCDF Files

**Symptoms:**
- File created but parsing fails
- `ncdump` errors
- "Unable to read variable" errors

**Solutions:**

**Validation:**
```bash
# Check file manually
ncdump -h /tmp/cmems-reingest-*/data.nc
```

**Recovery:**
```typescript
// Already implemented - checks file size before parsing
if (fileSize < 500) {
  return null;  // Reject suspiciously small files
}
```

---

## Automatic Fallback Strategy (Built-in)

### Level 1: Retry with Backoff
```
Attempt 1 → fail
Wait 2s
Attempt 2 → fail
Wait 4s
Attempt 3 → fail (last attempt for this dataset)
```

### Level 2: Dataset Fallback
```
Regional satellite dataset → fail
  ↓
Regional model dataset → fail
  ↓
Global fallback dataset → success ✅
```

### Level 3: Date Fallback
```
Today (D-1) → no data
  ↓
Yesterday (D-2) → no data
  ↓
2 days ago (D-3) → success ✅
```

### Level 4: Margin Adjustment (Coastal)
```
Standard margin (0.5°) → no data
  ↓
Wider margin (0.7°) → success ✅
```

### Level 5: Graceful Degradation
```
Failed to fetch chlorophyll
Failed to fetch clarity
✅ Got temperature, salinity, nutrients
  ↓
Store partial data (3/7 variables)
```

## Monitoring & Alerts

### Check Last Ingestion Status
```bash
# View most recent ingestion attempts
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at, source')
    .eq('source', 'copernicus_targeted_reingest')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.table(data);
}

check();
"
```

### Validate Coverage
```sql
-- Check which rectangles are missing recent data
SELECT r.rectangle_code, r.center_lat, r.center_lon, r.cmems_region
FROM ices_rectangles r
LEFT JOIN findr_conditions_latest c ON r.rectangle_code = c.rectangle_code
WHERE r.is_coastal = true
  AND (c.captured_at IS NULL OR c.captured_at < NOW() - INTERVAL '3 days')
ORDER BY r.rectangle_code;
```

## Prevention Strategies

### 1. Pre-flight Checks
```bash
# Before batch ingestion, verify:
copernicusmarine --version  # CLI installed
copernicusmarine describe --include-datasets | head -10  # Auth works
```

### 2. Gradual Rollout
```bash
# Test one rectangle first
npx tsx scripts/targeted-reingest.ts --rectangle=28E5

# Then batch
for rect in 28E5 29E5 30E5; do
  npx tsx scripts/targeted-reingest.ts --rectangle=$rect
  sleep 5
done
```

### 3. Monitoring Dashboard
```sql
-- Create view for monitoring
CREATE VIEW copernicus_ingestion_health AS
SELECT 
  DATE(captured_at) as date,
  COUNT(*) as rectangles_updated,
  COUNT(CASE WHEN chlorophyll_mg_m3 IS NOT NULL THEN 1 END) as has_chlorophyll,
  COUNT(CASE WHEN water_temp_c IS NOT NULL THEN 1 END) as has_temperature,
  AVG(CASE WHEN chlorophyll_mg_m3 IS NOT NULL THEN 1 ELSE 0 END) as chlorophyll_success_rate
FROM findr_conditions_snapshots
WHERE source LIKE '%copernicus%'
  AND captured_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(captured_at)
ORDER BY date DESC;
```

## Future Enhancements

### Phase 1: Better Diagnostics (✅ Done)
- [x] Diagnostic script to identify failure reasons
- [x] Detailed error logging
- [x] Capture CLI output for debugging

### Phase 2: Smarter Fallbacks (🚧 In Progress)
- [x] Automatic wider margin for coastal areas
- [x] Multi-day fallback
- [ ] Interpolation from nearby rectangles
- [ ] Cache known-good configurations per rectangle

### Phase 3: Monitoring (📋 Planned)
- [ ] Email alerts on repeated failures
- [ ] Slack notifications for batch jobs
- [ ] Dashboard showing ingestion health
- [ ] Automated retry of failed rectangles

### Phase 4: Intelligence (💡 Future)
- [ ] Learn optimal margins per rectangle
- [ ] Predict best datasets per region
- [ ] Detect seasonal data availability patterns
- [ ] Auto-adjust to Copernicus downtime

## Testing Your Fixes

### Test Case 1: Known Good Rectangle
```bash
# Should succeed
npx tsx scripts/targeted-reingest.ts --rectangle=21D8 --date=2025-10-15
```

### Test Case 2: Coastal Rectangle
```bash
# May need wider margin fallback
DEBUG_INGESTION=true npx tsx scripts/targeted-reingest.ts --rectangle=28E5
```

### Test Case 3: Recent Date
```bash
# May need date fallback
npx tsx scripts/targeted-reingest.ts --rectangle=28E5 --date=2025-10-17
```

### Test Case 4: Invalid Rectangle
```bash
# Should fail gracefully with clear error
npx tsx scripts/targeted-reingest.ts --rectangle=99Z9
```

## Summary

**Diagnosis:** Run `diagnose-ingestion-failure.ts` first to identify the root cause

**Automatic Fallbacks:**
1. ✅ Retry with exponential backoff
2. ✅ Dataset fallback (regional → global)
3. ✅ Date fallback (up to 7 days back)
4. ✅ Wider margin for coastal areas
5. ✅ Graceful degradation (partial data)

**Manual Intervention:**
- Authentication issues → `copernicusmarine login`
- Land issues → Try adjacent rectangle or wider margin
- Dataset gaps → Add to regionRouterV2.ts

**Monitoring:**
- Check `findr_conditions_snapshots` for recent ingestions
- Query `copernicus_ingestion_health` view
- Enable DEBUG_INGESTION for detailed logs

---

**Status:** Comprehensive fallback strategy implemented  
**Tools:** diagnostic script + enhanced targeted-reingest  
**Next:** Test with problematic rectangles, add monitoring dashboard
