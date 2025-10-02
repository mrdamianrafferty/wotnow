# Testing on Vercel Domain (While DNS Propagates) 🌐

DNS for fishfindr.eu hasn't propagated yet, so use your Vercel domain for now!

## 🔗 Your Production URLs

Based on deployment:
- **Production:** `https://wotnow-iapyfityk-damians-projects-06bbadaa.vercel.app`
- **Or check:** `https://godaisy.com` (your main domain)

Let's find your active production URL:

---

## ✅ Step 1: Test Apple OAuth on Vercel Domain

### Check Your Vercel Domain
1. Run: `npx vercel ls` to see all deployments
2. Or go to: https://vercel.com/dashboard
3. Find your production URL (probably godaisy.com or wotnow-xxx.vercel.app)

### Update Apple OAuth for Vercel Domain
If Apple OAuth still doesn't work on your Vercel domain:

1. Go to: https://developer.apple.com/account
2. Navigate to: **Certificates, Identifiers & Profiles**
3. Click: **Identifiers** → Find your Services ID (not App ID!)
4. Click **Configure** next to "Sign in with Apple"
5. Under "Domains and Subdomains", check if your Vercel domain is listed:
   - `godaisy.com` ✅
   - `wotnow-xxx.vercel.app` (might need to add)
6. Under "Return URLs", make sure you have:
   - `https://godaisy.com/auth/callback` ✅
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback` (if using that)

### Update Supabase Redirect URLs
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** → **URL Configuration**
4. Under "Redirect URLs", add:
   - `https://godaisy.com/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`
5. Click **Save**

---

## 🗄️ Step 2: Apply Supabase Migration

**Do this FIRST before testing favourites!**

### Option 1: Supabase Dashboard (Easiest)
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New query**
5. Copy the entire contents of: `supabase/migrations/20251002001_create_user_favourites.sql`
6. Paste into the editor
7. Click **Run** (or press Cmd+Enter)
8. Should see: "Success. No rows returned"

### Option 2: Via Terminal
```bash
# If you have Supabase CLI installed
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Verify It Worked
Run this query in SQL Editor:
```sql
-- Check table exists (should return empty, no errors)
SELECT * FROM user_favourites LIMIT 1;

-- Check RLS policies (should return 4 rows)
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'user_favourites';

-- Check indexes (should return 4-5 rows)
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_favourites';
```

If you see results, the migration worked! ✅

---

## 🧪 Step 3: Test on Your Production Domain

### Find Your Production Domain
Run this to check:
```bash
npx vercel ls --prod
```

Or use: **https://godaisy.com** (your main domain)

### Test Apple OAuth
1. Open: `https://godaisy.com/findr/auth` (or your Vercel domain)
2. Click **"Continue with Apple"**
3. Complete the Apple sign-in flow
4. Should redirect back to your site
5. Check top-right corner → should see your avatar or email

### Test Favourites
1. Go to: `https://godaisy.com/findr/favourites-modern`
2. Should show: "No species tracked yet" (empty state)
3. Click **"Add Your First Species"**
4. Should see suggestion categories
5. Click a heart icon to add a species
6. Should see the species card with:
   - Confidence score (might be ~50 without location)
   - 7-day forecast graph
   - Current conditions
7. Click bell icon → notification modal opens
8. Toggle settings and save
9. Refresh page → species should still be there ✅

### Test with Location (Better Scores)
Try: `https://godaisy.com/findr/favourites-modern?rectangleCode=31F2`

This will show real confidence scores for that ICES rectangle!

---

## 🐛 Troubleshooting

### "Unauthorized - Please sign in"
- **Cause:** Not signed in or session expired
- **Fix:** Go to `/findr/auth` and sign in again
- Check Supabase dashboard → Authentication → Users (should see your user)

### "Failed to fetch favourites" / 500 Error
- **Cause:** Migration not applied yet!
- **Fix:** Apply the migration (Step 2 above)
- Check SQL Editor: `SELECT * FROM user_favourites;` should work

### Apple OAuth redirects but no avatar
- **Cause:** Redirect URL mismatch
- **Fix:** 
  1. Check Supabase redirect URLs include your domain
  2. Check Apple Services ID has your domain listed
  3. Sign out and try again

### Confidence scores all showing 50
- **Normal!** Without a rectangleCode, it defaults to 50
- **Fix:** Add `?rectangleCode=31F2` to URL
- Or update code to auto-detect user location

### fishfindr.eu not working
- **Normal!** DNS takes 24-48 hours to propagate
- Use godaisy.com or your Vercel domain for now
- Check DNS: `nslookup fishfindr.eu` or `dig fishfindr.eu`

---

## 📝 Testing Checklist

Once migration is applied and you're on production domain:

- [ ] Can sign in with Apple OAuth
- [ ] See your avatar/email in top right
- [ ] Can visit /findr/favourites-modern
- [ ] See empty state initially
- [ ] Can click "Add Your First Species"
- [ ] See species suggestions
- [ ] Can add a species (heart icon)
- [ ] Species appears in dashboard
- [ ] Can toggle notifications
- [ ] Can set notification threshold
- [ ] Can remove species (X icon)
- [ ] Refresh page → favourites persist
- [ ] Sign out and back in → favourites still there

---

## 🎯 When DNS Propagates

After 24-48 hours, when fishfindr.eu works:

1. **Test it works:**
   ```bash
   curl -I https://fishfindr.eu
   # Should return 200 OK
   ```

2. **Update Supabase redirect URLs:**
   - Add `https://fishfindr.eu/auth/callback`

3. **Test Apple OAuth on fishfindr.eu:**
   - Should work immediately if you already added it to Apple Services ID

4. **Update documentation:**
   - Replace godaisy.com references with fishfindr.eu

---

## 🔗 Quick Commands

```bash
# Check DNS propagation
nslookup fishfindr.eu
dig fishfindr.eu

# List Vercel deployments
npx vercel ls

# See production domain
npx vercel ls --prod

# Check deployment status
npx vercel inspect [DEPLOYMENT_URL]
```

---

## ✅ Next Steps

1. **Now:** Test on godaisy.com or your Vercel domain
2. **Apply migration** in Supabase SQL Editor
3. **Test favourites** add/remove/persist flow
4. **Wait for DNS** (check every few hours)
5. **Once DNS works:** Test on fishfindr.eu

Everything is deployed and ready - just need to wait for DNS! 🚀

---

**Need the SQL?** It's in: `supabase/migrations/20251002001_create_user_favourites.sql`
