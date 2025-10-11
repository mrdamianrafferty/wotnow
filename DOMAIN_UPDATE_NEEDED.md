# Favourites 404 - Domain Not Updated Issue

## Current Situation
**The favourites API fix is deployed, but www.godaisy.io is still serving an old deployment.**

### Evidence:
1. **Latest deployment**: `wotnow-dmut4zzof-damians-projects-06bbadaa.vercel.app` (5 minutes ago)
   - Build ID: `mvwifqbA67zCdOzZrFzSu` (new)
   - Has moved file: `pages/api/findr/favourites/index.ts` ✅

2. **Custom domain** (www.godaisy.io):
   - Build ID: `_c98qsnlkJdzHIHPeWer0` (OLD)
   - Still looking for: `pages/api/findr/favourites.ts` ❌
   - Results in 404 errors

3. **Old JavaScript bundle** still loading:
   - `findr-7686e46fd16e2cef.js` (old code)
   - Hard refresh doesn't help because the HTML itself is old

## Root Cause
**Vercel domain configuration is not auto-updating to latest deployments.**

The custom domain `www.godaisy.io` is pinned to an old deployment and needs manual intervention to update.

## Solutions

### Option 1: Update Domain in Vercel Dashboard (RECOMMENDED)

1. **Go to Vercel Dashboard**:
   - Visit: https://vercel.com/damians-projects-06bbadaa/wotnow

2. **Find Latest Deployment**:
   - Look for deployment from "5m ago"
   - URL: `wotnow-dmut4zzof-damians-projects-06bbadaa.vercel.app`

3. **Promote to Production**:
   - Click on the deployment
   - Click "Promote to Production" button
   - This should update www.godaisy.io automatically

### Option 2: Remove and Re-add Domain

1. Go to Project Settings → Domains
2. Remove `www.godaisy.io` and `godaisy.io`
3. Re-add them
4. This forces Vercel to point to the latest deployment

### Option 3: Wait for Next Deploy

The domain might update on the NEXT deployment. Try:

```bash
# Make a trivial change and redeploy
echo "# Trigger rebuild" >> README.md
git add README.md
git commit -m "Force redeploy to update domain"
git push origin main
npx vercel --prod --yes
```

### Option 4: Test on Vercel URL (Temporary)

If you need to test immediately while waiting for domain to update:

1. **Disable deployment protection** (if enabled):
   - Go to Project Settings → Deployment Protection
   - Disable it temporarily

2. **Test on direct URL**:
   ```
   https://wotnow-dmut4zzof-damians-projects-06bbadaa.vercel.app/findr
   ```

## Verification After Fix

Once the domain updates, verify:

```bash
# Check build ID matches
curl -s "https://www.godaisy.io" | grep -o "_c98qsnlkJdzHIHPeWer0\|mvwifqbA67zCdOzZrFzSu"
# Should show: mvwifqbA67zCdOzZrFzSu (NEW)

# Test API endpoint
curl -X POST https://www.godaisy.io/api/findr/favourites \
  -H "Content-Type: application/json" \
  -d '{"speciesId":"test"}'
# Should return: {"error":"Unauthorized - Please sign in"}
# NOT: 404
```

Then in browser:
1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Should load new JavaScript bundle (different hash than `findr-7686e46fd16e2cef.js`)
3. Sign in and test adding favourites
4. Should work without 404 errors

## Why CLI Commands Failed

```bash
npx vercel alias <url> www.godaisy.io
# Error: You don't have access to the domain
```

This means:
- Domain is managed by a different Vercel team/account
- Or domain configuration is locked
- Must use Vercel Dashboard to update

## Current Commits

All code changes are deployed and working:
- `360644d1` - TypeScript fixes for favourites API
- `a1c1b425` - Moved favourites.ts to favourites/index.ts  
- `9d2acce5` - Added air temperature to conditions API
- `4aba9ec4` - Fixed favourites API manual JOIN

**The code is correct. The domain just needs to point to the latest deployment.**

## Next Steps

1. ✅ **Log into Vercel Dashboard**
2. ✅ **Navigate to Project → Deployments**
3. ✅ **Find latest deployment (5m old)**
4. ✅ **Click "Promote to Production"** OR **"Assign Domain"**
5. ✅ **Wait 1-2 minutes for CDN propagation**
6. ✅ **Hard refresh browser** (Cmd+Shift+R)
7. ✅ **Test favourites functionality**

## Alternative: Redeploy with Vercel Button

If the above doesn't work, try forcing a complete redeployment through Vercel's UI:
1. Go to Vercel Dashboard → Deployments
2. Click "..." menu on latest deployment
3. Select "Redeploy"
4. Check "Use existing build cache: No"
5. Click "Redeploy"

This will force a fresh build and should update the domain.
