-- Create table for storing Grow Daisy user plants
create table if not exists public.grow_user_plants (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    type text not null,
    location text,
    health text constraint grow_user_plants_health_check check (health in ('excellent', 'good', 'fair', 'poor')),
    planted_at timestamptz,
    last_watered_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Ensure fast lookups by user
create index if not exists grow_user_plants_user_id_idx
    on public.grow_user_plants (user_id, created_at);

-- Helper function to maintain updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to automatically update the updated_at column
drop trigger if exists grow_user_plants_set_updated_at on public.grow_user_plants;
create trigger grow_user_plants_set_updated_at
before update on public.grow_user_plants
for each row
execute function public.handle_updated_at();

-- Enable Row Level Security so users only see their own plants
alter table public.grow_user_plants enable row level security;

drop policy if exists "Users can view own plants" on public.grow_user_plants;
create policy "Users can view own plants"
    on public.grow_user_plants
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can add own plants" on public.grow_user_plants;
create policy "Users can add own plants"
    on public.grow_user_plants
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own plants" on public.grow_user_plants;
create policy "Users can update own plants"
    on public.grow_user_plants
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own plants" on public.grow_user_plants;
create policy "Users can delete own plants"
    on public.grow_user_plants
    for delete
    using (auth.uid() = user_id);
