-- Add rotation_group to plant_species for crop rotation intelligence
alter table public.plant_species
  add column if not exists rotation_group text;

alter table public.plant_species
  add constraint plant_species_rotation_group_check
  check (rotation_group in (
    'brassica',
    'legume',
    'root_allium',
    'solanaceae',
    'cucurbit',
    'permanent',
    'non_rotating'
  ));

-- Partial index for efficient lookups (only rows that have a group)
create index if not exists idx_plant_species_rotation_group
  on public.plant_species (rotation_group)
  where rotation_group is not null;

-- Seed rotation groups from perenual_family
update public.plant_species
  set rotation_group = 'brassica'
  where perenual_family ilike '%Brassicaceae%'
    and rotation_group is null;

update public.plant_species
  set rotation_group = 'legume'
  where perenual_family ilike '%Fabaceae%'
    and rotation_group is null;

update public.plant_species
  set rotation_group = 'solanaceae'
  where perenual_family ilike '%Solanaceae%'
    and rotation_group is null;

update public.plant_species
  set rotation_group = 'cucurbit'
  where perenual_family ilike '%Cucurbitaceae%'
    and rotation_group is null;

update public.plant_species
  set rotation_group = 'root_allium'
  where (perenual_family ilike '%Apiaceae%' or perenual_family ilike '%Amaryllidaceae%')
    and rotation_group is null;

-- Known perennials by slug
update public.plant_species
  set rotation_group = 'permanent'
  where slug in (
    'asparagus', 'rhubarb',
    'raspberry', 'blackberry', 'blueberry', 'strawberry',
    'gooseberry', 'redcurrant', 'blackcurrant', 'whitecurrant',
    'grape', 'fig', 'apple', 'pear', 'plum', 'cherry',
    'rosemary', 'thyme', 'sage', 'lavender', 'mint', 'oregano', 'chives'
  )
    and rotation_group is null;

-- Everything else defaults to non_rotating
update public.plant_species
  set rotation_group = 'non_rotating'
  where rotation_group is null;
