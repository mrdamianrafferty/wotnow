create table if not exists public.grid_conditions_latest (
  cell_id text primary key references public.grid_025deg(cell_id) on delete cascade,
  collected_at timestamptz not null default now(),

  surface_temperature_c double precision,
  bottom_temperature_c double precision,
  salinity_psu double precision,
  oxygen_mg_l double precision,
  chlorophyll_mg_m3 double precision,
  nitrate_umol_l double precision,
  phosphate_umol_l double precision,
  phytoplankton_index double precision,

  sources text[] default '{}',
  quality text check (quality in ('high','medium','low','unknown')) default 'unknown',
  updated_at timestamptz not null default now()
);
create index if not exists idx_grid_conditions_latest_updated_at
  on public.grid_conditions_latest (updated_at desc);
