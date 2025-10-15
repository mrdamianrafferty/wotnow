# 🚀 Phase 10 Deployment Checklist

**Use this checklist whenever deploying Phase 10 or similar updates that change the prediction data structure.**

---

## 📋 Pre-Deployment Checklist

### Backend Verification
- [ ] SQL function deployed to Supabase
- [ ] Function tested with test queries
- [ ] Data coverage verified (324/325 rectangles)
- [ ] Guild weighting preserved

### Frontend Verification
- [ ] All React components created and error-free
- [ ] Type definitions updated
- [ ] API calling correct function with correct parameters
- [ ] No TypeScript compilation errors

---

## 🔄 Deployment Steps

### Step 1: Deploy SQL (If Not Already Done)
```sql
-- Run in Supabase SQL Editor:
-- File: DEPLOY_PHASE10_CONNECT_REAL_CMEMS.sql
```

### Step 2: Update API Endpoint
Verify `pages/api/findr/predictions.ts` is calling:
```typescript
supabase.rpc('get_environmental_predictions_basic', {
  p_rectangle_code: rectangleCode,
  p_date: predictionDate,
})
```

### Step 3: Clear ALL Caches 🚨 **CRITICAL**

**A. Clear Database Cache**
```bash
# Clear all predictions for today
node scripts/clear-all-cache-for-date.js

# Or specify date:
node scripts/clear-all-cache-for-date.js 2025-10-12
```

**B. Restart Dev Server** (Development)
```bash
pkill -f "next dev"
npm run dev
```

**C. Deploy to Production** (Production)
```bash
# Vercel auto-deploys on push to main
git add .
git commit -m "Phase 10: Connect real CMEMS environmental data"
git push origin main

# Wait for Vercel deployment to complete
```

**D. Clear Production Cache** (Production)
```bash
# Option 1: Via Supabase dashboard
# Go to SQL Editor → Run:
DELETE FROM findr_prediction_sessions WHERE prediction_date = CURRENT_DATE;

# Option 2: Via API
# Create admin endpoint or run script with production credentials
```

### Step 4: Verify Deployment

**Development:**
1. Hard refresh browser (Cmd+Shift+R)
2. Open http://localhost:3000/findr
3. Check for badges and environmental section

**Production:**
1. Clear browser cache
2. Open https://fishfindr.eu/findr (or your production URL)
3. Check for badges and environmental section

### Step 5: Test Checklist
- [ ] Guild badges appear (🌊 Pelagic, 🪨 Reef/Kelp, etc.)
- [ ] Data freshness badges appear (🟢 6h ago)
- [ ] Environmental section displays with temp/sal/depth/substrate
- [ ] Tooltips work on hover
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Favourites page shows compact environmental info

---

## 🔧 Cache Busting Scripts

### Script 1: Clear Specific Rectangle
```bash
node scripts/clear-prediction-cache.js <rectangle> <date>
```

**Example:**
```bash
node scripts/clear-prediction-cache.js 31F1 2025-10-12
```

**When to use:**
- Testing a specific area
- User reports stale data for one location
- Debugging a particular rectangle

### Script 2: Clear All for Date (Recommended)
```bash
node scripts/clear-all-cache-for-date.js <date>
```

**Example:**
```bash
# Clear today
node scripts/clear-all-cache-for-date.js

# Clear specific date
node scripts/clear-all-cache-for-date.js 2025-10-12
```

**When to use:**
- After deploying Phase 10
- After updating prediction function
- When rolling out new features
- Daily cache refresh (if needed)

---

## 🚨 Common Issues & Solutions

### Issue 1: "Badges still not showing"
**Cause:** Browser cache or stale API cache  
**Solution:**
```bash
# 1. Clear database cache
node scripts/clear-all-cache-for-date.js

# 2. Hard refresh browser
# Mac: Cmd+Shift+R
# Windows: Ctrl+Shift+F5

# 3. Check network tab for fresh API call
```

### Issue 2: "API returns null for environmental data"
**Cause:** Wrong function or parameters  
**Solution:**
```bash
# Check API is calling correct function:
grep -A 5 "supabase.rpc" pages/api/findr/predictions.ts

# Should see:
# get_environmental_predictions_basic
# p_rectangle_code
# p_date
```

