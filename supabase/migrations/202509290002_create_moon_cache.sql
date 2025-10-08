-- Create table to cache daily moon and sun data per rounded coordinate bucket
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
  source text not null default 'ipgeolocation',
  raw jsonb,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.moon_cache is 'Caches daily moon/sun events per rounded coordinate grid to minimize upstream API calls.';

create unique index if not exists moon_cache_unique_bucket_date
  on public.moon_cache (lat_bucket, lon_bucket, local_date);

create index if not exists moon_cache_expires_at_idx
  on public.moon_cache (expires_at);
