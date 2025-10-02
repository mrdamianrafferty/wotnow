-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto with schema public;

-- Create moon_cache table if it does not exist
create table if not exists public.moon_cache (
  id uuid primary key default gen_random_uuid(),
  lat_bucket numeric(5,1) not null,
  lon_bucket numeric(5,1) not null,
  local_date date not null,
  timezone text not null,
  sunrise_iso timestamptz,
  sunset_iso timestamptz,
  day_length_minutes integer,
  moonrise_iso timestamptz,
  moonset_iso timestamptz,
  moon_phase_name text,
  moon_phase_fraction numeric,
  moon_illumination_pct numeric,
  source text,
  raw jsonb,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.moon_cache is 'Caches daily moon and sun data per rounded coordinate bucket.';

alter table public.moon_cache
  alter column source set default 'ipgeolocation';

-- Add new columns if they are missing to keep schema forward-compatible
alter table public.moon_cache
  add column if not exists day_length_minutes integer,
  add column if not exists moon_phase_fraction numeric,
  add column if not exists moon_illumination_pct numeric,
  add column if not exists raw jsonb,
  alter column cached_at set default now();

create unique index if not exists moon_cache_unique_bucket_date
  on public.moon_cache (lat_bucket, lon_bucket, local_date);

create index if not exists moon_cache_expires_at_idx
  on public.moon_cache (expires_at);
