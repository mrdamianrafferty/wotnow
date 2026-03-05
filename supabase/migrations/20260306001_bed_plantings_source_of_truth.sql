-- Make grow_bed_plantings the source of truth for plant-to-bed assignments.
-- Adds partial indexes for active-planting queries and prevents duplicate
-- active assignments of the same plant to the same bed.

-- Partial index: quickly find all active plantings for a bed
create index if not exists grow_bed_plantings_bed_active_idx
    on public.grow_bed_plantings (bed_id)
    where removed_at is null;

-- Partial index: quickly find all beds a plant is currently in
create index if not exists grow_bed_plantings_plant_active_idx
    on public.grow_bed_plantings (plant_id)
    where removed_at is null;

-- Unique constraint: prevent duplicate active assignments of the same plant to the same bed
create unique index if not exists grow_bed_plantings_bed_plant_active_uniq
    on public.grow_bed_plantings (bed_id, plant_id)
    where removed_at is null;
