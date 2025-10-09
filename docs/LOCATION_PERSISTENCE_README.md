LOCATION PERSISTENCE IMPLEMENTATION
===================================

This note captures the end to end flow we touched while getting the Findr
location persistence stack in shape and keeping Supabase in sync.


CURRENT STATE
-------------
- The migration `supabase/migrations/20251002002_create_user_location_preferences.sql`
  now drops the existing trigger before recreating it, which lets
  `supabase db push` replay cleanly after the Pre-DNS script created the first
  trigger in production.
- `supabase db push` currently finishes without errors; the warnings you see are
  just “already exists” notices from objects that were created earlier.
- A newer migration, `supabase/migrations/20251005004_update_user_location_preferences_coordinates.sql`,
  is checked in but not yet committed with the rest of the location changes
  (context provider, API handler, UI wiring).


WHAT WE DID
-----------
1. **Provisioned manually during DNS cutover**  
   - Ran `SUPABASE_PRE_DNS_MIGRATION.sql` directly in the Supabase SQL editor to
     unblock initial prod usage.  
   - That script built early versions of `user_location_preferences`,
     `user_favourites`, index/trigger helpers, and GPS columns on
     `findr_catch_entries`.

2. **Attempted to replay migrations via CLI**  
   - `supabase db push` re-ran the migrations and failed at the comment step in
     `20251002001_create_user_favourites.sql` because the live table (created by
     the Pre-DNS script) did not yet have `notifications_enabled`.
   - Fixed by running:
     ```sql
     ALTER TABLE user_favourites
       ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS notification_threshold INTEGER DEFAULT 70,
       ADD COLUMN IF NOT EXISTS notification_channels JSONB DEFAULT '{"push": false, "email": false, "sms": false}'::jsonb,
       ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT now(),
       ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ DEFAULT now();
     ```
   - Re-ran `supabase db push` and progressed until the trigger conflict on
     `user_location_preferences`.

3. **Made the migration idempotent**  
   - Added a guard at the top of the trigger block:
     ```sql
     DROP TRIGGER IF EXISTS update_user_location_preferences_updated_at ON user_location_preferences;
     ```
   - Committed as `Fix user location preferences trigger`.  
   - Verified `supabase db push` now completes; remaining output is purely
     “already exists” notices from earlier manual runs.


OPEN ITEMS BEFORE SHIPPING LOCATION PERSISTENCE
-----------------------------------------------
- Finalise the new runtime code:
  - `context/UnifiedLocationContext.tsx`
  - `pages/api/user/location.ts`
  - `components/LocationPicker.tsx`
  - `components/findr/LocationDisplay.tsx`
  - `pages/findr/conditions.tsx`
  - `pages/_app.tsx`
- Stage and commit `supabase/migrations/20251005004_update_user_location_preferences_coordinates.sql`
  alongside the above runtime changes.
- Review the draft docs that were generated during investigation (e.g.
  `LOCATION_SYNC_FIX.md`, `LOCATION_TEST_PLAN.md`, `ROUTER_RELOAD_RACE_CONDITION.md`)
  and either polish or remove duplicates.
- Push the trigger fix (already committed locally) so teammates stop hitting the
  old trigger when they run migrations.


LESSONS LEARNED
---------------
- If we run helper SQL (like `SUPABASE_PRE_DNS_MIGRATION.sql`) outside the CLI,
  double-check that the migrations mirror that schema exactly; any column or
  trigger added later must be backfilled manually or the migration needs to be
  made idempotent via `DROP ... IF EXISTS` or `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- When migrations fail after manual fixes, remember the CLI’s
  `supabase migration repair` command (or even inserting into
  `supabase_migrations.schema_migrations`) if we absolutely need to mark a
  migration as applied.
- Build the habit of testing `supabase db push` after any manual SQL change;
  catching duplicate triggers/policies locally is much faster than debugging on
  production deploy.


QUICK RE-VALIDATION CHECKLIST
-----------------------------
1. Ensure `supabase db push` succeeds on a fresh checkout:
   ```bash
   supabase db push
   ```
   Expect only “already exists” notices.
2. Smoke test the location UI (picker, display) once the pending React changes
   are merged.
3. Confirm RLS coverage using `curl`/`supabase functions` or the Supabase SQL
   editor to make sure policies on `user_location_preferences` still block data
   leakage.
4. Update this note if the schema or flow changes again.
