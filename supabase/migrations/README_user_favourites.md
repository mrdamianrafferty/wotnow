# User Favourites Migration

This migration creates the `user_favourites` table for the findr favourites tracking feature.

## What it creates:

- **Table**: `user_favourites` with columns:
  - `id` - UUID primary key
  - `user_id` - Foreign key to auth.users
  - `species_id` - Canonical species UUID (FK to `species.id`)
  - `notifications_enabled` - Boolean for notification preferences
  - `notification_threshold` - Confidence level (0-100) to trigger alerts
  - `notification_channels` - JSONB with push/email/sms preferences
  - `added_at`, `last_checked`, `created_at`, `updated_at` - Timestamps

- **Indexes** for performance:
  - `user_id` - Fast user lookups
  - `species_id` - Fast species lookups
  - `added_at` - Ordered by recency
  - Partial index on notifications

- **RLS Policies**:
  - Users can only view/insert/update/delete their own favourites
  - Enforced at database level for security

  - Auto-update `updated_at` on any change

> **2025-11 Canonicalization (Migration `20251122000005`)**
>
> - Legacy text `species_id` values (codes/names) are now converted to UUIDs that reference `species.id`.
> - Unresolved favourites are logged to `user_favourite_canonicalization_audit` before being deleted.
> - `(user_id, species_id)` uniqueness is enforced on the UUID column plus a cascading FK.

## How to apply:

### Option 1: Supabase CLI (Recommended)
```bash
# Make sure you're linked to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

### Option 2: Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Open the file `supabase/migrations/20251002001_create_user_favourites.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run**

### Option 3: Manual SQL
Connect to your Supabase database and run:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" < supabase/migrations/20251002001_create_user_favourites.sql
```

## Verify it worked:

Run this query in SQL Editor:
```sql
-- Check table exists
SELECT * FROM user_favourites LIMIT 1;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_favourites';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'user_favourites';
```

## Testing:

After applying the migration, test the API endpoints:

1. **GET** `/api/findr/favourites` - Fetch user's favourites
2. **POST** `/api/findr/favourites` - Add a favourite
3. **DELETE** `/api/findr/favourites?id=UUID` - Remove a favourite
4. **PATCH** `/api/findr/favourites/notifications` - Update notification preferences

## Rollback (if needed):

```sql
DROP TABLE IF EXISTS user_favourites CASCADE;
DROP FUNCTION IF EXISTS update_user_favourites_updated_at() CASCADE;
```
