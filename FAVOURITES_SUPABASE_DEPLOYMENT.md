# Favourites Supabase Integration Deployment Guide

## Overview
This guide covers connecting the favourites system from localStorage-only to full Supabase integration with authentication and data persistence.

## What Changed

### 1. Backend (Already Existed! ✅)
The `/api/findr/favourites` API endpoint was already fully implemented with:
- `GET`: Fetch user's favourites with full species data
- `POST`: Add new favourite (requires `speciesId`)
- `DELETE`: Remove favourite (requires favourite `id`)

### 2. Frontend Changes

#### Main Findr Page (`pages/findr/index.tsx`)
- **Before**: Used localStorage only, no Supabase sync
- **After**: Uses new `useFavourites` hook for hybrid localStorage + Supabase sync
- Automatically syncs favourites to Supabase when user authenticates
- Falls back to localStorage for unauthenticated users

#### Favourites Page (`pages/findr/favourites.tsx`)
- Fixed data mapping: API returns `speciesId`, not `species_id`
- Added `favouriteIdMap` to track mapping between species IDs and favourite record IDs
- Updated `removeFavourite` to use correct favourite ID from user_favourites table

#### New Hook (`hooks/useFavourites.ts`)
- Hybrid localStorage + Supabase storage
- Auto-migration from localStorage to Supabase on authentication
- Optimistic UI updates
- Automatic fallback to localStorage if Supabase fails

### 3. Database

#### Table Schema (`user_favourites`)
```sql
create table public.user_favourites (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  species_id uuid not null,
  added_at timestamp with time zone null default now(),
  last_checked timestamp with time zone null default now(),
  notifications_enabled boolean null default false,
  notification_threshold integer null default 70,
  notification_channels jsonb null default '{"sms": false, "push": false, "email": false}'::jsonb,
  constraint user_favourites_pkey primary key (id),
  constraint user_favourites_user_id_species_id_key unique (user_id, species_id),
  constraint user_favourites_species_id_fkey foreign key (species_id) references species (id) on delete cascade,
  constraint user_favourites_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);
```

## Deployment Steps

### Step 1: Run Database Migrations

#### 1.1 Ensure `user_favourites` table exists
Check if the table already exists:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'user_favourites';
```

If it doesn't exist, create it (use the schema provided in your message).

#### 1.2 Apply Row Level Security Policies
Run the RLS migration:
```bash
# Apply the RLS policies
psql "$DATABASE_URL" < supabase/migrations/20251009001_user_favourites_rls.sql
```

Or copy/paste the contents of `supabase/migrations/20251009001_user_favourites_rls.sql` into Supabase SQL Editor.

#### 1.3 Verify RLS is enabled
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'user_favourites';
-- Should return rowsecurity = true

-- Check policies are created
SELECT policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'user_favourites';
-- Should show 4 policies: SELECT, INSERT, UPDATE, DELETE
```

### Step 2: Deploy Code Changes

#### 2.1 Review changes
```bash
git status
# Should show:
# - hooks/useFavourites.ts (new file)
# - pages/findr/index.tsx (modified)
# - pages/findr/favourites.tsx (modified)
# - supabase/migrations/20251009001_user_favourites_rls.sql (new file)
```

#### 2.2 Commit changes
```bash
git add hooks/useFavourites.ts
git add pages/findr/index.tsx
git add pages/findr/favourites.tsx
git add supabase/migrations/20251009001_user_favourites_rls.sql
git commit -m "Connect favourites to Supabase with hybrid localStorage sync

- Add useFavourites hook for hybrid localStorage + Supabase storage
- Update main Findr page to use useFavourites hook
- Fix favourites page data mapping (speciesId vs species_id)
- Add RLS policies for user_favourites table
- Auto-migrate localStorage favourites to Supabase on auth"
```

#### 2.3 Deploy to Vercel
```bash
npx vercel deploy --prod --yes
```

### Step 3: Test the Integration

#### 3.1 Test as Unauthenticated User
1. Visit `/findr`
2. Swipe right to like a species
3. Click "Saved fish" in navigation
4. Verify the species appears in the list
5. Open DevTools > Application > Local Storage
6. Verify `findrFavorites` array contains the species IDs

#### 3.2 Test as Authenticated User
1. Sign in at `/findr/auth`
2. Visit `/findr`
3. Swipe right to like a species
4. Open DevTools > Network tab
5. Verify POST request to `/api/findr/favourites` succeeds
6. Visit `/findr/favourites`
7. Verify species appears in the list

#### 3.3 Test Migration from localStorage to Supabase
1. Sign out (if signed in)
2. Visit `/findr`
3. Swipe right to like 2-3 species
4. Verify they appear in localStorage
5. Sign in at `/findr/auth`
6. Wait 2-3 seconds for auto-migration
7. Check Supabase database:
```sql
SELECT 
  uf.id,
  uf.user_id,
  s.name_en as species_name,
  uf.added_at
FROM user_favourites uf
JOIN species s ON s.id = uf.species_id
WHERE uf.user_id = 'YOUR_USER_ID'
ORDER BY uf.added_at DESC;
```

