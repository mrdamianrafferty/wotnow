# 🚀 Deployment Scripts

Quick reference for deploying WotNow to production.

## Usage

### Full Deployment (Recommended)
Interactive deployment with cache clearing option:

```bash
# With custom commit message
./deploy.sh "Add new feature"

# With auto-generated commit message
./deploy.sh
```

Or using npm:
```bash
npm run deploy
```

**What it does:**
1. ✅ Stages and commits all changes
2. ✅ Pushes to GitHub
3. ✅ Deploys to Vercel production
4. ✅ Optionally clears prediction cache

---

### Quick Deploy (Fast)
No prompts, just deploy:

```bash
# With custom commit message
./quick-deploy.sh "Quick fix"

# With auto-generated commit message
./quick-deploy.sh
```

Or using npm:
```bash
npm run deploy:quick
```

**What it does:**
1. ✅ Commits and pushes changes
2. ✅ Deploys to Vercel
3. ⚡ No cache clearing prompt

---

## After Deployment

### See Your Changes
Your browser might cache the old version. To see updates:

**Option 1: Hard Refresh** (Quick)
- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

**Option 2: Clear Cache** (Thorough)
1. Open DevTools (F12)
2. Right-click refresh button
3. Click "Empty Cache and Hard Reload"

**Option 3: Incognito Mode** (Testing)
- Open a private/incognito window

---

## Manual Cache Clearing

### Clear Prediction Cache
If species data or predictions aren't updating, clear the Supabase cache:

**Via Supabase SQL Editor:**
```sql
-- Clear all predictions
DELETE FROM findr_prediction_sessions;

-- Or clear specific rectangle
DELETE FROM findr_prediction_sessions 
WHERE rectangle_code = '31E8';
```

**Via Supabase CLI:**
```bash
echo "DELETE FROM findr_prediction_sessions;" | supabase db execute
```

---

## Troubleshooting

### Changes Not Showing Up?

1. **Check Vercel Deployment**
   - Visit https://vercel.com/damians-projects-06bbadaa/wotnow
   - Verify latest commit is deployed
   - Check for build errors

2. **Browser Cache**
   - Hard refresh (Cmd+Shift+R)
   - Clear browser cache
   - Try incognito mode

3. **Prediction Cache**
   - Clear `findr_prediction_sessions` table
   - Wait 3 hours for auto-expiry

4. **GitHub Not Updated**
   - Run: `git push origin main`
   - Check: `git log --oneline -5`

### Deployment Failed?

**ESLint Errors:**
```bash
npm run lint:fix  # Auto-fix issues
npm run lint      # Check remaining errors
```

**TypeScript Errors:**
```bash
npm run typecheck  # Check type issues
```

**Build Errors:**
```bash
npm run build  # Test build locally
```

---

## Environment Variables

Required for deployment:
- `SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `STORMGLASS_SECRET_KEY` - Weather API key
- (See `.env.example` for full list)

Managed via:
- Vercel dashboard for production
- `.env.local` for local development

---

## Tips

### Quick Iterations
```bash
# Make changes, then:
npm run deploy:quick
```

### Testing Before Deploy
```bash
npm run build        # Test build
npm run typecheck    # Check types
npm run lint         # Check code quality
```

### Deploy Specific Commit
```bash
git checkout <commit-hash>
npm run deploy
```

---

## What Gets Deployed

- All committed code from current branch
- Environment variables from Vercel
- Static assets and images
- API routes and serverless functions

**Not Deployed:**
- `.env.local` (local only)
- `node_modules` (installed fresh)
- `.next` build cache (rebuilt)
- Git history (only code)

---

## Support

Issues? Check:
- [Vercel Logs](https://vercel.com/damians-projects-06bbadaa/wotnow)
- [GitHub Actions](https://github.com/mrdamianrafferty/wotnow/actions)
- `npm run smoke` - Run smoke tests
