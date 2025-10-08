# DNS Propagation Complete - Post-Launch Checklist

**Domain**: fishfindr.eu  
**Status**: Waiting for DNS propagation (24-48 hours)  
**Expected**: Thursday 3rd October 2025

---

## 🔍 Step 0: Verify DNS Propagation

```bash
# Check if DNS has propagated
nslookup fishfindr.eu

# Check CNAME record
dig fishfindr.eu CNAME

# Verify from multiple locations
curl -I https://fishfindr.eu
```

**Expected Result**: fishfindr.eu should point to your Vercel deployment

---

## 🗄️ Step 1: Apply Database Migration (CRITICAL)

### 1.1 Open Supabase SQL Editor
```bash
# Open Supabase dashboard
open https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql/new
```

### 1.2 Run Migration SQL
**File**: `supabase/migrations/20251002001_create_user_favourites.sql`

```sql
-- Copy and paste the entire contents of:
-- /Users/damianrafferty/Projects/WotNow/supabase/migrations/20251002001_create_user_favourites.sql

-- This creates:
-- 1. user_favourites table
-- 2. RLS policies for secure access
-- 3. Indexes for performance
-- 4. Updated_at trigger

-- Run in Supabase SQL Editor
```

### 1.3 Verify Migration
```sql
-- Check table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'user_favourites';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_favourites';

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'user_favourites';

-- Try inserting test data (should work for authenticated users)
SELECT * FROM user_favourites LIMIT 1;
```

---

## 🔐 Step 2: Update Environment Variables

### 2.1 Update Vercel Environment Variables
```bash
# Open Vercel dashboard
open https://vercel.com/mrdamianrafferty/wotnow/settings/environment-variables

# Verify these are set (should already be configured):
# NEXT_PUBLIC_SUPABASE_URL=https://swmviqpxetwziqxhzldh.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 2.2 Update Local .env Files (if needed)
```bash
# Check local environment
cat .env.local | grep SUPABASE

# Should contain:
# NEXT_PUBLIC_SUPABASE_URL=https://swmviqpxetwziqxhzldh.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

---

## ✅ Step 3: Test Auth Flow

### 3.1 Test Login Flow
```bash
# Start dev server
npm run dev

# Open favourites page
open http://localhost:3000/findr/favourites
```

**Manual Test Checklist**:
- [ ] Page redirects to `/findr/auth` when not logged in
- [ ] Can create account with email/password
- [ ] Can log in with existing account
- [ ] Auth state persists across page refreshes
- [ ] Can log out successfully

### 3.2 Test Database Connection
**After logging in**, open browser console and run:
```javascript
// Check session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// Try fetching favourites (should return empty array initially)
const response = await fetch('/api/findr/favourites');
const data = await response.json();
console.log('Favourites:', data);
```

---

## 🎣 Step 4: Test Favourites CRUD Operations

### 4.1 Add a Favourite
```bash
# In browser console at http://localhost:3000/findr
# or http://localhost:3000/findr/favourites
```

**Manual Test**:
1. Go to `/findr` (swipe interface)
2. Swipe right on a species (e.g., "Cod")
3. Check console for success message
4. Navigate to `/findr/favourites`
5. Verify species appears in the list

### 4.2 Verify Database Record
```sql
-- In Supabase SQL Editor
SELECT * FROM user_favourites ORDER BY created_at DESC LIMIT 5;

-- Check structure
SELECT 
  id,
  user_id,
  species_id,
  notifications_enabled,
  created_at,
  updated_at
FROM user_favourites;
```

### 4.3 Test Remove Favourite
1. Click trash icon on a favourite
2. Verify it disappears from UI
3. Check database record is deleted:

```sql
-- In Supabase SQL Editor
SELECT * FROM user_favourites WHERE species_id = 'cod';
-- Should return no rows if deleted
```

### 4.4 Test Toggle Priority
1. Click target/star icon on a favourite
2. Verify UI updates with priority indicator
3. Check localStorage maintains priority state

### 4.5 Test Notifications Toggle
1. Click bell icon on a favourite
2. Verify notifications_enabled field updates:

```sql
-- In Supabase SQL Editor
SELECT species_id, notifications_enabled 
FROM user_favourites 
WHERE user_id = '<your-user-id>';
```

---

## 📊 Step 5: Test Enhanced Dashboard Features

### 5.1 Test Confidence Grouping
**Manual Test**:
1. Add 5+ species to favourites
2. Navigate to `/findr/favourites`
3. Verify species are grouped into:
   - 🔥 **Active** (85%+) - Red theme
   - ⚡ **Good** (70-84%) - Yellow theme  
   - ⏳ **Unlikely** (<60%) - Gray theme

