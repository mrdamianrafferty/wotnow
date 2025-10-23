create or replace function public.findr_match_species_conditions(p_cell_id text)
returns table (
  species_id uuid,
  species_code text,
  name_en text,
  score numeric,
  reasons text[]
)
language plpgsql
as $$
begin
  -- ensure we only respond when we have a latest conditions row
  if not exists (select 1 from public.grid_conditions_latest where cell_id = p_cell_id) then
    return;
  end if;

  return query
  select
    s.id as species_id,
    s.species_code,
    s.name_en,
    0::numeric as score,
    array[]::text[] as reasons
  from public.species s
  order by s.species_code;
end;
$$;
