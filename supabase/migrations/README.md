This folder contains SQL migration files intended to be applied to the Supabase (Postgres) database.

To apply a single migration file (recommended for this change):

1. Use `psql` with a secure `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/<db>"
psql "$DATABASE_URL" -f supabase/migrations/202512260001_add_updated_at_ices_rectangles.sql
```

2. Alternatively, run the SQL from the Supabase SQL editor in the project dashboard.

Notes:
- Run this migration from CI or locally with a Service Role / admin connection string.
- The migration will add `updated_at` to `ices_rectangles`, backfill existing rows, create a trigger to keep it current, and add an index used by sitemap generation.
- After applying, verify with:

```sql
SELECT count(*) FROM public.ices_rectangles WHERE updated_at IS NULL;
```

If you want me to apply this migration for you (CI or remote), provide the connection method or let me run commands locally if you prefer.
