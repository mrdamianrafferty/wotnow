-- Grow Daisy transactional email idempotency ledger
--
-- Stripe retries webhook deliveries, and several distinct Stripe events can
-- represent the SAME thing a subscriber should be emailed about exactly once
-- (a trial converting arrives as both subscription.updated and, on some
-- accounts, an invoice event). Deduping on stripe_event_id alone is therefore
-- not enough: a retry of one event dedupes, but two different events for the
-- same transition do not.
--
-- This table keys on a SEMANTIC dedupe_key instead — e.g. 'trial_started:sub_123'
-- — so any number of distinct Stripe events collapse onto one send. The UNIQUE
-- constraint is what actually enforces it: the sender claims the key with an
-- INSERT and treats a 23505 unique violation as "already sent". A
-- SELECT-then-INSERT check would leave a race window open between the two
-- statements, which concurrent webhook retries would eventually hit.
--
-- Note this deliberately does NOT reuse grow_subscription_events. That table
-- has never recorded a single Stripe event (recordGrowEvent inserted a `tier`
-- column that does not exist on it, and the error was unchecked), so it is not
-- a trustworthy dedupe source.

create table if not exists public.grow_email_sends (
  id uuid primary key default gen_random_uuid(),

  -- Semantic identity of the message: '<email_type>:<stable subject id>'.
  -- Unique across the table; this is the whole point of the ledger.
  dedupe_key text not null unique,

  -- Which template was sent, for reporting.
  email_type text not null,

  user_id uuid references auth.users(id) on delete cascade,

  -- Address actually sent to, recorded as-sent: a user may later change their
  -- email, and we need to know where this message went.
  recipient text not null,

  -- Triggering provider event, for audit/debugging. Not the dedupe key.
  stripe_event_id text,
  stripe_subscription_id text,

  -- Resend's message id, once accepted.
  resend_id text,

  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  error text,

  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists grow_email_sends_user_id_idx
  on public.grow_email_sends (user_id);

create index if not exists grow_email_sends_created_at_idx
  on public.grow_email_sends (created_at desc);

comment on table public.grow_email_sends is
  'Idempotency ledger for Grow Daisy transactional email. One row per logical message; dedupe_key is claimed before sending so webhook retries cannot double-send.';

comment on column public.grow_email_sends.dedupe_key is
  'Semantic key, e.g. trial_started:sub_123. Deliberately NOT the Stripe event id, so different events describing the same transition collapse to one send.';

-- Written only by the webhook via the service role, which bypasses RLS. RLS is
-- enabled with no permissive policy so that anon/authenticated clients cannot
-- read it: rows contain subscriber email addresses.
alter table public.grow_email_sends enable row level security;
