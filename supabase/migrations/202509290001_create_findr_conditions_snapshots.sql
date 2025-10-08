-- Create table to store unified conditions snapshots per ICES rectangle
create table if not exists public.findr_conditions_snapshots (
  id uuid primary key default gen_random_uuid(),
  rectangle_code text not null,
  captured_at timestamptz not null,
  sea_temp_c numeric,
  chlorophyll_mg_m3 numeric,
  dissolved_oxygen_mg_l numeric,
  salinity_psu numeric,
  nitrate_umol_l numeric,
  phosphate_umol_l numeric,
  wave_height_m numeric,
  wind_speed_kts numeric,
  wind_direction_deg numeric,
  next_high_tide_iso timestamptz,
  next_low_tide_iso timestamptz,
  hourly_marine_json jsonb,
  daily_marine_json jsonb,
  source text not null default 'fallback',
  created_at timestamptz not null default now()
);

comment on table public.findr_conditions_snapshots is 'Stores marine + biology snapshot metrics per ICES rectangle.';

-- Ensure rectangle codes align with catalogue (optional foreign key)
alter table public.findr_conditions_snapshots
  drop constraint if exists findr_conditions_rectangle_fk;

alter table public.findr_conditions_snapshots
  add constraint findr_conditions_rectangle_fk
  foreign key (rectangle_code)
  references public.findr_rectangles (rectangle_code)
  on delete cascade;

-- Avoid duplicate inserts for the same capture time
create unique index if not exists findr_conditions_snapshots_rectangle_captured_at_idx
  on public.findr_conditions_snapshots (rectangle_code, captured_at desc);

-- Speed up latest snapshot lookups
create index if not exists findr_conditions_snapshots_captured_at_idx
  on public.findr_conditions_snapshots (captured_at desc);

-- Helper view to fetch latest snapshot per rectangle
create or replace view public.findr_conditions_latest as
select distinct on (rectangle_code)
  rectangle_code,
  id,
  captured_at,
  sea_temp_c,
  chlorophyll_mg_m3,
  dissolved_oxygen_mg_l,
  salinity_psu,
  nitrate_umol_l,
  phosphate_umol_l,
  wave_height_m,
  wind_speed_kts,
  wind_direction_deg,
  next_high_tide_iso,
  next_low_tide_iso,
  hourly_marine_json,
  daily_marine_json,
  source,
  created_at
from public.findr_conditions_snapshots
order by rectangle_code, captured_at desc;