### Issue 3: "Server not picking up changes"
**Cause:** Next.js dev server needs restart  
**Solution:**
```bash
pkill -f "next dev"
npm run dev
```

### Issue 4: "Function not found error"
**Cause:** SQL function not deployed to Supabase  
**Solution:**
```sql
-- Run in Supabase SQL Editor:
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%environmental%';

-- Should return: get_environmental_predictions_basic
```

---

## 📊 Verification Commands

### Check API Response
```bash
curl -s -X POST "http://localhost:3000/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F1","predictionDate":"2025-10-12","bypassCache":true}' | \
  jq '.predictions[0] | {species: .species_common_name, freshness: .data_freshness, guild: .weight_profile, has_factors: (.factors != null)}'
```

**Expected output:**
```json
{
  "species": "Mackerel",
  "freshness": "fresh",
  "guild": "pelagic",
  "has_factors": true
}
```

### Check Database Cache Status
```sql
-- In Supabase SQL Editor:
SELECT 
  rectangle_code,
  prediction_date,
  language,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_valid
FROM findr_prediction_sessions
WHERE prediction_date = CURRENT_DATE
ORDER BY created_at DESC;
```

### Check Server Logs
```bash
tail -f /tmp/wotnow_dev.log | grep "RPC\|Cache"
```

---

## 🎯 Success Criteria

Deployment is successful when:

✅ **API Response:**
- Returns `data_freshness`, `weight_profile`, `factors`
- `factors` includes temperature, salinity, depth, substrate
- No null values for environmental data

✅ **UI Display:**
- Guild badges visible (🌊 🪨 ⚓ 🦑 🏖️ 🐟)
- Data freshness badges visible (🟢 🟡 🟠 🔴)
- Environmental section displays all 4 factors
- Match quality colors correct (✅ ⚠️ ❌)
- Tooltips work on hover

✅ **No Errors:**
- Browser console clean
- Server logs show no RPC errors
- Network requests return 200 status
- TypeScript compilation successful

---

## 📝 Post-Deployment

### Immediate (Day 1)
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify data freshness across rectangles
- [ ] Test on mobile devices
- [ ] Verify favourites page

### Short Term (Week 1)
- [ ] Analytics review (engagement metrics)
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] A/B test results (if applicable)

### Long Term (Month 1)
- [ ] Data quality audit
- [ ] Start Phase 10.1 (EMODnet Substrate)
- [ ] Plan Phase 10.2 (Salinity Data)
- [ ] Gather ML training data

---

## 🔮 Future Cache Busting

**For Phase 10.1, 10.2, 10.3, Phase 11:**

Every time you update the prediction function:

```bash
# 1. Deploy SQL changes
# 2. Update API if needed
# 3. Clear ALL cache
node scripts/clear-all-cache-for-date.js

# 4. Restart server (dev)
pkill -f "next dev" && npm run dev

# 5. Deploy to production
git push origin main

# 6. Clear production cache (via Supabase dashboard)
DELETE FROM findr_prediction_sessions WHERE prediction_date >= CURRENT_DATE - INTERVAL '1 day';

# 7. Hard refresh browsers
# 8. Verify badges appear
# 9. Celebrate! 🎉
```

---

## 🛠️ Quick Reference

**Clear cache:**
```bash
node scripts/clear-all-cache-for-date.js
```

**Restart dev server:**
```bash
pkill -f "next dev" && npm run dev
```

**Hard refresh browser:**
- Mac: `Cmd + Shift + R`
- Windows: `Ctrl + Shift + F5`

**Test API:**
```bash
curl -X POST localhost:3000/api/findr/predictions \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F1","predictionDate":"2025-10-12","bypassCache":true}' | \
  jq '.predictions[0].data_freshness'
```

**Check for badges:**
1. Open http://localhost:3000/findr
2. Select rectangle
3. Look for 🌊 🟢 badges
4. Expand card → See environmental section

---

## ✅ Deployment Complete!

**Phase 10:** ✅ Live and working  
**Environmental data:** ✅ Flowing from API to UI  
**Badges:** ✅ Displaying correctly  
**Cache:** ✅ Cleared and fresh

**Next:** User testing, feedback, Phase 10.1 planning! 🚀