#### 3.4 Test Remove Favourite
1. On `/findr/favourites`
2. Click the trash icon on a species card
3. Verify the card disappears from the UI
4. Verify DELETE request succeeds in Network tab
5. Refresh the page
6. Verify the species is still gone
7. Check database to confirm deletion:
```sql
SELECT COUNT(*) FROM user_favourites WHERE user_id = 'YOUR_USER_ID';
```

### Step 4: Monitor for Issues

#### 4.1 Check Logs
```bash
# Vercel logs
vercel logs production

# Look for errors like:
# - "Unauthorized - Please sign in"
# - "Species not found"
# - "Failed to add favourite"
# - "Failed to remove favourite"
```

#### 4.2 Check Database
```sql
-- Check favourite counts by user
SELECT 
  u.email,
  COUNT(uf.id) as favourite_count
FROM auth.users u
LEFT JOIN user_favourites uf ON uf.user_id = u.id
GROUP BY u.id, u.email
ORDER BY favourite_count DESC;

-- Check for orphaned favourites (species that don't exist)
SELECT COUNT(*) 
FROM user_favourites uf
WHERE NOT EXISTS (
  SELECT 1 FROM species s WHERE s.id = uf.species_id
);
```

## Troubleshooting

### Issue: "Unauthorized - Please sign in"
**Cause**: RLS policies are enabled but user is not authenticated  
**Solution**: 
1. Verify user is signed in
2. Check that Supabase session is valid
3. Check browser cookies are enabled

### Issue: Favourites not syncing to Supabase
**Cause**: API call failing or RLS blocking access  
**Solution**:
1. Check DevTools > Network tab for failed requests
2. Verify RLS policies are correctly applied
3. Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel

### Issue: "Species not found" when adding favourite
**Cause**: Species ID doesn't exist in species table  
**Solution**:
1. Verify the species exists:
```sql
SELECT id, species_code, name_en 
FROM species 
WHERE id = 'SPECIES_ID_HERE';
```
2. If missing, add species to database first

### Issue: Can't remove favourite
**Cause**: Favourite ID mapping issue  
**Solution**:
1. Reload the `/findr/favourites` page
2. Check console for "Could not find favourite ID" error
3. Verify `favouriteIdMap` is populated correctly
4. As fallback, manually delete from database:
```sql
DELETE FROM user_favourites 
WHERE user_id = 'USER_ID' 
  AND species_id = 'SPECIES_ID';
```

### Issue: Duplicates in favourites list
**Cause**: Unique constraint not working or multiple tabs open  
**Solution**:
1. Check for duplicates:
```sql
SELECT species_id, COUNT(*) 
FROM user_favourites 
WHERE user_id = 'USER_ID'
GROUP BY species_id 
HAVING COUNT(*) > 1;
```
2. Remove duplicates:
```sql
DELETE FROM user_favourites a
USING user_favourites b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.species_id = b.species_id;
```

## Rollback Plan

If issues occur, you can roll back to localStorage-only mode:

1. **Revert code changes**:
```bash
git revert HEAD
git push origin main
npx vercel deploy --prod --yes
```

2. **Keep database changes**: The `user_favourites` table and RLS policies won't affect the app if not called

3. **Or disable RLS temporarily**:
```sql
ALTER TABLE user_favourites DISABLE ROW LEVEL SECURITY;
```

## Next Steps

### Priority Flags in Database
Currently, priority flags are still stored in localStorage. To fully migrate:

1. Add `is_priority` column to `user_favourites`:
```sql
ALTER TABLE user_favourites 
ADD COLUMN is_priority BOOLEAN DEFAULT false;
```

2. Update API to return and accept `is_priority`
3. Update `togglePriority` function to call API instead of localStorage

### Notifications
The table has notification fields ready:
- `notifications_enabled`
- `notification_threshold`
- `notification_channels`

Future work:
1. Add UI to configure notifications
2. Create background job to check conditions and send notifications
3. Integrate with push notification service (Firebase, OneSignal, etc.)

## Summary

✅ **What Works Now**:
- Favourites saved to Supabase when user is authenticated
- Falls back to localStorage for unauthenticated users
- Auto-migration from localStorage to Supabase on login
- Proper data mapping between species IDs and favourite record IDs
- RLS policies protect user data
- Add/remove favourites fully functional

🚧 **Still Uses localStorage**:
- Priority flags (toggle star on favourite)

📊 **Monitoring**:
- Check Vercel logs for API errors
- Monitor Supabase dashboard for query performance
- Watch for RLS policy violations
