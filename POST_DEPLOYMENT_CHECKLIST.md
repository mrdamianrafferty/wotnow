# Post-Deployment Checklist 🚀

Deployment is running! Once Vercel finishes building, follow these steps:

## 1. ✅ Test Apple OAuth (Production)
Since Apple OAuth requires HTTPS and won't work on localhost:

1. Go to: **https://fishfindr.eu/findr/auth** (or your production domain)
2. Click "Continue with Apple"
3. Verify:
   - ✅ OAuth flow completes successfully
   - ✅ You're redirected back to findr
   - ✅ Your Apple profile photo appears in the user menu
   - ✅ You can sign out and sign back in

## 2. 🗄️ Apply Supabase Migration
**IMPORTANT:** The favourites feature won't work until you create the database table!

### Option A: Supabase Dashboard (Easiest)
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open `supabase/migrations/20251002001_create_user_favourites.sql`
5. Copy entire contents
6. Paste into SQL Editor
7. Click **Run** ✅

### Option B: Supabase CLI
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Verify It Worked:
Run this in SQL Editor:
```sql
-- Should return empty table (no errors)
SELECT * FROM user_favourites LIMIT 1;

-- Should show 4 policies
SELECT * FROM pg_policies WHERE tablename = 'user_favourites';
```

## 3. 🧪 Test Favourites Flow

### Sign In First
1. Go to: **https://fishfindr.eu/findr/auth**
2. Sign in with Apple (or email)
3. Verify you're logged in (see your avatar in top right)

### Test Favourites Page
1. Go to: **https://fishfindr.eu/findr/favourites-modern**
2. Should see empty state: "No species tracked yet"
3. Click "Add Your First Species"
4. Should see suggestions (You've Caught, Local Favorites, etc.)
5. Click heart icon to add a species
6. Should redirect to dashboard with that species
7. Should see:
   - ✅ Species name and image
   - ✅ Confidence score (live from predictions)
   - ✅ 7-day forecast graph
   - ✅ Current conditions (temp, wind, tide, waves)
8. Click bell icon → notification modal opens
9. Set preferences and save
10. Click X to remove species → should disappear
11. Refresh page → favourites should persist

### Test API Directly (Optional)
Open browser console on fishfindr.eu:
```javascript
// Get favourites
fetch('/api/findr/favourites').then(r => r.json()).then(console.log);

// Add a favourite (replace UUID with real species ID from species table)
fetch('/api/findr/favourites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ speciesId: 'SPECIES_UUID_HERE' })
}).then(r => r.json()).then(console.log);
```

## 4. 🔄 Switch to New Favourites (Optional)
Once you've confirmed everything works:

```bash
# Backup old page
mv pages/findr/favourites.tsx pages/findr/favourites-legacy.tsx

# Activate new page
mv pages/findr/favourites-modern.tsx pages/findr/favourites.tsx

# Commit and deploy
git add .
git commit -m "Switch to new favourites page as primary"
git push origin main
npx vercel deploy --prod --yes
```

Then the new favourites will be at: **https://fishfindr.eu/findr/favourites**

## 5. 📝 Update Supabase Redirect URLs
Don't forget about the reminder file! Once DNS fully propagates:

See: `REMINDER_SUPABASE_CONFIG.md` for:
- Adding fishfindr.eu to Supabase redirect URLs
- Testing the complete auth flow on production domain

## 🎉 Success Criteria

You'll know everything is working when:
- ✅ Apple OAuth works on production (not localhost)
- ✅ Can sign in and see your avatar
- ✅ Can add species to favourites
- ✅ Favourites persist across page refreshes
- ✅ Live confidence scores display
- ✅ Can toggle notifications
- ✅ Can remove species
- ✅ Different users see different favourites (RLS working)

## 🐛 Troubleshooting

### "Unauthorized - Please sign in"
- Check you're signed in (avatar in top right)
- Try signing out and back in
- Check Supabase dashboard → Authentication → Users

### "Failed to fetch favourites"
- Migration not applied yet! See Step 2 above
- Check Supabase dashboard → SQL Editor
- Run: `SELECT * FROM user_favourites;`

### Confidence scores showing 50 for everything
- Normal! Needs valid rectangleCode in URL
- Try: `/findr/favourites-modern?rectangleCode=31F2`
- Or update code to auto-detect user's location

### Apple OAuth not working
- Must be on HTTPS (production domain)
- Check Apple Developer Services ID has fishfindr.eu added
- Check Supabase redirect URLs include fishfindr.eu

---

## 🔗 Quick Links

- **Production Site:** https://fishfindr.eu
- **Favourites Page:** https://fishfindr.eu/findr/favourites-modern
- **Auth Page:** https://fishfindr.eu/findr/auth
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Apple Developer:** https://developer.apple.com/account

---

Need help? Check `FAVOURITES_IMPLEMENTATION.md` for full technical details!
