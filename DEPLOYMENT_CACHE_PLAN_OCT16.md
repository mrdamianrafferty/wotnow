# 🚀 Deployment & Cache Clearing Plan - October 16, 2025

**Deployment:** Service Worker Fix + Playful Bio Migration  
**Critical:** Cache clearing required after deployment

---

## 📦 What We're Deploying

### 1. Service Worker Fix (middleware.ts)
**Change:** Exclude PWA files from fishfindr.eu redirect  
**Impact:** Fixes SecurityError preventing PWA registration  
**Affects:** User PWA installations, offline functionality

### 2. Playful Bio Migration (20251016004)
**Change:** Updates `species.playful_bio_en` for 79 species  
**Impact:** Enhanced modal descriptions  
**Affects:** Fish species modals, card bios

---

## 🔄 Cache Layers & Clearing Strategy

Based on our successful Phase 10 deployment, we have **3 cache layers** to manage:

### 1. Database Cache (findr_prediction_sessions)
**What it stores:** API prediction responses  
**TTL:** 3 hours  
**Clear method:** Run script  
**Why clear:** Ensures fresh data from updated RPC functions

### 2. Vercel Edge Cache
**What it stores:** API routes, static assets  
**TTL:** Varies (15min - 1 hour)  
**Clear method:** Auto-cleared on deployment  
**Why clear:** Already handled by Vercel on `git push`

### 3. Browser Cache
**What it stores:** JavaScript bundles, API responses  
**TTL:** Varies (immutable for static assets)  
**Clear method:** Hard refresh  
**Why clear:** Users need new JS with updated features

---

## ✅ Complete Deployment Workflow

### Step 1: Pre-Deploy Verification
```bash
# Verify migrations are ready
ls -la supabase/migrations/20251016004_upsert_species_playful_bio_en.sql

# Check middleware changes look correct
git diff middleware.ts

# Ensure service worker fix is properly commented
grep -A 5 "isPWAFile" middleware.ts
```

### Step 2: Apply Database Migration
```bash
# Apply playful bio migration to Supabase
npx supabase db push

# Expected output:
# ✅ Migration 20251016004_upsert_species_playful_bio_en.sql applied
# ✅ 79 species updated
```

### Step 3: Clear Database Cache (TODAY)
```bash
# Clear all cached predictions for today
node scripts/clear-all-cache-for-date.js

# Expected output:
# 🧹 Clearing ALL cache entries for 2025-10-16...
# ✅ Cleared X cached entries for 2025-10-16
# 📍 Rectangles cleared: [list of rectangles]
```

### Step 4: Deploy to Production
```bash
# Stage changes
git add middleware.ts
git add supabase/migrations/20251016004_upsert_species_playful_bio_en.sql

# Commit with clear message
git commit -m "fix: Service worker redirect + playful bio migration

- Add isPWAFile check to middleware (fixes SecurityError on fishfindr.eu)
- Populate playful_bio_en for 79 species
- Resolves PWA installation issues
- Enhances species modal descriptions"

# Push to trigger Vercel deployment
git push origin main

# Wait for Vercel deployment (~30-60 seconds)
# Watch: https://vercel.com/damians-projects-06bbadaa/wotnow
```

**Note:** Vercel automatically clears edge cache on deployment ✅

### Step 5: Verify Deployment
```bash
# Wait for "Deployment complete" from Vercel CLI or dashboard
# Expected: Build time ~30-60 seconds
```

### Step 6: Clear Browser Cache
**On your test devices:**

1. **Desktop Browser:**
   - **Mac:** `Cmd + Shift + R`
   - **Windows/Linux:** `Ctrl + Shift + F5`
   - **Chrome DevTools:** Right-click refresh → "Empty Cache and Hard Reload"

2. **Mobile Browser:**
   - **iOS Safari:** Settings → Safari → Clear History and Website Data
   - **Android Chrome:** Settings → Privacy → Clear Browsing Data → Cached images

3. **PWA Installed App:**
   - Uninstall current PWA
   - Clear browser cache
   - Reinstall PWA from fishfindr.eu

---

## 🧪 Post-Deployment Verification

### Test 1: Service Worker Registration
```javascript
// Open https://fishfindr.eu in browser console:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('✅ Service Workers:', regs.length);
  regs.forEach(reg => console.log('  -', reg.scope));
});

// Expected output:
// ✅ Service Workers: 1
//   - https://www.fishfindr.eu/
```

**Pass criteria:** No SecurityError, registration successful

### Test 2: PWA Files Not Redirected
```bash
# Test that sw.js loads directly (no redirect)
curl -I https://fishfindr.eu/sw.js

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/javascript
# (NO 301/302 redirect)
```

**Pass criteria:** Direct 200 response, not 301/302 redirect

### Test 3: Playful Bios Visible
1. Open https://wotnow.vercel.app/findr
2. Click on a species card (e.g., Sea Bass)
3. Check modal shows playful bio in the blue "findr bio" section

**Pass criteria:** Cheeky, fun bio text visible (not scientific description)

### Test 4: Fresh Predictions Data
```bash
# Test predictions API for today
curl -s -X POST "https://wotnow.vercel.app/api/findr/predictions" \
  -H "Content-Type: application/json" \
  -d '{"rectangleCode":"31F1","predictionDate":"2025-10-16"}' | \
  jq '.metadata.source'

# Expected output:
# "live"  (not "cache")
```

**Pass criteria:** Response shows `source: "live"`, not cached

### Test 5: Species Modal Completeness
1. Open species modal for multiple fish
2. Verify all 4 enhanced sections display:
   - ✅ Best fishing techniques (Target icon)
   - ✅ Top bait recommendations (Wand2 icon)
   - ✅ Preferred habitats (Mountain icon)
   - ✅ iNaturalist link (ExternalLink icon)

