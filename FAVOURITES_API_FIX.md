# Favourites API 500 Error - Fix Summary

## Problem
The `/api/findr/favourites` endpoint was returning a **500 Internal Server Error** with the message "Failed to fetch favourites".

## Root Cause
The API code was attempting to use Supabase's automatic JOIN syntax:

```typescript
.from('user_favourites')
.select(`
  id,
  added_at,
  last_checked,
  species:species_id (
    id,
    species_code,
    scientific_name,
    ...
  )
`)
```

**This syntax only works when there's a foreign key relationship**, but the `user_favourites` table was defined with:

```sql
CREATE TABLE user_favourites (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  species_id TEXT NOT NULL,  -- <-- TEXT, not a FK!
  ...
);
```

The `species_id` column is **TEXT** (stores species.id as text), not a UUID foreign key. Supabase couldn't resolve the automatic join, causing the query to fail.

## Solution
Changed the API to perform a **manual join** instead of relying on Supabase's automatic relationship resolution:

### New Approach:
1. **Fetch favourites first** - Get just the IDs and species_id:
   ```typescript
   const { data: favourites } = await supabase
     .from('user_favourites')
     .select('id, species_id, added_at, last_checked')
     .eq('user_id', userId);
   ```

2. **Extract unique species IDs**:
   ```typescript
   const speciesIds = [...new Set(favourites.map(f => f.species_id))];
   ```

3. **Fetch species data separately**:
   ```typescript
   const { data: speciesData } = await supabase
     .from('species')
     .select('id, species_code, name_en, ...')
     .in('id', speciesIds);
   ```

4. **Create lookup map and manually join**:
   ```typescript
   const speciesMap = new Map(
     (speciesData || []).map(s => [s.id, s])
   );
   
   const favouritesWithConfidence = favourites.map(fav => {
     const species = speciesMap.get(fav.species_id);
     // ... build response object
   });
   ```

## Why Was This Missed?
- The deployment guide mentioned applying RLS policies, but didn't catch that the **foreign key constraint was never created**
- The original table migration (`20251002001_create_user_favourites.sql`) defined `species_id TEXT` without a foreign key
- RLS policies were correctly applied (they already existed), so the authentication worked fine
- The error only manifested when trying to fetch favourites because that's when the JOIN was attempted

## Files Changed
- `pages/api/findr/favourites.ts` - Rewrote GET handler to use manual join

## Verification
After deploying the fix:

1. **Test authenticated user can fetch favourites**:
   - Sign in at `/findr/auth`
   - Navigate to `/findr/favourites`
   - Should load without 500 error

2. **Check browser console**:
   - Should no longer see "Failed to fetch favourites"
   - Network tab should show 200 response from `/api/findr/favourites`

3. **Verify species data is complete**:
   - Each favourite should have full species details (name, advice, etc.)
   - Confidence scores should display correctly

## Future Consideration
**Option 1: Keep current setup (TEXT with manual join)**
- ✅ Works now
- ✅ Flexible (species.id can be any string format)
- ❌ No database-level referential integrity
- ❌ Manual joins required

**Option 2: Add foreign key constraint (requires migration)**
```sql
-- This would require species.id to be compatible with UUID type
ALTER TABLE user_favourites 
  ALTER COLUMN species_id TYPE UUID USING species_id::UUID,
  ADD CONSTRAINT fk_user_favourites_species 
    FOREIGN KEY (species_id) 
    REFERENCES species(id) 
    ON DELETE CASCADE;
```
Then revert to automatic JOIN syntax. **Only do this if species.id is actually UUID type!**

## Deployment Status
- ✅ Fixed code committed: `4aba9ec4`
- ✅ Deployed to production: https://wotnow-9sc813o3u-damians-projects-06bbadaa.vercel.app
- ✅ Ready to test

## Related Files
- `/pages/api/findr/favourites.ts` - Fixed API endpoint
- `/supabase/migrations/20251002001_create_user_favourites.sql` - Original table definition
- `/supabase/migrations/20251009001_user_favourites_rls.sql` - RLS policies (already applied)
- `/FAVOURITES_SUPABASE_DEPLOYMENT.md` - Deployment guide (still valid, RLS was fine)