### 5.2 Test 7-Day Forecasts
**Manual Test**:
1. Check each card has a mini bar chart
2. Verify colors match confidence:
   - Red bars: 85%+
   - Yellow bars: 70-84%
   - Blue bars: 60-69%
   - Gray bars: <60%
3. Hover over bars to see tooltips
4. Check peak indicators (🔥) on highest days

### 5.3 Test Card Interactions
**Manual Test**:
- [ ] Click "GO FISH NOW!" on Active cards
- [ ] Click "Plan Trip" on Good cards
- [ ] Expand tactical advice sections
- [ ] Remove species from each tier
- [ ] Toggle priority across all tiers
- [ ] Cards animate smoothly on state changes

---

## 🔄 Step 6: Test localStorage → Database Migration

### 6.1 Migrate Existing Favourites
If you have favourites in localStorage, they need to be migrated:

```javascript
// In browser console after logging in
const existingFavs = JSON.parse(localStorage.getItem('findrFavorites') || '[]');
console.log('Existing favourites in localStorage:', existingFavs);

// For each favourite, POST to API
for (const speciesId of existingFavs) {
  await fetch('/api/findr/favourites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speciesId })
  });
}

// Clear localStorage after migration
localStorage.removeItem('findrFavorites');
console.log('Migration complete!');
```

### 6.2 Verify Migration
```sql
-- In Supabase SQL Editor
SELECT COUNT(*) as total_favourites 
FROM user_favourites 
WHERE user_id = '<your-user-id>';

-- List all migrated species
SELECT species_id, created_at 
FROM user_favourites 
WHERE user_id = '<your-user-id>' 
ORDER BY created_at;
```

---

## 🚨 Step 7: Test Error Handling

### 7.1 Test Unauthenticated Access
```bash
# Open incognito window
open -a "Google Chrome" --args --incognito http://localhost:3000/findr/favourites
```
- [ ] Should redirect to `/findr/auth`
- [ ] Should show login/signup form
- [ ] Should redirect back after login

### 7.2 Test Network Failures
**In browser DevTools → Network tab**:
1. Set throttling to "Offline"
2. Try adding a favourite
3. Verify error message displays
4. Set back to "Online"
5. Retry - should work

### 7.3 Test Concurrent Updates
**Open two browser tabs**:
1. Add favourite in Tab 1
2. Verify it appears in Tab 2 (after refresh)
3. Remove favourite in Tab 2
4. Verify it disappears in Tab 1 (after refresh)

---

## 📱 Step 8: Test Mobile Experience

### 8.1 Responsive Layouts
```bash
# Test in Chrome DevTools device mode
open http://localhost:3000/findr/favourites
```

**Test Devices**:
- [ ] iPhone SE (375px) - Mobile
- [ ] iPhone 12 Pro (390px) - Mobile
- [ ] iPad (768px) - Tablet
- [ ] iPad Pro (1024px) - Tablet/Desktop
- [ ] Desktop (1920px) - Desktop

**Check**:
- [ ] Active cards: 1 column mobile, 2 columns desktop
- [ ] Good cards: 1/2/3 columns (mobile/tablet/desktop)
- [ ] Waiting cards: Full-width compact list
- [ ] Section headers stack on mobile
- [ ] Touch targets are ≥44px
- [ ] No horizontal scroll

### 8.2 Touch Interactions
- [ ] Swipe gestures work on cards (if implemented)
- [ ] Tap to expand works
- [ ] Button taps have visual feedback
- [ ] No accidental double-taps

---

## 🔍 Step 9: Performance & Security Checks

### 9.1 Check RLS Policies
```sql
-- Verify users can only see their own favourites
-- Log in as User A, then run:
SELECT * FROM user_favourites WHERE user_id != auth.uid();
-- Should return 0 rows (blocked by RLS)

-- Verify INSERT is restricted
INSERT INTO user_favourites (user_id, species_id) 
VALUES ('fake-user-id', 'cod');
-- Should fail with RLS error
```

### 9.2 Check API Response Times
```bash
# In terminal
time curl -X GET http://localhost:3000/api/findr/favourites \
  -H "Cookie: sb-access-token=<your-token>"

# Should be < 500ms for empty list
# Should be < 1s for 10+ favourites with predictions
```

### 9.3 Check Memory Leaks
**In Chrome DevTools → Performance**:
1. Start recording
2. Add 10 favourites
3. Remove all favourites
4. Stop recording
5. Check memory graph - should return to baseline

