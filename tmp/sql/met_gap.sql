with latest as (
  select distinct on (rectangle_code)
    rectangle_code,
    source
  from public.findr_conditions_snapshots
  order by rectangle_code, captured_at desc
)
select rectangle_code, source
from latest
where source not in ('ingest:metno-primary', 'ingest:openmeteo');