**Pass criteria:** All sections visible with correct data

---

## 🔍 Troubleshooting

### Issue: Service worker still shows redirect error
**Solution:**
1. Completely unregister existing service workers:
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
   });
   ```
2. Clear all browser data for fishfindr.eu
3. Hard refresh and try again

### Issue: Playful bios not showing
**Solution:**
1. Check migration was applied: `npx supabase db pull`
2. Verify data in Supabase: 
   ```sql
   SELECT species_code, name_en, playful_bio_en 
   FROM species 
   WHERE playful_bio_en IS NOT NULL 
   LIMIT 5;
   ```
3. Hard refresh browser to get new API responses

### Issue: Predictions still showing "cache" source
**Solution:**
1. Re-run cache clear script:
   ```bash
   node scripts/clear-all-cache-for-date.js 2025-10-16
   ```
2. Add `bypassCache: true` flag for debugging:
   ```bash
   curl -X POST "..." -d '{"rectangleCode":"31F1","bypassCache":true}'
   ```

### Issue: PWA won't install after fix
**Solution:**
1. Check HTTPS is working (PWA requires HTTPS)
2. Verify manifest.json loads: `curl https://fishfindr.eu/manifest.json`
3. Check service worker scope matches domain
4. Test in incognito/private mode (eliminates cache issues)

---

## 📊 Expected Cache Clear Results

After running `clear-all-cache-for-date.js` for 2025-10-16:

```
✅ Cleared [X] cached entries for 2025-10-16
📍 Rectangles cleared: [31F1, 20C5, 21D8, ... etc]
```

**Next automatic cache clear:** 3 hours after fresh API calls populate cache

---

## ⏱️ Timeline Summary

| Step | Duration | Action |
|------|----------|--------|
| 1. Migration | 30 seconds | `npx supabase db push` |
| 2. Cache clear | 5 seconds | `node scripts/clear-all-cache-for-date.js` |
| 3. Git commit | 10 seconds | `git add` + `git commit` |
| 4. Vercel deploy | 60 seconds | `git push origin main` (auto-deploys) |
| 5. Browser refresh | 5 seconds | `Cmd+Shift+R` on test devices |
| 6. Verification | 2 minutes | Test all 5 verification steps |
| **TOTAL** | **~4 minutes** | Complete deployment + verification |

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ Migration applied (79 species have playful bios)
- ✅ Database cache cleared for today
- ✅ Vercel deployment completed
- ✅ Service worker registers without errors on fishfindr.eu
- ✅ PWA files (sw.js, manifest.json) return 200 (not redirected)
- ✅ Species modals show playful bios
- ✅ All 4 enhanced modal sections display
- ✅ Predictions API returns `source: "live"` for fresh data
- ✅ No browser console errors

---

## 📝 Deployment Log Template

Use this to track the deployment:

```
🚀 DEPLOYMENT LOG - October 16, 2025
===========================================

Time Started: __:__
Deployed By: Damian

✅ Step 1: Pre-Deploy Verification
   - Migration file exists: [ ]
   - Middleware diff reviewed: [ ]
   - Service worker fix verified: [ ]

✅ Step 2: Database Migration
   - Command: npx supabase db push
   - Result: [ ] Success / [ ] Failed
   - Species updated: ___ / 79

✅ Step 3: Cache Clear
   - Command: node scripts/clear-all-cache-for-date.js
   - Entries cleared: ___
   - Rectangles affected: ___

✅ Step 4: Git Deployment
   - Files staged: [ ] middleware.ts [ ] migration SQL
   - Commit SHA: ________
   - Push result: [ ] Success / [ ] Failed

✅ Step 5: Vercel Deployment
   - Build status: [ ] Success / [ ] Failed
   - Build time: ___ seconds
   - Deployment URL: ___________

✅ Step 6: Browser Cache Clear
   - Desktop cleared: [ ]
   - Mobile cleared: [ ]
   - PWA reinstalled: [ ]

✅ Step 7: Verification Tests
   - Service worker registration: [ ] Pass / [ ] Fail
   - PWA files not redirected: [ ] Pass / [ ] Fail
   - Playful bios visible: [ ] Pass / [ ] Fail
   - Fresh predictions data: [ ] Pass / [ ] Fail
   - Modal completeness: [ ] Pass / [ ] Fail

Time Completed: __:__
Total Duration: ___ minutes

Notes:
_____________________
_____________________
```

---

## 🎯 Key Learnings from Previous Deployments

From Phase 10 (biogeochemical integration) and other successful deployments:

1. **Always clear database cache first** - Before deploying, clear stale cached predictions
2. **Vercel auto-clears edge cache** - No manual action needed for CDN/edge layer
3. **Browser hard refresh is critical** - Users must Cmd+Shift+R to get new JS bundles
4. **Test with `bypassCache: true` first** - Validates API works before testing cached flow
5. **Check both domains** - Test wotnow.vercel.app AND fishfindr.eu for consistency
6. **PWA requires complete cache clear** - Service workers are aggressive cachers

---

## 📚 Related Documentation

- **Cache Clearing Guide:** `CACHE_CLEARING_GUIDE.md`
- **Previous Deployment:** `DEPLOYMENT_COMPLETE_BIOGEOCHEMICAL.md`
- **Fish Modal Enhancements:** `FISH_MODAL_ENHANCEMENTS.md`
- **Service Worker Issue:** (conversation context)

---

**Ready to deploy?** Follow the workflow above step-by-step! ✨
