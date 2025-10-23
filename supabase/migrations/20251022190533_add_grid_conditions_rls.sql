grant usage on schema public to anon;
grant select on public.rectangles_unified to anon;
grant select on public.species_full_public to anon;
grant select on public.grid_conditions_latest to anon;
alter table public.grid_conditions_latest enable row level security;
drop policy if exists "Public read: grid_conditions_latest" on public.grid_conditions_latest;
create policy "Public read: grid_conditions_latest" on public.grid_conditions_latest for select
  to anon using (true);
