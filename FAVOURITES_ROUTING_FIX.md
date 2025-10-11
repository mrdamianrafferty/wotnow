# Favourites API 404 Fix - Routing Conflict

## Problem
The favourites API was returning a **404 Not Found** error when trying to add favourites:
```
POST https://www.godaisy.io/api/findr/favourites 404 (Not Found)
Failed to add favourite to Supabase: Species not found
```

## Root Cause
**Next.js API Route Naming Conflict**

We had both:
- `/pages/api/findr/favourites.ts` (main API endpoint file)
- `/pages/api/findr/favourites/` (directory with sub-endpoints like notifications.ts)

In Next.js, **you cannot have both a file and a directory with the same name at the same path level**. This creates a routing conflict where Next.js doesn't know whether `/api/findr/favourites` should map to:
- The file: `favourites.ts`
- The directory index: `favourites/index.ts`

As a result, Next.js ignored the `favourites.ts` file, causing 404 errors.

## Solution
Moved the main API file into the directory as an index file:

```bash
mv pages/api/findr/favourites.ts -> pages/api/findr/favourites/index.ts
```

This resolves the conflict because now:
- `/api/findr/favourites` → `favourites/index.ts`
- `/api/findr/favourites/notifications` → `favourites/notifications.ts`

Both routes work without conflict.

## Additional Fixes
After moving the file one directory level deeper, needed to update:

1. **Import path** - Added one more `../`:
   ```typescript
   // Before:
   import { createServerSupabaseClient } from '../../../lib/supabase/pages-api';
   
   // After:
   import { createServerSupabaseClient } from '../../../../lib/supabase/pages-api';
   ```

2. **TypeScript types** - Added explicit interfaces:
   ```typescript
   interface FavouriteRecord {
     id: string;
     species_id: string;
     added_at: string;
     last_checked: string;
   }
   
   interface SpeciesRecord {
     id: string;
     species_code: string;
     name_en: string;
     // ... all species fields
   }
   ```

3. **Type casting** - Added proper type assertions:
   ```typescript
   const typedFavourites = favourites as FavouriteRecord[];
   const typedSpeciesData = (speciesData || []) as SpeciesRecord[];
   ```

## Files Changed
- Moved: `pages/api/findr/favourites.ts` → `pages/api/findr/favourites/index.ts`
- Also committed:
  - `hooks/useFavourites.ts` (hybrid localStorage + Supabase hook)
  - `pages/findr/index.tsx` (updated to use hook)
  - `pages/findr/favourites.tsx` (updated to use hook)
  - `supabase/migrations/20251009001_user_favourites_rls.sql` (RLS policies)
  - Documentation files

## Verification Steps

### 1. Test POST (Add Favourite)
1. Sign in at `/findr/auth`
2. Go to `/findr` (main swiping interface)
3. Swipe right on a species card
4. Open browser Network tab
5. Should see: `POST /api/findr/favourites` → **200 OK** (not 404)
6. Check console - should NOT see "Failed to add favourite"

### 2. Test GET (Load Favourites)
1. While signed in, visit `/findr/favourites`
2. Should load without errors
3. Network tab should show: `GET /api/findr/favourites` → **200 OK**
4. Species cards should display with full data

### 3. Test DELETE (Remove Favourite)
1. On favourites page, click trash icon on a species
2. Network tab should show: `DELETE /api/findr/favourites` → **200 OK**
3. Card should disappear immediately

## Why This Happened
This is a common Next.js gotcha. The file/directory naming conflict wasn't caught during development because:
1. Local dev server may handle it differently than production
2. The `favourites/notifications.ts` sub-endpoint was added later
3. TypeScript compilation doesn't catch routing conflicts

## Prevention
When creating API sub-endpoints under a route that already has a main endpoint:
- ✅ Use directory structure from the start: `route/index.ts` + `route/subroute.ts`
- ❌ Don't mix: `route.ts` + `route/subroute.ts`

## Deployment Status
- ✅ Fixed code committed: `360644d1`
- ✅ Deployed to production: https://wotnow-hcre2o72o-damians-projects-06bbadaa.vercel.app
- ✅ Ready to test

## Related Fixes
This completes the favourites integration along with:
1. **Manual JOIN fix** (`4aba9ec4`) - Fixed species data fetching
2. **Air temp fix** (`9d2acce5`) - Added weather data to conditions API
3. **Routing fix** (`360644d1`) - Resolved 404 on favourites endpoint

All three issues are now resolved! 🎉
