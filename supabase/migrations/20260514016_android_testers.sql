-- ============================================================================
-- Migration: android_testers signup table
-- ============================================================================
-- Creates a table to capture people who sign up via /android-testers to help
-- launch Go Daisy on Google Play (Google requires 12 testers for a fortnight
-- before a new app can be released to production).
--
-- Security model:
--   - RLS enabled
--   - Anonymous users can INSERT (so the public signup form works)
--   - Anonymous users CANNOT SELECT (so the list can't be enumerated from the
--     browser even if someone inspects the network tab)
--   - Service role / authenticated admin users have full access (default)
--
-- View signups via the Supabase dashboard or with the service role key.
-- ============================================================================

create table if not exists public.android_testers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  country text,
  primary_activity text,
  created_at timestamptz not null default now(),
  -- status tracks the tester's journey:
  --   'signed_up' (initial), 'invited' (added to Play Console),
  --   'opted_in' (clicked the link), 'completed' (finished 14-day test)
  status text not null default 'signed_up',
  -- free-text notes for the admin
  notes text,
  -- unique on lower(email) to dedupe case-insensitively
  constraint android_testers_email_unique unique (email)
);

-- Helpful index for the admin "who's outstanding?" query
create index if not exists android_testers_status_idx
  on public.android_testers (status, created_at desc);

-- Lowercase email automatically so duplicates are caught regardless of case
create or replace function public.android_testers_normalize_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists android_testers_normalize_email_trigger
  on public.android_testers;

create trigger android_testers_normalize_email_trigger
  before insert or update on public.android_testers
  for each row execute function public.android_testers_normalize_email();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.android_testers enable row level security;

-- Allow anonymous (anon) users to insert new signups via the public form.
-- Deliberately does NOT include a USING clause so anon cannot read existing
-- rows back; the INSERT just doesn't return the inserted row to the client.
drop policy if exists "anon can insert signups" on public.android_testers;
create policy "anon can insert signups"
  on public.android_testers
  for insert
  to anon
  with check (true);

-- Authenticated admin / service role gets full access by default (no policy
-- needed for service role — it bypasses RLS).
-- If you want signed-in app users to read their own signup (e.g. so a logged-
-- in user can see whether they already opted in), uncomment the policy below.

-- drop policy if exists "authenticated can read own signup" on public.android_testers;
-- create policy "authenticated can read own signup"
--   on public.android_testers
--   for select
--   to authenticated
--   using (lower(email) = lower((auth.jwt() ->> 'email')::text));

-- ============================================================================
-- Helpful admin views (optional)
-- ============================================================================

create or replace view public.android_testers_summary as
select
  status,
  count(*) as tester_count,
  min(created_at) as earliest,
  max(created_at) as latest
from public.android_testers
group by status
order by status;

-- Restrict the summary view to authenticated admins
revoke all on public.android_testers_summary from anon;
grant select on public.android_testers_summary to authenticated;

-- ============================================================================
-- Done
-- ============================================================================
comment on table public.android_testers is
  'Public signup list for the Go Daisy Android closed-beta testing programme. '
  'Inserted via /android-testers form; read only via admin / service role.';
