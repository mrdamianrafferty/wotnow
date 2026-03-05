-- Garden beds: named containers for organizing plants
create table if not exists public.grow_garden_beds (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    type text not null check (type in ('raised_bed','container','in_ground','greenhouse','polytunnel','other')),
    color text not null default 'terracotta',
    sort_order integer not null default 0,
    sun_exposure text check (sun_exposure in ('full_sun','partial_shade','full_shade')),
    soil_type text,
    size_label text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Temporal planting history for crop rotation tracking
create table if not exists public.grow_bed_plantings (
    id uuid primary key default gen_random_uuid(),
    bed_id uuid not null references public.grow_garden_beds(id) on delete cascade,
    plant_id uuid not null references public.grow_user_plants(id) on delete cascade,
    quantity integer default 1,
    planted_at date not null default current_date,
    removed_at date,
    harvest_data jsonb,
    created_at timestamptz not null default now()
);

-- Add bed_id FK to grow_user_plants (current assignment, quick lookup)
alter table public.grow_user_plants add column if not exists bed_id uuid
    references public.grow_garden_beds(id) on delete set null;

-- Indexes
create index if not exists grow_garden_beds_user_sort_idx
    on public.grow_garden_beds (user_id, sort_order);

create index if not exists grow_bed_plantings_bed_planted_idx
    on public.grow_bed_plantings (bed_id, planted_at);

create index if not exists grow_bed_plantings_plant_idx
    on public.grow_bed_plantings (plant_id);

create index if not exists grow_user_plants_bed_id_idx
    on public.grow_user_plants (bed_id)
    where bed_id is not null;

-- Reuse existing handle_updated_at() trigger function
drop trigger if exists grow_garden_beds_set_updated_at on public.grow_garden_beds;
create trigger grow_garden_beds_set_updated_at
    before update on public.grow_garden_beds
    for each row
    execute function public.handle_updated_at();

-- =========================================================================
-- RLS: grow_garden_beds
-- =========================================================================
alter table public.grow_garden_beds enable row level security;

drop policy if exists "Users can view own beds" on public.grow_garden_beds;
create policy "Users can view own beds"
    on public.grow_garden_beds
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can add own beds" on public.grow_garden_beds;
create policy "Users can add own beds"
    on public.grow_garden_beds
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own beds" on public.grow_garden_beds;
create policy "Users can update own beds"
    on public.grow_garden_beds
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own beds" on public.grow_garden_beds;
create policy "Users can delete own beds"
    on public.grow_garden_beds
    for delete
    using (auth.uid() = user_id);

-- =========================================================================
-- RLS: grow_bed_plantings (via bed ownership)
-- =========================================================================
alter table public.grow_bed_plantings enable row level security;

drop policy if exists "Users can view own bed plantings" on public.grow_bed_plantings;
create policy "Users can view own bed plantings"
    on public.grow_bed_plantings
    for select
    using (
        exists (
            select 1 from public.grow_garden_beds
            where id = grow_bed_plantings.bed_id
            and user_id = auth.uid()
        )
    );

drop policy if exists "Users can add own bed plantings" on public.grow_bed_plantings;
create policy "Users can add own bed plantings"
    on public.grow_bed_plantings
    for insert
    with check (
        exists (
            select 1 from public.grow_garden_beds
            where id = grow_bed_plantings.bed_id
            and user_id = auth.uid()
        )
    );

drop policy if exists "Users can update own bed plantings" on public.grow_bed_plantings;
create policy "Users can update own bed plantings"
    on public.grow_bed_plantings
    for update
    using (
        exists (
            select 1 from public.grow_garden_beds
            where id = grow_bed_plantings.bed_id
            and user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.grow_garden_beds
            where id = grow_bed_plantings.bed_id
            and user_id = auth.uid()
        )
    );

drop policy if exists "Users can delete own bed plantings" on public.grow_bed_plantings;
create policy "Users can delete own bed plantings"
    on public.grow_bed_plantings
    for delete
    using (
        exists (
            select 1 from public.grow_garden_beds
            where id = grow_bed_plantings.bed_id
            and user_id = auth.uid()
        )
    );

-- Grant permissions
grant select, insert, update, delete on public.grow_garden_beds to authenticated;
grant select, insert, update, delete on public.grow_bed_plantings to authenticated;