---

## 🎨 Step 10: Visual Regression Testing

### 10.1 Screenshot Comparison
```bash
# Take screenshots before/after for comparison
# Use browser DevTools or Playwright

# Active section with 2 species
# Good section with 4 species
# Unlikely section with 6 species
# Empty state (no favourites)
```

### 10.2 Visual Checks
- [ ] Card shadows render correctly
- [ ] Gradient backgrounds display properly
- [ ] Icons align with text
- [ ] Badges have correct colors
- [ ] Bar charts render without gaps
- [ ] Animations are smooth (60fps)
- [ ] Dark mode works (if applicable)

---

## 📦 Step 11: Production Deployment Verification

### 11.1 Deploy to Production
```bash
# Push latest changes
git add -A
git commit -m "chore: Ready for production after DNS propagation"
git push origin main

# Vercel auto-deploys from main branch
# Check deployment status
open https://vercel.com/mrdamianrafferty/wotnow
```

### 11.2 Test on Production
```bash
# Open production site
open https://fishfindr.eu/findr/favourites
```

**Production Checklist**:
- [ ] HTTPS works (not HTTP)
- [ ] Auth redirects work
- [ ] Database operations work
- [ ] API endpoints respond
- [ ] Favourites persist across sessions
- [ ] No console errors
- [ ] Analytics tracking works (if configured)

### 11.3 Monitor Production Logs
```bash
# Vercel logs
open https://vercel.com/mrdamianrafferty/wotnow/logs

# Supabase logs
open https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/logs/postgres-logs
```

---

## 🐛 Step 12: Known Issues & Workarounds

### Issue 1: localStorage Still Used
**Status**: localStorage used as fallback until migration
**Fix**: Run migration script in Step 6.1
**Verify**: Check that database has records, not just localStorage

### Issue 2: Mock Data Warnings
**Status**: Console shows "Mocked favourite entries detected"
**Fix**: Normal during development. Will disappear once all data is live.
**Verify**: Check console logs decrease over time

### Issue 3: Translation API Rate Limits
**Status**: Many POST /api/translate requests
**Fix**: Implement translation caching (future enhancement)
**Workaround**: Currently acceptable for MVP

---

## 🎯 Step 13: Post-Launch Monitoring (First 24 Hours)

### 13.1 Database Monitoring
```sql
-- Check favourite creation rate
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as favourites_created
FROM user_favourites
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Check most popular species
SELECT 
  species_id,
  COUNT(*) as users_tracking
FROM user_favourites
GROUP BY species_id
ORDER BY users_tracking DESC
LIMIT 10;

-- Check notifications enabled rate
SELECT 
  COUNT(CASE WHEN notifications_enabled THEN 1 END) as enabled,
  COUNT(CASE WHEN NOT notifications_enabled THEN 1 END) as disabled,
  ROUND(100.0 * COUNT(CASE WHEN notifications_enabled THEN 1 END) / COUNT(*), 2) as enabled_percentage
FROM user_favourites;
```

### 13.2 Error Monitoring
```bash
# Check Vercel error logs
# Look for 500 errors, auth failures, database timeouts

# Check Supabase slow queries
# Look for queries taking >1s
```

### 13.3 User Feedback
- [ ] Monitor support channels
- [ ] Check analytics for bounce rates
- [ ] Review user session recordings (if configured)
- [ ] Track conversion rate (signup → add favourite)

---

## ✨ Step 14: Celebrate! 🎉

You've successfully launched the favourites system with:
- ✅ Database-backed persistence
- ✅ User authentication
- ✅ 3-tier confidence dashboard
- ✅ 7-day forecast charts
- ✅ Real-time updates
- ✅ Mobile responsive design

**Next Steps** (Future Enhancements):
1. Add email notifications for peak conditions
2. Implement push notifications
3. Add catch log integration
4. Build species selection carousels
5. Add social features (compare favourites with friends)
6. Optimize translation caching
7. Add PWA support for offline access

---

## 📝 Quick Command Reference

```bash
# Check DNS propagation
nslookup fishfindr.eu

# Start dev server
npm run dev

# Run database query
# (Open Supabase SQL Editor)

# Deploy to production
git push origin main

# Check production logs
open https://vercel.com/mrdamianrafferty/wotnow/logs

# Open production site
open https://fishfindr.eu/findr/favourites

# Check Supabase database
open https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/editor
```

---

**Generated**: 2 October 2025  
**Status**: Ready to execute after DNS propagation  
**Estimated Time**: 2-3 hours for complete testing
