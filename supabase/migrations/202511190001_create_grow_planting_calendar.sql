-- Create table for storing climate-aware planting calendar windows
create table if not exists public.grow_planting_calendar (
    id uuid primary key default gen_random_uuid(),
    plant_slug text not null,
    plant_common_name text,
    plant_scientific_name text,
    climate_zone_code text not null,
    window_type text not null check (window_type in ('sow_indoor', 'sow_outdoor', 'transplant', 'harvest')),
    start_day_of_year integer not null check (start_day_of_year between 1 and 366),
    end_day_of_year integer not null check (end_day_of_year between 1 and 366),
    tasks text[] not null default array[]::text[],
    data_quality text not null default 'derived' check (data_quality in ('authoritative', 'derived', 'estimated')),
    source text,
    source_url text,
    notes text,
    data_version text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Restrict to known grow climate zone codes
alter table public.grow_planting_calendar
    add constraint grow_planting_calendar_zone_check
    check (climate_zone_code in (
        'atlantic_mild',
        'cool_maritime',
        'continental_cool',
        'med_marine',
        'southern_hot_dry',
        'mountain_cool'
    ));

-- Unique constraint ensures one window per plant/zone/type/start bucket
create unique index if not exists grow_planting_calendar_unique_idx
    on public.grow_planting_calendar (plant_slug, climate_zone_code, window_type, start_day_of_year);

drop trigger if exists grow_planting_calendar_set_updated_at on public.grow_planting_calendar;
create trigger grow_planting_calendar_set_updated_at
before update on public.grow_planting_calendar
for each row
execute function public.handle_updated_at();

-- Enable Row Level Security and allow read access to signed-in users
alter table public.grow_planting_calendar enable row level security;

create policy "Anyone can read grow planting calendar"
    on public.grow_planting_calendar
    for select
    using (true);
